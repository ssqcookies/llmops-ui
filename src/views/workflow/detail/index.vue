<script setup lang="ts">
/** 工作流详情页：基于 vue-flow 的可视化编排画布 */
import { ref, computed, onMounted, watch, shallowRef, markRaw, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { VueFlow, Panel, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import '@vue-flow/core/dist/style.css'
import '@vue-flow/core/dist/theme-default.css'
import { Message } from '@arco-design/web-vue'
import { formatTime } from '@/utils/format'
import {
  useGetWorkflow,
  useGetDraftGraph,
  useUpdateDraftGraph,
  usePublishWorkflow,
  useCancelPublishWorkflow,
  useDebugWorkflow,
  useUpdateWorkflow,
} from '@/hooks/use-workflow'
import { ROUTE_NAME } from '@/constants'
import { NODE_META, createDefaultNodeData } from './node-config'
import type { WorkflowNodeType, WorkflowNodeData, NodeField } from './types'
import NodeLibraryPanel from './components/NodeLibraryPanel.vue'
import NodeConfigDrawer from './components/NodeConfigDrawer.vue'
import DebugDrawer from './components/DebugDrawer.vue'
import DraftHistoryModal from './components/DraftHistoryModal.vue'
import { getDatasetsWithPage } from '@/services/dataset'
import StartNode from './components/nodes/StartNode.vue'
import LlmNode from './components/nodes/LlmNode.vue'
import PluginNode from './components/nodes/PluginNode.vue'
import KnowledgeRetrievalNode from './components/nodes/KnowledgeRetrievalNode.vue'
import TemplateNode from './components/nodes/TemplateNode.vue'
import HttpRequestNode from './components/nodes/HttpRequestNode.vue'
import PythonNode from './components/nodes/PythonNode.vue'
import EndNode from './components/nodes/EndNode.vue'
import { applyAutoLayout } from './useAutoLayout'

// ============================================================
// 路由 & 基础信息
// ============================================================
const route = useRoute()
const router = useRouter()
const workflowId = computed(() => route.params.workflowId as string)

const { workflow, loadWorkflow } = useGetWorkflow()
const workflowName = computed(() => (workflow.value as any)?.name || '工作流')
const workflowDesc = computed(() => (workflow.value as any)?.description || '')
const workflowStatus = computed(() => (workflow.value as any)?.status || 'draft')
const workflowUpdatedAt = computed(() => (workflow.value as any)?.updated_at as number | undefined)
const savedTime = computed(() =>
  workflowUpdatedAt.value ? formatTime(workflowUpdatedAt.value * 1000, 'HH:mm:ss') : '--:--:--',
)

// ============================================================
// vue-flow 节点类型注册
// ============================================================
const nodeTypes = {
  start: markRaw(StartNode),
  llm: markRaw(LlmNode),
  plugin: markRaw(PluginNode),
  knowledge_retrieval: markRaw(KnowledgeRetrievalNode),
  template: markRaw(TemplateNode),
  http_request: markRaw(HttpRequestNode),
  python: markRaw(PythonNode),
  end: markRaw(EndNode),
}

// ============================================================
// 图数据（nodes / edges）
// ============================================================
const { nodes: graphNodes, edges: graphEdges, loadDraftGraph } = useGetDraftGraph()
const nodes = shallowRef<Record<string, any>[]>([])
const edges = shallowRef<Record<string, any>[]>([])

/** 将后端返回的节点 data 归一化为前端展示所需结构 */
const normalizeNodeData = (type: string, data: Record<string, any>): WorkflowNodeData => {
  const meta = NODE_META[type as WorkflowNodeType] ?? NODE_META.start
  return {
    nodeType: type as WorkflowNodeType,
    // 后端仅回传根级 title 时兜底为节点展示名
    label: data.label || data.title || meta.label,
    icon: data.icon || meta.icon,
    color: data.color || meta.color,
    inputs: Array.isArray(data.inputs) ? data.inputs : meta.inputs.map((f) => ({ ...f })),
    outputs: Array.isArray(data.outputs) ? data.outputs : meta.outputs.map((f) => ({ ...f })),
    knowledgeBases: Array.isArray(data.knowledgeBases)
      ? data.knowledgeBases
      : Array.isArray(data.knowledge_bases)
        ? data.knowledge_bases
        : // 后端仅回传 dataset_ids 时用 ID 兜底名称，抽屉加载知识库列表后会补全真实名称
          Array.isArray(data.dataset_ids)
          ? data.dataset_ids.map((id: string) => ({ id, name: id }))
          : [],
    retrievalStrategy: data.retrievalStrategy ?? data.retrieval_strategy ?? 'hybrid',
    maxResults: data.maxResults ?? data.max_results ?? 5,
    minScore: data.minScore ?? data.min_score ?? 0.05,
    prompt: data.prompt ?? '',
    model: data.model ?? '',
    // 大语言模型节点配置（use-workflow.fromApiNode 已将后端 language_model_config 转为该结构）
    model_config: data.model_config,
    template: data.template ?? '',
    method: data.method ?? 'GET',
    url: data.url ?? '',
    // HTTP 请求节点三组参数（兼容后端可能的蛇形命名）
    headers: Array.isArray(data.headers)
      ? data.headers
      : Array.isArray(data.header_params)
        ? data.header_params
        : [],
    params: Array.isArray(data.params)
      ? data.params
      : Array.isArray(data.query_params)
        ? data.query_params
        : [],
    body: Array.isArray(data.body)
      ? data.body
      : Array.isArray(data.body_params)
        ? data.body_params
        : [],
    code: data.code ?? '',
  }
}

/** 加载草稿图 */
const loadGraph = async () => {
  await loadDraftGraph(workflowId.value)
  nodes.value = graphNodes.value.map((n) => ({
    ...n,
    data: normalizeNodeData(n.type, n.data ?? {}),
  }))
  edges.value = graphEdges.value

  // 节点位置缺失或全部重叠在 (0,0) 时，自动调用 Dagre 布局
  const hasValidPositions = nodes.value.every(
    (n) => n.position && (n.position.x !== 0 || n.position.y !== 0),
  )
  if (!hasValidPositions && nodes.value.length > 1) {
    nodes.value = applyAutoLayout(nodes.value, edges.value)
  }

  // 知识库检索节点：后端仅存 dataset_ids，加载知识库列表补全名称和图标
  await enrichKnowledgeBases()
}

/** 补全知识库检索节点的知识库名称与图标（后端仅存 ID） */
const enrichKnowledgeBases = async () => {
  const kbNodes = nodes.value.filter((n) => n.type === 'knowledge_retrieval')
  if (!kbNodes.length) return
  try {
    const resp = await getDatasetsWithPage(1, 50)
    const list = (resp.data.list ?? []) as Array<{ id: string; name: string; icon?: string }>
    const map = new Map(list.map((d) => [d.id, d]))
    let changed = false
    nodes.value = nodes.value.map((n) => {
      if (n.type !== 'knowledge_retrieval') return n
      const kbs = (n.data?.knowledgeBases ?? []) as Array<{ id: string; name: string; icon?: string }>
      if (!kbs.length) return n
      const enriched = kbs.map((k) => {
        const d = map.get(k.id)
        return d ? { id: k.id, name: d.name, icon: d.icon ?? '' } : k
      })
      changed = true
      return { ...n, data: { ...n.data, knowledgeBases: enriched } }
    })
    if (changed) nodes.value = [...nodes.value]
  } catch (e) {
    console.error('[enrichKnowledgeBases] failed:', e)
  }
}

// ============================================================
// 选中节点 & 配置抽屉
// ============================================================
const drawerVisible = ref(false)
/** 草稿历史弹窗显示状态 */
const draftHistoryVisible = ref(false)
const selectedNodeId = ref<string | null>(null)
const selectedNode = computed(() => {
  if (!selectedNodeId.value) return null
  const n = nodes.value.find((x) => x.id === selectedNodeId.value)
  return n ? { id: n.id, type: n.type as WorkflowNodeType, data: n.data as WorkflowNodeData } : null
})

/**
 * 引用显示映射：实际值 `节点ID/字段名` -> 显示值 `节点标题/字段名`
 * 通过 provide 供节点卡片反查（不同节点字段可能重名，持久化必须用节点ID拼接）
 */
const refDisplayMap = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  nodes.value.forEach((n) => {
    const d = n.data as WorkflowNodeData
    const title = d.title || d.label || n.id
    // 开始节点可引用其入参，其他节点可引用其输出
    const fields = n.type === 'start' ? d.inputs ?? [] : d.outputs ?? []
    fields.forEach((f) => {
      map[`${n.id}/${f.name}`] = `${title}/${f.name}`
    })
  })
  return map
})
provide('refDisplayMap', refDisplayMap)

/**
 * DFS 获取所有前置节点：基于逆邻接表（target -> sources）深度优先遍历
 * @param nodeId 目标节点ID
 * @returns 全部前置节点（已去重，不含节点本身）
 */
const getPredecessors = (nodeId: string): Record<string, any>[] => {
  // 构建逆邻接表：key 为目标节点，value 为其直接上游节点列表
  const reverseAdj = new Map<string, string[]>()
  edges.value.forEach((e) => {
    const list = reverseAdj.get(String(e.target)) ?? []
    list.push(String(e.source))
    reverseAdj.set(String(e.target), list)
  })

  const visited = new Set<string>()
  const dfs = (current: string) => {
    ;(reverseAdj.get(current) ?? []).forEach((src) => {
      // 已访问或命中节点本身时跳过，避免环路与自身引用
      if (visited.has(src) || src === nodeId) return
      visited.add(src)
      dfs(src)
    })
  }
  dfs(nodeId)

  return nodes.value.filter((n) => visited.has(n.id))
}

// ============================================================
// 工作流校验（调试/发布前全量校验）
// ============================================================
/** 变量名正则：字母/下划线开头，后续字母数字下划线 */
const VAR_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
/** 合法变量类型（小写） */
const VALID_VAR_TYPES = new Set(['string', 'int', 'float', 'boolean', 'reference'])

/** 工作流全量校验：返回错误信息数组，空数组表示通过 */
const validateWorkflow = (): string[] => {
  const errors: string[] = []
  const nodeList = nodes.value
  const edgeList = edges.value

  // ── 1. 结构校验 ──
  const startNodes = nodeList.filter((n) => n.type === 'start')
  const endNodes = nodeList.filter((n) => n.type === 'end')
  if (startNodes.length === 0) errors.push('请添加开始节点')
  if (endNodes.length === 0) errors.push('请添加结束节点')
  if (startNodes.length > 1) errors.push('只能有一个开始节点')
  if (endNodes.length > 1) errors.push('只能有一个结束节点')

  // 节点 id / title 唯一性
  const idSet = new Set<string>()
  const titleSet = new Set<string>()
  for (const n of nodeList) {
    if (idSet.has(n.id)) {
      errors.push(`节点ID重复：${n.id}`)
    } else {
      idSet.add(n.id)
    }
    const title = (n.data?.title || n.data?.label || '').trim()
    if (!title) {
      errors.push(`节点名称不能为空（id: ${n.id}）`)
    } else if (titleSet.has(title)) {
      errors.push(`节点名称不能重复：${title}`)
    } else {
      titleSet.add(title)
    }
  }

  // 至少一条边
  if (edgeList.length === 0) {
    errors.push('请连接节点')
  }

  // ── 2. 边校验 ──
  const nodeIdSet = new Set(nodeList.map((n) => n.id))
  const edgePairSet = new Set<string>()
  for (const e of edgeList) {
    const src = String(e.source)
    const tgt = String(e.target)
    if (!nodeIdSet.has(src) || !nodeIdSet.has(tgt)) {
      errors.push(`连接的节点不存在：${src} → ${tgt}`)
      continue
    }
    if (src === tgt) {
      errors.push(`节点不能连接自己：${src}`)
      continue
    }
    const pair = `${src}->${tgt}`
    if (edgePairSet.has(pair)) {
      errors.push(`重复连接：${src} → ${tgt}`)
    } else {
      edgePairSet.add(pair)
    }
  }

  // ── 2.1 图连通性校验：开始节点必须为唯一入度0节点、结束节点必须为唯一出度0节点、所有节点必须在 start→end 通路上 ──
  if (startNodes.length === 1 && endNodes.length === 1 && edgeList.length > 0) {
    const startId = startNodes[0]!.id
    const endId = endNodes[0]!.id
    // 仅统计指向已存在节点的有效边
    const validEdges = edgeList.filter(
      (e) => nodeIdSet.has(String(e.source)) && nodeIdSet.has(String(e.target)),
    )
    const outAdj = new Map<string, string[]>()
    const inAdj = new Map<string, string[]>()
    validEdges.forEach((e) => {
      const s = String(e.source)
      const t = String(e.target)
      const outList = outAdj.get(s) ?? []
      outList.push(t)
      outAdj.set(s, outList)
      const inList = inAdj.get(t) ?? []
      inList.push(s)
      inAdj.set(t, inList)
    })

    // BFS：从指定节点出发，沿邻接表可达的全部节点
    const bfs = (start: string, adj: Map<string, string[]>): Set<string> => {
      const visited = new Set<string>([start])
      const queue = [start]
      while (queue.length) {
        const cur = queue.shift()!
        ;(adj.get(cur) ?? []).forEach((next) => {
          if (!visited.has(next)) {
            visited.add(next)
            queue.push(next)
          }
        })
      }
      return visited
    }

    // 开始节点不能有入边
    if ((inAdj.get(startId) ?? []).length > 0) {
      errors.push('开始节点不能有输入连接')
    }
    // 结束节点不能有出边
    if ((outAdj.get(endId) ?? []).length > 0) {
      errors.push('结束节点不能有输出连接')
    }
    // 开始节点必须有出边
    if ((outAdj.get(startId) ?? []).length === 0) {
      errors.push('请从开始节点连接到其他节点')
    }
    // 结束节点必须有入边
    if ((inAdj.get(endId) ?? []).length === 0) {
      errors.push('请连接到结束节点')
    }
    // 从开始节点正向可达
    const reachableFromStart = bfs(startId, outAdj)
    // 从结束节点逆向可达（即能到达结束节点）
    const canReachEnd = bfs(endId, inAdj)
    for (const n of nodeList) {
      const d = n.data as WorkflowNodeData
      const title = d.title || d.label || n.id
      if (!reachableFromStart.has(n.id)) {
        errors.push(`节点[${title}]未从开始节点可达，请检查连接`)
      }
      if (!canReachEnd.has(n.id)) {
        errors.push(`节点[${title}]无法到达结束节点，请检查连接`)
      }
    }
  }

  // ── 3. 节点必填字段校验 ──
  for (const n of nodeList) {
    const d = n.data as WorkflowNodeData
    const title = d.title || d.label || n.id
    if (n.type === 'start') {
      if (!d.inputs?.length) errors.push(`开始节点至少需要一个输入变量`)
    } else if (n.type === 'end') {
      if (!d.outputs?.length) errors.push(`结束节点至少需要一个输出变量`)
    } else if (n.type === 'llm') {
      if (!d.prompt?.trim()) errors.push(`LLM节点[${title}]的提示词不能为空`)
      if (!d.model_config?.model) errors.push(`请为LLM节点[${title}]选择模型`)
    } else if (n.type === 'knowledge_retrieval') {
      const kbIds = d.dataset_ids?.length ?? d.knowledgeBases?.length ?? 0
      if (!kbIds) errors.push(`请为知识库检索节点[${title}]选择知识库`)
      const hasQuery = d.inputs?.some((f) => f.name === 'query')
      if (!hasQuery) errors.push(`检索节点[${title}]需要query输入`)
    } else if (n.type === 'http_request') {
      if (!d.url?.trim()) errors.push(`请为HTTP请求节点[${title}]填写请求URL`)
      if (!d.method) errors.push(`请为HTTP请求节点[${title}]选择请求方法`)
    } else if (n.type === 'python') {
      if (!d.code?.trim()) errors.push(`代码节点[${title}]的代码不能为空`)
    } else if (n.type === 'template') {
      if (!d.template?.trim()) errors.push(`模板转换节点[${title}]的模板不能为空`)
    }

    // ── 4. 变量校验（inputs / outputs）──
    const checkFields = (fields: NodeField[] | undefined, label: string) => {
      if (!fields) return
      fields.forEach((f) => {
        if (!VAR_NAME_REGEX.test(f.name)) {
          errors.push(`节点[${title}]的${label}变量名不合法：${f.name}（仅字母/数字/下划线，不能以数字开头）`)
        }
        const t = String(f.type ?? '').toLowerCase()
        if (!VALID_VAR_TYPES.has(t)) {
          errors.push(`节点[${title}]的${label}变量[${f.name}]类型不合法：${f.type}（需小写）`)
        }
        if (f.value === undefined || f.value === null) {
          errors.push(`节点[${title}]的${label}变量[${f.name}]缺少value`)
        }
      })
    }
    checkFields(d.inputs, '输入')
    checkFields(d.outputs, '输出')
  }

  // ── 4.1 REF 引用校验：引用的节点必须是当前节点的前置节点 ──
  for (const n of nodeList) {
    const d = n.data as WorkflowNodeData
    const title = d.title || d.label || n.id
    const preds = getPredecessors(n.id)
    const predIdSet = new Set(preds.map((p) => p.id))
    // 开始节点无引用，跳过
    if (n.type === 'start') continue

    const checkRef = (fields: NodeField[] | undefined, label: string) => {
      if (!fields) return
      fields.forEach((f) => {
        if (f.type === 'reference' && f.reference) {
          const refNodeId = String(f.reference).split('/')[0]
          if (!predIdSet.has(refNodeId)) {
            errors.push(`节点[${title}]的${label}变量[${f.name}]引用了非前置节点，请核实后重试`)
          }
        }
      })
    }
    checkRef(d.inputs, '输入')
    checkRef(d.outputs, '输出')
    // HTTP 节点三组参数也可能含引用
    if (n.type === 'http_request') {
      checkRef(d.headers as NodeField[], 'HEADERS')
      checkRef(d.params as NodeField[], 'PARAMS')
      checkRef(d.body as NodeField[], 'BODY')
    }
  }

  return errors
}

/** 当前节点可引用的前置字段分组：DFS 全部前置节点，开始节点取入参，普通节点取输出 */
const referenceOptions = computed(() => {
  if (!selectedNodeId.value) return []
  return getPredecessors(selectedNodeId.value)
    .map((n) => {
      const d = n.data as WorkflowNodeData
      const fields = (n.type === 'start' ? d.inputs ?? [] : d.outputs ?? []).map((f) => ({
        name: f.name,
      }))
      return { nodeId: n.id, nodeTitle: d.title || d.label || n.id, fields }
    })
    .filter((g) => g.fields.length > 0)
})

const handleNodeClick = ({ node }: { node: Record<string, any> }) => {
  // 节点ID比对：重复点击同一节点时不重复更新状态，仅保持抽屉打开
  if (selectedNodeId.value === node.id && drawerVisible.value) return
  selectedNodeId.value = node.id
  drawerVisible.value = true
}

/** 点击边时重置节点选择：关闭配置抽屉并清空选中节点 */
const handleEdgeClick = () => {
  drawerVisible.value = false
  selectedNodeId.value = null
}

/** 配置面板保存：将标题/描述/输入参数合并回节点数据 */
const configSaving = ref(false)
const handleConfigSubmit = async ({
  id,
  title,
  description,
  inputs,
  outputs,
  prompt,
  template,
  code,
  knowledgeBases,
  retrievalStrategy,
  maxResults,
  minScore,
  method,
  url,
  headers,
  params,
  body,
  pluginId,
  pluginName,
  pluginIcon,
  model_config,
}: {
  id: string
  title: string
  description: string
  inputs: {
    name: string
    type: string
    description: string
    required: boolean
    source?: 'fixed' | 'ref'
    value?: string | number | boolean
    reference?: string
  }[]
  outputs: { name: string; type: string; description: string; required: boolean }[]
  prompt?: string
  template?: string
  code?: string
  knowledgeBases?: { id: string; name: string }[]
  retrievalStrategy?: 'hybrid' | 'vector' | 'fulltext'
  maxResults?: number
  minScore?: number
  method?: string
  url?: string
  headers?: WorkflowNodeData['headers']
  params?: WorkflowNodeData['params']
  body?: WorkflowNodeData['body']
  pluginId?: string
  pluginName?: string
  pluginIcon?: string
  model_config?: WorkflowNodeData['model_config']
}) => {
  const idx = nodes.value.findIndex((n) => n.id === id)
  if (idx === -1) return
  const node = nodes.value[idx]
  if (!node) return

  // 节点名称唯一性校验：与其他节点（排除自身）的 title/label 比对
  const newTitle = title.trim()
  const duplicated = nodes.value.some(
    (n) => n.id !== id && (n.data?.title || n.data?.label || '').trim() === newTitle,
  )
  if (duplicated) {
    Message.error(`节点名称 [${newTitle}] 已存在，请修改后重试`)
    return
  }

  // ── 引用清理：节点删除字段后，清除后续节点中对它的引用 ──
  // 可引用字段 = start 节点的 inputs（start 的 outputs = inputs）/ 其他节点的 outputs
  const oldRefFields = new Set<string>()
  if (node.type === 'start') {
    node.data.inputs?.forEach((f: any) => oldRefFields.add(f.name))
  } else {
    node.data.outputs?.forEach((f: any) => oldRefFields.add(f.name))
  }
  const newRefFields = new Set<string>()
  if (node.type === 'start') {
    inputs.forEach((f) => newRefFields.add(f.name))
  } else {
    outputs.forEach((f) => newRefFields.add(f.name))
  }
  const removedFields = [...oldRefFields].filter((n) => !newRefFields.has(n))

  if (removedFields.length) {
    nodes.value = nodes.value.map((n) => {
      if (n.id === id) return n
      const clearRef = (fields: any[] | undefined) => {
        if (!fields?.length) return fields
        return fields.map((f: any) => {
          if (f.reference && removedFields.some((name) => f.reference === `${id}/${name}`)) {
            return { ...f, reference: '', value: '' }
          }
          return f
        })
      }
      const newData = { ...n.data }
      newData.inputs = clearRef(n.data.inputs as any[]) as any
      if (n.type === 'end') {
        newData.outputs = clearRef(n.data.outputs as any[]) as any
      }
      if (n.type === 'http_request') {
        newData.headers = clearRef(n.data.headers as any[]) as any
        newData.params = clearRef(n.data.params as any[]) as any
        newData.body = clearRef(n.data.body as any[]) as any
      }
      return { ...n, data: newData }
    })
  }
  // ── 引用清理结束 ──

  const data: WorkflowNodeData = {
    ...node.data,
    title,
    description,
    label: title || node.data.label,
    inputs: inputs as unknown as WorkflowNodeData['inputs'],
    outputs: outputs as unknown as WorkflowNodeData['outputs'],
    prompt: prompt ?? node.data.prompt,
    template: template ?? node.data.template,
    code: code ?? node.data.code,
  }
  // 知识库检索节点：关联知识库（含后端 dataset_ids / retrieval_config 字段，便于直接持久化）
  if (node.type === 'knowledge_retrieval') {
    data.knowledgeBases = knowledgeBases ?? node.data.knowledgeBases ?? []
    data.dataset_ids = (knowledgeBases ?? []).map((k) => k.id)
    data.retrievalStrategy = retrievalStrategy ?? node.data.retrievalStrategy ?? 'hybrid'
    data.maxResults = maxResults ?? node.data.maxResults ?? 5
    data.minScore = minScore ?? node.data.minScore ?? 0.05
    data.retrieval_config = {
      strategy: data.retrievalStrategy,
      max_results: data.maxResults,
      min_score: data.minScore,
    }
  }
  // HTTP 请求节点：方法 / URL / HEADERS / PARAMS / BODY
  if (node.type === 'http_request') {
    data.method = method ?? 'GET'
    data.url = url ?? ''
    data.headers = headers ?? []
    data.params = params ?? []
    data.body = body ?? []
  }
  if (node.type === 'plugin') {
    data.pluginId = pluginId ?? ''
    data.pluginName = pluginName ?? ''
    data.pluginIcon = pluginIcon ?? ''
  }
  if (node.type === 'llm') {
    data.model_config = model_config
    data.model = model_config?.model ?? ''
  }
  nodes.value[idx] = { ...node, data }
  // shallowRef 只追踪 .value 替换，需整体赋值新数组才能触发节点重渲染
  nodes.value = [...nodes.value]
  configSaving.value = true
  await saveGraph(false)
  configSaving.value = false
  // 保存成功后关闭配置面板
  drawerVisible.value = false
  selectedNodeId.value = null
  Message.success('节点配置已保存')
}

/** 键盘 Delete 删除节点时触发：清理关联边、关闭配置抽屉 */
const handleNodeRemove = ({ node }: { node: { id: string } }) => {
  edges.value = edges.value.filter((e) => e.source !== node.id && e.target !== node.id)
  if (selectedNodeId.value === node.id) {
    drawerVisible.value = false
    selectedNodeId.value = null
  }
  scheduleSave()
}

// 兜底：选中节点被外部删除（如键盘 Delete）导致 selectedNode 变空时，自动关闭抽屉
watch(selectedNode, (val) => {
  if (!val && drawerVisible.value) {
    drawerVisible.value = false
    selectedNodeId.value = null
  }
})

/** 点击画布空白区域：关闭配置抽屉并取消节点选中 */
const handlePaneClick = () => {
  drawerVisible.value = false
  selectedNodeId.value = null
}

/** 连接两个节点：把 connect 事件产生的边加入 edges */
const handleConnect = (params: {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}) => {
  // 禁止自连
  if (params.source === params.target) {
    Message.warning('不能将节点连接到本身')
    return
  }
  // 避免重复连线
  const exists = edges.value.some(
    (e) => e.source === params.source && e.target === params.target,
  )
  if (exists) {
    Message.warning('这两个节点已有连接，无需重复添加')
    return
  }
  // 查找起止节点的类型
  const sourceNode = nodes.value.find((n) => n.id === params.source)
  const targetNode = nodes.value.find((n) => n.id === params.target)
  const edge = {
    id: crypto.randomUUID(),
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle ?? undefined,
    targetHandle: params.targetHandle ?? undefined,
    source_type: sourceNode?.type,
    target_type: targetNode?.type,
    animated: true,
    style: { strokeWidth: 2, stroke: '#9ca3af' },
  }
  // 走 vue-flow 内部 addEdges（与 v-model:edges 同步），避免手动 push 与 v-model 自动添加产生重复边/无类型边
  addEdges([edge])
  scheduleSave()
}

/** 边被删除时触发（vue-flow 已通过 v-model:edges 同步移除，这里仅触发保存） */
const handleEdgeRemove = () => {
  scheduleSave()
}

// ============================================================
// 节点库面板
// ============================================================
const libraryVisible = ref(false)

/** 画布拖拽放置：从节点库拖入新节点 */
const { screenToFlowCoordinate, addEdges } = useVueFlow()

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

/** 生成新节点数据：名称加 5 位随机后缀（下划线连接），避免同类型节点 title 重复触发校验报错；开始/结束节点全局唯一无需后缀 */
const genNewNodeData = (type: WorkflowNodeType): WorkflowNodeData => {
  const data = createDefaultNodeData(type)
  if (type !== 'start' && type !== 'end') {
    data.label = `${data.label}_${Math.random().toString(36).slice(2, 7)}`
  }
  return data
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  const type = e.dataTransfer?.getData('application/vueflow') as WorkflowNodeType
  if (!type) return
  const position = screenToFlowCoordinate({ x: e.clientX, y: e.clientY })
  const id = `node-${Date.now()}`
  nodes.value = [
    ...nodes.value,
    {
      id,
      type,
      position,
      data: genNewNodeData(type),
    },
  ]
  scheduleSave()
}

/** 点击节点库直接添加节点（默认位置） */
const handleAddNode = (type: WorkflowNodeType) => {
  // 开始 / 结束节点在整个工作流中只能存在一个
  if (type === 'start' || type === 'end') {
    const exists = nodes.value.some((n) => n.type === type)
    if (exists) {
      Message.warning(type === 'start' ? '工作流中只能存在一个开始节点' : '工作流中只能存在一个结束节点')
      return
    }
  }
  // 计算所有节点的平均位置作为新节点的默认位置
  let x = 0
  let y = 0
  if (nodes.value.length > 0) {
    const sumX = nodes.value.reduce((acc, n) => acc + (n.position?.x ?? 0), 0)
    const sumY = nodes.value.reduce((acc, n) => acc + (n.position?.y ?? 0), 0)
    x = sumX / nodes.value.length + 60
    y = sumY / nodes.value.length + 60
  }
  const id = crypto.randomUUID()
  nodes.value = [
    ...nodes.value,
    {
      id,
      type,
      position: { x, y },
      data: genNewNodeData(type),
    },
  ]
  scheduleSave()
}

// ============================================================
// 画布变化 → 自动保存（防抖）
// ============================================================
const { convertGraphToReq, handleUpdateDraftGraph } = useUpdateDraftGraph()
let saveTimer: ReturnType<typeof setTimeout> | null = null

const scheduleSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveGraph(false).catch((e) => {
      // 自动保存失败仅记录日志，不打断用户操作
      console.error('[autoSave] failed:', e)
    })
  }, 800)
}

/** 校验图数据：节点 id 与 title 均不能重复，返回错误信息（null 为通过） */
const validateGraph = (): string | null => {
  const idSet = new Set<string>()
  const titleSet = new Set<string>()
  for (const n of nodes.value) {
    if (idSet.has(n.id)) return `节点 id [${n.id}] 重复，请检查后重试`
    idSet.add(n.id)
    const title = (n.data?.title || n.data?.label || '').trim()
    if (title) {
      if (titleSet.has(title)) return `节点名称 [${title}] 重复，请修改后重试`
      titleSet.add(title)
    }
  }
  return null
}

const saveGraph = async (notify = true) => {
  // 保存前校验：节点 id / title 不能重复
  const errMsg = validateGraph()
  if (errMsg) {
    Message.error(errMsg)
    return
  }
  const req = convertGraphToReq(nodes.value, edges.value)
  await handleUpdateDraftGraph(workflowId.value, req, notify)
  // 刷新基础信息（更新时间）
  await loadWorkflow(workflowId.value)
}

// ============================================================
// 发布 / 取消发布
// ============================================================
const { loading: publishing, handlePublishWorkflow } = usePublishWorkflow()
const { loading: cancelling, handleCancelPublish: doCancelPublish } = useCancelPublishWorkflow()

const handlePublish = async () => {
  await handlePublishWorkflow(String(workflow.value.id))
  await loadWorkflow(workflowId.value)
}

const handleCancelPublish = async () => {
  await doCancelPublish(String(workflow.value.id))
  await loadWorkflow(workflowId.value)
}

// ============================================================
// 调试
// ============================================================
const { loading: debugging } = useDebugWorkflow()
const debugVisible = ref(false)

const handleDebug = async () => {
  // 调试前全量校验：结构/边/节点必填/变量
  const errors = validateWorkflow()
  if (errors.length) {
    Message.error({ content: errors[0]!, duration: 3000 })
    return
  }
  // 打开调试抽屉前立即保存草稿（跳过防抖），确保后端调试用的是最新图（含最新连线）
  await saveGraph(false).catch((e) => {
    console.error('[debug] save before debug failed:', e)
  })
  debugVisible.value = true
}

// 调试时更新画布节点状态
const handleDebugNodeStatus = (nodeId: string, status: string) => {
  const idx = nodes.value.findIndex((n) => n.id === nodeId)
  if (idx === -1) return
  const node = nodes.value[idx]
  nodes.value[idx] = {
    ...node,
    data: { ...node.data, debugStatus: status },
  }
  nodes.value = [...nodes.value]
}

// 调试完成：后端在调试成功后更新 is_debug_passed 等状态，刷新工作流基础信息
const handleDebugFinished = async () => {
  await loadWorkflow(workflowId.value)
}

// ============================================================
// 编辑工作流基础信息
// ============================================================
const { loading: updatingInfo, handleUpdateWorkflow } = useUpdateWorkflow()
const editModalVisible = ref(false)
const editForm = ref({ name: '', description: '' })

const openEditModal = () => {
  editForm.value = {
    name: workflow.value.name ?? '',
    description: workflow.value.description ?? '',
  }
  editModalVisible.value = true
}

const handleSaveEdit = async () => {
  if (!editForm.value.name.trim()) {
    Message.warning('工作流名称不能为空')
    return
  }
  await handleUpdateWorkflow(workflowId.value, {
    name: editForm.value.name,
    tool_call_name: workflow.value.tool_call_name ?? '',
    icon: workflow.value.icon ?? '',
    description: editForm.value.description,
  })
  editModalVisible.value = false
  await loadWorkflow(workflowId.value)
}

// ============================================================
// 自适应布局（Dagre）
// ============================================================
/** 调用 Dagre 重新计算所有节点位置并自适应画布 */
const handleAutoLayout = () => {
  if (!nodes.value.length) return
  const updated = applyAutoLayout(nodes.value, edges.value)
  nodes.value = updated
  // 布局完成后自适应缩放以完整展示
  setTimeout(() => {
    void fitView()
  }, 50)
  scheduleSave()
}

// ============================================================
// 缩放（底栏下拉控制）
// ============================================================
const { zoomTo, getViewport, fitView } = useVueFlow()
/** 缩放级别（百分比，25-200），实时同步画布 */
const zoomLevel = ref(50)

/** 缩放下拉选项 */
const zoomOptions = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '200%', value: 2 },
]

const handleZoomSelect = (val: number | string) => {
  const level = val as number
  void zoomTo(level)
  zoomLevel.value = Math.round(level * 100)
}

/** 视口变化时实时同步缩放比例显示 */
const handleViewportMove = () => {
  zoomLevel.value = Math.round(getViewport().zoom * 100)
}

// ============================================================
// 草稿历史：恢复到上一次自动保存的草稿
// ============================================================
const handleRestoreDraft = async () => {
  // 关闭节点配置抽屉，避免选中的旧节点数据残留
  drawerVisible.value = false
  selectedNodeId.value = null
  await loadGraph()
  await fitView()
  zoomLevel.value = Math.round(getViewport().zoom * 100)
  Message.success('已恢复到上一次自动保存的草稿')
}

// ============================================================
// 返回
// ============================================================
const handleBack = () => {
  if (window.history.state?.back) {
    router.back()
  } else {
    router.push({ name: ROUTE_NAME.PERSONAL_SPACE, params: { tab: 'workflows' } })
  }
}

// ============================================================
// 生命周期
// ============================================================
onMounted(async () => {
  await loadWorkflow(workflowId.value)
  await loadGraph()
  // 节点加载完成后调用 fitView 自适应画布
  await fitView()
  zoomLevel.value = Math.round(getViewport().zoom * 100)
})
</script>

<template>
  <div class="flex h-screen w-full flex-col bg-[#fafbfc]">
    <!-- ============== 顶部导航栏 ============== -->
    <header class="flex h-14 shrink-0 items-center justify-between border-b border-[#e5e6eb] bg-white px-4">
      <div class="flex items-center gap-4">
        <a-button type="text" size="large" shape="circle" @click="handleBack">
          <template #icon><icon-arrow-left :size="18" /></template>
        </a-button>
        <div class="flex items-center gap-2">
          <span class="text-[15px] font-medium text-[#1d2129]">{{ workflowName }}</span>
          <a-button type="text" size="mini" @click="openEditModal">
            <template #icon><icon-edit :size="14" /></template>
          </a-button>
          <span class="text-[12px] text-[#86909c]">{{ workflowDesc }}</span>
        </div>
        <!-- 草稿入口：仅历史icon可点击查看草稿，草稿标签与时间仅展示不可点 -->
        <div class="flex items-center gap-1.5">
          <a-button
            type="text"
            size="mini"
            :disabled="workflowStatus === 'published'"
            title="查看草稿历史"
            @click="workflowStatus !== 'published' && (draftHistoryVisible = true)"
          >
            <template #icon><icon-history :size="13" /></template>
          </a-button>
          <span class="text-[12px] text-[#86909c]">草稿</span>
          <span class="rounded bg-[#f2f3f5] px-2 py-0.5 text-[12px] text-[#86909c]">
            已自动保存 {{ savedTime }}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <a-button
          type="primary"
          size="large"
          :loading="publishing"
          :disabled="!workflow.is_debug_passed"
          @click="handlePublish"
        >
          <template #icon><icon-cloud-upload :size="16" /></template>
          更新发布
        </a-button>
        <a-button
          size="large"
          :loading="cancelling"
          :disabled="workflowStatus !== 'published'"
          @click="handleCancelPublish"
        >
          取消发布
        </a-button>
      </div>
    </header>

    <!-- ============== 画布区域 ============== -->
    <div class="relative flex-1 overflow-hidden">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        :node-types="nodeTypes"
        :fit-view-on-init="true"
        :min-zoom="0.25"
        :max-zoom="2"
        connection-mode="strict"
        class="h-full w-full"
        @node-click="handleNodeClick"
        @edge-click="handleEdgeClick"
        @dragover="handleDragOver"
        @drop="handleDrop"
        @node-drag-stop="scheduleSave"
        @connect="handleConnect"
        @edge-remove="handleEdgeRemove"
        @node-remove="handleNodeRemove"
        @pane-click="handlePaneClick"
        @nodes-change="scheduleSave"
        @edges-change="scheduleSave"
        @move="handleViewportMove"
      >
        <Background :gap="16" pattern-color="#e5e6eb" />

        <!-- 左上角节点库面板 -->
        <Panel v-if="libraryVisible" position="top-left" class="!p-0 !m-2">
          <NodeLibraryPanel @add="handleAddNode" />
        </Panel>

        <!-- 底部操作栏 -->
        <Panel
          position="bottom-center"
          class="!m-0 flex h-12 w-full items-center justify-center gap-3 border-t border-[#e5e6eb] bg-white"
        >
          <!-- 节点库开关：激活态蓝色背景白字 -->
          <a-button
            :type="libraryVisible ? 'primary' : 'default'"
            size="small"
            @click="libraryVisible = !libraryVisible"
          >
            <template #icon><icon-folder-add :size="14" /></template>
            节点
          </a-button>

          <div class="h-5 w-px bg-[#e5e6eb]" />

          <!-- 缩放下拉 -->
          <a-dropdown trigger="click" @select="handleZoomSelect">
            <a-button size="small">
              {{ zoomLevel }}%
              <template #icon><icon-down :size="12" /></template>
            </a-button>
            <template #content>
              <a-doption v-for="opt in zoomOptions" :key="String(opt.value)" :value="opt.value">
                {{ opt.label }}
              </a-doption>
            </template>
          </a-dropdown>

          <div class="h-5 w-px bg-[#e5e6eb]" />

          <!-- 自适应布局 -->
          <a-tooltip content="自适应布局" position="top">
            <a-button
              size="small"
              class="!border-[#e5e6eb] !bg-white !text-[#4e5969] hover:!bg-[#f2f3f5]"
              @click="handleAutoLayout"
            >
              <template #icon><icon-layout :size="14" /></template>
              自适应
            </a-button>
          </a-tooltip>

          <div class="h-5 w-px bg-[#e5e6eb]" />

          <a-button
            size="small"
            :loading="debugging"
            class="!border-[#e5e6eb] !bg-white !text-[#165dff] hover:!bg-[#e8f3ff]"
            @click="handleDebug"
          >
            <template #icon><icon-play :size="14" /></template>
            调试
          </a-button>
        </Panel>
      </VueFlow>

      <!-- ============== 节点配置面板（画布内右侧绝对定位） ============== -->
      <NodeConfigDrawer
        v-if="drawerVisible && selectedNode"
        :visible="drawerVisible"
        :node="selectedNode"
        :loading="configSaving"
        :reference-options="referenceOptions"
        @update-node="handleConfigSubmit"
        @close="handlePaneClick"
      />
    </div>

    <!-- 工作流调试抽屉 -->
    <DebugDrawer
      v-model:visible="debugVisible"
      :workflow-id="workflowId"
      :nodes="nodes"
      :edges="edges"
      @node-status="handleDebugNodeStatus"
      @finished="handleDebugFinished"
    />

    <!-- 编辑工作流基础信息弹窗 -->
    <a-modal
      v-model:visible="editModalVisible"
      title="编辑工作流"
      :ok-loading="updatingInfo"
      @ok="handleSaveEdit"
    >
      <a-form layout="vertical">
        <a-form-item field="name" label="工作流名称" required>
          <a-input v-model="editForm.name" placeholder="请输入工作流名称" :max-length="50" allow-clear />
        </a-form-item>
        <a-form-item field="description" label="描述">
          <a-textarea
            v-model="editForm.description"
            placeholder="请输入工作流描述"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            :max-length="200"
            allow-clear
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 草稿历史弹窗：查看/恢复上一次自动保存的草稿 -->
    <DraftHistoryModal
      v-model:visible="draftHistoryVisible"
      :workflow-id="workflowId"
      :saved-at="workflowUpdatedAt ?? 0"
      @restore="handleRestoreDraft"
    />
  </div>
</template>

<style scoped>
/* 选中边高亮：蓝色加粗 */
:deep(.vue-flow__edge.selected path) {
  stroke: #165dff !important;
  stroke-width: 3px !important;
}
</style>
