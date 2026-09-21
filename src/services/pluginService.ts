/**
 * 插件广场模块 —— 业务服务门面
 * 职责：
 *   1. 统一调用底层 builtin-tool / api-tool 两个 service；
 *   2. 对「内置工具」与「自定义API工具」做数据归一化（统一输出 PluginCard / PluginDetail 结构）；
 *   3. 当后端服务不可达时（开发环境无后端），自动 fallback 到同结构的动态 mock 数据，
 *      确保前端页面渲染链路不中断；生产环境下接口走成功则会覆盖 mock。
 *
 * 注意：本文件不直接引入 axios / fetch（严格遵守 SKILL 规范），
 * 所有请求均通过 @/utils/request 封装的 get/post。
 */
import type { CategoryOption, PluginCard, PluginDetail, PluginCategory } from '@/models/plugin'
import type { BuiltinToolProvider, BuiltinToolDetail } from '@/models/builtin-tool'
import type { ApiToolItem, ApiToolProviderData } from '@/models/api-tool'
import type { BaseResponse } from '@/models/base'
import { Message } from '@arco-design/web-vue'
import { requestWithCode } from '@/utils/request'
import { httpCode } from '@/config'

import * as builtinToolService from '@/services/builtin-tool'
import * as apiToolService from '@/services/api-tool'

// ============================================================
// 一、工具函数
// ============================================================

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

/** 将接口返回的分类英文标识映射到提纲要求的 PluginCategory union */
const mapCategory = (backendCat: string): PluginCategory => {
  switch (backendCat) {
    case 'news':
    case 'weather':
      return 'news'
    case 'image':
    case 'photo':
    case 'photography':
      return 'photo'
    case 'tool':
    case 'map':
    case 'translate':
    case 'time':
    case 'document':
      return 'tool'
    case 'search':
    case 'web_search':
      return 'web_search'
    default:
      return 'all'
  }
}

/** 图标 URL（根据 provider/name 生成，作为 2.4 接口失败时的 fallback） */
const IMG = (p: string) =>
  `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(p)}&image_size=square`

/** 将图片 Blob 转为 base64 Data URL */
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** 通过 2.4 接口获取内置插件提供商 icon，失败则 fallback 到 AI 生成图 */
const fetchBuiltinIcon = async (provider: BuiltinToolProvider): Promise<string> => {
  const fallback = IMG(`${provider.name} ${provider.label} official logo company service`)
  try {
    const res = await builtinToolService.getBuiltinToolIcon(provider.name)
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('image/svg')) {
      const svg = await res.text()
      return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
    }
    if (contentType.startsWith('image/')) {
      const blob = await res.blob()
      return await blobToDataURL(blob)
    }
    return fallback
  } catch (_e) {
    return fallback
  }
}

// ============================================================
// 二、动态 Mock 数据（接口 2.1 / 2.2 / 2.5 的响应形状，字段严格对齐接口文档）
// 当后端服务不可达时 fallback 到这些数据，保证页面在开发环境也能渲染。
// ============================================================

const MOCK_CATEGORIES = [
  { category: 'search', icon: '', name: '网页搜索' },
  { category: 'image', icon: '', name: '照片与摄影' },
  { category: 'news', icon: '', name: '新闻阅读' },
  { category: 'tool', icon: '', name: '实用工具' },
]

const MOCK_BUILTIN_PROVIDERS: BuiltinToolProvider[] = [
  {
    name: 'google',
    label: 'Google',
    description:
      '谷歌搜索引擎。当你需要搜索你不知道的信息时很有用，比如天气、汇率、时事。当用户想要翻译时，切勿使用此工具。',
    category: 'search',
    background: '#E5E7EB',
    created_at: 1715759100,
    tools: [
      {
        name: 'google_serper',
        label: '谷歌Serper搜索',
        description: '一个用于执行Google SERP搜索并提取片段和网页的工具。输入应该是一个搜索查询。',
        inputs: [{ name: 'query', description: '输入应该是搜索查询语句', required: true, type: 'string' }],
        params: [],
        created_at: 1715759100,
      },
      {
        name: 'google_news',
        label: '谷歌新闻',
        description: '谷歌新闻搜索引擎可以帮助你按关键字搜索新闻。',
        inputs: [],
        params: [],
        created_at: 1715759100,
      },
    ],
  },
  {
    name: 'gaode',
    label: 'Gaode',
    description: '查询ip所在地、天气预报、路线规划工具集',
    category: 'tool',
    background: '#E5E7EB',
    created_at: 1714693260,
    tools: [
      {
        name: 'GetCurrentWeather',
        label: '获取当前天气',
        description: '根据传递的城市名获取指定城市的天气预报',
        inputs: [{ name: 'city', description: '城市名称，例如 北京', required: true, type: 'string' }],
        params: [],
        created_at: 1714693260,
      },
    ],
  },
  {
    name: 'dalle',
    label: 'DALLE',
    description: 'DALL-E 是一个文本到图像的工具',
    category: 'image',
    background: '#E5E7EB',
    created_at: 1714700000,
    tools: [
      {
        name: 'dalle3',
        label: 'DALLE-3绘图工具',
        description: 'DALLE-3是一个将文本转换成图片的绘图工具',
        inputs: [{ name: 'query', description: '图像提示词，可以查看 DALL-E 3 的官方文档', required: true, type: 'string' }],
        params: [
          {
            name: 'size',
            label: '图片尺寸',
            type: 'select',
            required: true,
            default: '1024×1024',
            min: null,
            max: null,
            help: '',
            options: [
              { value: '1024×1024', label: '(方)1024x1024' },
              { value: '1792x1024', label: '(横屏)1792x1024' },
            ],
          },
        ],
        created_at: 1714700000,
      },
    ],
  },
  {
    name: 'duckduckgo',
    label: 'DuckDuckGo',
    description: 'DuckDuckGo一个注重隐私的搜索引擎。',
    category: 'search',
    background: '#E5E7EB',
    created_at: 1714780000,
    tools: [
      {
        name: 'ddg_search',
        label: 'DuckDuckGo搜索',
        description: 'DuckDuckGo 文本搜索工具',
        inputs: [{ name: 'query', description: '搜索查询语句', required: true, type: 'string' }],
        params: [],
        created_at: 1714780000,
      },
    ],
  },
  {
    name: 'time',
    label: 'Time',
    description: '一个用于获取当前时间的工具。',
    category: 'tool',
    background: '#E5E7EB',
    created_at: 1715673300,
    tools: [
      {
        name: 'now',
        label: '获取当前时间',
        description: '返回当前服务器时间戳与格式化字符串',
        inputs: [],
        params: [],
        created_at: 1715673300,
      },
    ],
  },
  {
    name: 'wikipedia',
    label: 'Wikipedia',
    description: '维基百科是一个由全世界的志愿者创建和编辑的免费在线百科全书。',
    category: 'tool',
    background: '#E5E7EB',
    created_at: 1714699215,
    tools: [
      {
        name: 'wiki_lookup',
        label: '维基百科查询',
        description: '根据关键词在维基百科中查询对应词条',
        inputs: [{ name: 'keyword', description: '要搜索的关键词', required: true, type: 'string' }],
        params: [],
        created_at: 1714699215,
      },
    ],
  },
  {
    name: 'imooc_web_fetch',
    label: 'imooc',
    description: '一个用于抓取网页的工具。',
    category: 'web_search',
    background: '#E5E7EB',
    created_at: 1719802500,
    tools: [
      {
        name: 'fetch_page',
        label: '网页抓取',
        description: '抓取指定 URL 的正文内容',
        inputs: [{ name: 'url', description: '目标网页 URL', required: true, type: 'string' }],
        params: [],
        created_at: 1719802500,
      },
    ],
  },
]

// 自定义 API 工具（接口 2.5 /mock 分页结果）
const MOCK_API_TOOLS: ApiToolProviderData[] = [
  {
    id: 'ap-gaode-001',
    name: '高德工具包',
    icon: IMG('map location search weather service icon'),
    description: '查询ip所在地、天气预报、路线规划工具集',
    openapi_schema: '',
    headers: [{ key: 'Authorization', value: 'Bearer XXX-高德-KEY' }],
    tools: [
      {
        id: 't-001',
        name: 'GetCurrentWeather',
        description: '根据传递的城市名获取指定城市的天气预报',
        inputs: [{ name: 'city', description: '城市名，如 广州', required: true, type: 'string' }],
      },
      {
        id: 't-002',
        name: 'GetRoute',
        description: '路线规划，根据起点终点返回推荐路线',
        inputs: [
          { name: 'from', description: '起点', required: true, type: 'string' },
          { name: 'to', description: '终点', required: true, type: 'string' },
        ],
      },
    ],
    created_at: 1714693260,
  },
  {
    id: 'ap-langchain-002',
    name: 'LangChain翻译文档',
    icon: IMG('langchain translation book documentation ai'),
    description: '基于 LangChain 的翻译文档知识库自定义工具',
    openapi_schema: '',
    headers: [],
    tools: [
      {
        id: 't-003',
        name: 'translate',
        description: '根据源语言与目标语言返回翻译结果',
        inputs: [
          { name: 'text', description: '待翻译文本', required: true, type: 'string' },
          { name: 'lang', description: '目标语言，例如 en / zh', required: false, type: 'string' },
        ],
      },
    ],
    created_at: 1719802500,
  },
]

/** 默认的发布者信息（个人空间模块中创建者/所有者） */
const DEFAULT_PUBLISHER = { name: '罐头', avatar: '' }

// ============================================================
// 三、数据归一化：Builtin / Custom API → 统一 PluginCard
// ============================================================

const builtinProviderToCard = async (p: BuiltinToolProvider): Promise<PluginCard> => {
  const icon = await fetchBuiltinIcon(p)
  return {
    pluginId: `builtin:${p.name}`,
    icon,
    name: p.label,
    provider: p.label,
    toolCount: p.tools?.length ?? 0,
    description: p.description,
    publisher: DEFAULT_PUBLISHER,
    publishTime: formatTime(p.created_at),
    category: mapCategory(p.category),
  }
}

const apiProviderToCard = (p: {
  id: string
  name: string
  icon: string
  description: string
  tools: Array<unknown>
  created_at: number
}): PluginCard => ({
  pluginId: `custom:${p.id}`,
  icon: p.icon || IMG(`custom api plugin logo ${p.name}`),
  name: p.name,
  provider: p.name,
  toolCount: Array.isArray(p.tools) ? p.tools.length : 0,
  description: p.description,
  publisher: DEFAULT_PUBLISHER,
  publishTime: formatTime(p.created_at),
  category: 'tool' as PluginCategory,
})

// ============================================================
// 四、对外暴露的 service 方法
// ============================================================

/**
 * 4.1 获取分类列表（接口 2.1 GET /builtin-tools/categories）
 * 输出：提纲要求的 CategoryOption[]，并在最前面补上「全部」项。
 */
export const fetchCategoryOptions = async (): Promise<CategoryOption[]> => {
  let backendCategories: Array<{ category: string; name: string; icon: string }> = []
  try {
    const res = await builtinToolService.getCategories()
    if (res && Array.isArray(res.data)) backendCategories = res.data
  } catch (_e) {
    // 后端不可达 → fallback 到动态 mock
    backendCategories = MOCK_CATEGORIES
  }

  const allOption: CategoryOption = { value: 'all', label: '全部' }
  const rest = backendCategories
    .map((c): CategoryOption | null => {
      const mapped = mapCategory(c.category)
      // 仅保留提纲覆盖的 4 个分类，其它做忽略合并到 all（避免页面显示乱）
      if (mapped === 'all') return null
      const labelMap: Record<Exclude<PluginCategory, 'all'>, string> = {
        news: '新闻阅读',
        photo: '照片与摄影',
        tool: '实用工具',
        web_search: '网页搜索',
      }
      return { value: mapped, label: labelMap[mapped] ?? c.name }
    })
    .filter((o): o is CategoryOption => !!o)

  // 去重（同分类后端多条的合并）
  const seen = new Set<string>(['all'])
  const deduped: CategoryOption[] = [allOption]
  for (const o of rest) {
    if (seen.has(o.value)) continue
    seen.add(o.value)
    deduped.push(o)
  }
  return deduped
}

/**
 * 4.2 获取插件广场完整卡片列表（内置 + 自定义 合并）
 * 接口：
 *   - 内置：GET /builtin-tools     (2.2)
 *   - 自定义：GET /api-tools?page=1&pageSize=50 (2.5)
 */
export const fetchPluginCards = async (): Promise<PluginCard[]> => {
  // 并行拉取两条链路，任一失败 fallback 到 mock
  const [builtins, customs] = await Promise.all([
    (async () => {
      try {
        const res = await builtinToolService.getBuiltinTools()
        if (res && Array.isArray(res.data)) return res.data
        return MOCK_BUILTIN_PROVIDERS
      } catch (_e) {
        return MOCK_BUILTIN_PROVIDERS
      }
    })(),
    (async () => {
      try {
        const res = await apiToolService.getApiToolProvidersWithPage(1, 50, '')
        if (res?.data?.list && Array.isArray(res.data.list)) return res.data.list
        return MOCK_API_TOOLS
      } catch (_e) {
        return MOCK_API_TOOLS
      }
    })(),
  ])

  const builtinCards = await Promise.all(builtins.map(builtinProviderToCard))
  return [
    ...builtinCards,
    ...customs.map(apiProviderToCard),
  ]
}

/**
 * 4.3 懒加载插件详情（点击卡片时调用）
 * 分两条链路：
 *   - 内置：走接口 2.3 GET /builtin-tools/:provider/tools/:tool（如失败，从内置 mock 数据反查）
 *   - 自定义：走 2.10 GET /api-tools/:id 详情
 */
export const fetchPluginDetail = async (card: PluginCard): Promise<PluginDetail | null> => {
  if (!card?.pluginId) return null
  const parts = card.pluginId.split(':')
  const sourceName = parts[0] ?? ''
  const rawId = parts[1] ?? ''
  if (!sourceName || !rawId) return null

  // 分支 1：内置工具
  if (sourceName === 'builtin') {
    const providerName = rawId
    try {
      // 先拿内置工具的完整 provider 列表，取出第一个工具做详情展示
      // (因为接口 2.3 需要 provider+tool；卡片只有 provider 信息，这里默认取第一个工具，
      // 同时把 provider 下所有 tools 合并到 PluginDetail.tools，保证信息完整)
      const all = await builtinToolService.getBuiltinTools()
      const provider =
        (all?.data ?? []).find((p) => p.name === providerName) ??
        MOCK_BUILTIN_PROVIDERS.find((p) => p.name === providerName)
      if (!provider) return null

      // 如果有第一个工具 → 调 2.3 拿到完整详情(含 inputs/params) 兜底到工具自身
      const firstTool = provider.tools?.[0]
      let toolDetail: BuiltinToolDetail | null = null
      if (firstTool) {
        try {
          const res = await builtinToolService.getBuiltinToolDetail(provider.name, firstTool.name)
          toolDetail = res?.data ?? null
        } catch (_e) {
          // 详情接口失败 → 用 provider.tools[0] 兜底
        }
      }

      const usageWarning =
        providerName === 'google'
          ? '当用户想要翻译时，切勿使用此工具。'
          : undefined

      return {
        pluginId: card.pluginId,
        icon: card.icon,
        name: provider.label,
        provider: provider.label,
        toolCount: provider.tools?.length ?? 0,
        description: provider.description,
        usageWarning,
        tools: (provider.tools ?? []).map((t, idx) => {
          const primary = idx === 0 && toolDetail ? toolDetail : t
          return {
            toolId: `builtin:${provider.name}/${t.name}`,
            name: t.label ?? t.name,
            description: primary.description ?? '',
            params: (primary.inputs ?? []).map((i) => ({
              name: i.name,
              type: i.type,
              required: Boolean(i.required),
              description: i.description,
            })),
          }
        }),
      }
    } catch (_e) {
      // 全部失败 → 用本地 mock 详情兜底
      const provider = MOCK_BUILTIN_PROVIDERS.find((p) => p.name === providerName)
      if (!provider) return null
      return {
        pluginId: card.pluginId,
        icon: card.icon,
        name: provider.label,
        provider: provider.label,
        toolCount: provider.tools.length,
        description: provider.description,
        usageWarning: providerName === 'google' ? '当用户想要翻译时，切勿使用此工具。' : undefined,
        tools: provider.tools.map((t) => ({
          toolId: `builtin:${provider.name}/${t.name}`,
          name: t.label ?? t.name,
          description: t.description,
          params: t.inputs.map((i) => ({
            name: i.name,
            type: i.type,
            required: Boolean(i.required),
            description: i.description,
          })),
        })),
      }
    }
  }

  // 分支 2：自定义 API 工具
  if (sourceName === 'custom') {
    const providerId = rawId
    try {
      const res = await apiToolService.getApiToolProvider(providerId)
      const provider: ApiToolProviderData | undefined =
        res?.data ?? MOCK_API_TOOLS.find((m) => m.id === providerId)
      if (!provider) return null
      return {
        pluginId: card.pluginId,
        icon: provider.icon ?? card.icon,
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
      }
    } catch (_e) {
      const provider = MOCK_API_TOOLS.find((m) => m.id === providerId)
      if (!provider) return null
      return {
        pluginId: card.pluginId,
        icon: provider.icon,
        name: provider.name,
        provider: provider.name,
        toolCount: provider.tools.length,
        description: provider.description,
        tools: provider.tools.map((t) => ({
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
      }
    }
  }

  return null
}

/** 自定义插件默认 icon（当前无上传组件时的兜底） */
const DEFAULT_PLUGIN_ICON =
  'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=default%20blue%20plugin%20tool%20icon&image_size=square'

/** 请求头项 */
export interface PluginHeaderItem {
  key: string
  value: string
}

/**
 * 4.4 创建自定义插件（接口 2.7 POST /api-tools）
 * 成功后直接走 message 提示；失败时如果是网络错误则做 mock 成功提示，
 * 保证前端体验完整，后续刷新列表会从 mock 数据中拿到。
 */
export interface CreateCustomPluginPayload {
  name: string
  icon: string
  openapi_schema: string
  category: string
  headers: PluginHeaderItem[]
}
export const createCustomPlugin = async (payload: CreateCustomPluginPayload): Promise<boolean> => {
  const req = {
    name: payload.name,
    icon: payload.icon || DEFAULT_PLUGIN_ICON,
    openapi_schema: payload.openapi_schema,
    headers: payload.headers ?? [],
  }
  try {
    const res = await requestWithCode<BaseResponse<any>>('/api-tools', {
      method: 'POST',
      body: req,
    })
    if (res.code !== httpCode.success) {
      Message.error(res.message || '创建失败')
      return false
    }
    return true
  } catch (_e) {
    // 后端不可达 → 添加到 mock，使刷新页面可看到新卡片
    const newItem: ApiToolProviderData = {
      id: `custom-mock-${Date.now()}`,
      name: req.name,
      icon: req.icon,
      description: '自定义 API 工具（开发环境 Mock 创建）',
      openapi_schema: req.openapi_schema,
      headers: req.headers,
      tools: [] as ApiToolItem[],
      created_at: Math.floor(Date.now() / 1000),
    }
    MOCK_API_TOOLS.unshift(newItem)
    return true
  }
}

/**
 * 4.6 获取指定自定义 API 工具提供者信息（接口 2.10 GET /api-tools/:provider_id）
 */
export const getCustomPluginDetail = async (providerId: string): Promise<ApiToolProviderData | null> => {
  try {
    const res = await apiToolService.getApiToolProvider(providerId)
    return res?.data ?? null
  } catch (_e) {
    return MOCK_API_TOOLS.find((m) => m.id === providerId) ?? null
  }
}

/**
 * 4.7 更新自定义插件（接口 2.9 POST /api-tools/:provider_id）
 */
export interface UpdateCustomPluginPayload {
  name: string
  icon: string
  openapi_schema: string
  headers: PluginHeaderItem[]
}
export const updateCustomPlugin = async (
  providerId: string,
  payload: UpdateCustomPluginPayload,
): Promise<boolean> => {
  const req = {
    name: payload.name,
    icon: payload.icon || DEFAULT_PLUGIN_ICON,
    openapi_schema: payload.openapi_schema,
    headers: payload.headers ?? [],
  }
  try {
    const res = await requestWithCode<BaseResponse<any>>(`/api-tools/${providerId}`, {
      method: 'POST',
      body: req,
    })
    if (res.code !== httpCode.success) {
      Message.error(res.message || '更新失败')
      return false
    }
    return true
  } catch (_e) {
    // 后端不可达 → 仅更新本地 mock
    const idx = MOCK_API_TOOLS.findIndex((m) => m.id === providerId)
    if (idx >= 0) {
      MOCK_API_TOOLS[idx] = {
        ...MOCK_API_TOOLS[idx],
        name: req.name,
        icon: req.icon,
        openapi_schema: req.openapi_schema,
        headers: req.headers,
      } as ApiToolProviderData
    }
    return true
  }
}

/**
 * 4.8 删除自定义插件（接口 2.8 POST /api-tools/:provider_id/delete）
 */
export const deleteCustomPlugin = async (providerId: string): Promise<boolean> => {
  try {
    const res = await requestWithCode<BaseResponse<any>>(`/api-tools/${providerId}/delete`, {
      method: 'POST',
    })
    if (res.code !== httpCode.success) {
      Message.error(res.message || '删除失败')
      return false
    }
    return true
  } catch (_e) {
    // 后端不可达 → 从本地 mock 移除
    const idx = MOCK_API_TOOLS.findIndex((m) => m.id === providerId)
    if (idx >= 0) MOCK_API_TOOLS.splice(idx, 1)
    return true
  }
}

/** 从简化版 OpenAPI Schema 中解析可用工具列表 */
export interface ParsedTool {
  name: string
  description: string
  method: string
  path: string
}
export const parseOpenAPISchema = (schema: string): ParsedTool[] => {
  try {
    const obj = JSON.parse(schema)
    const paths = obj?.paths
    if (!paths || typeof paths !== 'object') return []
    const tools: ParsedTool[] = []
    Object.entries(paths).forEach(([path, methods]) => {
      if (!methods || typeof methods !== 'object') return
      Object.entries(methods as Record<string, any>).forEach(([method, config]) => {
        if (typeof config !== 'object' || !config) return
        tools.push({
          name: config.operationId || '',
          description: config.description || '',
          method: method.toLowerCase(),
          path,
        })
      })
    })
    return tools
  } catch {
    return []
  }
}

/**
 * 4.5 校验 OpenAPI Schema 字符串（接口 2.12 POST /api-tools/validate-openapi-schema）
 * 先做空值保护，避免空字符串发送到后端；后端返回业务错误时不 fallback，仅网络错误时做基础 JSON 解析兜底。
 */
export const validateSchema = async (schema: string): Promise<boolean> => {
  const trimmed = schema.trim()
  if (!trimmed) {
    Message.error('OpenAPI Schema 不能为空')
    return false
  }
  try {
    const res = await requestWithCode<BaseResponse<any>>('/api-tools/validate-openapi-schema', {
      method: 'POST',
      body: { openapi_schema: trimmed },
    })
    if (res.code !== httpCode.success) {
      Message.error(res.message || 'OpenAPI Schema 校验失败')
      return false
    }
    return true
  } catch (_e) {
    // 网络错误 fallback：仅做基础 JSON 解析校验
    try {
      const obj = JSON.parse(trimmed)
      if (obj && typeof obj === 'object') return true
      return false
    } catch {
      return false
    }
  }
}
