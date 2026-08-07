<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { ChatMessage } from '../types'

const props = defineProps<{
  messages: ChatMessage[]
}>()

type PreviewTab = 'preview' | 'memory'

const inputText = ref('')
const activeTab = ref<PreviewTab>('preview')
const MAX_CHARS = 2000
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const messageListRef = ref<HTMLElement | null>(null)

const quickQuestions = [
  '介绍一下你们的产品',
  '如何申请售后服务?',
  '你们支持哪些支付方式?',
  '如何联系人工客服?',
]

const charCount = computed(() => inputText.value.length)
const messageCount = computed(() => props.messages.length)

function scrollToBottom() {
  nextTick(() => {
    if (messageListRef.value) {
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight
    }
  })
}

function handleSend() {
  if (!inputText.value.trim()) return
  inputText.value = ''
  scrollToBottom()
}

function handleQuickQuestion(q: string) {
  inputText.value = q
  handleSend()
}

function handleStop() {
  // TODO: 停止响应
}

function handleClear() {
  inputText.value = ''
}

function handleUpload() {
  // TODO: 实现图片上传
}

function adjustTextareaHeight() {
  const el = textareaRef.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 h-12 border-b border-[#e5e6eb] flex-shrink-0">
      <div class="flex items-center gap-3">
        <h3 class="text-[14px] font-semibold text-[#1d2129]">预览与调试</h3>
        <div class="flex items-center gap-1 h-7 p-0.5 bg-[#f2f3f5] rounded">
          <button
            class="px-3 h-6 text-[12px] rounded transition-colors"
            :class="activeTab === 'preview' ? 'bg-white text-[#1677ff] shadow-sm font-medium' : 'text-[#4e5969] hover:text-[#1d2129]'"
            @click="activeTab = 'preview'"
          >
            调试
          </button>
          <button
            class="px-3 h-6 text-[12px] rounded transition-colors"
            :class="activeTab === 'memory' ? 'bg-white text-[#1677ff] shadow-sm font-medium' : 'text-[#4e5969] hover:text-[#1d2129]'"
            @click="activeTab = 'memory'"
          >
            长期记忆
          </button>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
          title="停止响应"
          @click="handleStop"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="6" y="6" width="12" height="12" rx="1"/>
          </svg>
        </button>
        <span class="text-[12px] text-[#86909c]">{{ messageCount }} 条消息</span>
      </div>
    </header>

    <!-- Message List -->
    <main
      ref="messageListRef"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0"
    >
      <template v-if="messages.length === 0">
        <div class="flex flex-col items-center justify-center h-full text-[#86909c]">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="mb-3 opacity-40">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-[13px]">暂无对话，快来开始调试吧</span>
        </div>
      </template>

      <template v-for="msg in messages" :key="msg.messageId">
        <!-- User Message -->
        <div
          v-if="msg.role === 'user'"
          class="flex justify-end items-start gap-2"
        >
          <div class="flex flex-col items-end gap-1 max-w-[80%]">
            <div
              class="bg-[#1677ff] text-white text-[13px] leading-[22px] px-3 py-2 rounded-lg rounded-tr-sm break-words whitespace-pre-wrap"
            >
              {{ msg.content }}
            </div>
            <div v-if="msg.steps?.length" class="flex flex-wrap gap-1 justify-end">
              <span
                v-for="(step, si) in msg.steps"
                :key="si"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[#e8f3ff] text-[#1677ff] rounded"
              >
                <svg v-if="step.label.includes('检索')" width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ step.label }}
              </span>
            </div>
            <span class="text-[11px] text-[#86909c]">{{ msg.timestamp }}</span>
          </div>
          <!-- User Avatar -->
          <div
            class="flex-shrink-0 w-8 h-8 rounded-full bg-[#1677ff] text-white flex items-center justify-center text-[12px] font-medium"
          >
            我
          </div>
        </div>

        <!-- Assistant Message -->
        <div
          v-else
          class="flex justify-start items-start gap-2"
        >
          <!-- Bot Avatar -->
          <div
            class="flex-shrink-0 w-8 h-8 rounded-full bg-[#7c3aed] text-white flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
              <circle cx="12" cy="5" r="2" stroke="currentColor" stroke-width="2"/>
              <path d="M12 7v4M8 16h.01M16 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="flex flex-col items-start gap-1 max-w-[80%]">
            <div
              class="bg-[#f7f8fa] text-[#1d2129] text-[13px] leading-[22px] px-3 py-2 rounded-lg rounded-tl-sm break-words whitespace-pre-wrap"
            >
              {{ msg.content }}
            </div>
            <!-- Steps -->
            <div v-if="msg.steps?.length" class="flex flex-wrap gap-1">
              <span
                v-for="(step, si) in msg.steps"
                :key="si"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-[#f2f3f5] text-[#4e5969] rounded"
              >
                <svg v-if="step.label.includes('检索')" width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
                  <path d="M21 21l-4.3-4.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <svg v-else width="10" height="10" viewBox="0 0 24 24" fill="none">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                {{ step.label }}
              </span>
            </div>
            <div class="flex items-center gap-2 text-[11px] text-[#86909c]">
              <span v-if="msg.tokenCount > 0">{{ msg.tokenCount }} Tokens</span>
              <span>{{ msg.timestamp }}</span>
            </div>
          </div>
        </div>
      </template>
    </main>

    <!-- Input Footer -->
    <footer class="flex-shrink-0 border-t border-[#e5e6eb] bg-white">
      <!-- Quick Questions -->
      <div class="px-3 pt-2 flex flex-wrap gap-1.5">
        <button
          v-for="(q, idx) in quickQuestions"
          :key="idx"
          class="px-2.5 py-1 text-[12px] text-[#4e5969] bg-[#f2f3f5] hover:bg-[#e8f3ff] hover:text-[#1677ff] rounded-full transition-colors"
          @click="handleQuickQuestion(q)"
        >
          {{ q }}
        </button>
      </div>

      <!-- Toolbar -->
      <div class="flex items-center gap-2 px-3 pt-2">
        <!-- Clear Button -->
        <button
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
          title="清空对话"
          @click="handleClear"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Textarea -->
        <div class="flex-1 flex items-end border border-[#e5e6eb] rounded-lg px-3 py-2 focus-within:border-[#1677ff] transition-colors">
          <textarea
            ref="textareaRef"
            v-model="inputText"
            :maxlength="MAX_CHARS"
            placeholder="输入你的问题..."
            rows="1"
            class="w-full resize-none outline-none text-[13px] leading-[20px] text-[#1d2129] placeholder:text-[#c9cdd4] bg-transparent"
            @input="adjustTextareaHeight"
            @keydown.enter.exact.prevent="handleSend"
          />
        </div>

        <!-- Upload Button -->
        <button
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
          title="上传图片"
          @click="handleUpload"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" stroke-width="2"/>
            <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>

        <!-- Send Button -->
        <button
          class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-[#1677ff] text-white hover:bg-[#4096ff] disabled:bg-[#94bfff] transition-colors"
          :disabled="!inputText.trim()"
          title="发送"
          @click="handleSend"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <!-- Bottom bar: char counter + disclaimer -->
      <div class="flex items-center justify-between px-3 py-2">
        <span class="text-[11px] text-[#86909c]">内容由 AI 生成，无法确保真实准确，仅供参考。</span>
        <span class="text-[11px] text-[#86909c]">{{ charCount }}/{{ MAX_CHARS }}</span>
      </div>
    </footer>
  </div>
</template>