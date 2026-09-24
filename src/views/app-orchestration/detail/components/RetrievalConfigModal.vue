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
  { deep: true },
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
    :width="520"
    :closable="true"
    @cancel="handleCancel"
  >
    <div class="py-4 px-1 flex flex-col gap-6">
      <!-- 检索策略 -->
      <div>
        <div class="flex items-center gap-1.5 mb-3">
          <span class="text-[14px] text-[#1d2129]">检索策略</span>
          <a-tooltip content="选择知识库内容的召回方式">
            <icon-info-circle class="text-[#c9cdd4] text-[13px] cursor-pointer" />
          </a-tooltip>
        </div>
        <a-radio-group v-model="localConfig.strategy">
          <a-radio value="hybrid">混合检索</a-radio>
          <a-radio value="vector">向量检索</a-radio>
          <a-radio value="fulltext">全文检索</a-radio>
        </a-radio-group>
      </div>

      <!-- 最大召回数量 -->
      <div>
        <div class="flex items-center gap-1.5 mb-3">
          <span class="text-[14px] text-[#1d2129]">最大召回数量</span>
          <a-tooltip content="单次检索最多返回的知识片段数量">
            <icon-info-circle class="text-[#c9cdd4] text-[13px] cursor-pointer" />
          </a-tooltip>
        </div>
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
            class="w-20"
          />
        </div>
      </div>

      <!-- 最小匹配度 -->
      <div>
        <div class="flex items-center gap-1.5 mb-3">
          <span class="text-[14px] text-[#1d2129]">最小匹配度</span>
          <a-tooltip content="只有相似度超过该阈值的结果才会被返回">
            <icon-info-circle class="text-[#c9cdd4] text-[13px] cursor-pointer" />
          </a-tooltip>
        </div>
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
            class="w-20"
          />
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="flex justify-end gap-2 pt-3 border-t border-[#f2f3f5]">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" @click="handleOk">确定</a-button>
    </div>
  </a-modal>
</template>
