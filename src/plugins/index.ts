import type { App } from 'vue'
import { registerDirectives } from '@/directives'

/** 安装全局插件（指令、第三方插件等） */
export function setupPlugins(app: App): void {
  registerDirectives(app)
}
