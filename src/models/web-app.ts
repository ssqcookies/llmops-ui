import type { BaseResponse } from '@/models/base'

// 获取WebApp基础信息响应结构
export type GetWebAppResponse = BaseResponse<{
  id: string
  icon: string
  name: string
  description: string
  app_config: {
    opening_statement: string
    opening_questions: string[]
    suggested_after_answer: {
      enable: boolean
    }
  }
}>

// WebApp 会话概览（左侧列表用）
export type WebAppConversationSummary = {
  id: string
  name: string
  summary: string
  is_pinned: boolean
  created_at: number
  updated_at: number
}

// 获取WebApp会话列表响应结构
export type GetWebAppConversationsResponse = BaseResponse<WebAppConversationSummary[]>

// WebApp 单条消息（会话详情）
export type WebAppConversationMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  total_token_count?: number
  latency?: number
  /** Agent 思考过程 / 工具调用 / 知识库检索（assistant 消息才有） */
  agent_thoughts?: {
    id: string
    event: string
    thought: string
    observation: string
    tool: string
    tool_input: Record<string, any>
    latency: number
    created_at: number
  }[]
  created_at: number
}

// 获取WebApp单个会话消息列表响应结构
export type GetWebAppConversationMessagesResponse = BaseResponse<{
  id: string
  name: string
  messages: WebAppConversationMessage[]
}>

// 与WebApp对话请求结构
export type WebAppChatRequest = {
  conversation_id?: string
  query: string
}

// 重命名会话请求结构
export type RenameWebAppConversationRequest = { name: string }

// 置顶/取消置顶会话请求结构
export type PinWebAppConversationRequest = { is_pinned: boolean }
