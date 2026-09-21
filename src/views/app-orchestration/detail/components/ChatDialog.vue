<script setup lang="ts">
import { ref } from 'vue'
import type { ChatMessageItem } from '../types'

const props = defineProps<{
  messageList: ChatMessageItem[]
  isLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'send', query: string): void
  (e: 'deleteMessage', message: ChatMessageItem | null): void
  (e: 'stopResponse'): void
}>()

const inputValue = ref('')

const handleSend = () => {
  if (!inputValue.value.trim()) return
  emit('send', inputValue.value.trim())
  inputValue.value = ''
}

const handleKeydown = () => {
  handleSend()
}

const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // ignore
  }
}

const handleDelete = (message: ChatMessageItem) => {
  emit('deleteMessage', message)
}

const handleStop = () => {
  emit('stopResponse')
}

const handleRecommendationClick = (question: string) => {
  emit('send', question)
}

const formatLatency = (ms?: number) => {
  if (!ms) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div class="flex flex-col h-full w-full bg-[#f7f8fa]">
    <!-- 消息区域 -->
    <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 scrollbar-thin bg-[#f7f8fa]">
      <!-- 空状态 -->
      <div
        v-if="messageList.length === 0"
        class="flex flex-col items-center justify-center h-full gap-3"
      >
        <a-avatar :size="64" shape="square" :style="{ backgroundColor: '#3370ff' }">
          <icon-apps />
        </a-avatar>
        <span class="text-lg font-semibold text-gray-800">AI 助手</span>
        <span class="text-sm text-gray-400">输入消息开始对话</span>
      </div>

      <!-- 消息列表 -->
      <div v-else class="flex flex-col gap-4">
        <div
          v-for="message in messageList"
          :key="message.id"
          class="flex gap-2 group"
          :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
        >
          <!-- 头像 -->
          <a-avatar
            :size="32"
            class="flex-shrink-0 mt-1"
            :style="
              message.role === 'user'
                ? { backgroundColor: '#3370ff' }
                : { backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }
            "
          >
            <template v-if="message.role === 'user'">
              <icon-user :style="{ color: '#ffffff' }" />
            </template>
            <template v-else>
              <icon-apps :style="{ color: '#3370ff' }" />
            </template>
          </a-avatar>

          <!-- 消息内容区 -->
          <div
            class="flex flex-col gap-1 max-w-[75%]"
            :class="message.role === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- 用户名 -->
            <span
              class="text-xs text-gray-500"
              :class="message.role === 'user' ? 'order-3' : ''"
            >
              {{ message.role === 'user' ? '用户' : 'AI 助手' }}
            </span>

            <!-- 气泡 + 操作按钮 -->
            <div
              class="flex items-start gap-1"
              :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- 操作按钮 -->
              <div
                class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <a-tooltip content="复制">
                  <a-button type="text" size="mini" shape="circle" @click="handleCopy(message.content)">
                    <template #icon><icon-copy :size="14" /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip content="删除">
                  <a-button type="text" size="mini" shape="circle" @click="handleDelete(message)">
                    <template #icon><icon-delete :size="14" /></template>
                  </a-button>
                </a-tooltip>
              </div>

              <!-- 消息气泡 -->
              <div
                class="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                :class="
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 border border-gray-200 rounded-tl-sm'
                "
              >
                {{ message.content }}
              </div>
            </div>

            <!-- 消息元信息：token 数和延迟 -->
            <div
              class="flex items-center gap-2 text-xs text-gray-400 mt-0.5"
              :class="message.role === 'user' ? 'order-3' : ''"
            >
              <span v-if="message.tokens !== undefined" class="flex items-center gap-0.5">
                <icon-code :size="12" />
                {{ message.tokens }} tokens
              </span>
              <span v-if="message.latency !== undefined" class="flex items-center gap-0.5">
                <icon-clock-circle :size="12" />
                {{ formatLatency(message.latency) }}
              </span>
            </div>

            <!-- 推荐问题（仅 assistant 消息） -->
            <div
              v-if="message.role === 'assistant' && message.recommendations && message.recommendations.length > 0"
              class="flex flex-wrap gap-2 mt-1"
            >
              <a-tag
                v-for="(rec, recIdx) in message.recommendations"
                :key="recIdx"
                class="cursor-pointer hover:bg-blue-50 transition-colors"
                color="arcoblue"
                :bordered="false"
                @click="handleRecommendationClick(rec)"
              >
                {{ rec }}
              </a-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 加载状态：正在生成 -->
      <div v-if="isLoading" class="flex gap-2 mt-4">
        <a-avatar :size="32" class="flex-shrink-0 mt-1" :style="{ backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }">
          <icon-apps :style="{ color: '#3370ff' }" />
        </a-avatar>
        <div class="flex flex-col gap-1">
          <span class="text-xs text-gray-500">AI 助手</span>
          <div class="bg-gray-100 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
            <a-spin :size="16" />
          </div>
          <a-button
            type="outline"
            size="small"
            class="mt-1 w-fit"
            @click="handleStop"
          >
            <template #icon><icon-close :size="12" /></template>
            停止响应
          </a-button>
        </div>
      </div>
    </div>

    <!-- 底部输入区域 -->
    <div class="flex-shrink-0 bg-[#f7f8fa] px-4 pt-4 pb-5">
      <div class="flex items-center gap-2">
        <!-- 左侧：清空对话（框外图标按钮） -->
        <a-tooltip content="清空对话">
          <a-button
            type="text"
            size="large"
            shape="circle"
            class="flex-shrink-0 !bg-transparent"
            @click="emit('deleteMessage', null)"
          >
            <template #icon>
              <icon-message :size="22" class="text-[#4e5969]" />
            </template>
          </a-button>
        </a-tooltip>

        <!-- 胶囊输入框（任意变体穿透 Arco 内部 wrapper，去掉自带灰底/边框/focus 阴影） -->
        <div
          class="chat-pill flex-1 h-12 flex items-center gap-2 bg-white border border-[#e5e6eb] rounded-full pl-5 pr-2
            [&_.arco-input-wrapper]:!bg-transparent [&_.arco-input-wrapper]:!border-none
            [&_.arco-input-wrapper]:!shadow-none [&_.arco-input-wrapper]:!px-0
            [&_.arco-input-wrapper.arco-input-focus]:!shadow-none
            [&_.arco-input]:!h-10 [&_.arco-input]:!text-[14px]
            [&_.arco-input::placeholder]:!text-[#86909c]"
        >
          <a-input
            v-model="inputValue"
            placeholder="发送消息或创建 AI 应用..."
            class="flex-1 !border-none !bg-transparent"
            @press-enter="handleKeydown"
          />
          <!-- 发送（框内右侧：纯图标无底色，空内容灰色禁用，有内容蓝色） -->
          <a-button
            type="text"
            shape="circle"
            class="flex-shrink-0 !bg-transparent !border-none
              [&.arco-btn:hover]:!bg-transparent [&.arco-btn:active]:!bg-transparent
              [&.arco-btn-disabled]:!bg-transparent [&.arco-btn-disabled]:!opacity-60"
            :disabled="!inputValue.trim()"
            @click="handleSend"
          >
            <template #icon>
              <icon-send
                :size="20"
                :class="inputValue.trim() ? 'text-[#3370ff]' : 'text-[#86909c]'"
              />
            </template>
          </a-button>
        </div>
      </div>

      <!-- 底部提示文字 -->
      <div class="text-center text-[#86909c] text-[13px] mt-3">
        内容由AI生成，无法确保真实准确，仅供参考。
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.scrollbar-thin {
  scrollbar-width: thin;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
</style>