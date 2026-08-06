import type { App, Directive } from 'vue'
import { permission } from './permission'

/** 全局自定义指令注册表 */
const directives: Record<string, Directive> = {
  permission,
}

export function registerDirectives(app: App): void {
  Object.entries(directives).forEach(([name, directive]) => {
    app.directive(name, directive)
  })
}
