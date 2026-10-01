import { ref } from 'vue'
import type {
  CreateWorkflowRequest,
  GetWorkflowsWithPageResponse,
  UpdateDraftGraphRequest,
  UpdateWorkflowRequest,
} from '@/models/workflow'
import {
  cancelPublishWorkflow,
  createWorkflow,
  debugWorkflow,
  deleteWorkflow,
  getDraftGraph,
  getWorkflow,
  getWorkflowsWithPage,
  publishWorkflow,
  updateDraftGraph,
  updateWorkflow,
} from '@/services/workflow'
import { useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { ROUTE_NAME } from '@/constants'

/**
 * 前端内部节点类型 -> 后端 node_type（draft-graph 接口契约）
 * start / end / llm / http_request 前后端一致，无需转换
 */
const NODE_TYPE_TO_API: Record<string, string> = {
  plugin: 'tool',
  python: 'code',
  knowledge_retrieval: 'dataset_retrieval',
  template: 'template_transform',
}

/** 后端 node_type -> 前端内部节点类型（加载草稿时反向映射，旧草稿中的历史值原样透传） */
const API_TO_NODE_TYPE: Record<string, string> = {
  tool: 'plugin',
  code: 'python',
  dataset_retrieval: 'knowledge_retrieval',
  template_transform: 'template',
}

/** 内部节点类型转后端 node_type，未命中映射时原样返回 */
const toApiNodeType = (type?: string) => (type ? (NODE_TYPE_TO_API[type] ?? type) : type)

/** 后端 node_type 转内部节点类型，未命中映射时原样返回（兼容旧草稿） */
const fromApiNodeType = (type?: string) => (type ? (API_TO_NODE_TYPE[type] ?? type) : type)

/**
 * 变量类型归一化为后端契约（小写）：string / int / float / boolean
 * 旧大写值 String/Boolean 转小写；Number/number 按抽屉既有口径归为 int；
 * reference（前端引用标记，仅出现在未走提交流程的脏数据）兜底为 string
 */
const normalizeVarType = (type?: string): string => {
  const t = String(type ?? '').toLowerCase()
  if (t === 'number') return 'int'
  if (t === 'reference') return 'string'
  return t
}

/** 按变量类型给出默认 literal 值 */
const defaultLiteral = (type: string): string | number | boolean => {
  if (type === 'int' || type === 'float') return 0
  if (type === 'boolean') return false
  return ''
}

/**
 * 提取字面量原始值：兼容历史脏数据（value 为嵌套 {type,content} 对象时递归拍平），
 * 防止 content 包 content 导致回显 [object Object]
 */
const extractLiteral = (val: unknown, type: string): string | number | boolean => {
  let cur: unknown = val
  // 最多拍平 5 层，避免异常循环结构死循环
  for (let i = 0; i < 5; i++) {
    if (cur && typeof cur === 'object' && 'content' in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>).content
      continue
    }
    break
  }
  if (cur === null || cur === undefined || typeof cur === 'object') return defaultLiteral(type)
  return cur as string | number | boolean
}

/** 解析引用字符串 "节点ID/变量名" -> {ref_node_id, ref_var_name} */
const parseRef = (ref: string): { ref_node_id: string; ref_var_name: string } | null => {
  if (!ref || typeof ref !== 'string') return null
  const idx = ref.indexOf('/')
  if (idx === -1) return null
  return { ref_node_id: ref.slice(0, idx), ref_var_name: ref.slice(idx + 1) }
}

/** 组合引用对象为 "节点ID/变量名" */
const composeRef = (content: { ref_node_id?: string; ref_var_name?: string } | undefined): string => {
  if (!content?.ref_node_id) return ''
  return `${content.ref_node_id}/${content.ref_var_name ?? ''}`
}

/** 判断字段是否为引用类型（reference 非空即视为引用） */
const isRefField = (f: Record<string, any>): boolean => Boolean(f.reference)

/** 检索策略映射：前端 vector/fulltext ↔ 后端 semantic/full_text */
const STRATEGY_TO_API: Record<string, string> = { vector: 'semantic', fulltext: 'full_text' }
const STRATEGY_FROM_API: Record<string, string> = { semantic: 'vector', full_text: 'fulltext' }

/** HTTP 节点参数分组（与 meta.type 对应） */
const HTTP_GROUPS = ['headers', 'params', 'body'] as const

/**
 * 内部扁平字段 -> 后端 Variable 嵌套格式
 * 规则：
 * - 有引用（含 outputs，如结束节点引用上游输出）-> value:{type:'ref',content:{ref_node_id,ref_var_name}}
 * - outputs 无引用 -> value:{type:'generated',content:''}
 * - inputs 无引用 -> value:{type:'literal',content:值}
 * - meta 仅 HTTP 节点变量携带（{type:'headers'|'params'|'body'}），普通变量不发送
 */
const toApiVariable = (
  f: Record<string, any>,
  isOutput: boolean,
  meta?: Record<string, any>,
): Record<string, any> => {
  const type = normalizeVarType(f.type)
  const base: Record<string, any> = { name: f.name ?? '', type }
  if (f.description !== undefined && f.description !== '') base.description = f.description
  if (f.required !== undefined) base.required = f.required
  if (meta) base.meta = meta

  if (isRefField(f)) {
    const ref = parseRef(f.reference ?? '')
    base.value = ref
      ? { type: 'ref', content: ref }
      : { type: 'ref', content: { ref_node_id: '', ref_var_name: '' } }
    return base
  }

  if (isOutput) {
    base.value = { type: 'generated', content: '' }
    return base
  }

  base.value = { type: 'literal', content: extractLiteral(f.value, type) }
  return base
}

/** 批量转换字段数组 */
const toApiVariables = (fields: unknown, isOutput: boolean, meta?: Record<string, any>) =>
  Array.isArray(fields)
    ? fields.map((f) => (f && typeof f === 'object' ? toApiVariable(f, isOutput, meta) : f))
    : fields

/**
 * 后端 Variable 嵌套格式 -> 内部扁平字段
 * 与 toApiVariable 互逆，保证保存/加载后表单可正确回显
 */
const fromApiVariable = (v: Record<string, any>): Record<string, any> => {
  const value = v.value ?? {}
  const base: Record<string, any> = {
    name: v.name ?? '',
    type: normalizeVarType(v.type),
    description: v.description ?? '',
    required: v.required ?? true,
    reference: '',
    value: '',
  }

  if (value.type === 'ref' && value.content) {
    base.reference = composeRef(value.content)
    base.value = ''
  } else if (value.type === 'literal') {
    base.value = extractLiteral(value.content, base.type)
  }
  // generated：运行后生成，无需回显值，保留空

  return base
}

/** 批量还原字段数组 */
const fromApiVariables = (fields: unknown) =>
  Array.isArray(fields)
    ? fields.map((f) => (f && typeof f === 'object' ? fromApiVariable(f) : f))
    : fields

/**
 * 内部节点 -> 后端 draft-graph 节点格式
 * 节点级差异：
 * - http_request：method 全小写；headers/params/body 合并进 inputs，以 meta.type 标识分组
 * - llm：model_config 契约 {provider, model_name, temperature, max_tokens}
 * - dataset_retrieval：retrieval_config 契约 {retrieval_strategy, k, score}，策略枚举 semantic/full_text/hybrid
 */
const toApiNode = (node: Record<string, any>): Record<string, any> => {
  const node_type = toApiNodeType(node.type)
  const d = (node.data ?? {}) as Record<string, any>
  const base: Record<string, any> = {
    ...d,
    id: node.id,
    node_type,
    position: node.position,
    // 节点标题取展示名 label（新建节点为默认名，配置保存后为用户自定义名）
    title: d.label ?? d.title,
    inputs: toApiVariables(d.inputs, false),
    outputs: toApiVariables(d.outputs, true),
  }
  // 内部冗余字段不随载荷发送
  delete base.nodeType
  delete base.label

  if (node_type === 'http_request') {
    base.method = String(d.method ?? 'GET').toLowerCase()
    // 三组参数合并进 inputs，meta.type 标识分组
    base.inputs = HTTP_GROUPS.flatMap((g) => toApiVariables(d[g], false, { type: g }))
    delete base.headers
    delete base.params
    delete base.body
  }

  if (node_type === 'llm') {
    base.language_model_config = {
      provider: d.model_config?.provider ?? '',
      model_name: d.model || d.model_config?.model || '',
      temperature: d.model_config?.temperature ?? 0.7,
      top_p: d.model_config?.topP ?? 1,
      presence_penalty: d.model_config?.presencePenalty ?? 0,
      frequency_penalty: d.model_config?.frequencyPenalty ?? 0,
      context_rounds: d.model_config?.contextRounds ?? 10,
      max_tokens: d.model_config?.maxReplyLength ?? 2048,
    }
  }

  if (node_type === 'dataset_retrieval') {
    base.dataset_ids = d.dataset_ids ?? (d.knowledgeBases ?? []).map((k: any) => k.id)
    const strategy = d.retrievalStrategy ?? d.retrieval_config?.strategy ?? 'hybrid'
    base.retrieval_config = {
      retrieval_strategy: STRATEGY_TO_API[strategy] ?? strategy,
      k: d.maxResults ?? d.retrieval_config?.max_results ?? 5,
      score: d.minScore ?? d.retrieval_config?.min_score ?? 0.05,
    }
    // 内部冗余字段不随载荷发送
    delete base.knowledgeBases
    delete base.retrievalStrategy
    delete base.maxResults
    delete base.minScore
  }

  return base
}

/** 后端 draft-graph 节点 -> 内部节点（与 toApiNode 互逆） */
const fromApiNode = (node: Record<string, any>): Record<string, any> => {
  const { id, node_type, position, ...rest } = node
  const type = fromApiNodeType(node_type)
  const data: Record<string, any> = { ...rest }

  if (node_type === 'http_request') {
    // inputs 按 meta.type 拆回 headers/params/body；method 内部统一大写（对齐下拉选项）
    data.method = String(rest.method ?? 'GET').toUpperCase()
    data.headers = []
    data.params = []
    data.body = []
    data.inputs = []
    ;(Array.isArray(rest.inputs) ? rest.inputs : []).forEach((v: Record<string, any>) => {
      const f = fromApiVariable(v)
      const g = v?.meta?.type
      if (g === 'headers') data.headers.push(f)
      else if (g === 'body') data.body.push(f)
      else data.params.push(f)
    })
  } else {
    data.inputs = fromApiVariables(rest.inputs)
  }
  data.outputs = fromApiVariables(rest.outputs)

  // 后端字段名为 language_model_config，键名为前端 camelCase（model/topP/maxReplyLength 等），兼容历史 snake_case 与 model_config
  const lmConfig = rest.language_model_config ?? rest.model_config
  if (node_type === 'llm' && lmConfig) {
    data.model = lmConfig.model ?? lmConfig.model_name ?? ''
    data.model_config = {
      model: lmConfig.model ?? lmConfig.model_name ?? '',
      provider: lmConfig.provider ?? '',
      temperature: lmConfig.temperature ?? 0.7,
      topP: lmConfig.topP ?? lmConfig.top_p ?? 1,
      presencePenalty: lmConfig.presencePenalty ?? lmConfig.presence_penalty ?? 0,
      frequencyPenalty: lmConfig.frequencyPenalty ?? lmConfig.frequency_penalty ?? 0,
      contextRounds: lmConfig.contextRounds ?? lmConfig.context_rounds ?? 10,
      maxReplyLength: lmConfig.maxReplyLength ?? lmConfig.max_tokens ?? 2048,
    }
  }

  if (node_type === 'dataset_retrieval' && rest.retrieval_config) {
    const rc = rest.retrieval_config
    const rawStrategy = rc.retrieval_strategy ?? 'hybrid'
    data.retrievalStrategy = STRATEGY_FROM_API[rawStrategy] ?? rawStrategy
    data.maxResults = rc.k ?? 5
    data.minScore = rc.score ?? 0.05
    // 内部嵌套结构同步重建，供配置抽屉兼容读取
    data.retrieval_config = {
      strategy: data.retrievalStrategy,
      max_results: data.maxResults,
      min_score: data.minScore,
    }
  }

  return { id, type, position, data }
}

export const useGetWorkflowsWithPage = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)
  const workflows = ref<GetWorkflowsWithPageResponse['data']['list']>([])
  const defaultPaginator = {
    current_page: 1,
    page_size: 20,
    total_page: 0,
    total_record: 0,
  }
  const paginator = ref({ ...defaultPaginator })

  // 2.定义加载数据函数
  const loadWorkflows = async (
    search_word: string = '',
    status: string = '',
    init: boolean = false,
  ) => {
    // 2.1 判断是否是初始化，并检查分页器
    if (init) {
      paginator.value = defaultPaginator
    } else if (paginator.value.current_page > paginator.value.total_page) {
      return
    }

    try {
      // 2.2 调用接口获取响应数据
      loading.value = true
      const resp = await getWorkflowsWithPage({
        current_page: paginator.value.current_page,
        page_size: paginator.value.page_size,
        search_word,
        status,
      })
      const data = resp.data

      // 2.3 更新分页器
      paginator.value = data.paginator

      // 2.4 判断是否存在更多数据
      if (paginator.value.current_page <= paginator.value.total_page) {
        paginator.value.current_page += 1
      }

      // 2.5 判断是追加或者是覆盖数据
      if (init) {
        workflows.value = data.list
      } else {
        workflows.value.push(...data.list)
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, workflows, paginator, loadWorkflows }
}

export const useCreateWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)
  const router = useRouter()

  // 2.定义创建工作流处理器
  const handleCreateWorkflow = async (req: CreateWorkflowRequest) => {
    try {
      // 3.调用API接口创建工作流
      loading.value = true
      const resp = await createWorkflow(req)

      // 4.创建成功提示并跳转页面
      Message.success('创建工作流成功')
      await router.push({
        name: ROUTE_NAME.WORKFLOW_DETAIL,
        params: {
          workflowId: resp.data.id,
        },
      })
    } finally {
      loading.value = false
    }
  }

  return { loading, handleCreateWorkflow }
}

export const useUpdateWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)

  // 2.定义更新工作流处理器
  const handleUpdateWorkflow = async (workflow_id: string, req: UpdateWorkflowRequest) => {
    try {
      // 3.调用api接口更新工作流
      loading.value = true
      const resp = await updateWorkflow(workflow_id, req)
      Message.success(resp.message)
    } finally {
      loading.value = false
    }
  }

  return { loading, handleUpdateWorkflow }
}

export const useGetWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)
  const isInitializing = ref(true)
  const workflow = ref<Record<string, any>>({})

  // 2.定义获取基础信息函数
  const loadWorkflow = async (workflow_id: string) => {
    try {
      // 3.调用API接口获取工作流基础信息
      loading.value = true
      const resp = await getWorkflow(workflow_id)
      workflow.value = resp.data
    } finally {
      loading.value = false
      isInitializing.value = false
    }
  }

  return { loading, isInitializing, workflow, loadWorkflow }
}

export const useDeleteWorkflow = () => {
  const handleDeleteWorkflow = (workflow_id: string, callback?: () => void) => {
    Modal.warning({
      title: '要删除该工作流吗?',
      content:
        '删除工作流后，发布的WebApp、开放API以及关联的社交媒体平台均无法使用该工作流，如果需要暂停工作流，可使用取消发布功能。',
      hideCancel: false,
      onOk: async () => {
        try {
          // 1.点击确定后向API接口发起请求
          const resp = await deleteWorkflow(workflow_id)
          Message.success(resp.message)
        } finally {
          // 2.调用callback函数指定回调功能
          callback && callback()
        }
      },
    })
  }

  return { handleDeleteWorkflow }
}

export const useGetDraftGraph = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)
  const nodes = ref<Record<string, any>>([])
  const edges = ref<Record<string, any>>([])

  // 2.定义加载数据函数
  const loadDraftGraph = async (workflow_id: string) => {
    try {
      // 3.调用api获取数据
      loading.value = true
      const resp = await getDraftGraph(workflow_id)
      const data = resp.data

      // 4.处理节点数据：后端契约格式拆回前端内部结构（node_type / 变量 / 节点级配置）
      nodes.value = data.nodes.map((node) => fromApiNode(node))

      // 6.处理边数据
      edges.value = data.edges.map((edge) => {
        // 7.添加动画，并设置边的粗细+颜色
        return { ...edge, animated: true, style: { strokeWidth: 2, stroke: '#9ca3af' } }
      })
    } finally {
      loading.value = false
    }
  }

  return { loading, nodes, edges, loadDraftGraph }
}

export const useUpdateDraftGraph = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)

  // 2.定义更新草稿图配置处理器
  const handleUpdateDraftGraph = async (
    workflow_id: string,
    req: UpdateDraftGraphRequest,
    is_notify: boolean = true,
  ) => {
    try {
      // 3.调用api接口更新草稿图配置
      loading.value = true
      const resp = await updateDraftGraph(workflow_id, req)
      is_notify && Message.success(resp.message)
      return resp
    } catch (e) {
      // 自动捕获异常，给出错误反馈（避免未捕获的 Promise rejection）
      console.error('[updateDraftGraph] failed:', e)
      is_notify && Message.error('保存失败，请稍后重试')
      return null
    } finally {
      loading.value = false
    }
  }

  // 3.定义图配置数据转请求数据函数
  const convertGraphToReq = (
    nodes: Record<string, any>[],
    edges: Record<string, any>[],
  ): UpdateDraftGraphRequest => {
    return {
      // 节点转换为后端契约格式（node_type / 变量 / 节点级配置，见 toApiNode）
      nodes: nodes.map((node) => toApiNode(node)),
      edges: edges.map((edge) => {
        return {
          id: edge.id,
          source: edge.source,
          source_type: toApiNodeType(edge.source_type),
          target: edge.target,
          target_type: toApiNodeType(edge.target_type),
        }
      }),
    }
  }

  return { loading, convertGraphToReq, handleUpdateDraftGraph }
}

export const usePublishWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)

  // 2.定义发布工作流处理器
  const handlePublishWorkflow = async (workflow_id: string) => {
    try {
      // 3.调用api接口发布工作流
      loading.value = true
      const resp = await publishWorkflow(workflow_id)
      Message.success(resp.message)
    } finally {
      loading.value = false
    }
  }

  return { loading, handlePublishWorkflow }
}

export const useCancelPublishWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)

  // 2.定义取消发布处理器
  const handleCancelPublish = async (workflow_id: string) => {
    try {
      // 3.调用api取消发布工作流
      loading.value = true
      const resp = await cancelPublishWorkflow(workflow_id)
      Message.success(resp.message)
    } finally {
      loading.value = false
    }
  }

  return { loading, handleCancelPublish }
}

export const useDebugWorkflow = () => {
  // 1.定义hooks所需数据
  const loading = ref(false)
  const error = ref('')

  // 2.定义调试会话处理器
  const handleDebugWorkflow = async (
    workflow_id: string,
    inputs: Record<string, any>,
    onData: (event_response: Record<string, any>) => void,
  ) => {
    try {
      loading.value = true
      const resp = await debugWorkflow(workflow_id, inputs, onData)

      // 2.1 判断响应内容是否存在，如果存在则表示该接口为非流式输出，意味着接口出错
      if (resp !== undefined) {
        error.value = resp['message']
      }
    } finally {
      loading.value = false
    }
  }

  return { loading, error, handleDebugWorkflow }
}
