import type { PluginSpaceCard } from '@/models/personalSpace'
import type { PluginDetail } from '@/models/plugin'
import type { ApiToolItem, ApiHeaderItem, ApiToolProviderData } from '@/models/api-tool'
import * as apiToolService from '@/services/api-tool'

/** 默认所有者信息（个人空间展示用） */
const DEFAULT_OWNER = { name: '慕小课', avatar: '' }

/** 2.5 分页列表中的 provider 结构（不含 openapi_schema） */
type ApiToolProviderListItem = {
  id: string
  name: string
  icon: string
  description: string
  headers: ApiHeaderItem[]
  tools: ApiToolItem[]
  created_at: number
}

/** Unix 时间戳（秒）→ MM-DD HH:mm */
const formatTime = (ts: number): string => {
  if (!ts) return '01-01 00:00'
  const d = new Date(ts * 1000)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

/** 自定义 API 工具提供者 → 个人空间插件卡片 */
const providerToCard = (provider: ApiToolProviderListItem): PluginSpaceCard => ({
  id: provider.id,
  icon: provider.icon,
  name: provider.name,
  description: provider.description,
  provider: provider.name,
  toolCount: provider.tools?.length ?? 0,
  owner: DEFAULT_OWNER,
  lastEditTime: formatTime(provider.created_at),
  verified: false,
})

/**
 * 获取个人空间插件列表（接口 2.5 GET /api-tools）
 * 后端不可达时返回空数组，由调用方展示空状态。
 */
export const fetchPersonalPlugins = async (keyword = ''): Promise<PluginSpaceCard[]> => {
  try {
    const res = await apiToolService.getApiToolProvidersWithPage(1, 50, keyword)
    const list = res?.data?.list
    if (Array.isArray(list)) return list.map(providerToCard)
    return []
  } catch (_e) {
    // TODO: 后端就绪后移除 fallback，目前失败返回空数组保持页面不报错
    return []
  }
}

/**
 * 删除个人空间插件（接口 2.8 POST /api-tools/:provider_id/delete）
 */
export const deletePersonalPlugin = async (id: string): Promise<boolean> => {
  try {
    const res = await apiToolService.deleteApiToolProvider(id)
    return res?.code === 'success'
  } catch (_e) {
    return false
  }
}

/** 自定义 API 工具提供者 → 插件详情（抽屉展示） */
export const apiProviderToDetail = (provider: ApiToolProviderData): PluginDetail => ({
  pluginId: provider.id,
  icon: provider.icon,
  name: provider.name,
  provider: provider.name,
  toolCount: provider.tools?.length ?? 0,
  description: provider.description,
  tools: (provider.tools ?? []).map((t) => ({
    toolId: t.id,
    name: t.name,
    description: t.description,
    params: (t.inputs ?? []).map((i) => ({
      name: i.name,
      type: i.type,
      required: Boolean(i.required),
      description: i.description,
    })),
  })),
})
