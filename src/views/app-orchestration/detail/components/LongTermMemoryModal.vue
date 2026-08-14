<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LongTermMemoryConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config: LongTermMemoryConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', value: LongTermMemoryConfig): void
  (e: 'cancel'): void
}>()

const localConfig = ref<LongTermMemoryConfig>({ ...props.config })

watch(
  () => props.config,
  (val) => {
    localConfig.value = { ...val }
  },
  { deep: true }
)

const handleOk = () => {
  emit('update:config', { ...localConfig.value })
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="长期记忆"
    :footer="false"
    :mask-closable="false"
    :width="560"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-4 py-2">
      <a-alert type="info" class="rounded">
        长期记忆允许 Agent 跨对话记住用户偏好和重要信息，使交互更加个性化。
      </a-alert>

      <a-textarea
        v-model="localConfig.content"
        placeholder="请输入长期记忆内容，例如：用户偏好使用简体中文交流..."
        :auto-size="{ minRows: 8, maxRows: 16 }"
        :max-length="5000"
        show-word-limit
      />

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">更新记忆</a-button>
      </div>
    </div>
  </a-modal>
</template>
