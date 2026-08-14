<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VoiceConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config: VoiceConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', value: VoiceConfig): void
  (e: 'cancel'): void
}>()

const localConfig = ref<VoiceConfig>({ ...props.config })

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

const voiceOptions = [
  { label: '晓晓（女声·亲和）', value: '晓晓' },
  { label: '云扬（男声·磁性）', value: '云扬' },
  { label: '晓伊（女声·甜美）', value: '晓伊' },
  { label: '云健（男声·沉稳）', value: '云健' },
  { label: '晓梦（女声·温柔）', value: '晓梦' },
  { label: '云帅（男声·阳光）', value: '云帅' },
]
</script>

<template>
  <a-modal
    :visible="visible"
    title="语音输出"
    :footer="false"
    :mask-closable="false"
    :width="560"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-6 py-2">
      <a-form :model="localConfig" layout="vertical">
        <a-form-item field="voice" label="音色">
          <a-select
            v-model="localConfig.voice"
            :options="voiceOptions"
            placeholder="请选择音色"
            allow-search
          />
        </a-form-item>

        <a-form-item field="autoPlay" label="自动播放">
          <a-switch v-model="localConfig.autoPlay" />
        </a-form-item>
      </a-form>

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">保存</a-button>
      </div>
    </div>
  </a-modal>
</template>
