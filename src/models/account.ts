import { type BaseResponse } from '@/models/base'

// 获取当前登录账号响应结构
export type GetCurrentUserResponse = BaseResponse<{
  id: string
  name: string
  email: string
  avatar: string
  /** 是否已设置登录密码（OAuth 首次登录未设密码时为 false） */
  password_set: boolean
  last_login_ip: string
  last_login_at: number
  created_at: number
}>
