import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { storage } from '@/utils'

const TOKEN_KEY = 'token'
const PERMISSIONS_KEY = 'permissions'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(storage.get<string>(TOKEN_KEY, ''))
  const permissions = ref<string[]>(storage.get<string[]>(PERMISSIONS_KEY, []))

  const isLogin = computed(() => Boolean(token.value))

  function setToken(value: string): void {
    token.value = value
    storage.set(TOKEN_KEY, value)
  }

  function setPermissions(list: string[]): void {
    permissions.value = list
    storage.set(PERMISSIONS_KEY, list)
  }

  function logout(): void {
    token.value = ''
    permissions.value = []
    storage.remove(TOKEN_KEY)
    storage.remove(PERMISSIONS_KEY)
  }

  return { token, permissions, isLogin, setToken, setPermissions, logout }
})
