import type { BaseResponse } from '@/models/base'

// 获取内置应用分类响应结构体
export type GetBuiltinAppCategoriesResponse = BaseResponse<
  {
    category: string
    name: string
  }[]
>

// 获取内置应用列表响应结构体
export type GetBuiltinAppsResponse = BaseResponse<
  {
    id: string
    category: string
    name: string
    icon: string
    description: string
    model_config: {
      provider: string
      model: string
      /** 模型展示名（如 Qwen2.5-7B），卡片展示 provider · label */
      label?: string
      /** 模型唯一名（如 qwen2.5-7b-instruct） */
      name?: string
    }
    created_at: number
    /** 是否已加入个人工作区（以后端返回为准） */
    is_added: boolean
  }[]
>
