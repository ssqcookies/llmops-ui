import type { Directive, DirectiveBinding } from 'vue'
import { useAuthStore } from '@/stores'

/**
 * v-permission 按钮级权限指令
 * 用法：v-permission="'model:create'" 或 v-permission="['model:create', 'model:read']"
 */
function check(binding: DirectiveBinding<string | string[]>): boolean {
  const authStore = useAuthStore()
  const required = Array.isArray(binding.value) ? binding.value : [binding.value]
  return required.some((perm) => authStore.permissions.includes(perm))
}

export const permission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    if (!check(binding)) {
      el.parentNode?.removeChild(el)
    }
  },
}
