import { get, requestRaw } from '@/utils/request'
import {
  type GetBuiltinToolDetailResponse,
  type GetBuiltinToolsResponse,
  type GetCategoriesResponse,
} from '@/models/builtin-tool'

// 获取内置分类列表信息
export const getCategories = () => {
  return get<GetCategoriesResponse>('/builtin-tools/categories')
}

// 获取所有内置工具提供者列表
export const getBuiltinTools = () => {
  return get<GetBuiltinToolsResponse>('/builtin-tools')
}

// 获取指定工具的详细信息（接口 2.3）
export const getBuiltinToolDetail = (provider: string, toolName: string) => {
  return get<GetBuiltinToolDetailResponse>(`/builtin-tools/${provider}/tools/${toolName}`)
}

// 获取内置插件提供商 icon（接口 2.4），返回原始 Response，由调用方根据 content-type 解析 svg/图片
export const getBuiltinToolIcon = (provider: string) => {
  return requestRaw(`/builtin-tools/${provider}/icon`)
}
