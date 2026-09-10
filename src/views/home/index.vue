<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import type { QuickQuestion, HomeWelcomeConfig, ChatMessageItem } from './types'

// ============================================================
// 首页欢迎配置（从 types + 常量实例化）
// ============================================================

const welcomeConfig = reactive<HomeWelcomeConfig>({
  title: 'Hi，我是慕课 AI 应用构建器',
  subtitle: '你的专属 AI 原生应用 开发平台',
  description:
    '说出你的创意，我可以快速帮你创建专属应用，一键轻松分享给朋友，也可以一键发布到慕课 LLM Ops 平台、微信等多个渠道。',
  quickQuestions: [
    {
      text: '什么是慕课LLMOps?',
      sendText: '请详细介绍一下什么是慕课 LLMOps 平台，它有哪些核心能力？',
    },
    {
      text: '我想创建一个应用',
      sendText: '我想从零创建一个 AI 应用，请引导我完成创建流程。',
    },
    {
      text: '能介绍下什么是RAG吗?',
      sendText: '请介绍一下 RAG（检索增强生成）是什么，它在本平台中如何使用？',
    },
  ],
})

// ============================================================
// 消息列表 & 对话状态
// ============================================================

const messageList = ref<ChatMessageItem[]>([])
const aiLoading = ref(false)
const inputValue = ref('')
const messageScrollRef = ref<HTMLElement | null>(null)

/** 用户尚未发送任何消息 → 展示欢迎态 */
const isWelcomeState = computed(
  () => messageList.value.filter((m) => m.role === 'user').length === 0,
)

/** 滚动到消息底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (messageScrollRef.value) {
    messageScrollRef.value.scrollTop = messageScrollRef.value.scrollHeight
  }
}

// ============================================================
// 发送消息 / 快捷问题 / 停止响应 / 清空对话
// ============================================================

const handleSend = () => {
  const text = inputValue.value.trim()
  if (!text) return
  doSend(text)
  inputValue.value = ''
}

const handleQuickQuestion = (q: QuickQuestion) => {
  const text = q.sendText ?? q.text
  doSend(text)
}

const doSend = (query: string) => {
  const userMsg: ChatMessageItem = {
    id: 'user-' + Date.now(),
    role: 'user',
    content: query,
  }
  messageList.value.push(userMsg)
  aiLoading.value = true
  scrollToBottom()

  // TODO: 预留接口调用位置 - 发送对话请求
  setTimeout(() => {
    const aiMsg: ChatMessageItem = {
      id: 'ai-' + Date.now(),
      role: 'assistant',
      content:
        '已收到您的问题，AI 正在基于最新模型能力为您生成答案……\n\n（此处为占位回复，接入后端对话接口后将返回真实 AI 输出）',
      tokens: 128,
      latency: 680,
      recommendations: ['继续深入讲解', '给我一个实际案例', '总结以上内容'],
    }
    messageList.value.push(aiMsg)
    aiLoading.value = false
    scrollToBottom()
  }, 1200)
}

const handleClearChat = () => {
  messageList.value = []
}

const handleStopResponse = () => {
  aiLoading.value = false
}

const handleRecommendationClick = (rec: string) => {
  doSend(rec)
}

/** 耗时格式化 */
const formatLatency = (ms?: number) => {
  if (!ms) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div
    class="h-screen w-full flex flex-col relative overflow-hidden bg-[#f7f8fa]"
  >
    <!-- 背景：顶部柔和蓝紫渐变光晕 -->
    <div class="bg-glow absolute top-0 left-0 right-0 h-[440px] pointer-events-none z-0" />

    <!-- 右上角：更多操作按钮 -->
    <div class="absolute top-5 right-6 z-10">
      <a-button
        shape="circle"
        size="small"
        type="text"
        :style="{
          width: '32px',
          height: '32px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e6eb',
        }"
      >
        <template #icon><icon-more :size="16" /></template>
      </a-button>
    </div>

    <!-- ========== 可滚动主内容（欢迎态 + 对话流） ========== -->
    <div
      ref="messageScrollRef"
      class="flex-1 min-h-0 overflow-y-auto px-16 pt-10 pb-4 relative z-[1]"
    >
      <!-- 欢迎态 -->
      <template v-if="isWelcomeState">
        <div class="max-w-[900px] mx-auto mb-8">
          <h1 class="welcome-title mb-2">
            {{ welcomeConfig.title }}
          </h1>
          <h2 class="welcome-subtitle mb-3">
            你的专属 <span class="text-[#165dff]">AI 原生应用</span> 开发平台
          </h2>
          <p class="welcome-desc">{{ welcomeConfig.description }}</p>
        </div>

        <!-- 欢迎消息气泡 -->
        <div class="max-w-[900px] mx-auto mb-6">
          <div class="flex items-start gap-3">
            <a-avatar
              :size="28"
              :style="{
                backgroundColor: '#165dff',
                flexShrink: 0,
                fontSize: '12px',
                fontWeight: 600,
              }"
            >
              慕
            </a-avatar>
            <div class="flex flex-col max-w-[700px]">
              <span class="welcome-msg-name mb-1">慕小课</span>
              <div class="welcome-msg-bubble">
                <p class="welcome-msg-greeting">你好，欢迎来到慕课LLMOps✨</p>
                <p class="welcome-msg-para">
                  慕课LLMOps是新一代大模型 AI 应用开发平台。无论你是否有编程基础，都可以快速搭建出各种 AI 应用，并一键发布到各大社交平台，或者轻松部署到自己的网站。
                </p>
                <div class="welcome-msg-list">
                  <p>· 随时来 <span class="font-semibold text-[#1d2129]">应用广场</span> 逛逛，这里内置了许多超有趣的应用。</p>
                  <p>· 你也可以直接发送「我想做一个应用」，我可以帮你快速创建应用。</p>
                  <p>· 你也可以向我提课有关课程的问题，我可以快速替你解答。</p>
                </div>
                <p class="welcome-msg-para">
                  如果你还有其他慕课LLMOps使用问题，也欢迎随时问我！
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 快捷问题（纵向） -->
        <div class="max-w-[900px] mx-auto">
          <div class="flex flex-col gap-2 items-start">
            <a-button
              v-for="q in welcomeConfig.quickQuestions"
              :key="q.text"
              :style="{
                borderRadius: '16px',
                height: '30px',
                padding: '0 14px',
                fontSize: '12px',
                backgroundColor: '#f2f3f5',
                border: '1px solid #e5e6eb',
                color: '#4e5969',
              }"
              class="quick-q-item"
              @click="handleQuickQuestion(q)"
            >
              {{ q.text }}
            </a-button>
          </div>
        </div>
      </template>

      <!-- 对话消息流 -->
      <template v-if="!isWelcomeState && messageList.length > 0">
        <div class="max-w-[900px] mx-auto flex flex-col gap-4 pb-4">
          <div
            v-for="msg in messageList"
            :key="msg.id"
            class="flex gap-2.5 group"
            :class="msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
          >
            <!-- 头像 -->
            <a-avatar
              :size="28"
              class="shrink-0 mt-0.5"
              :style="{ backgroundColor: '#165dff', fontSize: '12px', fontWeight: 600 }"
            >
              {{ msg.role === 'user' ? '我' : '慕' }}
            </a-avatar>

            <!-- 内容列 -->
            <div
              class="flex flex-col gap-1 max-w-[75%]"
              :class="msg.role === 'user' ? 'items-end' : 'items-start'"
            >
              <span class="chat-msg-label">
                {{ msg.role === 'user' ? '我' : '慕小课' }}
              </span>

              <div
                class="chat-msg-bubble"
                :class="msg.role === 'user' ? 'chat-msg-bubble-user' : 'chat-msg-bubble-ai'"
              >
                <span class="whitespace-pre-wrap break-words">{{ msg.content }}</span>
              </div>

              <div class="flex items-center gap-2 chat-msg-meta">
                <span v-if="msg.tokens !== undefined" class="flex items-center gap-0.5">
                  <icon-code :size="11" />
                  {{ msg.tokens }} tokens
                </span>
                <span v-if="msg.latency !== undefined" class="flex items-center gap-0.5">
                  <icon-clock-circle :size="11" />
                  {{ formatLatency(msg.latency) }}
                </span>
              </div>

              <div
                v-if="msg.role === 'assistant' && msg.recommendations && msg.recommendations.length"
                class="flex flex-wrap gap-2 mt-1"
              >
                <a-tag
                  v-for="(rec, i) in msg.recommendations"
                  :key="i"
                  color="arcoblue"
                  :bordered="false"
                  class="cursor-pointer chat-rec-tag"
                  @click="handleRecommendationClick(rec)"
                >
                  {{ rec }}
                </a-tag>
              </div>
            </div>
          </div>

          <!-- AI loading -->
          <div v-if="aiLoading" class="flex gap-2.5">
            <a-avatar
              :size="28"
              class="shrink-0 mt-0.5"
              :style="{ backgroundColor: '#165dff', fontSize: '12px', fontWeight: 600 }"
            >
              慕
            </a-avatar>
            <div class="flex flex-col gap-1">
              <span class="chat-msg-label">慕小课</span>
              <div class="chat-msg-bubble chat-msg-bubble-ai py-2.5">
                <a-spin :size="14" />
              </div>
              <a-button
                size="mini"
                type="outline"
                class="mt-1 w-fit"
                @click="handleStopResponse"
              >
                <template #icon><icon-close :size="11" /></template>
                停止响应
              </a-button>
            </div>
          </div>

          <!-- 清空对话 -->
          <div class="flex justify-center mt-2">
            <a-button
              type="text"
              size="mini"
              :style="{ color: '#86909c' }"
              @click="handleClearChat"
            >
              <template #icon><icon-delete :size="12" /></template>
              清空对话
            </a-button>
          </div>
        </div>
      </template>
    </div>

    <!-- ========== 底部输入区 ========== -->
    <div class="shrink-0 pb-5 pt-2 relative z-[1]">
      <div class="max-w-[760px] mx-auto">
        <div class="input-container">
          <a-tooltip content="添加附件">
            <a-button
              type="text"
              shape="circle"
              size="small"
              class="shrink-0"
              :style="{ width: '34px', height: '34px', color: '#86909c', margin: '0 2px' }"
            >
              <template #icon><icon-paperclip :size="16" /></template>
            </a-button>
          </a-tooltip>

          <a-input
            v-model="inputValue"
            placeholder="发送消息或创建 AI 应用..."
            class="chat-input-field"
            :bordered="false"
            size="large"
            allow-clear
            @press-enter="handleSend"
          />

          <a-button
            type="primary"
            shape="circle"
            size="small"
            :disabled="!inputValue.trim()"
            :style="{
              width: '30px',
              height: '30px',
              minWidth: '30px',
              flexShrink: 0,
              margin: '0 4px',
              borderRadius: '50%',
            }"
            @click="handleSend"
          >
            <template #icon><icon-right :size="14" /></template>
          </a-button>
        </div>

        <p class="text-center text-[11px] leading-5 text-[#c9cdd4] mt-2.5">
          内容由AI生成，无法确保真实准确，仅供参考。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .bg-glow {
    background:
      radial-gradient(ellipse 60% 80% at 20% 0%, rgba(22, 93, 255, 0.10) 0%, transparent 70%),
      radial-gradient(ellipse 50% 70% at 80% 0%, rgba(114, 46, 209, 0.08) 0%, transparent 70%);
  }

  .welcome-title {
    @apply text-[26px] font-bold text-[#1d2129] leading-[1.3];
    letter-spacing: -0.2px;
  }
  .welcome-subtitle {
    @apply text-[16px] font-semibold text-[#1d2129] leading-[1.4];
  }
  .welcome-desc {
    @apply text-[12px] text-[#4e5969] leading-[1.7] max-w-[560px];
    line-height: 20px;
  }
  .welcome-msg-name {
    @apply text-[11px] text-[#86909c];
  }
  .welcome-msg-bubble {
    @apply bg-white rounded-[10px] border border-[#eef0f3] px-4 py-3.5;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    max-width: 640px;
  }
  .welcome-msg-greeting {
    @apply text-[13px] font-semibold text-[#1d2129] mb-2;
  }
  .welcome-msg-para {
    @apply text-[12px] text-[#4e5969] leading-[1.75] mb-2;
  }
  .welcome-msg-list {
    @apply flex flex-col gap-1 my-2 pl-0.5;
  }
  .welcome-msg-list p {
    @apply text-[12px] text-[#4e5969] leading-[1.8];
  }
  .quick-q-item {
    transition: all 0.15s ease;
  }
  .quick-q-item:hover {
    background-color: #ffffff !important;
    border-color: #165dff !important;
    color: #165dff !important;
  }
}

@layer components {
  .chat-msg-label {
    @apply text-[11px] text-[#86909c];
  }
  .chat-msg-bubble {
    @apply px-3.5 py-2.5 text-[13px] leading-[1.75] break-words;
    border-radius: 12px;
  }
  .chat-msg-bubble-ai {
    @apply bg-white text-[#1d2129] border border-[#eef0f3];
    border-top-left-radius: 4px;
  }
  .chat-msg-bubble-user {
    @apply bg-[#165dff] text-white;
    border-top-right-radius: 4px;
  }
  .chat-msg-meta {
    @apply text-[10px] text-[#c9cdd4] mt-0.5;
  }
  .chat-rec-tag {
    @apply text-[11px] rounded-[12px] !px-2.5 !py-0.5 transition-colors;
  }
}

@layer components {
  .input-container {
    @apply flex items-center bg-white rounded-full border border-[#e5e6eb]
           px-2 py-1.5 gap-1 transition-colors;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
  }
  .input-container:focus-within {
    border-color: #165dff;
    box-shadow: 0 2px 10px rgba(22, 93, 255, 0.08);
  }
  .chat-input-field :deep(.arco-input-wrapper) {
    background-color: transparent !important;
    box-shadow: none !important;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }
  .chat-input-field :deep(.arco-input-inner) {
    background-color: transparent !important;
    font-size: 13px !important;
    color: #1d2129;
  }
  .chat-input-field :deep(.arco-input-inner::placeholder) {
    color: #c9cdd4;
  }
  .chat-input-field :deep(.arco-input-clear-btn) {
    color: #c9cdd4;
  }
}
</style>
