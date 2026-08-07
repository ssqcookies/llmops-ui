<script setup lang="ts">
import { ref, reactive } from 'vue'
import type { AppConfig } from '../types'

const config = reactive<AppConfig>({
  appId: 'app-001',
  appName: '智能客服助手',
  appIcon: '',
  appDescription: '基于大语言模型的智能客服应用，支持多轮对话、知识库检索和工作流编排。',
  appType: 'chatbot',
  apiKey: 'sk-****l3x9',
  endpoint: 'https://api.llmops.com/v1/app/app-001',
})

const appTypes = [
  { value: 'chatbot', label: '聊天机器人' },
  { value: 'workflow', label: '工作流应用' },
  { value: 'agent', label: '智能体' },
  { value: 'rag', label: 'RAG 应用' },
]

const copiedKey = ref(false)
const copiedEndpoint = ref(false)

function copyText(text: string, target: 'key' | 'endpoint') {
  navigator.clipboard.writeText(text).then(() => {
    if (target === 'key') {
      copiedKey.value = true
      setTimeout(() => { copiedKey.value = false }, 2000)
    } else {
      copiedEndpoint.value = true
      setTimeout(() => { copiedEndpoint.value = false }, 2000)
    }
  })
}

function handleIconUpload() {
  console.log('上传应用图标')
}
</script>

<template>
  <div class="p-5">
    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">应用名称</label>
      <input
        v-model="config.appName"
        type="text"
        placeholder="请输入应用名称"
        class="w-full px-3 py-2 border border-[#e5e6eb] rounded-md text-sm outline-none focus:border-[#1677ff] transition-colors"
      />
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">应用图标</label>
      <div
        class="w-20 h-20 border border-dashed border-[#e5e6eb] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#1677ff] transition-colors"
        @click="handleIconUpload"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#86909c"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span class="text-xs text-[#86909c] mt-1">上传图标</span>
      </div>
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">应用描述</label>
      <textarea
        v-model="config.appDescription"
        rows="3"
        placeholder="请输入应用描述"
        class="w-full px-3 py-2 border border-[#e5e6eb] rounded-md text-sm outline-none focus:border-[#1677ff] transition-colors resize-none"
      />
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">应用类型</label>
      <div class="relative">
        <select
          v-model="config.appType"
          class="appearance-none w-full px-3 py-2 pr-8 border border-[#e5e6eb] rounded-md text-sm bg-white text-[#1d2129] cursor-pointer outline-none focus:border-[#1677ff]"
        >
          <option v-for="t in appTypes" :key="t.value" :value="t.value">
            {{ t.label }}
          </option>
        </select>
        <svg
          class="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86909c] pointer-events-none"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">API 密钥</label>
      <div class="flex items-center gap-2">
        <input
          type="text"
          :value="config.apiKey"
          readonly
          class="flex-1 px-3 py-2 border border-[#e5e6eb] rounded-md text-sm bg-[#f7f8fa] text-[#4e5969] cursor-default"
        />
        <button
          class="flex items-center gap-1 px-3 py-2 border border-[#e5e6eb] rounded-md text-sm text-[#4e5969] hover:text-[#1677ff] hover:border-[#1677ff] transition-colors flex-shrink-0"
          @click="copyText(config.apiKey, 'key')"
        >
          <svg
            v-if="!copiedKey"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00b42a"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ copiedKey ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>

    <div class="rounded-lg border border-[#e5e6eb] p-5 mb-4">
      <label class="font-medium text-sm text-[#1d2129] mb-2 block">接入端点</label>
      <div class="flex items-center gap-2">
        <input
          type="text"
          :value="config.endpoint"
          readonly
          class="flex-1 px-3 py-2 border border-[#e5e6eb] rounded-md text-sm bg-[#f7f8fa] text-[#4e5969] cursor-default"
        />
        <button
          class="flex items-center gap-1 px-3 py-2 border border-[#e5e6eb] rounded-md text-sm text-[#4e5969] hover:text-[#1677ff] hover:border-[#1677ff] transition-colors flex-shrink-0"
          @click="copyText(config.endpoint, 'endpoint')"
        >
          <svg
            v-if="!copiedEndpoint"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <svg
            v-else
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#00b42a"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{{ copiedEndpoint ? '已复制' : '复制' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>