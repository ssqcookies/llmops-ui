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
  SPACEAPPSLIST:'SpaceAppsList',
  LOGIN:'login'
} as const

/** 默认分页参数 */
export const DEFAULT_PAGINATION = {
  page: 1,
  pageSize: 20,
} as const
