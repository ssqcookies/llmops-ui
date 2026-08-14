<script setup lang="ts">
import { ref, watch } from 'vue'
import type { ModelConfig } from '../types'

const props = defineProps<{
  visible: boolean
  modelConfig: ModelConfig
}>()

const emit = defineEmits<{
  (e: 'update:modelConfig', value: ModelConfig): void
  (e: 'cancel'): void
}>()

const localConfig = ref<ModelConfig>({ ...props.modelConfig })

watch(
  () => props.modelConfig,
  (val) => {
    localConfig.value = { ...val }
  },
  { deep: true }
)

const handleOk = () => {
  emit('update:modelConfig', { ...localConfig.value })
}

const handleCancel = () => {
  emit('cancel')
}

const modelOptions = [
  { label: 'GPT-4o', value: 'GPT-4o' },
  { label: 'GPT-4o Mini', value: 'GPT-4o Mini' },
  { label: 'GPT-4 Turbo', value: 'GPT-4 Turbo' },
  { label: 'Claude 3.5 Sonnet', value: 'Claude 3.5 Sonnet' },
  { label: 'Gemini 1.5 Pro', value: 'Gemini 1.5 Pro' },
]
</script>

<template>
  <a-modal
    :visible="visible"
    title="模型设置"
    :footer="false"
    :mask-closable="false"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-6 py-2">
      <a-form :model="localConfig" layout="vertical">
        <a-form-item field="model" label="模型">
          <a-select
            v-model="localConfig.model"
            :options="modelOptions"
            placeholder="请选择模型"
            allow-search
          />
        </a-form-item>

        <a-form-item field="temperature" label="温度">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="topP" label="Top P">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.topP"
              :min="0"
              :max="1"
              :step="0.01"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.topP"
              :min="0"
              :max="1"
              :step="0.01"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="presencePenalty" label="存在惩罚">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.presencePenalty"
              :min="-2"
              :max="2"
              :step="0.1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.presencePenalty"
              :min="-2"
              :max="2"
              :step="0.1"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="frequencyPenalty" label="频率惩罚">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.frequencyPenalty"
              :min="-2"
              :max="2"
              :step="0.1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.frequencyPenalty"
              :min="-2"
              :max="2"
              :step="0.1"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="contextRounds" label="携带上下文轮数">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.contextRounds"
              :min="0"
              :max="50"
              :step="1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.contextRounds"
              :min="0"
              :max="50"
              :step="1"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="maxReplyLength" label="最大回复长度">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.maxReplyLength"
              :min="1"
              :max="128000"
              :step="1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.maxReplyLength"
              :min="1"
              :max="128000"
              :step="1"
              class="w-28"
            />
          </div>
        </a-form-item>
      </a-form>

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">确定</a-button>
      </div>
    </div>
  </a-modal>
</template>
