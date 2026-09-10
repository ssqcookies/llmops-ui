/**
 * 插件广场模块 - 类型定义（按 AGENTS.md 规范放 models 目录）
 */

/** 插件分类枚举值 */
export type PluginCategory =
  | 'all'
  | 'news'
  | 'photo'
  | 'tool'
  | 'web_search'

/** 分类选项（用于Tab渲染） */
export interface CategoryOption {
  /** 分类 value */
  value: PluginCategory
  /** 分类显示标签 */
  label: string
}

/** 插件卡片信息（列表项） */
export interface PluginCard {
  /** 插件ID */
  pluginId: string
  /** 插件图标URL */
  icon: string
  /** 插件名称 */
  name: string
  /** 提供商名称 */
  provider: string
  /** 包含工具数量 */
  toolCount: number
  /** 插件描述（1-2行，列表中会省略号截断） */
  description: string
  /** 发布者信息 */
  publisher: {
    avatar: string
    name: string
  }
  /** 发布时间（格式 MM-DD HH:mm） */
  publishTime: string
  /** 所属分类 */
  category: PluginCategory
}

/** 工具参数信息 */
export interface ToolParam {
  /** 参数名 */
  name: string
  /** 参数类型 */
  type: string
  /** 是否必填 */
  required: boolean
  /** 参数描述 */
  description?: string
}

/** 工具详情（抽屉面板中的子工具条目） */
export interface ToolDetail {
  /** 工具ID */
  toolId: string
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 参数列表 */
  params: ToolParam[]
}

/** 插件详情（抽屉面板完整数据） */
export interface PluginDetail {
  /** 插件ID */
  pluginId: string
  /** 插件图标URL */
  icon: string
  /** 插件名称 */
  name: string
  /** 提供商名称 */
  provider: string
  /** 包含工具数量 */
  toolCount: number
  /** 插件完整描述（多行展示不截断） */
  description: string
  /** 使用限制提示，特殊样式标注 */
  usageWarning?: string
  /** 包含的工具列表 */
  tools: ToolDetail[]
}

/** 插件列表查询参数（AND：分类 + 关键词 + 分页） */
export interface PluginListQuery {
  /** 分类筛选 */
  category: PluginCategory
  /** 搜索关键词 */
  keyword: string
  /** 分页-页码 */
  page: number
  /** 分页-每页数量 */
  pageSize: number
}
