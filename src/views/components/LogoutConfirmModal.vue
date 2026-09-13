<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAccountStore, useCredentialStore } from '@/stores'
import { logout } from '@/services/auth'
import storage from '@/utils/storage'
import { useRouter } from 'vue-router'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const accountStore = useAccountStore()
const credentialStore = useCredentialStore()
const router = useRouter()

/** 确认按钮loading */
const confirmLoading = ref(false)

watch(
  () => props.visible,
  (val) => {
    if (val) confirmLoading.value = false
  },
)

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

/** 清理所有前端登录态：store + localStorage + cookie */
const clearAuthState = () => {
  // 1. 清理 Pinia store（同时会清掉 storage 中的 account / credential 键）
  accountStore.clear()
  credentialStore.clear()
  // 2. 清理 localStorage 全部缓存
  storage.clear()
  // 3. 清理 document.cookie（遍历删除所有 cookie）
  document.cookie.split(';').forEach((cookie) => {
    const name = cookie.split('=')[0]?.trim()
    if (!name) return
    // 同名 cookie 在不同 path / domain 下可能残留，逐一遍历常见 path 清理
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`
  })
}

/** 确认退出 */
const handleConfirm = async () => {
  confirmLoading.value = true
  try {
    // 调用后端退出接口（清理服务端 session / cookie）
    await logout()
  } catch {
    // 接口失败仍继续清理前端状态，保证用户能退出
  } finally {
    clearAuthState()
    confirmLoading.value = false
    handleClose()
    router.replace('/auth/login')
  }
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="确认退出"
    :mask-closable="false"
    @before-close="handleClose"
    @ok="handleConfirm"
    @cancel="handleClose"
    :confirm-loading="confirmLoading"
    ok-text="确认退出"
    cancel-text="取消"
  >
    <div class="logout-confirm-body">
      <span class="logout-warning-icon">
        <icon-exclamation-circle-fill :size="22" />
      </span>
      <span class="logout-confirm-text">
        确定要退出当前账号吗？退出后需要重新登录才能继续使用。
      </span>
    </div>
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .logout-confirm-body {
    @apply flex items-start gap-3 py-2;
  }
  .logout-warning-icon {
    @apply shrink-0 text-[#ff7d00] mt-0.5;
  }
  .logout-confirm-text {
    @apply text-[14px] text-[#1d2129] leading-6;
  }
}
</style>
