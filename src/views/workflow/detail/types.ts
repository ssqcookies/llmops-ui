/** 工作流节点类型（与后端 node_type 对齐） */
export type WorkflowNodeType =
  | 'start'
  | 'llm'
  | 'plugin'
  | 'knowledge_retrieval'
  | 'template'
  | 'http_request'
  | 'python'
  | 'end'

/** 字段值类型 */
export type FieldValueType =
  | 'String'
  | 'Number'
  | 'Boolean'
  | 'Array'
  | 'Object'
  // 抽屉参数行使用的小写值类型
  | 'string'
  | 'int'
  | 'float'
  | 'reference'

/** 节点输入/输出字段定义 */
export interface NodeField {
  /** 字段名 */
  name: string
  /** 字段类型 */
  type: FieldValueType
  /** 引用值（如 "节点ID/字段名"），空表示未引用 */
  reference?: string
  /** 字段描述 */
  description?: string
  /** 是否必填 */
  required?: boolean
  /** 默认值 */
  value?: string | number | boolean
}

/** 已关联知识库（节点卡片与配置抽屉共用） */
export interface LinkedKnowledge {
  id: string
  name: string
  /** 知识库图标 URL（节点卡片展示用） */
  icon?: string
}

/** HTTP 节点参数（HEADERS / PARAMS / BODY）编辑模型 */
export interface HttpParam {
  /** 参数名 */
  name: string
  /** reference / string / int / float / boolean */
  type: string
  /** 固定值（string 为字符串，int/float 为数字，boolean 为布尔） */
  value: string | number | boolean
  /** 引用值（实际值格式：节点ID/字段名） */
  reference: string
}

/** 知识库检索策略 */
export type RetrievalStrategy = 'hybrid' | 'vector' | 'fulltext'

/** 节点元数据（用于节点库展示与默认配置） */
export interface NodeMeta {
  type: WorkflowNodeType
  label: string
  description: string
  icon: string
  /** 主题色（图标背景 / 节点标题色） */
  color: string
  /** 默认输入字段 */
  inputs: NodeField[]
  /** 默认输出字段 */
  outputs: NodeField[]
}

/** vue-flow 自定义节点 data */
export interface WorkflowNodeData {
  /** 节点类型 */
  nodeType: WorkflowNodeType
  /** 节点显示名称 */
  label: string
  /** 节点标题（配置面板可编辑） */
  title?: string
  /** 节点描述 */
  description?: string
  /** 节点图标 */
  icon: string
  /** 主题色 */
  color: string
  /** 输入字段 */
  inputs: NodeField[]
  /** 输出字段 */
  outputs: NodeField[]
  /** 关联知识库（仅知识库检索节点） */
  knowledgeBases?: LinkedKnowledge[]
  /** 关联知识库 ID 列表（仅知识库检索节点，后端字段） */
  dataset_ids?: string[]
  /** 检索策略（仅知识库检索节点） */
  retrievalStrategy?: RetrievalStrategy
  /** 检索配置（仅知识库检索节点，后端字段） */
  retrieval_config?: {
    max_results?: number
    min_score?: number
    strategy?: RetrievalStrategy
  }
  /** 最大召回数量（仅知识库检索节点） */
  maxResults?: number
  /** 最小匹配度（仅知识库检索节点） */
  minScore?: number
  /** 提示词（仅大模型节点） */
  prompt?: string
  /** 模型（仅大模型节点） */
  model?: string
  /** 模型配置（仅大模型节点，与应用编排 ModelConfig 对齐，复用模型设置弹窗） */
  model_config?: {
    /** 模型唯一标识（如 deepseek-v3） */
    model?: string
    /** provider 唯一标识（如 deepseek） */
    provider?: string
    temperature?: number
    topP?: number
    presencePenalty?: number
    frequencyPenalty?: number
    contextRounds?: number
    maxReplyLength?: number
  }
  /** 插件标识（仅插件节点） */
  pluginId?: string
  /** 插件名称（仅插件节点，卡片展示用） */
  pluginName?: string
  /** 插件图标（仅插件节点，卡片展示用） */
  pluginIcon?: string
  /** 模板内容（仅模板转换节点） */
  template?: string
  /** 请求方法（仅 HTTP 节点） */
  method?: string
  /** 请求 URL（仅 HTTP 节点） */
  url?: string
  /** 请求头参数（仅 HTTP 节点） */
  headers?: HttpParam[]
  /** Query 参数（仅 HTTP 节点） */
  params?: HttpParam[]
  /** Body 参数（仅 HTTP 节点） */
  body?: HttpParam[]
  /** Python 代码（仅 Python 节点） */
  code?: string
  [key: string]: unknown
}
