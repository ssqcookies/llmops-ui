<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { QuickQuestion, HomeWelcomeConfig, ChatMessageItem, PendingImage } from './types'
import {
  useAssistantAgentChat,
  useStopAssistantAgentChat,
  useGetAssistantAgentMessagesWithPage,
  useDeleteAssistantAgentConversation,
} from '@/hooks/use-assistant-agent'
import { uploadImage } from '@/services/upload-file'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

// ============================================================
// 辅助Agent hooks（真实接口联调）
// ============================================================
const { handleAssistantAgentChat } = useAssistantAgentChat()
const { handleStopAssistantAgentChat } = useStopAssistantAgentChat()
const {
  messages: historyMessages,
  loadAssistantAgentMessages,
} = useGetAssistantAgentMessagesWithPage()
const { handleDeleteAssistantAgentConversation } = useDeleteAssistantAgentConversation()

// ============================================================
// 首页欢迎配置（从 types + 常量实例化）
// ============================================================

const welcomeConfig = reactive<HomeWelcomeConfig>({
  title: 'Hi，我是AI 应用构建器',
  subtitle: '你的专属 AI 原生应用 开发平台',
  description:
    '说出你的创意，我可以快速帮你创建专属应用，一键轻松分享给朋友，也可以一键发布到 LLM Ops 平台、微信等多个渠道。',
  quickQuestions: [
    {
      text: '什么是LLMOps?',
      sendText: '请详细介绍一下什么是 LLMOps 平台，它有哪些核心能力？',
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
/** 流式回答是否已输出内容（区分"思考中"与"生成中"两种加载态） */
const hasStreamContent = ref(false)
/** 用户点击停止后的暂停态（保留气泡并显示"已暂停"） */
const isPaused = ref(false)
/** 当前流式任务ID（SSE事件携带），用于停止响应 */
const currentTaskId = ref('')
const inputValue = ref('')
const messageScrollRef = ref<HTMLElement | null>(null)

// ===== 待发送图片 =====
const pendingImages = ref<PendingImage[]>([])

/** 图片最多支持 9 张 */
const MAX_IMAGES = 9
/** a-upload 重建 key */
const uploadKey = ref(0)

/** 选择图片：本地预览 + 立即上传，成功后替换为服务端图片地址 */
const handleSelectImages = async (files: File[]) => {
  for (const file of files) {
    const localUrl = URL.createObjectURL(file)
    pendingImages.value.push({ url: localUrl, uploading: true })
    try {
      const resp = await uploadImage(file)
      const idx = pendingImages.value.findIndex((img) => img.url === localUrl)
      if (idx > -1) {
        URL.revokeObjectURL(localUrl)
        pendingImages.value[idx] = { url: resp.data.image_url, uploading: false }
      }
    } catch {
      pendingImages.value = pendingImages.value.filter((img) => img.url !== localUrl)
      URL.revokeObjectURL(localUrl)
    }
  }
}

/** 移除待发送图片 */
const handleRemoveImage = (url: string) => {
  pendingImages.value = pendingImages.value.filter((img) => img.url !== url)
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}

/** a-upload 选择图片（auto-upload=false） */
const handleImageChange = (fileList: { file?: File }[]) => {
  uploadKey.value += 1
  const files = fileList.map((item) => item.file).filter((f): f is File => !!f)
  if (files.length === 0) return
  const remainSlots = MAX_IMAGES - pendingImages.value.length
  if (remainSlots <= 0) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  if (files.length > remainSlots) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
  }
  handleSelectImages(files.slice(0, remainSlots))
}

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

/** 把 SSE 事件名统一为小写枚举名。后端是 QueueEvent 实例，f-string 会输出 "QueueEvent.AGENT_END" */
const normalizeSSEEvent = (raw: string) => {
  const PREFIX = 'QueueEvent.'
  const name = raw.startsWith(PREFIX) ? raw.slice(PREFIX.length) : raw
  return name.toLowerCase()
}

// ============================================================
// 发送消息 / 快捷问题 / 停止响应 / 清空对话
// ============================================================

const doSend = (query: string, imageUrls: string[] = []) => {
  // 0.防止并发发送
  if (aiLoading.value) return

  // 1.为本次问答生成 pairId（user + assistant 共享，便于整条删除）
  const pairId = 'pair-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)

  // 2.追加用户消息（含图片）
  messageList.value.push({
    id: 'user-' + Date.now(),
    role: 'user',
    content: query,
    pairId,
    ...(imageUrls.length ? { images: imageUrls } : {}),
  })
  aiLoading.value = true
  isPaused.value = false
  hasStreamContent.value = false
  scrollToBottom()

  // 3.本次请求的局部状态（避免多请求串流）
  let localMsgId = ''
  let localDone = false
  /** 用户是否手动点击了"停止响应" */
  let localIsManualStop = false

  // 4.确保流式AI消息存在并返回该消息
  const ensureStreamingMsg = (): ChatMessageItem | null => {
    if (localDone) return null
    if (!localMsgId) {
      const aiMsg: ChatMessageItem = {
        id: 'ai-' + Date.now(),
        role: 'assistant',
        content: '',
        pairId,
      }
      messageList.value.push(aiMsg)
      localMsgId = aiMsg.id
      scrollToBottom()
    }
    return messageList.value.find((m) => m.id === localMsgId) ?? null
  }

  /** 标记手动停止（供顶层 handleStopResponse 调用） */
  const markManualStop = () => { localIsManualStop = true }

  // 5.结束本次流式会话
  const finishStreaming = () => {
    if (localDone) return
    localDone = true
    // 给 assistant 消息标记状态：手动停止 → stopped，否则 → completed
    const aiMsg = localMsgId ? messageList.value.find((m) => m.id === localMsgId) : null
    if (aiMsg) aiMsg.status = localIsManualStop ? 'stopped' : 'completed'
    aiLoading.value = false
    isPaused.value = false
    currentTaskId.value = ''
    scrollToBottom()
  }

  // 6.SSE事件处理器
  const onSSEEvent = (event_response: Record<string, any>) => {
    if (localDone) return
    const { event: rawEvent, data } = event_response
    if (data?.task_id) currentTaskId.value = data.task_id
    const event = normalizeSSEEvent(rawEvent)

    switch (event) {
      case 'agent_message': {
        const aiMsg = ensureStreamingMsg()
        if (aiMsg && data.answer) {
          aiMsg.content += data.answer
          if (data.total_token_count) aiMsg.tokens = data.total_token_count
          if (data.latency) aiMsg.latency = Math.round(data.latency * 1000)
          hasStreamContent.value = true
        }
        scrollToBottom()
        break
      }
      case 'agent_end':
      case 'stop':
        finishStreaming()
        break
      case 'error':
      case 'timeout': {
        const aiMsg = ensureStreamingMsg()
        if (aiMsg && !aiMsg.content) {
          aiMsg.content = data.thought || data.answer || '服务出现错误，请稍后重试'
        }
        finishStreaming()
        break
      }
      // ping / agent_thought / agent_action / dataset_retrieval / long_term_memory_recall 暂不处理
    }
  }

  // 7.发起真实SSE对话请求（携带图片 URLs）
  handleAssistantAgentChat(query, imageUrls, onSSEEvent).catch(() => finishStreaming())

  // 8.把手动停止标记函数暴露给顶层（闭包内调用 doSend 返回时）
  return { markManualStop }
}

/** 当前活跃请求的手动停止标记器 */
let activeMarkManualStop: (() => void) | null = null

const handleSend = () => {
  const text = inputValue.value.trim()
  if (!text) return
  // 图片仍在上传中则不发送
  if (pendingImages.value.some((img) => img.uploading)) return
  const imageUrls = pendingImages.value.map((img) => img.url)
  const controller = doSend(text, imageUrls)
  activeMarkManualStop = controller?.markManualStop ?? null
  inputValue.value = ''
  pendingImages.value = []
}

const handleQuickQuestion = (q: QuickQuestion) => {
  const text = q.sendText ?? q.text
  const controller = doSend(text)
  activeMarkManualStop = controller?.markManualStop ?? null
}

const handleClearChat = async () => {
  try {
    await handleDeleteAssistantAgentConversation()
    messageList.value = []
  } catch {
    // 请求层已统一提示错误
  }
}

const handleStopResponse = () => {
  if (!aiLoading.value) return
  // 1.通知当前活跃请求：这是一次手动停止（finishStreaming 据此把状态标为 stopped）
  activeMarkManualStop?.()
  // 2.发后端停止请求
  if (currentTaskId.value) handleStopAssistantAgentChat(currentTaskId.value)
  // 3.立即切到暂停气泡；2s 兜底强制收尾（防止后端断连接不发事件）
  isPaused.value = true
  setTimeout(() => {
    if (aiLoading.value) {
      aiLoading.value = false
      isPaused.value = false
      currentTaskId.value = ''
    }
  }, 2000)
}

const handleCopy = async (content: string) => {
  try {
    await navigator.clipboard.writeText(content)
    Message.success('已复制到剪贴板')
  } catch {
    Message.error('复制失败')
  }
}

const handleDeletePair = (pairId?: string) => {
  if (!pairId) return
  messageList.value = messageList.value.filter((m) => m.pairId !== pairId)
}

/** 重试：找到 assistant 消息对应的 user 消息内容，重新发送 */
const handleRetry = (msg: ChatMessageItem) => {
  if (msg.role !== 'assistant' || !msg.pairId) return
  const userMsg = messageList.value.find(
    (m) => m.role === 'user' && m.pairId === msg.pairId,
  )
  if (!userMsg?.content) return
  doSend(userMsg.content)
}

const handleRecommendationClick = (rec: string) => {
  doSend(rec)
}

/** 耗时格式化 */
const formatLatency = (ms?: number) => {
  if (!ms) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

// ============================================================
// 初始化：加载与辅助Agent的历史会话记录
// ============================================================

onMounted(async () => {
  try {
    await loadAssistantAgentMessages(true)
    // 后端按 created_at 倒序返回 [最新...最旧]，先 slice().reverse() 变正序
    // 再 forEach 按 user→assistant 顺序 push，最后无需再 reverse
    const items: ChatMessageItem[] = []
    historyMessages.value.slice().reverse().forEach((item) => {
      const pairId = `pair-${item.id}`
      items.push({
        id: `${item.id}-q`,
        role: 'user',
        content: item.query,
        ...(item.image_urls?.length ? { images: item.image_urls } : {}),
        pairId,
      })
      items.push({
        id: `${item.id}-a`,
        role: 'assistant',
        content: item.answer,
        tokens: item.total_token_count || undefined,
        latency: item.latency ? Math.round(item.latency * 1000) : undefined,
        pairId,
        status: 'completed',
      })
    })
    messageList.value = items
  } catch {
    // 请求层已统一提示错误
  }
})
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
              客
            </a-avatar>
            <div class="flex flex-col max-w-[700px]">
              <span class="welcome-msg-name mb-1">罐头</span>
              <div class="welcome-msg-bubble">
                <p class="welcome-msg-greeting">你好，欢迎来到LLMOps✨</p>
                <p class="welcome-msg-para">
                  LLMOps是新一代大模型 AI 应用开发平台。无论你是否有编程基础，都可以快速搭建出各种 AI 应用，并一键发布到各大社交平台，或者轻松部署到自己的网站。
                </p>
                <div class="welcome-msg-list">
                  <p>· 随时来 <span class="font-semibold text-[#1d2129]">应用广场</span> 逛逛，这里内置了许多超有趣的应用。</p>
                  <p>· 你也可以直接发送「我想做一个应用」，我可以帮你快速创建应用。</p>
                  <p>· 你也可以向我提课有关课程的问题，我可以快速替你解答。</p>
                </div>
                <p class="welcome-msg-para">
                  如果你还有其他LLMOps使用问题，也欢迎随时问我！
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
              {{ msg.role === 'user' ? '我' : '罐' }}
            </a-avatar>

            <!-- 内容列 -->
            <div
              class="flex flex-col gap-1 max-w-[75%]"
              :class="msg.role === 'user' ? 'items-end' : 'items-start'"
            >
              <span class="chat-msg-label">
                {{ msg.role === 'user' ? '我' : '罐头' }}
              </span>

              <div
                class="chat-msg-bubble"
                :class="msg.role === 'user' ? 'chat-msg-bubble-user' : 'chat-msg-bubble-ai'"
              >
                <!-- assistant 消息走 Markdown 渲染（代码块显示为代码框） -->
                <MarkdownRenderer
                  v-if="msg.role === 'assistant'"
                  :content="msg.content"
                />
                <!-- 用户消息：图片 + 文本 -->
                <template v-else>
                  <div
                    v-if="msg.images?.length"
                    class="mb-2 grid grid-cols-3 gap-1.5"
                  >
                    <img
                      v-for="(url, imgIdx) in msg.images"
                      :key="imgIdx"
                      :src="url"
                      alt="upload"
                      class="h-[72px] w-[72px] rounded-md object-cover"
                    />
                  </div>
                  <span v-if="msg.content" class="whitespace-pre-wrap break-words">{{ msg.content }}</span>
                </template>
              </div>

              <div class="flex items-center gap-2 chat-msg-meta">
                <!-- 状态标签（仅 assistant 消息 + 有 status 时显示） -->
                <template v-if="msg.role === 'assistant' && msg.status">
                  <span
                    class="flex items-center gap-0.5"
                    :class="{
                      'text-[#00b42a]': msg.status === 'completed',
                      'text-[#f77234]': msg.status === 'stopped',
                      'text-[#86909c]': msg.status === 'paused',
                    }"
                  >
                    <icon-check-circle-fill :size="11" v-if="msg.status === 'completed'" />
                    <icon-close-circle-fill :size="11" v-else-if="msg.status === 'stopped'" />
                    <icon-pause :size="11" v-else />
                    {{ msg.status === 'completed' ? '已完成' : msg.status === 'stopped' ? '手动终止' : '已暂停' }}
                  </span>
                </template>

                <!-- 耗时 + tokens -->
                <span v-if="msg.latency !== undefined" class="flex items-center gap-0.5">
                  <icon-clock-circle :size="11" />
                  {{ formatLatency(msg.latency) }}
                </span>
                <span v-if="msg.tokens !== undefined" class="flex items-center gap-0.5">
                  <icon-code :size="11" />
                  {{ msg.tokens }} Tokens
                </span>

                <!-- hover 显示：重试 + 复制 + 删除（仅 assistant 消息 + 有 status 时） -->
                <span
                  v-if="msg.role === 'assistant' && msg.status"
                  class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5"
                >
                  <a-tooltip content="重试">
                    <a-button
                      type="text"
                      size="mini"
                      shape="circle"
                      class="!w-5 !h-5 hover:!bg-[#f2f3f5]"
                      @click="handleRetry(msg)"
                    >
                      <template #icon><icon-refresh :size="12" /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip content="复制">
                    <a-button
                      type="text"
                      size="mini"
                      shape="circle"
                      class="!w-5 !h-5 hover:!bg-[#f2f3f5]"
                      @click="handleCopy(msg.content)"
                    >
                      <template #icon><icon-copy :size="12" /></template>
                    </a-button>
                  </a-tooltip>
                  <a-tooltip content="删除当前对话">
                    <a-button
                      type="text"
                      size="mini"
                      shape="circle"
                      class="!w-5 !h-5 hover:!bg-[#f2f3f5]"
                      @click="handleDeletePair(msg.pairId)"
                    >
                      <template #icon><icon-delete :size="12" /></template>
                    </a-button>
                  </a-tooltip>
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

          <!-- AI 思考中（未输出内容 + 未暂停） -->
          <div v-if="aiLoading && !hasStreamContent && !isPaused" class="flex gap-2.5">
            <a-avatar
              :size="28"
              class="shrink-0 mt-0.5"
              :style="{ backgroundColor: '#165dff', fontSize: '12px', fontWeight: 600 }"
            >
              罐
            </a-avatar>
            <div class="flex flex-col gap-1">
              <span class="chat-msg-label">罐头</span>
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

          <!-- 已暂停（用户点击停止后，保留气泡 + 文案） -->
          <div v-if="aiLoading && isPaused" class="flex gap-2.5">
            <a-avatar
              :size="28"
              class="shrink-0 mt-0.5"
              :style="{ backgroundColor: '#165dff', fontSize: '12px', fontWeight: 600 }"
            >
              罐
            </a-avatar>
            <div class="flex flex-col gap-1">
              <span class="chat-msg-label">罐头</span>
              <div class="chat-msg-bubble chat-msg-bubble-ai py-2.5 text-[#86909c] text-[12px] flex items-center gap-1">
                <icon-pause :size="12" />
                已暂停
              </div>
            </div>
          </div>

          <!-- 流式生成中（已输出内容 + 未暂停）：停止响应按钮 -->
          <div v-if="aiLoading && hasStreamContent && !isPaused" class="flex justify-center mt-2">
            <a-button size="mini" type="outline" @click="handleStopResponse">
              <template #icon><icon-close :size="11" /></template>
              停止响应
            </a-button>
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
        <!-- 待发送图片缩略图 -->
        <div v-if="pendingImages.length" class="mb-2 flex flex-wrap gap-2 px-1">
          <div
            v-for="img in pendingImages"
            :key="img.url"
            class="group/img relative h-16 w-16 flex-shrink-0"
          >
            <img
              :src="img.url"
              alt="pending"
              class="h-16 w-16 rounded-lg border border-[#e5e6eb] object-cover"
              :class="{ 'opacity-60': img.uploading }"
            />
            <!-- 上传中遮罩 -->
            <div
              v-if="img.uploading"
              class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/20"
            >
              <a-spin :size="18" />
            </div>
            <!-- 删除 -->
            <div
              v-else
              class="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] cursor-pointer items-center justify-center rounded-full bg-[#4e5969] text-white"
              @click="handleRemoveImage(img.url)"
            >
              <icon-close :size="10" />
            </div>
          </div>
        </div>

        <div class="input-container">
          <!-- 左侧：消息图标（原型图） -->
          <icon-message class="shrink-0 text-[#86909c] ml-3" :size="20" />

          <!-- 原生 input，彻底消灭 Arco wrapper 灰底 -->
          <input
            v-model="inputValue"
            type="text"
            placeholder="发送消息或创建 AI 应用..."
            class="flex-1 bg-transparent border-none outline-none text-[14px] text-[#1d2129] placeholder:text-[#c9cdd4] px-2"
            @keydown.enter="handleSend"
          />

          <!-- 添加图片（最多 9 张） -->
          <a-upload
            :key="`img-upload-${uploadKey}`"
            :show-file-list="false"
            :auto-upload="false"
            accept="image/*"
            multiple
            @change="handleImageChange"
          >
            <template #upload-button>
              <a-tooltip content="添加图片（最多9张）">
                <a-button
                  type="text"
                  shape="circle"
                  size="small"
                  class="shrink-0 hover:!bg-[#f2f3f5]"
                >
                  <template #icon><icon-plus-circle :size="18" class="text-[#4e5969]" /></template>
                </a-button>
              </a-tooltip>
            </template>
          </a-upload>

          <!-- 右侧：发送按钮（蓝色圆形） -->
          <a-button
            type="primary"
            shape="circle"
            size="small"
            :disabled="!inputValue.trim() || pendingImages.some((i) => i.uploading)"
            class="shrink-0 mr-1"
            @click="handleSend"
          >
            <template #icon><icon-send :size="14" /></template>
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
           gap-1;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
    padding: 8px 4px 8px 4px;
  }
}
</style>
