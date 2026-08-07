<script setup lang="ts">
import { computed } from 'vue'
import type { TabKey, AutoSaveStatus } from '../types'

const props = defineProps<{
  activeTab: TabKey
  autoSaveStatus: AutoSaveStatus
  modelName: string
}>()

const emit = defineEmits<{
  (e: 'update:activeTab', tab: TabKey): void
  (e: 'save'): void
  (e: 'openPublishHistory'): void
  (e: 'openModelSettings'): void
  (e: 'updatePublish'): void
}>()

const tabs: { key: TabKey; label: string }[] = [
  { key: 'orchestrate', label: '编排' },
  { key: 'publish', label: '发布' },
  { key: 'config', label: '配置' },
  { key: 'statistics', label: '统计分析' },
]

const saveStatusText = computed(() => {
  switch (props.autoSaveStatus.autoSaveStatus) {
    case 'saved':
      return '已保存'
    case 'saving':
      return '保存中…'
    case 'dirty':
      return '有未保存的更改'
    default:
      return ''
  }
})

const dotColor = computed(() => {
  switch (props.autoSaveStatus.autoSaveStatus) {
    case 'saved':
      return 'bg-green-500'
    case 'saving':
      return 'bg-amber-500'
    case 'dirty':
      return 'bg-gray-400'
    default:
      return 'bg-gray-400'
  }
})

function selectTab(tab: TabKey) {
  emit('update:activeTab', tab)
}
</script>

<template>
  <header class="h-14 flex items-center justify-between px-5 bg-white border-b border-[#e5e6eb]">
    <div class="flex items-center gap-2 flex-shrink-0">
      <button
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition cursor-pointer"
        title="返回"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span class="text-sm font-medium text-gray-900">聊天机器人</span>

      <span class="text-gray-300 mx-1">|</span>

      <button
        class="flex items-center gap-1 text-sm text-gray-600 hover:text-[#1677ff] transition cursor-pointer"
        @click="emit('openModelSettings')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 10v6m4.22-13.78l4.24-4.24M3.54 20.46l4.24-4.24m0-8.48L3.54 3.54m16.92 16.92l-4.24-4.24" />
        </svg>
        <span>{{ modelName }}</span>
      </button>
    </div>

    <nav class="flex items-center gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="px-5 py-2 rounded-md text-sm cursor-pointer transition"
        :class="
          activeTab === tab.key
            ? 'bg-[rgba(22,93,255,0.08)] text-[#1677ff] font-medium'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        "
        @click="selectTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="flex items-center gap-3 flex-shrink-0">
      <div class="flex items-center gap-1.5 text-xs text-gray-500">
        <span class="w-1.5 h-1.5 rounded-full" :class="dotColor"></span>
        <span>{{ saveStatusText }}</span>
        <span v-if="autoSaveStatus.lastSavedTime" class="text-gray-400">{{ autoSaveStatus.lastSavedTime }}</span>
      </div>

      <button
        class="flex items-center justify-center w-8 h-8 rounded-md hover:bg-gray-100 transition cursor-pointer text-gray-500 hover:text-gray-700"
        title="发布历史"
        @click="emit('openPublishHistory')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </button>

      <button
        class="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[#1677ff] text-white text-sm font-medium hover:bg-[#0e5cd6] transition cursor-pointer"
        @click="emit('updatePublish')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
        <span>更新发布</span>
      </button>
    </div>
  </header>
</template>