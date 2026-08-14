<script setup lang="ts">
import { ref, watch } from 'vue'
import type { RetrievalConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config: RetrievalConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', value: RetrievalConfig): void
  (e: 'cancel'): void
}>()

const localConfig = ref<RetrievalConfig>({ ...props.config })

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
    title="检索设置"
    :footer="false"
    :mask-closable="false"
    :width="560"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-6 py-2">
      <a-form :model="localConfig" layout="vertical">
        <a-form-item field="strategy" label="检索策略">
          <a-radio-group v-model="localConfig.strategy" type="button">
            <a-radio value="hybrid">混合检索</a-radio>
            <a-radio value="vector">向量检索</a-radio>
            <a-radio value="fulltext">全文检索</a-radio>
          </a-radio-group>
        </a-form-item>

        <a-form-item field="maxRecall" label="最大召回数量">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.maxRecall"
              :min="1"
              :max="50"
              :step="1"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.maxRecall"
              :min="1"
              :max="50"
              :step="1"
              class="w-28"
            />
          </div>
        </a-form-item>

        <a-form-item field="minMatchScore" label="最小匹配度">
          <div class="flex items-center gap-4">
            <a-slider
              v-model="localConfig.minMatchScore"
              :min="0"
              :max="1"
              :step="0.01"
              class="flex-1"
            />
            <a-input-number
              v-model="localConfig.minMatchScore"
              :min="0"
              :max="1"
              :step="0.01"
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
