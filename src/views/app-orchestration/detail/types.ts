/**
 * 应用编排详情页 - 类型定义
 * 严格遵循字段命名规范：appId / pluginId / workflowId / kbId / modelId / version
 */

/** Tab Key */
export type TabKey = 'orchestrate' | 'publish' | 'config' | 'statistics'

/** ========== 左栏：人设与回复逻辑 ========== */
export interface PersonaConfig {
  /** 角色（Markdown 格式多行文本） */
  role: string
  /** 技能（Markdown 格式多行文本，## 技能 1/2/3...） */
  skills: string
  /** 限制（Markdown 格式多行文本） */
  limitations: string
}

/** ========== 中栏：应用能力 ========== */
export interface PluginItem {
  /** 插件唯一标识 */
  pluginId: string
  name: string
  description: string
  icon?: string
  enabled: boolean
  /** 分类：自定义 / 内置 */
  category: 'custom' | 'builtin'
}

export interface WorkflowItem {
  /** 工作流唯一标识 */
  workflowId: string
  name: string
  description: string
  selected: boolean
}

export interface KnowledgeBaseItem {
  /** 知识库唯一标识 */
  kbId: string
  name: string
  description: string
  documentCount: number
  selected: boolean
}

export interface CapabilityConfig {
  plugins: PluginItem[]
  workflows: WorkflowItem[]
  knowledgeBases: KnowledgeBaseItem[]
  /** 长期记忆开关 */
  longTermMemoryEnabled: boolean
  /** 长期记忆内容 */
  longTermMemoryContent: string
  /** 对话开场白 */
  openingMessage: string
  /** 开场白预设问题列表 */
  openingQuestions: string[]
  /** 用户问题建议开关 */
  userSuggestionsEnabled: boolean
  /** 语音输入开关 */
  voiceInputEnabled: boolean
  /** 语音输出开关 */
  voiceOutputEnabled: boolean
  /** 内容审查开关 */
  contentModerationEnabled: boolean
}

/** ========== 检索设置（M6） ========== */
export type RetrievalStrategy = 'hybrid' | 'vector' | 'fulltext'

export interface RetrievalConfig {
  retrievalStrategy: RetrievalStrategy
  /** 最大召回数量 */
  maxRecallCount: number
  /** 最小匹配度 0-1 */
  minMatchScore: number
}

/** ========== 内容审查设置（M9） ========== */
export interface ModerationConfig {
  keywords: string[]
  checkInput: boolean
  presetReply: string
  checkOutput: boolean
}

/** ========== 语音输出设置（M8） ========== */
export interface VoiceOutputConfig {
  voice: string
  autoPlay: boolean
}

export interface VoiceOption {
  value: string
  label: string
}

/** ========== 模型设置（M1） ========== */
export interface ModelConfig {
  /** 模型唯一标识 */
  modelId: string
  /** 温度参数 */
  temperature: number
  /** Top P */
  topP: number
  /** 存在惩罚 */
  presencePenalty: number
  /** 频率惩罚 */
  frequencyPenalty: number
  /** 上下文轮数 */
  contextRounds: number
  /** 最大回复 Token */
  maxResponseTokens: number
}

export interface ModelOption {
  modelId: string
  label: string
  /** 支持的最大 Token */
  maxTokens: number
}

/** ========== 插件详情（M2） ========== */
export interface PluginDetail {
  pluginId: string
  name: string
  description: string
  params: PluginParam[]
}

export interface PluginParam {
  key: string
  label: string
  value: string
  required: boolean
  type: 'text' | 'textarea' | 'number'
}

/** ========== 发布版本 ========== */
export type PublishStatus = 'published' | 'canceled'

export interface PublishRecord {
  /** 版本号 */
  version: string
  /** 发布时间 */
  publishTime: string
  publisher: string
  remark: string
  status: PublishStatus
  isCurrent: boolean
}

/** ========== 右栏：预览与调试 ========== */
export interface ChatStep {
  label: string
  detail: string
}

export interface ChatMessage {
  /** 消息唯一标识 */
  messageId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  /** Token 用量 */
  tokenCount: number
  /** 步骤详情 */
  steps: ChatStep[]
  /** 多模态图片列表 */
  images: string[]
}

export interface AutoSaveStatus {
  /** 自动保存状态 */
  autoSaveStatus: 'saved' | 'saving' | 'dirty'
  lastSavedTime: string
}

/** ========== 配置 Tab ========== */
export interface AppConfig {
  /** 应用唯一标识 */
  appId: string
  appName: string
  appIcon: string
  appDescription: string
  appType: string
  apiKey: string
  endpoint: string
}

/** ========== 统计分析 ========== */
export interface StatisticsOverview {
  totalConversations: number
  totalTokens: number
  activeUsers: number
  /** 趋势数据 */
  trend: Array<{ date: string; conversations: number; tokens: number }>
  sessions: Array<{
    sessionId: string
    user: string
    tokenCount: number
    messageCount: number
    time: string
  }>
}

/** ========== 通用 ========== */
export type EmptyStateType = 'empty' | 'loading' | 'error'
