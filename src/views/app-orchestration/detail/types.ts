/** 应用编排详情页 - 类型定义 */

/** 模型参数配置 */
export interface ModelConfig {
  /** 后端模型唯一标识（如 deepseek-v3、qwen2.5-7b-instruct） */
  model: string
  /** 后端 provider 唯一标识（如 deepseek、qwenlm），保存草稿时必填 */
  provider?: string
  temperature: number
  topP: number
  presencePenalty: number
  frequencyPenalty: number
  contextRounds: number
  maxReplyLength: number
}

/** 插件信息 */
export interface PluginItem {
  id: string
  name: string
  description: string
  icon: string
  category: string
}

/** 工作流项 */
export interface WorkflowItem {
  id: string
  name: string
  description: string
}

/** 知识库项 */
export interface KnowledgeItem {
  id: string
  name: string
  description: string
}

/** 知识库检索片段（agent_thought 中 dataset_retrieval 事件的展开内容） */
export interface ChatKnowledgeItem {
  title: string
  content: string
}

/** 待发送图片（已上传成功得到 url，uploading 表示上传中） */
export interface ChatPendingImage {
  url: string
  uploading: boolean
}

/** 对话消息 */
export interface ChatMessageItem {
  id: string
  /** 后端真实消息 id（AI 回复消息），用于拉取建议问题 */
  serverMessageId?: string
  /** 一问一答共享的 id，用于整组删除 */
  pairId: string
  role: 'user' | 'assistant'
  content: string
  /** 用户消息附带的图片地址 */
  images?: string[]
  /** assistant 消息状态：已完成 / 已手动终止 */
  status?: 'completed' | 'stopped'
  tokens?: number
  /** 耗时（毫秒） */
  latency?: number
  recommendations?: string[]
  /** 回答时检索到的知识库片段，存在时展示“已搜索知识库”折叠入口 */
  knowledgeItems?: ChatKnowledgeItem[]
}

/** 检索配置 */
export interface RetrievalConfig {
  strategy: 'hybrid' | 'vector' | 'fulltext'
  maxRecall: number
  minMatchScore: number
}

/** 语音输出配置 */
export interface VoiceConfig {
  voice: string
  autoPlay: boolean
}

/** 内容审查配置 */
export interface ContentReviewConfig {
  keywords: string[]
  reviewInput: boolean
  presetReply: string
  reviewOutput: boolean
}

/** 长期记忆配置 */
export interface LongTermMemoryConfig {
  enabled: boolean
  content: string
}

/** 分组配置（ConfigCollapse 使用） */
export interface CollapseGroup {
  key: string
  title: string
  description?: string
  /** 左侧图标名（Arco icon-* 前缀） */
  icon?: string
  collapsible?: boolean
  defaultExpand?: boolean
  showAdd?: boolean
  addDisabled?: boolean
}

/** 添加插件抽屉分类 */
export type PluginCategory = '全部' | 'Google' | '搜索' | '天气' | '旅行' | '自定义插件' | '内置'
