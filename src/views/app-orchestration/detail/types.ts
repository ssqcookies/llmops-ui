/** 应用编排详情页 - 类型定义 */

/** 模型参数配置 */
export interface ModelConfig {
  model: string
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

/** 对话消息 */
export interface ChatMessageItem {
  id: string
  role: 'user' | 'assistant'
  content: string
  tokens?: number
  latency?: number
  recommendations?: string[]
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
  collapsible?: boolean
  defaultExpand?: boolean
  showAdd?: boolean
  addDisabled?: boolean
}

/** 添加插件抽屉分类 */
export type PluginCategory = '全部' | 'Google' | '搜索' | '天气' | '旅行' | '自定义插件' | '内置'
