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
    }
    created_at: number
    /** 是否已加入个人工作区（后端返回，若后端暂不支持则前端维护） */
    added?: boolean
  }[]
>
