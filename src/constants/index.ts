/**
 * 全局常量统一导出
 * 枚举、业务常量在此维护
 */
export {}
/** 全局常量定义 */

/** 应用元信息 */
export const APP_META = {
  title: 'LLM Ops UI',
  version: '0.0.0',
} as const

/** 路由名称枚举 */
export const ROUTE_NAME = {
  HOME: 'Home',
  NOT_FOUND: 'NotFound',
  FORBIDDEN: 'Forbidden',
  SPACEAPPSLIST:'SpaceAppsList',
  LOGIN:'login',
  APP_ORCHESTRATION_DETAIL: 'AppOrchestrationDetail',
  PLUGIN: 'PluginSquare',
  PERSONAL_SPACE: 'PersonalSpace',
  KNOWLEDGE_DETAIL: 'KnowledgeDetail',
  KNOWLEDGE_DOCUMENT_DETAIL: 'KnowledgeDocumentDetail',
  KNOWLEDGE_ADD_FILE: 'KnowledgeAddFile',
  OPEN_API: 'OpenApi',
  APP_SQUARE: 'AppSquare',
  WEB_APP: 'WebApp',
} as const

/** 默认分页参数 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
} as const
