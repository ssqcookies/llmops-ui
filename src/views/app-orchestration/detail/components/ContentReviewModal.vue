<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { ContentReviewConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config: ContentReviewConfig
}>()

const emit = defineEmits<{
  (e: 'update:config', value: ContentReviewConfig): void
  (e: 'cancel'): void
}>()

/** 关键词数量上限 */
const MAX_KEYWORDS = 100

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

/** 关键词文本：每行一个，按换行符分割 */
const keywordsText = computed({
  get: () => localConfig.value.keywords.join('\n'),
  set: (val: string) => {
    localConfig.value.keywords = val
      .split('\n')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, MAX_KEYWORDS)
  },
})

/** 当前关键词数量（按非空行计数） */
const keywordsCount = computed(() => localConfig.value.keywords.length)

const handleOk = () => {
  if (localConfig.value.keywords.length === 0) {
    Message.warning('请输入关键词')
    return
  }
  emit('update:config', {
    ...localConfig.value,
    keywords: [...localConfig.value.keywords],
  })
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <a-modal
    :visible="visible"
    :footer="false"
    :mask-closable="false"
    :width="640"
    :closable="true"
    @cancel="handleCancel"
  >
    <template #title>
      <span class="text-[18px] font-medium text-[#1d2129]">内容审查</span>
    </template>

    <div class="flex flex-col gap-5 py-1">
      <!-- 关键词 -->
      <div>
        <div class="mb-1 flex items-center gap-0.5">
          <span class="text-[15px] font-medium text-[#1d2129]">关键词</span>
          <span class="text-[#f53f3f]">*</span>
        </div>
        <div class="mb-2 text-[13px] leading-[20px] text-[#86909c]">
          每行一个，用换行符分割。最多填写100个关键词
        </div>
        <div class="relative">
          <a-textarea
            v-model="keywordsText"
            placeholder="每行一个，用换行符分隔"
            :auto-size="{ minRows: 4, maxRows: 8 }"
            class="keywords-textarea"
          />
          <span
            class="pointer-events-none absolute bottom-2 right-3 text-[13px] leading-[20px] text-[#86909c]"
          >
            {{ keywordsCount }}/{{ MAX_KEYWORDS }}
          </span>
        </div>
      </div>

      <!-- 审查输入内容 -->
      <div class="rounded-lg border border-[#f2f3f5] bg-[#f7f8fa] px-6 py-5">
        <div class="flex items-center justify-between">
          <span class="text-[15px] text-[#1d2129]">审查输入内容</span>
          <a-switch v-model="localConfig.reviewInput" />
        </div>
        <div :class="['mt-4', localConfig.reviewInput ? '' : 'pointer-events-none opacity-50']">
          <div class="mb-2 text-[14px] text-[#1d2129]">预设回复</div>
          <a-textarea
            v-model="localConfig.presetReply"
            placeholder="这里是预设回复内容"
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </div>
      </div>

      <!-- 审查输出内容 -->
      <div class="rounded-lg border border-[#f2f3f5] bg-[#f7f8fa] px-6 py-5">
        <div class="flex items-center justify-between">
          <span class="text-[15px] text-[#1d2129]">审查输出内容</span>
          <a-switch v-model="localConfig.reviewOutput" />
        </div>
      </div>

      <!-- 底部按钮 -->
      <div class="flex justify-end gap-3 pt-3">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">保存</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
@reference "tailwindcss";

/* 为右下角关键词计数预留空间，避免与输入文字重叠 */
.keywords-textarea :deep(.arco-textarea) {
  @apply pb-7;
}
</style>
