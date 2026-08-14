<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const handleConfirm = () => {
  emit('confirm')
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="要取消发布该 Agent 应用吗？"
    :footer="false"
    :mask-closable="false"
    :width="480"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-6 py-2">
      <div class="flex items-start gap-3 p-4 rounded-md bg-orange-50 border border-orange-200">
        <icon-exclamation-circle-fill class="text-orange-500 mt-0.5" :size="20" />
        <span class="text-sm text-orange-700 leading-relaxed">
          取消发布后，WebApp 以及发布的社交媒体平台均无法使用该 Agent，如需更新 WebApp 地址，请使用地址重生成功能。
        </span>
      </div>

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" status="danger" @click="handleConfirm">确认</a-button>
      </div>
    </div>
  </a-modal>
</template>
