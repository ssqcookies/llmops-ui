import { type BaseResponse } from '@/models/base'

// 获取内置插件分类接口响应接口
export type GetCategoriesResponse = BaseResponse<
  Array<{
    category: string
    icon: string
    name: string
  }>
>

// 工具输入参数（大语言模型调用参数）
export interface BuiltinToolInput {
  name: string
  description: string
  required: boolean
  type: string
}

// 工具设置参数
export interface BuiltinToolParamOption {
  value: string
  label: string
}
export interface BuiltinToolParam {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required: boolean
  default?: unknown
  min?: number | null
  max?: number | null
  help?: string
  options?: BuiltinToolParamOption[]
}

// 内置工具条目
export interface BuiltinToolItem {
  name: string
  label: string
  description: string
  inputs: BuiltinToolInput[]
  params: BuiltinToolParam[]
  created_at: number
}

// 内置工具提供者
export interface BuiltinToolProvider {
  name: string
  label: string
  description: string
  category: string
  background: string
  tools: BuiltinToolItem[]
  created_at: number
}

// 获取所有内置插件列表
export type GetBuiltinToolsResponse = BaseResponse<BuiltinToolProvider[]>

// 接口 2.3 获取指定工具详情
export interface BuiltinToolDetail {
  provider: {
    name: string
    label: string
    description: string
    category: string
    background: string
  }
  name: string
  label: string
  description: string
  inputs: BuiltinToolInput[]
  params: BuiltinToolParam[]
  created_at: number
}
export type GetBuiltinToolDetailResponse = BaseResponse<BuiltinToolDetail>
