<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ContentReviewConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config: ContentReviewConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', value: ContentReviewConfig): void
  (e: 'cancel'): void
}>()

const localConfig = ref<ContentReviewConfig>({ ...props.config })

watch(
  () => props.config,
  (val) => {
    localConfig.value = {
      ...val,
      keywords: [...val.keywords],
    }
  },
  { deep: true }
)

const handleOk = () => {
  emit('update:config', {
    ...localConfig.value,
    keywords: [...localConfig.value.keywords],
  })
}

const handleCancel = () => {
  emit('cancel')
}

const keywordsText = computed({
  get: () => localConfig.value.keywords.join('\n'),
  set: (val: string) => {
    localConfig.value.keywords = val
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
  },
})

const keywordsCharCount = computed(() => keywordsText.value.length)
</script>

<template>
  <a-modal
    :visible="visible"
    title="内容审查"
    :footer="false"
    :mask-closable="false"
    :width="600"
    class="rounded-lg shadow-sm"
    @cancel="handleCancel"
  >
    <div class="flex flex-col gap-6 py-2">
      <a-form :model="localConfig" layout="vertical">
        <a-form-item field="keywords" label="审查关键词">
          <a-textarea
            v-model="keywordsText"
            placeholder="每行输入一个关键词，最多 100 个字符"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            :max-length="100"
          />
          <div class="text-right text-xs text-gray-400 mt-1">
            {{ keywordsCharCount }} / 100
          </div>
        </a-form-item>

        <a-form-item field="reviewInput" label="审查输入内容">
          <a-switch v-model="localConfig.reviewInput" />
        </a-form-item>

        <a-form-item
          v-if="localConfig.reviewInput"
          field="presetReply"
          label="预设回复"
        >
          <a-textarea
            v-model="localConfig.presetReply"
            placeholder="当输入内容触发审查时，返回此预设回复"
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>

        <a-form-item field="reviewOutput" label="审查输出内容">
          <a-switch v-model="localConfig.reviewOutput" />
        </a-form-item>
      </a-form>

      <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">保存</a-button>
      </div>
    </div>
  </a-modal>
</template>
