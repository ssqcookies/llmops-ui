<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue'
import type { VoiceConfig } from '../types'
import { getLanguageModel } from '@/services/language-model'

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

// ===== 动态音色列表：从 TTS 模型的 parameters 里读 voice 参数的 options =====
const voiceOptions = ref<{ label: string; value: string }[]>([])
const voiceLoading = ref(false)

const loadVoiceOptions = async () => {
  // 后端 TTS 固定使用 siliconflow / cosyvoice2-0.5b
  try {
    voiceLoading.value = true
    const resp = await getLanguageModel('siliconflow', 'cosyvoice2-0.5b')
    const params = resp.data?.parameters ?? []
    const voiceParam = params.find((p: any) => p.name === 'voice')
    voiceOptions.value = (voiceParam?.options ?? []).map((o: any) => ({
      label: o.label,
      value: String(o.value),
    }))
    // 若当前选中的音色不在选项里，重置为默认
    if (voiceOptions.value.length && !voiceOptions.value.some((o) => o.value === localConfig.value.voice)) {
      const defaultVoice = voiceParam?.default
      localConfig.value.voice = String(defaultVoice ?? voiceOptions.value[0].value)
    }
  } catch {
    // 接口失败时保留默认列表，不阻塞弹窗
  } finally {
    voiceLoading.value = false
  }
}

onMounted(loadVoiceOptions)

// 弹窗每次打开时刷新音色列表（模型可能更新）
watch(
  () => props.visible,
  (v) => {
    if (v && voiceOptions.value.length === 0) loadVoiceOptions()
  }
)
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
            :loading="voiceLoading"
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
