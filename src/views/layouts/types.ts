/** DefaultLayout 布局专属类型定义 */
import type { Component } from 'vue'

/** 导航菜单项类型 */
export interface NavMenuItem {
  /** 唯一标识 */
  key: string
  /** 显示名称 */
  label: string
  /** 路由路径 */
  path: string
  /** 图标组件（非激活态） */
  icon: Component
  /** 图标组件（激活态） */
  iconActive?: Component
  /** 分组名，不传则不分组 */
  group?: string
}

/** 当前登录用户信息 */
export interface CurrentUser {
  /** 用户ID */
  id: string
  /** 用户名 / 昵称 */
  name: string
  /** 绑定邮箱 */
  email: string
  /** 头像URL */
  avatar?: string
}

/** 全局弹窗统一状态 */
export interface LayoutDialogs {
  /** 账号设置弹窗 */
  accountSettings: boolean
  /** 退出登录确认弹窗 */
  logoutConfirm: boolean
}
