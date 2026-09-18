<script setup lang="ts">
import { ref } from 'vue'
import ApiKeyPanel from './components/ApiKeyPanel.vue'
import QuickStartPanel from './components/QuickStartPanel.vue'

/** 当前激活的 Tab：quick-start / api-key */
const activeTab = ref<'quick-start' | 'api-key'>('quick-start')
</script>

<template>
  <div class="openapi-page">
    <!-- 页面头部：标题 + 副标题 -->
    <div class="openapi-header">
      <span class="openapi-title">开放API</span>
      <span class="openapi-subtitle">利用开放 API 快速与企业现有业务对接</span>
    </div>

    <!-- Tab 切换栏 -->
    <div class="openapi-tabs">
      <div
        class="tab-item"
        :class="{ 'tab-item-active': activeTab === 'quick-start' }"
        @click="activeTab = 'quick-start'"
      >
        快速开始
      </div>
      <div
        class="tab-item"
        :class="{ 'tab-item-active': activeTab === 'api-key' }"
        @click="activeTab = 'api-key'"
      >
        秘钥
      </div>
    </div>

    <!-- 内容区 -->
    <div class="openapi-content">
      <QuickStartPanel v-if="activeTab === 'quick-start'" />
      <ApiKeyPanel v-else />
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .openapi-page {
    @apply min-h-screen bg-[#f7f8fa] px-8 py-6;
  }
  .openapi-header {
    @apply flex items-baseline gap-3 mb-5;
  }
  .openapi-title {
    @apply text-[20px] font-semibold text-[#1d2129] leading-7;
  }
  .openapi-subtitle {
    @apply text-[13px] text-[#86909c] leading-5;
  }
  .openapi-tabs {
    @apply flex items-center gap-1 border-b border-[#e5e6eb] mb-5;
  }
  .tab-item {
    @apply relative px-4 py-2 text-[14px] text-[#4e5969]
           cursor-pointer transition-colors
           hover:text-[#165dff];
  }
  .tab-item-active {
    @apply text-[#165dff] font-medium;
  }
  .tab-item-active::after {
    content: '';
    @apply absolute left-0 right-0 bottom-[-1px] h-[2px] bg-[#165dff] rounded-[1px];
  }
  .openapi-content {
    @apply bg-white rounded-[8px] border border-[#e5e6eb] shadow-[0_1px_2px_rgba(0,0,0,0.04)] p-6 min-h-[500px];
  }
}
</style>
