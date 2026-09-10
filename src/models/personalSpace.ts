/**
 * 个人空间模块类型定义
 * 包含 4 个 Tab：AI应用 / 插件 / 工作流 / 知识库
 */

/** 个人空间 Tab key 枚举 */
export type PersonalSpaceTab = 'apps' | 'plugins' | 'workflows' | 'knowledge'

/** Tab 选项定义 */
export interface PersonalTabOption {
  /** Tab key */
  key: PersonalSpaceTab
  /** 显示文案 */
  label: string
  /** 搜索框占位符 */
  searchPlaceholder: string
  /** 右上角创建按钮文案 */
  createBtnText: string
}

/** ========== 通用卡片基础信息 ========== */
interface BaseCard {
  /** 卡片ID */
  id: string
  /** 卡片图标URL */
  icon: string
  /** 卡片名称 */
  name: string
  /** 描述（2行截断） */
  description: string
  /** 所有者/发布者信息 */
  owner: {
    /** 头像URL（为空时展示首个汉字） */
    avatar?: string
    /** 名称 */
    name: string
  }
  /** 最近编辑时间（MM-DD HH:mm） */
  lastEditTime: string
  /** 是否启用绿色对勾徽章 */
  verified?: boolean
}

/** ========== Tab 1：AI应用卡片 ========== */
export interface AppCard extends BaseCard {
  /** 模型提供商 + 模型规格（例：月之暗面 · Moonshot (128K)） */
  modelInfo: string
}

/** AI应用卡片操作菜单枚举 */
export type AppCardAction = 'analyze' | 'edit' | 'copy' | 'delete'

/** ========== Tab 2：插件卡片 ========== */
export interface PluginSpaceCard extends BaseCard {
  /** 提供商 */
  provider: string
  /** 包含工具数量 */
  toolCount: number
}

/** 插件卡片操作菜单枚举 */
export type PluginCardAction = 'settings' | 'delete'

/** ========== Tab 3：工作流卡片 ========== */
export interface WorkflowCard extends BaseCard {
  /** 工作流显示名称 */
  workflowName: string
  /** 节点数量 */
  nodeCount: number
}

/** 工作流卡片操作菜单枚举 */
export type WorkflowCardAction = 'edit' | 'delete'

/** ========== Tab 4：知识库卡片 ========== */
export interface KnowledgeCard extends BaseCard {
  /** 文档数量 */
  docCount: number
  /** 字符总数（单位：千字符） */
  totalCharsK: number
  /** 关联应用数量 */
  linkedAppCount: number
}

/** 知识库卡片操作菜单枚举 */
export type KnowledgeCardAction = 'settings' | 'delete'

/** ========== 列表查询参数 ========== */
export interface PersonalListQuery {
  /** 搜索关键词 */
  keyword: string
  /** 分页（预留） */
  page: number
  pageSize: number
}
