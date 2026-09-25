<script setup lang="ts">
/**
 * WebApp 对外发布页 - 主容器
 *  - 从路由 params 取 token
 *  - 拉取 WebApp 基础信息 + 会话列表 + 当前会话消息
 *  - SSE 流式对话（webAppChat）
 *  - 左栏 Sidebar（会话 CRUD） + 右栏 Chat
 */
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  getWebApp,
  getWebAppConversations,
  webAppChat,
  stopWebAppChat,
} from '@/services/web-app'
import {
  getConversationMessages,
  getConversationName,
  updateConversationName,
  deleteConversation,
  updateConversationIsPinned,
} from '@/services/conversation'
import { uploadImage } from '@/services/upload-file'
import type {
  GetWebAppResponse,
  WebAppConversationMessage,
  WebAppConversationSummary,
  WebAppPendingImage,
} from '@/models/web-app'
import WebAppSidebar from './WebAppSidebar.vue'
import WebAppChat from './WebAppChat.vue'

// ===== Token & 基础信息 =====
const route = useRoute()
const token = computed(() => route.params.token as string)
const webAppInfo = ref<GetWebAppResponse['data'] | null>(null)
const appLoading = ref(false)

// ===== 会话列表 =====
const conversations = ref<WebAppConversationSummary[]>([])
const conversationsLoading = ref(false)

/** 置顶会话在前，非置顶按 updated_at 倒序 */
const pinnedConversations = computed(() =>
  conversations.value.filter((c) => c.is_pinned),
)
const normalConversations = computed(() =>
  conversations.value
    .filter((c) => !c.is_pinned)
    .sort((a, b) => b.updated_at - a.updated_at),
)

// ===== 当前选中的会话 =====
const currentConversationId = ref<string>('')
const currentConversationName = ref<string>('新的对话')
const messages = ref<WebAppConversationMessage[]>([])

// ===== 对话发送状态 =====
const aiLoading = ref(false)
const currentTaskId = ref('')
const inputValue = ref('')
const hasStreamContent = ref(false)

// ===== 待发送图片 =====
const pendingImages = ref<WebAppPendingImage[]>([])

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

// ===== 重命名弹窗 =====
const renameVisible = ref(false)
const renameValue = ref('')

// ===== 滚动到底部 =====
const scrollRef = ref<HTMLElement | null>(null)
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// ===== 1.加载 WebApp 基础信息 =====
const loadWebAppInfo = async () => {
  if (!token.value) return
  try {
    appLoading.value = true
    const resp = await getWebApp(token.value)
    webAppInfo.value = resp.data
  } catch {
    Message.error('无法访问该应用，链接可能已失效')
  } finally {
    appLoading.value = false
  }
}

// ===== 2.加载会话列表 =====
const loadConversations = async () => {
  if (!token.value) return
  try {
    conversationsLoading.value = true
    // 后端按 is_pinned 过滤：true=置顶，false=非置顶。用 allSettled 防止单个失败导致全空
    const [pinnedResult, normalResult] = await Promise.allSettled([
      getWebAppConversations(token.value, true),
      getWebAppConversations(token.value, false),
    ])
    const pinnedList =
      pinnedResult.status === 'fulfilled' ? pinnedResult.value.data : []
    const normalList =
      normalResult.status === 'fulfilled' ? normalResult.value.data : []
    // 后端可能不返回 is_pinned 字段，前端手动标记
    pinnedList.forEach((c) => (c.is_pinned = true))
    normalList.forEach((c) => (c.is_pinned = false))
    conversations.value = [...pinnedList, ...normalList]
  } catch {
    // 请求层统一提示
  } finally {
    conversationsLoading.value = false
  }
}

// ===== 3.加载某会话的消息 =====
const loadMessages = async (conversationId: string) => {
  if (!conversationId) return
  try {
    const [nameResp, msgResp] = await Promise.all([
      getConversationName(conversationId),
      getConversationMessages(conversationId, {
        current_page: 1,
        page_size: 50,
        created_at: 0,
      }),
    ])
    currentConversationName.value = nameResp.data.name

    // 后端倒序返回，前端翻正后再拆成 user/assistant 消息对
    const rawList = msgResp.data.list.slice().reverse()
    const items: WebAppConversationMessage[] = []
    rawList.forEach((item) => {
      items.push({
        id: `${item.id}-q`,
        role: 'user',
        content: item.query,
        image_urls: item.image_urls ?? [],
        created_at: item.created_at,
      })
      items.push({
        id: `${item.id}-a`,
        role: 'assistant',
        content: item.answer,
        total_token_count: item.total_token_count || undefined,
        latency: item.latency ? Math.round(item.latency * 1000) : undefined,
        agent_thoughts: (item.agent_thoughts as WebAppConversationMessage['agent_thoughts']) || [],
        created_at: item.created_at,
      })
    })
    messages.value = items
    await scrollToBottom()
  } catch {
    // 请求层统一提示
  }
}

// ===== 4.选中会话 =====
const selectConversation = async (conv: WebAppConversationSummary) => {
  if (aiLoading.value) {
    Message.warning('请等待当前对话结束后再切换')
    return
  }
  currentConversationId.value = conv.id
  currentConversationName.value = conv.name
  await loadMessages(conv.id)
}

// ===== 5.新建对话（仅本地清空，后端在首次 chat 时自动创建） =====
const handleNewConversation = () => {
  if (aiLoading.value) {
    Message.warning('请等待当前对话结束后再新建')
    return
  }
  currentConversationId.value = ''
  currentConversationName.value = '新的对话'
  messages.value = []
  inputValue.value = ''
}

// ===== 6.SSE 对话 =====
const handleSend = async () => {
  const query = inputValue.value.trim()
  if (!query || aiLoading.value) return
  // 图片仍在上传中则不发送
  if (pendingImages.value.some((img) => img.uploading)) return

  // 取出已上传完成的图片 URLs
  const imageUrls = pendingImages.value.map((img) => img.url)

  // 本地先 push user 消息（含图片）
  const userMsg: WebAppConversationMessage = {
    id: 'u-' + Date.now(),
    role: 'user',
    content: query,
    image_urls: imageUrls,
    created_at: Math.floor(Date.now() / 1000),
  }
  messages.value.push(userMsg)
  inputValue.value = ''
  pendingImages.value = []
  aiLoading.value = true
  hasStreamContent.value = false
  scrollToBottom()

  // 本地 push 空 assistant 占位
  const aiMsg: WebAppConversationMessage = {
    id: 'a-' + Date.now(),
    role: 'assistant',
    content: '',
    agent_thoughts: [],
    created_at: Math.floor(Date.now() / 1000),
  }
  messages.value.push(aiMsg)
  const localAiId = aiMsg.id
  let localDone = false
  let localMsg = messages.value.find((m) => m.id === localAiId)!

  const finishStreaming = () => {
    if (localDone) return
    localDone = true
    aiLoading.value = false
    currentTaskId.value = ''
    // 重新拉会话列表，让后端生成的新会话（或最新摘要）出现在侧栏；同时同步当前会话名称
    loadConversations().then(() => {
      if (currentConversationId.value) {
        const cur = conversations.value.find((c) => c.id === currentConversationId.value)
        if (cur) currentConversationName.value = cur.name
      }
    })
  }

  const onEvent = (ev: Record<string, any>) => {
    if (localDone) return
    const rawEvent = ev.event
    const data = ev.data || {}
    if (data.task_id) currentTaskId.value = data.task_id
    // 首次对话时后端会自动创建会话并在事件中回传 conversation_id
    if (data.conversation_id) currentConversationId.value = data.conversation_id

    // 把 QueueEvent.AGENT_* 前缀去掉
    const eventName = (rawEvent || '').toString().replace(/^QueueEvent\./, '').toLowerCase()

    switch (eventName) {
      case 'agent_message':
        if (data.answer) {
          localMsg.content += data.answer
          hasStreamContent.value = true
        }
        if (data.total_token_count) localMsg.total_token_count = data.total_token_count
        if (data.latency) localMsg.latency = Math.round(data.latency * 1000)
        scrollToBottom()
        break
      case 'agent_thought':
        if (data.event && data.event !== 'agent_message') {
          localMsg.agent_thoughts = localMsg.agent_thoughts || []
          localMsg.agent_thoughts.push({
            id: data.id || 't-' + Date.now() + '-' + Math.random(),
            event: data.event,
            thought: data.thought || '',
            observation: data.observation || '',
            tool: data.tool || '',
            tool_input: data.tool_input || {},
            latency: data.latency || 0,
            created_at: data.created_at || Math.floor(Date.now() / 1000),
          })
        }
        break
      case 'agent_end':
      case 'stop':
        finishStreaming()
        break
      case 'error':
      case 'timeout':
        if (!localMsg.content) {
          localMsg.content = '服务出现错误，请稍后重试'
        }
        finishStreaming()
        break
    }
  }

  try {
    // 首次消息不带 conversation_id，后端自动创建会话并在 SSE 事件中回传；后续消息带上
    await webAppChat(
      token.value,
      {
        query,
        image_urls: imageUrls,
        ...(currentConversationId.value ? { conversation_id: currentConversationId.value } : {}),
      },
      onEvent,
    )
  } catch {
    finishStreaming()
  }
}

// ===== 7.停止响应 =====
const handleStop = async () => {
  if (!aiLoading.value || !currentTaskId.value) return
  try {
    await stopWebAppChat(token.value, currentTaskId.value)
  } catch {
    // 后端可能还没注册 stop 接口，请求层会提示
  }
  // 前端强制收尾（后端 stop 后可能还会发 stop 事件）
  aiLoading.value = false
  currentTaskId.value = ''
}

// ===== 8.重命名 =====
const openRename = () => {
  if (!currentConversationId.value) return
  renameValue.value = currentConversationName.value
  renameVisible.value = true
}
const handleRenameConfirm = async () => {
  if (!renameValue.value.trim()) return
  try {
    await updateConversationName(currentConversationId.value, renameValue.value.trim())
    currentConversationName.value = renameValue.value.trim()
    await loadConversations()
    Message.success('已重命名')
  } catch {
    // 请求层统一提示
  } finally {
    renameVisible.value = false
  }
}

// ===== 9.删除会话 =====
const handleDeleteConversation = (conv: WebAppConversationSummary) => {
  Modal.warning({
    title: '要删除会话信息吗？',
    content: '删除会话后，该会话下的所有聊天记录将被永远删除，无法找回。',
    hideCancel: false,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        await deleteConversation(conv.id)
        await loadConversations()
        // 如果删的是当前会话 → 清空消息
        if (conv.id === currentConversationId.value) {
          currentConversationId.value = ''
          currentConversationName.value = '新的对话'
          messages.value = []
        }
        Message.success('已删除')
      } catch {
        // 请求层统一提示
      }
    },
  })
}

// ===== 10.置顶 / 取消置顶 =====
const handlePinConversation = async (conv: WebAppConversationSummary) => {
  try {
    await updateConversationIsPinned(conv.id, !conv.is_pinned)
    await loadConversations()
    Message.success(conv.is_pinned ? '已取消置顶' : '已置顶')
  } catch {
    // 请求层统一提示
  }
}

// ===== 初始化 =====
onMounted(async () => {
  await Promise.all([loadWebAppInfo(), loadConversations()])
  // 默认选中最近更新的会话（如果有）
  if (conversations.value.length > 0) {
    const latest = [...conversations.value].sort(
      (a, b) => b.updated_at - a.updated_at,
    )[0]
    if (latest) await selectConversation(latest)
  }
})
</script>

<template>
  <div class="flex h-screen w-screen bg-white overflow-hidden text-[#1d2129]">
    <!-- 左栏：Sidebar -->
    <WebAppSidebar
      :app-info="webAppInfo"
      :loading="appLoading"
      :pinned-conversations="pinnedConversations"
      :conversations="normalConversations"
      :current-id="currentConversationId"
      :conversations-loading="conversationsLoading"
      :ai-loading="aiLoading"
      @select="selectConversation"
      @new="handleNewConversation"
      @pin="handlePinConversation"
      @rename="(c) => { currentConversationId = c.id; currentConversationName = c.name; openRename() }"
      @delete="handleDeleteConversation"
    />

    <!-- 右栏：Chat -->
    <WebAppChat
      ref="scrollRef"
      :app-info="webAppInfo"
      :current-name="currentConversationName"
      :messages="messages"
      :ai-loading="aiLoading"
      :has-stream-content="hasStreamContent"
      :input-value="inputValue"
      :can-send="!!inputValue.trim() && !aiLoading && !pendingImages.some((i) => i.uploading)"
      :show-opening="messages.length === 0"
      :pending-images="pendingImages"
      @update:input-value="inputValue = $event"
      @send="handleSend"
      @stop="handleStop"
      @scroll-bottom="scrollToBottom"
      @select-images="handleSelectImages"
      @remove-image="handleRemoveImage"
    />

    <!-- 重命名弹窗 -->
    <a-modal
      :visible="renameVisible"
      title="重命名"
      :footer="false"
      :width="420"
      unmount-on-close
      @cancel="renameVisible = false"
    >
      <div class="mt-2">
        <a-form layout="vertical">
          <a-form-item label="会话名称" required>
            <a-input v-model="renameValue" placeholder="请输入新会话名称" />
          </a-form-item>
        </a-form>
      </div>
      <div class="flex items-center justify-end gap-2 mt-3">
        <a-button @click="renameVisible = false">取消</a-button>
        <a-button type="primary" @click="handleRenameConfirm">确认</a-button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
@reference "tailwindcss";
</style>
