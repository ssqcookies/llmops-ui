/** 首页（Home）专属类型定义 */

/** 快捷问题类型 */
export interface QuickQuestion {
  /** 显示文本 */
  text: string
  /** 实际发送文本（可与显示文本不同） */
  sendText?: string
}

/** 首页欢迎配置 */
export interface HomeWelcomeConfig {
  /** 主标题 */
  title: string
  /** 副标题（支持关键字段用HTML片段渲染蓝色） */
  subtitle: string
  /** 描述文案 */
  description: string
  /** 快捷问题列表 */
  quickQuestions: QuickQuestion[]
}

/** 聊天消息条目（首页自用，避免跨模块引用） */
export interface ChatMessageItem {
  /** 唯一 ID */
  id: string
  role: 'user' | 'assistant'
  content: string
  tokens?: number
  latency?: number
  recommendations?: string[]
  /** 问答对 ID：user/assistant 共享同一个 pairId，用于删除整条对话 */
  pairId?: string
  /** 消息状态（仅 assistant 有） */
  status?: 'completed' | 'paused' | 'stopped'
}
