<script setup lang="ts">
/** 节点配置面板：固定标题 + 类型图标，编辑节点描述与输入/输出参数，通过 updateNode 事件回传数据 */
import { computed, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { NODE_META } from '../node-config'
import type {
  WorkflowNodeType,
  WorkflowNodeData,
  RetrievalStrategy,
  LinkedKnowledge,
  HttpParam,
} from '../types'
import { getDatasetsWithPage } from '@/services/dataset'
import CompactParamList from './CompactParamList.vue'
import KnowledgePickerModal from './KnowledgePickerModal.vue'
import PluginPickerModal from './PluginPickerModal.vue'
import ModelSettingsModal from '@/views/app-orchestration/detail/components/ModelSettingsModal.vue'
import type { ModelConfig } from '@/views/app-orchestration/detail/types'

/** 面板内部的字段编辑模型 */
interface InputField {
  name: string
  /** 变量类型：reference/string/int/float/boolean（开始/结束节点无 reference） */
  type: string
  description: string
  required: boolean
  /** 赋值方式：fixed 固定值 / ref 引用上游节点字段（仅开始/结束节点卡片式表单使用） */
  source: 'fixed' | 'ref'
  /** 固定值内容（string 为字符串，int/float 为数字，boolean 为布尔） */
  value: string | number | boolean
  /** 引用值（实际值格式：节点ID/字段名，防跨节点重名） */
  reference: string
}

/** 面板内部的输出字段编辑模型 */
interface OutputField {
  name: string
  type: string
  description: string
  required: boolean
  /** 结束节点紧凑行模型：固定值（string 为字符串，int/float 为数字，boolean 为布尔） */
  value?: string | number | boolean
  /** 结束节点紧凑行模型：引用值（实际值格式：节点ID/字段名） */
  reference?: string
  /** 引用时保留的原始变量类型（提交时还原） */
  refType?: string
}

/** 引用字段选项分组（前置节点） */
interface ReferenceGroup {
  /** 前置节点ID（用于拼接引用实际值） */
  nodeId: string
  /** 前置节点标题（用于分组展示） */
  nodeTitle: string
  /** 可引用字段 */
  fields: { name: string }[]
}

const props = withDefaults(
  defineProps<{
    /** 控制组件显示 */
    visible?: boolean
    /** 存储节点数据 */
    node?: Record<string, any>
    /** 更新状态 */
    loading?: boolean
    /** 可引用的上游节点字段分组（按连线计算） */
    referenceOptions?: ReferenceGroup[]
  }>(),
  {
    visible: false,
    node: () => ({}),
    loading: false,
    referenceOptions: () => [],
  },
)

/** 使用自定义事件处理复杂数据结构（不使用 v-model） */
const emit = defineEmits<{
  /** 节点数据更新（保存时触发） */
  (
    e: 'updateNode',
    payload: {
      id: string
      title: string
      description: string
      inputs: InputField[]
      outputs: OutputField[]
      prompt?: string
      template?: string
      code?: string
      knowledgeBases?: LinkedKnowledge[]
      retrievalStrategy?: RetrievalStrategy
      maxResults?: number
      minScore?: number
      method?: string
      url?: string
      headers?: HttpParam[]
      params?: HttpParam[]
      body?: HttpParam[]
      pluginId?: string
      pluginName?: string
      pluginIcon?: string
      model_config?: WorkflowNodeData['model_config']
    },
  ): void
  /** 关闭面板 */
  (e: 'close'): void
}>()

/** 深度拷贝（避免直接修改原始数据） */
const cloneDeep = <T>(val: T): T => JSON.parse(JSON.stringify(val))

/** Python 代码节点固定函数模板 */
const DEFAULT_PYTHON_CODE = `def main(params):
    return {
    }
`

/** 表单模型 */
const form = ref({
  id: '',
  type: '' as WorkflowNodeType | '',
  title: '',
  description: '',
  inputs: [] as InputField[],
  outputs: [] as OutputField[],
  /** 提示词（大语言模型节点） */
  prompt: '',
  /** 转换模板（模板转换节点） */
  template: '',
  /** 代码（代码执行节点） */
  code: '',
  /** 关联知识库（知识库检索节点） */
  knowledgeBases: [] as LinkedKnowledge[],
  /** 检索策略（知识库检索节点） */
  retrievalStrategy: 'hybrid' as RetrievalStrategy,
  /** 最大召回数量（知识库检索节点） */
  maxResults: 5,
  /** 最小匹配度（知识库检索节点） */
  minScore: 0.05,
  /** 请求方法（HTTP 请求节点） */
  method: 'GET',
  /** 请求 URL（HTTP 请求节点） */
  url: '',
  /** HEADERS 参数（HTTP 请求节点） */
  headers: [] as HttpParam[],
  /** PARAMS 参数（HTTP 请求节点） */
  params: [] as HttpParam[],
  /** BODY 参数（HTTP 请求节点） */
  body: [] as HttpParam[],
  /** 绑定插件 ID（扩展插件节点） */
  pluginId: '',
  /** 绑定插件名称（扩展插件节点，卡片展示用） */
  pluginName: '',
  /** 绑定插件图标（扩展插件节点，卡片展示用） */
  pluginIcon: '',
  /** 模型配置（大语言模型节点，与应用编排 ModelConfig 对齐） */
  model_config: {
    model: '',
    provider: '',
    temperature: 0.7,
    topP: 1,
    presencePenalty: 0,
    frequencyPenalty: 0,
    contextRounds: 10,
    maxReplyLength: 2048,
  } as ModelConfig,
})

/** 模型设置弹窗显示状态 */
const modelModalVisible = ref(false)

/** 当前节点元数据（图标、颜色） */
const meta = computed(() =>
  form.value.type ? NODE_META[form.value.type as WorkflowNodeType] : null,
)

/** 参数名称校验错误（与 inputs / outputs 索引对齐） */
const inputErrors = ref<string[]>([])
const outputErrors = ref<string[]>([])

/** 变量类型选项（开始/结束节点卡片式表单使用，对齐后端小写契约 string/int/float/boolean） */
const typeOptions = [
  { label: 'STRING', value: 'string' },
  { label: 'INT', value: 'int' },
  { label: 'FLOAT', value: 'float' },
  { label: 'BOOLEAN', value: 'boolean' },
]

/** 紧凑输入行的类型选项：引用 + 4 种字面量类型（对齐 VariableType） */
const inputTypeOptions = [
  { label: '引用', value: 'reference' },
  { label: 'STRING', value: 'string' },
  { label: 'INT', value: 'int' },
  { label: 'FLOAT', value: 'float' },
  { label: 'BOOLEAN', value: 'boolean' },
]

/** 各字面量类型的默认值（VariableType.STRING: "", INT: 0, FLOAT: 0, BOOLEAN: false） */
const getDefaultValue = (type: string): string | number | boolean => {
  if (type === 'int' || type === 'float') return 0
  if (type === 'boolean') return false
  return ''
}

/**
 * 归一化字段值：后端嵌套 {type:'literal',content:xxx} / {type:'ref',content:{...}} 格式提取为原始字面量
 * 防止对象直接写入 value 导致 CompactParamList 显示 [object Object]
 */
const normalizeFieldValue = (val: unknown): string | number | boolean => {
  let cur = val
  // 递归拍平 content 嵌套（含 content 包 content 的历史脏数据），最多 5 层
  for (let i = 0; i < 5; i++) {
    if (cur && typeof cur === 'object' && 'content' in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>).content
      continue
    }
    break
  }
  if (cur === null || cur === undefined || cur === '' || typeof cur === 'object') return ''
  return cur as string | number | boolean
}

/** 紧凑模式类型切换：选择其他类型时自动填入对应类型默认值 */
const handleInputTypeChange = (field: InputField, type: unknown) => {
  const t = String(type)
  if (t === 'reference') {
    field.value = ''
  } else {
    field.reference = ''
    field.value = getDefaultValue(t)
  }
}

/** 给字段写入值（兼容输入框/数字框/开关的多种值类型） */
const setFieldValue = (field: InputField, val: unknown) => {
  field.value = val as string | number | boolean
}

/** 控件展示值转换 */
const asBool = (field: InputField) => Boolean(field.value)
const asNum = (field: InputField) => Number(field.value || 0)
const asStr = (field: InputField) => String(field.value ?? '')

/** 是否紧凑行式输入样式：除开始、结束节点外 */
const isCompactInput = computed(
  () => form.value.type !== 'start' && form.value.type !== 'end',
)

/** 输出固定节点：不可添加/删除、名称不可编辑（LLM 固定 output，知识库检索固定 combine_documents） */
const isFixedOutputNode = computed(
  () =>
    form.value.type === 'template' ||
    form.value.type === 'http_request' ||
    form.value.type === 'plugin' ||
    form.value.type === 'knowledge_retrieval' ||
    form.value.type === 'llm',
)

/** 输出类型锁定节点：类型也不可切换（LLM/知识库检索固定单输出但类型可变） */
const isOutputTypeFixed = computed(
  () =>
    form.value.type === 'template' ||
    form.value.type === 'http_request' ||
    form.value.type === 'plugin',
)

/** 结束节点输出参数的紧凑行模型（结构与 HttpParam 一致，直接复用 CompactParamList） */
const compactOutputs = computed(() => form.value.outputs as unknown as HttpParam[])

/** 引用字段下拉数据（分组结构：isGroup + options，标签为 节点标题/字段名） */
const referenceSelectOptions = computed(() =>
  props.referenceOptions.map((g) => ({
    isGroup: true,
    label: g.nodeTitle,
    options: g.fields.map((f) => ({
      label: `${g.nodeTitle}/${f.name}`,
      value: `${g.nodeId}/${f.name}`,
    })),
  })),
)

/** 弹层挂载到触发元素父节点：抽屉内部滚动时弹层跟随选择器一起移动，避免悬浮错位 */
const getPopupContainer = (node: HTMLElement) => node.parentElement ?? document.body

// ============================================================
// 知识库检索节点：已关联知识库列表 + 选择弹窗
// ============================================================
/** 知识库选项（含图标，用于已关联列表展示与名称补全） */
const datasetOptions = ref<{ id: string; name: string; icon: string }[]>([])
/** 知识库列表加载状态 */
const datasetLoading = ref(false)
/** 选择引用知识库弹窗显示状态 */
const pickerVisible = ref(false)

/** 加载知识库列表（打开知识库检索节点时调用，后端限制每页最多 50 条，用于图标展示/名称补全） */
const loadDatasets = async () => {
  if (datasetLoading.value || datasetOptions.value.length) return
  try {
    datasetLoading.value = true
    const resp = await getDatasetsWithPage(1, 50)
    datasetOptions.value = (resp.data.list ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      icon: d.icon ?? '',
    }))
    // 已选知识库名称缺失（后端仅回传 ID）时，用最新列表补全名称
    form.value.knowledgeBases = form.value.knowledgeBases.map((k) => ({
      id: k.id,
      name: datasetOptions.value.find((d) => d.id === k.id)?.name ?? k.name,
      icon: datasetOptions.value.find((d) => d.id === k.id)?.icon ?? k.icon ?? '',
    }))
  } catch (e) {
    console.error('[getDatasetsWithPage] failed:', e)
  } finally {
    datasetLoading.value = false
  }
}

/** 打开知识库选择弹窗（列表数据由弹窗内部自行查询） */
const openKnowledgePicker = () => {
  pickerVisible.value = true
}

/** 弹窗确认：整体替换为选中的知识库列表 */
const handleKnowledgeConfirm = (list: LinkedKnowledge[]) => {
  form.value.knowledgeBases = list
}

/** 移除单个已关联知识库 */
const removeKnowledge = (id: string) => {
  form.value.knowledgeBases = form.value.knowledgeBases.filter((k) => k.id !== id)
}

/** 取已关联知识库的图标 URL（未加载到则为空） */
const getKnowledgeIcon = (id: string) =>
  datasetOptions.value.find((d) => d.id === id)?.icon ?? ''

// ============================================================
// 扩展插件节点：绑定插件弹窗
// ============================================================
/** 选择插件弹窗显示状态 */
const pluginPickerVisible = ref(false)

/** 打开插件选择弹窗 */
const openPluginPicker = () => {
  pluginPickerVisible.value = true
}

/** 弹窗确认：绑定选中的插件 */
const handlePluginConfirm = (plugin: { pluginId: string; name: string; icon: string }) => {
  form.value.pluginId = plugin.pluginId
  form.value.pluginName = plugin.name
  form.value.pluginIcon = plugin.icon ?? ''
}

/** 移除已绑定插件 */
const removePlugin = () => {
  form.value.pluginId = ''
  form.value.pluginName = ''
  form.value.pluginIcon = ''
}

/** 最大召回数量（1-20 整数） */
const maxResultsProps = { min: 1, max: 20, step: 1 }
/** 最小匹配度（0-1，步长 0.01） */
const minScoreProps = { min: 0, max: 1, step: 0.01 }

/** 匹配度滑块 tooltip 保留两位小数 */
const formatScoreTooltip = (val: number) => Number(val).toFixed(2)

/** 监听选中节点变化：将节点数据映射到表单模型，组件加载时立即执行 */
watch(
  () => props.node,
  (val) => {
    // 空对象/同一节点（画布交互导致数组重建）时不重置表单，保留编辑中的数据
    if (!val?.id || val.id === form.value.id) return
    // 基础属性直接映射，数据属性从 node.data 获取
    form.value.id = val.id
    form.value.type = val.type
    form.value.title = val.data?.title ?? val.data?.label ?? ''
    form.value.description = val.data?.description ?? ''
    // 节点专属配置：提示词 / 转换模板 / 代码（Python 空代码使用固定函数模板）
    form.value.prompt = val.data?.prompt ?? ''
    form.value.template = val.data?.template ?? ''
    form.value.code = val.data?.code ?? (val.type === 'python' ? DEFAULT_PYTHON_CODE : '')
    // 大语言模型节点：模型配置（与应用编排 ModelConfig 对齐，缺省字段补默认值）
    const mc = val.data?.model_config ?? {}
    form.value.model_config = {
      model: mc.model ?? mc.model_id ?? '',
      provider: mc.provider ?? '',
      temperature: mc.temperature ?? 0.7,
      topP: mc.topP ?? 1,
      presencePenalty: mc.presencePenalty ?? 0,
      frequencyPenalty: mc.frequencyPenalty ?? 0,
      contextRounds: mc.contextRounds ?? 10,
      maxReplyLength: mc.maxReplyLength ?? mc.max_tokens ?? 2048,
    }
    // 知识库检索节点：关联知识库 / 检索策略 / 召回参数（兼容后端 retrieval_config 嵌套结构）
    form.value.knowledgeBases = cloneDeep(val.data?.knowledgeBases ?? [])
    form.value.retrievalStrategy =
      val.data?.retrievalStrategy ?? val.data?.retrieval_config?.strategy ?? 'hybrid'
    form.value.maxResults =
      val.data?.maxResults ?? val.data?.retrieval_config?.max_results ?? 5
    form.value.minScore =
      val.data?.minScore ?? val.data?.retrieval_config?.min_score ?? 0.05
    if (val.type === 'knowledge_retrieval') void loadDatasets()
    // HTTP 请求节点：方法 / URL / 三组参数
    form.value.method = val.data?.method ?? 'GET'
    form.value.url = val.data?.url ?? ''
    form.value.headers = (val.data?.headers ?? []).map((f: Record<string, any>) =>
      normalizeHttpParam(f),
    )
    form.value.params = (val.data?.params ?? []).map((f: Record<string, any>) =>
      normalizeHttpParam(f),
    )
    form.value.body = (val.data?.body ?? []).map((f: Record<string, any>) =>
      normalizeHttpParam(f),
    )
    // 扩展插件节点：绑定插件信息
    form.value.pluginId = val.data?.pluginId ?? ''
    form.value.pluginName = val.data?.pluginName ?? ''
    form.value.pluginIcon = val.data?.pluginIcon ?? ''
    // 输入参数深度拷贝后赋值（开始/结束节点保留卡片式模型；其余节点为紧凑行模型）
    const compact = val.type !== 'start' && val.type !== 'end'
    form.value.inputs = cloneDeep(val.data?.inputs ?? []).map((f: Record<string, any>) => {
      const rawType = String(f.type ?? 'string').toLowerCase()
      if (compact) {
        // 紧凑模式：有引用值即为 reference；旧数据 Number 归为 int
        const type = f.reference
          ? 'reference'
          : rawType === 'number'
            ? 'int'
            : rawType
        return {
          name: f.name ?? '',
          type,
          description: f.description ?? '',
          required: f.required ?? true,
          source: 'fixed' as const,
          value: normalizeFieldValue(f.value) || getDefaultValue(type),
          reference: f.reference ?? '',
        }
      }
      return {
        name: f.name ?? '',
        // 旧草稿 number 归为 int，与类型选项 string/int/float/boolean 对齐
        type: rawType === 'number' ? 'int' : rawType,
        description: f.description ?? '',
        required: f.required ?? true,
        source: f.reference ? 'ref' : 'fixed',
        value: typeof f.value === 'string' ? f.value : '',
        reference: f.reference ?? '',
      }
    })
    // 输出参数深度拷贝后赋值（所有非开始节点均为紧凑行模型，支持引用值）
    form.value.outputs = cloneDeep(val.data?.outputs ?? []).map((f: Record<string, any>) => {
      // 旧草稿 number 归为 int，与类型选项 string/int/float/boolean 对齐
      const rawType = String(f.type ?? 'string').toLowerCase()
      const normType = rawType === 'number' ? 'int' : rawType
      // 紧凑行模型：有引用值即为 reference，原始类型存 refType 供提交还原
      const type = f.reference ? 'reference' : normType
      return {
        name: f.name ?? '',
        type,
        description: f.description ?? '',
        required: f.required ?? false,
        value: normalizeFieldValue(f.value) || getDefaultValue(type),
        reference: f.reference ?? '',
        refType: normType,
      }
    })
    inputErrors.value = []
    outputErrors.value = []
  },
  { immediate: true },
)

/** 添加输入字段：向表单 inputs 数组添加新字段（紧凑节点默认 string 类型空值） */
const addInputField = () => {
  form.value.inputs.push({
    name: '',
    type: isCompactInput.value ? 'string' : 'string',
    description: '',
    required: true,
    source: 'fixed',
    value: '',
    reference: '',
  })
  Message.success('新增输入字段成功')
}

/** 删除指定索引的输入字段（可选链保证空值安全） */
const removeInputField = (idx: number) => {
  form.value.inputs?.splice(idx, 1)
}

// ============================================================
// HTTP 请求节点：HEADERS / PARAMS / BODY 参数管理
// ============================================================
/** 新建空的 HTTP 参数（默认 string 类型空值） */
const createHttpParam = (): HttpParam => ({
  name: '',
  type: 'string',
  value: '',
  reference: '',
})

/** 后端原始参数归一化为 HttpParam（兼容旧的字符串值与 number 类型） */
const normalizeHttpParam = (f: Record<string, any>): HttpParam => {
  const rawType = String(f.type ?? 'string').toLowerCase()
  const type = f.reference
    ? 'reference'
    : rawType === 'number'
      ? 'int'
      : rawType
  return {
    name: f.name ?? '',
    type,
    value:
      f.value !== undefined && f.value !== null && f.value !== ''
        ? f.value
        : type === 'int' || type === 'float'
          ? 0
          : type === 'boolean'
            ? false
            : '',
    reference: f.reference ?? '',
  }
}

/** 添加指定分组的 HTTP 参数 */
const addHttpParam = (group: 'headers' | 'params' | 'body') => {
  form.value[group].push(createHttpParam())
}

/** 删除指定分组、指定索引的 HTTP 参数（可选链保证空值安全） */
const removeHttpParam = (group: 'headers' | 'params' | 'body', idx: number) => {
  form.value[group]?.splice(idx, 1)
}

/** HTTP 方法选项 */
const httpMethodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].map(
  (m) => ({ label: m, value: m }),
)

/** 添加输出字段（所有非开始节点均为紧凑行模型：默认 string 类型空值） */
const addOutputField = () => {
  form.value.outputs.push({
    name: '',
    type: 'string',
    description: '',
    required: false,
    value: '',
    reference: '',
    refType: 'string',
  })
  Message.success('新增输出字段成功')
}

/** 删除指定索引的输出字段（可选链保证空值安全） */
const removeOutputField = (idx: number) => {
  form.value.outputs?.splice(idx, 1)
}

/** 校验表单：输入/输出参数名称必填，返回是否存在错误 */
const validateForm = () => {
  inputErrors.value = form.value.inputs.map((f) => (f.name.trim() ? '' : '参数名称不能为空'))
  outputErrors.value = form.value.outputs.map((f) => (f.name.trim() ? '' : '参数名称不能为空'))
  const nameValid = inputErrors.value.every((e) => !e) && outputErrors.value.every((e) => !e)
  // HTTP 节点必须填写请求地址；HEADERS/PARAMS/BODY 中空名称行提示后移除
  if (form.value.type === 'http_request') {
    if (!form.value.url.trim()) {
      Message.warning('请输入请求 URL')
      return false
    }
  }
  return nameValid
}

/** 提交表单：存在错误则直接返回，否则深度拷贝数据并触发 updateNode 事件 */
const handleSubmit = () => {
  if (!validateForm()) return
  // 按类型清理：引用类型只保留 reference，其他类型只保留 value；保留原始类型到 refType 供序列化还原
  // 结束节点没有输入参数，强制置空防止脏数据
  const inputs =
    form.value.type === 'end'
      ? []
      : cloneDeep(form.value.inputs).map((f) => {
          if (f.type === 'reference') {
            const { refType, ...rest } = f as any
            return { ...rest, type: refType ?? 'string', value: '' }
          }
          return { ...f, reference: '' }
        })
  emit('updateNode', {
    id: form.value.id,
    title: form.value.title,
    description: form.value.description,
    inputs,
    // 开始节点没有输出参数，强制置空防止脏数据；
    // 所有非开始节点均为紧凑行模型，按类型清理（引用保留 reference 并还原原始类型，其他类型清空 reference）
    outputs:
      form.value.type === 'start'
        ? []
        : cloneDeep(form.value.outputs).map((f) => {
            if (f.type === 'reference') {
              const { refType, ...rest } = f as any
              return { ...rest, type: refType ?? 'string', value: '' }
            }
            return { ...f, reference: '' }
          }),
    prompt: form.value.prompt,
    template: form.value.template,
    code: form.value.code,
    knowledgeBases: cloneDeep(form.value.knowledgeBases),
    retrievalStrategy: form.value.retrievalStrategy,
    maxResults: form.value.maxResults,
    minScore: form.value.minScore,
    method: form.value.method,
    url: form.value.url,
    // 按类型清理：引用类型只保留 reference，其他类型只保留 value；丢弃参数名为空的行
    headers: cloneDeep(form.value.headers)
      .filter((f) => f.name.trim())
      .map((f) => {
        if (f.type === 'reference') {
          const { refType, ...rest } = f as any
          return { ...rest, type: refType ?? 'string', value: '' }
        }
        return { ...f, reference: '' }
      }),
    params: cloneDeep(form.value.params)
      .filter((f) => f.name.trim())
      .map((f) => {
        if (f.type === 'reference') {
          const { refType, ...rest } = f as any
          return { ...rest, type: refType ?? 'string', value: '' }
        }
        return { ...f, reference: '' }
      }),
    body: cloneDeep(form.value.body)
      .filter((f) => f.name.trim())
      .map((f) => {
        if (f.type === 'reference') {
          const { refType, ...rest } = f as any
          return { ...rest, type: refType ?? 'string', value: '' }
        }
        return { ...f, reference: '' }
      }),
    pluginId: form.value.pluginId,
    pluginName: form.value.pluginName,
    pluginIcon: form.value.pluginIcon,
    model_config: form.value.model_config,
  })
}
</script>

<template>
  <div
    class="absolute right-0 top-0 z-50 flex h-full w-[480px] flex-col border-l border-[#e5e6eb] bg-white"
  >
    <!-- 顶部标题区：类型图标 + 可编辑标题 + 关闭按钮 -->
    <div class="flex items-center gap-2 border-b border-[#f2f3f5] px-4 py-3">
      <div
        v-if="meta"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
        :style="{ backgroundColor: meta.color }"
      >
        <component :is="meta.icon" :size="15" />
      </div>
      <a-input
        v-model="form.title"
        :placeholder="'请输入节点名称'"
        size="medium"
        class="editable-title !flex-1 !border !border-transparent !bg-transparent !px-1 !text-[15px] !font-semibold hover:!border-[#c9cdd4] focus:!border-[#165dff]"
      />
      <a-button type="text" shape="circle" @click="emit('close')">
        <template #icon><icon-close :size="16" /></template>
      </a-button>
    </div>

    <!-- 内容区：纵向滚动、横向裁切，滚动条隐藏 -->
    <div
      class="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <!-- 描述信息区：自动调整高度(3-5行) -->
      <a-textarea
        v-model="form.description"
        :auto-size="{ minRows: 3, maxRows: 5 }"
        placeholder="输入描述..."
      />

      <!-- ============== 扩展插件节点：绑定插件 ============== -->
      <template v-if="form.type === 'plugin'">
        <div class="mb-2 mt-4 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-[13px] font-medium text-[#1d2129]">绑定插件</span>
            <a-tooltip content="插件能够让工作流调用外部API，例如搜索信息、浏览网页、生成图片等，扩展工作流的能力和使用场景。">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-button v-if="!form.pluginId" type="text" size="mini" @click="openPluginPicker">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>
        <!-- 已绑定插件卡片 -->
        <div v-if="form.pluginId" class="flex items-center gap-2 rounded-lg border border-[#e5e6eb] bg-[#f7f8fa] p-2.5">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img v-if="form.pluginIcon" :src="form.pluginIcon" :alt="form.pluginName" class="h-full w-full object-cover" />
            <icon-apps v-else :size="16" class="text-[#86909c]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-[13px] font-medium text-[#1d2129]">{{ form.pluginName }}</div>
            <div class="truncate text-[12px] text-[#86909c]">{{ form.pluginId }}</div>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <a-button type="text" size="mini" @click="openPluginPicker">更换</a-button>
            <a-button type="text" size="mini" status="danger" @click="removePlugin">
              <template #icon><icon-delete :size="13" /></template>
            </a-button>
          </div>
        </div>
        <!-- 未绑定时：说明文字 + 空状态占位 -->
        <div v-else class="rounded-lg border border-dashed border-[#e5e6eb] px-3 py-4 text-center">
          <div class="mb-1 text-[12px] text-[#86909c]">插件能够让工作流调用外部API，扩展能力</div>
          <a-button type="outline" size="mini" @click="openPluginPicker">
            <template #icon><icon-plus :size="12" /></template>
            点击绑定插件
          </a-button>
        </div>
      </template>

      <!-- ============== HTTP 请求节点：基本信息 / HEADERS / PARAMS / BODY ============== -->
      <template v-if="form.type === 'http_request'">
        <!-- 基本信息：请求方法 + URL -->
        <div class="mb-2 mt-4 flex items-center gap-1">
          <span class="text-[13px] font-medium text-[#1d2129]">基本信息</span>
          <a-tooltip content="配置请求方法与目标地址，URL 中可用 {{变量名}} 引用上游参数">
            <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
          </a-tooltip>
        </div>
        <div class="mb-2 flex items-center gap-2">
          <div class="w-28 shrink-0">
            <a-select
              v-model="form.method"
              size="small"
              :options="httpMethodOptions"
              class="w-full"
              :get-popup-container="getPopupContainer"
            />
          </div>
          <a-input
            v-model="form.url"
            size="small"
            class="min-w-0 flex-1"
            placeholder="https://example.com/api"
          />
        </div>

        <!-- HEADERS 参数 -->
        <div class="mb-1 mt-4 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-[13px] font-medium text-[#1d2129]">HEADERS参数</span>
            <a-tooltip content="HTTP 请求头，如 Authorization">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-button type="text" size="mini" @click="addHttpParam('headers')">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>
        <CompactParamList
          v-if="form.headers.length"
          :fields="form.headers"
          :show-header="false"
          :reference-options="referenceOptions"
          @remove="(idx) => removeHttpParam('headers', idx)"
        />
        <div v-else class="rounded border border-dashed border-[#e5e6eb] px-3 py-3 text-center text-[12px] text-[#c9cdd4]">
          暂无 HEADERS 参数，点击右上角 + 添加
        </div>

        <!-- PARAMS 参数 -->
        <div class="mb-1 mt-4 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-[13px] font-medium text-[#1d2129]">PARAMS参数</span>
            <a-tooltip content="URL Query 查询参数，将自动拼接在请求地址后">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-button type="text" size="mini" @click="addHttpParam('params')">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>
        <CompactParamList
          v-if="form.params.length"
          :fields="form.params"
          :show-header="false"
          :reference-options="referenceOptions"
          @remove="(idx) => removeHttpParam('params', idx)"
        />
        <div v-else class="rounded border border-dashed border-[#e5e6eb] px-3 py-3 text-center text-[12px] text-[#c9cdd4]">
          暂无 PARAMS 参数，点击右上角 + 添加
        </div>

        <!-- BODY 参数 -->
        <div class="mb-1 mt-4 flex items-center justify-between">
          <div class="flex items-center gap-1">
            <span class="text-[13px] font-medium text-[#1d2129]">BODY参数</span>
            <a-tooltip content="请求体参数，通常用于 POST / PUT 请求">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-button type="text" size="mini" @click="addHttpParam('body')">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>
        <CompactParamList
          v-if="form.body.length"
          :fields="form.body"
          :show-header="false"
          :reference-options="referenceOptions"
          @remove="(idx) => removeHttpParam('body', idx)"
        />
        <div v-else class="rounded border border-dashed border-[#e5e6eb] px-3 py-3 text-center text-[12px] text-[#c9cdd4]">
          暂无 BODY 参数，点击右上角 + 添加
        </div>
      </template>

      <!-- 输入参数区（HTTP 节点使用专属的基本信息+参数组；结束节点无输入参数，均不展示） -->
      <template v-if="form.type !== 'http_request' && form.type !== 'end'">
      <!-- 输入参数区：头部包含标题和添加按钮（知识库检索节点输入固定为 query，不可添加） -->
      <div class="mb-2 mt-4 flex items-center justify-between">
        <span class="text-[13px] font-medium text-[#1d2129]">输入参数</span>
        <a-button v-if="form.type !== 'knowledge_retrieval'" type="text" size="mini" @click="addInputField">
          <template #icon><icon-plus :size="12" /></template>
        </a-button>
      </div>

      <!-- 输入参数列表 -->
      <template v-if="form.inputs.length">
        <!-- ============== 紧凑行式：除开始/结束节点（参数名 | 类型 | 值） ============== -->
        <template v-if="isCompactInput">
          <!-- 列标题 -->
          <div class="mb-1 flex items-center gap-2 px-0.5 text-[12px] text-[#86909c]">
            <span class="w-28 shrink-0">参数名</span>
            <span class="w-28 shrink-0">类型</span>
            <span class="min-w-0 flex-1">值</span>
            <span class="w-6 shrink-0"></span>
          </div>
          <div
            v-for="(field, idx) in form.inputs"
            :key="`in-${idx}`"
            class="mb-2 flex items-center gap-2"
          >
            <!-- 参数名（可修改，必填；知识库检索节点固定 query 不可编辑） -->
            <div class="flex w-28 shrink-0 items-center gap-0.5">
              <a-input
                v-model="field.name"
                size="small"
                class="min-w-0 flex-1"
                placeholder="参数名"
                :error="!!inputErrors[idx]"
                :disabled="form.type === 'knowledge_retrieval'"
              />
              <span class="shrink-0 text-[#f53f3f]">*</span>
            </div>

            <!-- 类型下拉：引用 / STRING / INT / FLOAT / BOOLEAN（知识库检索节点固定 string 不可切换） -->
            <div class="w-28 shrink-0">
              <a-select
                v-model="field.type"
                size="small"
                :options="inputTypeOptions"
                class="w-full"
                :disabled="form.type === 'knowledge_retrieval'"
                :get-popup-container="getPopupContainer"
                @change="(val) => handleInputTypeChange(field, val)"
              />
            </div>

            <!-- 值：引用时选择前序节点输出；其他类型按默认值渲染对应控件 -->
            <div class="min-w-0 flex-1">
              <a-select
                v-if="field.type === 'reference'"
                v-model="field.reference"
                size="small"
                class="w-full"
                placeholder="请选择引用字段"
                allow-clear
                :options="referenceSelectOptions"
                :get-popup-container="getPopupContainer"
              >
                <template #empty>暂无可引用字段，请先连接前置节点</template>
              </a-select>
              <a-switch
                v-else-if="field.type === 'boolean'"
                :model-value="asBool(field)"
                size="small"
                @update:model-value="(val) => setFieldValue(field, val)"
              />
              <a-input-number
                v-else-if="field.type === 'int'"
                :model-value="asNum(field)"
                size="small"
                :precision="0"
                class="w-full"
                @update:model-value="(val) => setFieldValue(field, val)"
              />
              <a-input-number
                v-else-if="field.type === 'float'"
                :model-value="asNum(field)"
                size="small"
                :precision="2"
                :step="0.1"
                class="w-full"
                @update:model-value="(val) => setFieldValue(field, val)"
              />
              <a-input
                v-else
                :model-value="asStr(field)"
                size="small"
                class="w-full"
                placeholder="请输入参数值"
                allow-clear
                @update:model-value="(val) => setFieldValue(field, val)"
              />
            </div>

            <!-- 删除（知识库检索节点输入固定不可删除） -->
            <a-button v-if="form.type !== 'knowledge_retrieval'" type="text" size="mini" class="w-6 shrink-0" @click="removeInputField(idx)">
              <template #icon><icon-minus-circle :size="15" class="text-[#86909c]" /></template>
            </a-button>
            <div v-else class="w-6 shrink-0"></div>
          </div>
        </template>

        <!-- ============== 卡片式：开始/结束节点 ============== -->
        <template v-else>
        <div
          v-for="(field, idx) in form.inputs"
          :key="`in-${idx}`"
          class="mb-3 rounded border border-[#e5e6eb] p-3"
        >
          <!-- 变量标题（可删除） -->
          <div class="mb-2 flex items-center justify-between">
            <span class="text-[13px] font-medium text-[#1d2129]">
              {{ field.name || `参数 ${idx + 1}` }}
            </span>
            <a-button type="text" size="mini" @click="removeInputField(idx)">
              <template #icon><icon-close :size="12" /></template>
            </a-button>
          </div>

          <!-- 参数名称输入 -->
          <div class="mb-2 flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">
              参数名称<span class="text-[#f53f3f]">*</span>
            </span>
            <a-input
              v-model="field.name"
              size="small"
              placeholder="请输入参数名称"
              :error="!!inputErrors[idx]"
            />
          </div>

          <!-- 类型选择器(string/int/float/boolean) -->
          <div class="mb-2 flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">
              变量类型<span class="text-[#f53f3f]">*</span>
            </span>
            <a-select
              v-model="field.type"
              size="small"
              :options="typeOptions"
              class="flex-1"
              :get-popup-container="getPopupContainer"
            />
          </div>

          <!-- 描述文本域 -->
          <div class="mb-2 flex items-start gap-2">
            <span class="w-16 shrink-0 pt-1 text-[12px] text-[#4e5969]">
              参数描述<span class="text-[#f53f3f]">*</span>
            </span>
            <a-textarea
              v-model="field.description"
              size="small"
              :auto-size="{ minRows: 1, maxRows: 3 }"
              placeholder="请输入参数描述"
            />
          </div>

          <!-- 赋值方式：固定值 / 引用（开始节点为流程入参，不支持引用上游） -->
          <div v-if="form.type !== 'start'" class="mb-2 flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">赋值方式</span>
            <a-radio-group v-model="field.source" type="button" size="small">
              <a-radio value="fixed">固定值</a-radio>
              <a-radio value="ref">引用</a-radio>
            </a-radio-group>
          </div>

          <!-- 引用值：选择上游节点字段（开始节点取入参，普通节点取输出） -->
          <div v-if="form.type !== 'start' && field.source === 'ref'" class="mb-2 flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">引用值</span>
            <a-select
              v-model="field.reference"
              size="small"
              class="flex-1"
              placeholder="请选择引用字段"
              allow-clear
              :options="referenceSelectOptions"
              :get-popup-container="getPopupContainer"
            >
              <template #empty>暂无可引用字段，请先连接前置节点</template>
            </a-select>
          </div>

          <!-- 固定值 -->
          <div v-if="form.type !== 'start' && field.source === 'fixed'" class="mb-2 flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">参数值</span>
            <a-input
              :model-value="asStr(field)"
              size="small"
              placeholder="请输入固定值"
              allow-clear
              @update:model-value="(val) => setFieldValue(field, val)"
            />
          </div>

          <!-- 必填开关 -->
          <div class="flex items-center gap-2">
            <span class="w-16 shrink-0 text-[12px] text-[#4e5969]">
              是否必填<span class="text-[#f53f3f]">*</span>
            </span>
            <a-switch v-model="field.required" size="small" />
          </div>
        </div>
        </template>
      </template>

      <!-- 无数据时显示提示 -->
      <div
        v-else
        class="rounded border border-dashed border-[#e5e6eb] px-3 py-4 text-center text-[12px] text-[#c9cdd4]"
      >
        暂未添加输入参数
      </div>
      </template>

      <!-- 知识库检索节点：关联知识库 / 检索策略 / 召回参数 -->
      <template v-if="form.type === 'knowledge_retrieval'">
        <!-- 关联知识库：标题 + 添加按钮（点击弹出知识库选择框） -->
        <div class="mb-2 mt-4 flex items-center justify-between">
          <span class="text-[13px] font-medium text-[#1d2129]">关联知识库</span>
          <a-button type="text" size="mini" @click="openKnowledgePicker">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>

        <!-- 已关联知识库列表 -->
        <div v-if="form.knowledgeBases.length" class="flex flex-col gap-2">
          <div
            v-for="kb in form.knowledgeBases"
            :key="kb.id"
            class="flex items-center gap-2 rounded-lg border border-[#e5e6eb] px-3 py-2"
          >
            <img
              v-if="getKnowledgeIcon(kb.id)"
              :src="getKnowledgeIcon(kb.id)"
              :alt="kb.name"
              class="h-7 w-7 shrink-0 rounded-md object-cover"
            />
            <div
              v-else
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f2f3f5] text-[#86909c]"
            >
              <icon-book :size="15" />
            </div>
            <span class="min-w-0 flex-1 truncate text-[13px] text-[#1d2129]">{{ kb.name }}</span>
            <button
              type="button"
              class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[#86909c] transition-colors hover:bg-[#f2f3f5] hover:text-[#f53f3f]"
              title="移除关联"
              @click="removeKnowledge(kb.id)"
            >
              <icon-close :size="12" />
            </button>
          </div>
        </div>
        <!-- 空态：点击整个区域打开选择弹窗 -->
        <button
          v-else
          type="button"
          class="flex min-h-[64px] w-full items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-[#c9cdd4] text-[13px] text-[#86909c] transition-colors hover:border-[#165dff] hover:text-[#165dff]"
          @click="openKnowledgePicker"
        >
          <icon-plus :size="13" />
          <span>未添加关联知识库，点击添加</span>
        </button>

        <!-- 检索策略 -->
        <div class="mb-3 mt-4 flex items-center gap-4">
          <div class="flex shrink-0 items-center gap-1">
            <span class="text-[13px] text-[#1d2129]">检索策略</span>
            <a-tooltip content="混合检索结合向量与全文检索结果；向量检索按语义相似度召回；全文检索按关键词匹配召回">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-radio-group v-model="form.retrievalStrategy" type="radio">
            <a-radio value="hybrid">混合检索</a-radio>
            <a-radio value="vector">向量检索</a-radio>
            <a-radio value="fulltext">全文检索</a-radio>
          </a-radio-group>
        </div>

        <!-- 最大召回数量：滑块 + 数值框 -->
        <div class="mb-3 flex items-center gap-3">
          <div class="flex w-28 shrink-0 items-center gap-1">
            <span class="text-[13px] text-[#1d2129]">最大召回数量</span>
            <a-tooltip content="每次检索返回的最大分段数量（1-20）">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-slider
            v-model="form.maxResults"
            :min="maxResultsProps.min"
            :max="maxResultsProps.max"
            :step="maxResultsProps.step"
            class="flex-1"
          />
          <a-input-number
            v-model="form.maxResults"
            :min="maxResultsProps.min"
            :max="maxResultsProps.max"
            :step="maxResultsProps.step"
            :precision="0"
            size="small"
            class="!w-24 shrink-0"
          />
        </div>

        <!-- 最小匹配度：滑块 + 数值框 -->
        <div class="mb-1 flex items-center gap-3">
          <div class="flex w-28 shrink-0 items-center gap-1">
            <span class="text-[13px] text-[#1d2129]">最小匹配度</span>
            <a-tooltip content="分段相似度阈值，低于该值的召回结果将被过滤（0-1）">
              <icon-info-circle :size="13" class="cursor-pointer text-[#86909c]" />
            </a-tooltip>
          </div>
          <a-slider
            v-model="form.minScore"
            :min="minScoreProps.min"
            :max="minScoreProps.max"
            :step="minScoreProps.step"
            :format-tooltip="formatScoreTooltip"
            class="flex-1"
          />
          <a-input-number
            v-model="form.minScore"
            :min="minScoreProps.min"
            :max="minScoreProps.max"
            :step="minScoreProps.step"
            :precision="2"
            size="small"
            class="!w-24 shrink-0"
          />
        </div>
      </template>

      <!-- 大语言模型节点：提示词（可用 {{变量名}} 引用输入参数） -->
      <template v-if="form.type === 'llm'">
        <!-- 模型选择：点击打开应用编排的模型设置弹窗 -->
        <div class="mb-3 mt-4">
          <div class="mb-2 flex items-center gap-1">
            <span class="text-[13px] font-medium text-[#1d2129]">语言模型配置</span>
            <icon-info-circle :size="13" class="text-[#86909c]" />
          </div>
          <div
            class="flex cursor-pointer items-center gap-2 rounded-lg border border-[#e5e6eb] bg-[#f7f8fa] p-2.5 transition-colors hover:border-[#bedaff] hover:bg-[#f7f8fa]"
            @click="modelModalVisible = true"
          >
            <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white">
              <icon-robot :size="16" class="text-[#86909c]" />
            </div>
            <div class="min-w-0 flex-1">
              <div v-if="form.model_config.model" class="truncate text-[13px] font-medium text-[#1d2129]">
                {{ form.model_config.provider ? form.model_config.provider + ' · ' : '' }}{{ form.model_config.model }}
              </div>
              <div v-else class="text-[13px] text-[#c9cdd4]">请选择模型</div>
            </div>
            <icon-edit :size="14" class="shrink-0 text-[#86909c]" />
          </div>
        </div>
        <div class="mb-2 mt-4 flex items-center gap-1">
          <span class="text-[13px] font-medium text-[#1d2129]">提示词</span>
          <icon-info-circle :size="13" class="text-[#86909c]" />
        </div>
        <a-textarea
          v-model="form.prompt"
          :auto-size="{ minRows: 4, maxRows: 12 }"
          placeholder="请输入提示词，可用 {{变量名}} 引用输入参数"
          class="rounded-md bg-[#f7f8fa]"
        />
      </template>

      <!-- 模板转换节点：转换模板 -->
      <template v-else-if="form.type === 'template'">
        <div class="mb-2 mt-4 flex items-center gap-1">
          <span class="text-[13px] font-medium text-[#1d2129]">转换模板</span>
          <icon-info-circle :size="13" class="text-[#86909c]" />
        </div>
        <a-textarea
          v-model="form.template"
          :auto-size="{ minRows: 4, maxRows: 12 }"
          placeholder="请输入转换模板，可用 {{变量名}} 引用输入参数"
          class="rounded-md bg-[#f7f8fa]"
        />
      </template>

      <!-- 代码执行节点：深色代码编辑器，固定函数格式 def main(params) -->
      <template v-else-if="form.type === 'python'">
        <div class="mb-2 mt-4 flex items-center gap-1">
          <span class="text-[13px] font-medium text-[#1d2129]">代码</span>
          <icon-info-circle :size="13" class="text-[#86909c]" />
        </div>
        <a-textarea
          v-model="form.code"
          :auto-size="{ minRows: 8, maxRows: 20 }"
          placeholder="def main(params):"
          class="code-editor"
        />
      </template>

      <!-- 输出参数区：开始节点为流程起点，没有输出参数，不展示 -->
      <template v-if="form.type !== 'start'">
        <!-- 头部包含标题和添加按钮（固定输出节点不可添加） -->
        <div class="mb-2 mt-4 flex items-center justify-between">
          <span class="text-[13px] font-medium text-[#1d2129]">输出参数</span>
          <a-button v-if="!isFixedOutputNode" type="text" size="mini" @click="addOutputField">
            <template #icon><icon-plus :size="12" /></template>
          </a-button>
        </div>

        <!-- 所有非开始节点输出参数均使用紧凑行列表，支持引用值 -->
        <CompactParamList
          :fields="compactOutputs"
          :reference-options="referenceOptions"
          :errors="outputErrors"
          :name-disabled="isFixedOutputNode"
          :type-disabled="isOutputTypeFixed"
          :hide-remove="isFixedOutputNode"
          @remove="removeOutputField"
        />
      </template>
    </div>

    <!-- 底部操作：保存按钮带 loading 状态 -->
    <div class="border-t border-[#f2f3f5] px-4 py-3">
      <a-button type="primary" long :loading="loading" @click="handleSubmit">保存</a-button>
    </div>

    <!-- 选择引用知识库弹窗 -->
    <KnowledgePickerModal
      v-model:visible="pickerVisible"
      :selected="form.knowledgeBases"
      @confirm="handleKnowledgeConfirm"
    />
    <!-- 选择插件弹窗 -->
    <PluginPickerModal
      v-model:visible="pluginPickerVisible"
      :selected-id="form.pluginId"
      @confirm="handlePluginConfirm"
    />
    <!-- 模型设置弹窗（复用应用编排组件） -->
    <ModelSettingsModal
      v-if="form.type === 'llm'"
      :visible="modelModalVisible"
      :model-config="form.model_config"
      @update:model-config="(val) => { form.model_config = val; modelModalVisible = false }"
      @cancel="modelModalVisible = false"
    />
  </div>
</template>

<style scoped>
/* 代码编辑器：深色背景 + 等宽字体，模拟 IDE 输入区域 */
.code-editor :deep(.arco-textarea-wrapper),
.code-editor :deep(textarea) {
  background-color: #374151;
  border-radius: 8px;
}

.code-editor :deep(textarea) {
  padding: 12px 14px;
  color: #f3f4f6;
  font-family: 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  font-size: 13px;
  line-height: 1.7;
  caret-color: #f3f4f6;
}

.code-editor :deep(textarea::placeholder) {
  color: #9ca3af;
}
</style>
