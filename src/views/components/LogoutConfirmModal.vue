<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAccountStore } from '@/stores'
import { useRouter } from 'vue-router'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const authStore = useAccountStore()
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

/** 确认退出 */
const handleConfirm = () => {
  confirmLoading.value = true
  // TODO: 预留接口调用位置 - 退出登录
  setTimeout(() => {
    authStore.clear()
    confirmLoading.value = false
    handleClose()
    router.replace('/auth/login')
  }, 800)
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
    <div class="flex items-start gap-3 py-2">
      <a-alert type="warning" :show-icon="true" />
      <span class="text-[14px] text-[#4e5969] leading-6">
        确定要退出当前账号吗？退出后需要重新登录才能继续使用。
      </span>
    </div>
  </a-modal>
</template>
