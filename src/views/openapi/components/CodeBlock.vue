<script setup lang="ts">
import { ref } from 'vue'
import { Message } from '@arco-design/web-vue'

/** 代码块组件：深色背景 + Copy 按钮 */
const props = withDefaults(
  defineProps<{
    /** 代码文本 */
    code: string
    /** 语言标签（shell / json 等） */
    lang?: string
  }>(),
  { lang: '' },
)

const copied = ref(false)

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(props.code)
    copied.value = true
    Message.success('已复制')
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    Message.error('复制失败')
  }
}
</script>

<template>
  <div class="code-block">
    <!-- 顶部栏：语言标签 + Copy 按钮 -->
    <div class="code-block-header">
      <span class="code-block-lang">{{ lang || 'text' }}</span>
      <a-button
        type="text"
        size="mini"
        :style="{ color: copied ? '#00b42a' : '#86909c' }"
        @click="handleCopy"
      >
        <template #icon>
          <icon-check v-if="copied" />
          <icon-copy v-else />
        </template>
        {{ copied ? '已复制' : 'Copy' }}
      </a-button>
    </div>
    <!-- 代码内容区 -->
    <div class="code-block-body">
      <span class="code-block-text">{{ code }}</span>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .code-block {
    @apply rounded-[8px] border border-[#2a2a2a] bg-[#1d2129] overflow-hidden;
  }
  .code-block-header {
    @apply flex items-center justify-between px-3 py-1.5
           border-b border-[#2a2a2a] bg-[#262626];
  }
  .code-block-lang {
    @apply text-[12px] text-[#86909c] select-none;
  }
  .code-block-body {
    @apply px-4 py-3 overflow-x-auto;
  }
  .code-block-text {
    @apply text-[13px] leading-[20px] text-[#c9cdd4]
           whitespace-pre font-mono break-all;
  }
}
</style>
