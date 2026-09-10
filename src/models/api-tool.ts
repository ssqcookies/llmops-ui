import { type BasePaginatorResponse, type BaseResponse } from '@/models/base'

// 工具输入参数结构
export interface ApiToolInput {
  name: string
  description: string
  required: boolean
  type: string
}

// 自定义 API 工具条目
export interface ApiToolItem {
  id: string
  name: string
  description: string
  inputs: ApiToolInput[]
}

// 请求头项
export interface ApiHeaderItem {
  key: string
  value: string
}

// 获取自定义API插件响应接口
export type GetApiToolProvidersWithPageResponse = BasePaginatorResponse<{
  id: string
  name: string
  icon: string
  description: string
  headers: ApiHeaderItem[]
  tools: ApiToolItem[]
  created_at: number
}>

// 新增自定义API插件提供者请求结构
export interface CreateApiToolProviderRequest {
  name: string
  icon: string
  openapi_schema: string
  headers: ApiHeaderItem[]
}

// 更新自定义API工具提供者请求与响应结构
export interface UpdateApiToolProviderRequest {
  name: string
  icon: string
  openapi_schema: string
  headers: ApiHeaderItem[]
}

// 获取自定义API工具提供者响应结构体（基础数据）
export interface ApiToolProviderData {
  id: string
  name: string
  icon: string
  description: string
  openapi_schema: string
  headers: ApiHeaderItem[]
  tools: ApiToolItem[]
  created_at: number
}

// 获取自定义API工具提供者响应结构体（含 code/data/message 外层包装）
export type GetApiToolProviderResponse = BaseResponse<ApiToolProviderData>
