<script setup lang="ts">
/**
 * WebApp 右栏 - 聊天区
 *  - 顶部会话标题
 *  - 消息列表（user 蓝色 / assistant 白色圆角）
 *  - assistant 消息里可折叠的 agent_thoughts 面板（长期记忆 / 知识库检索 / 工具调用）
 *  - 流式加载气泡 + 停止按钮
 *  - 底部输入框（胶囊形 + 附件 + 发送）
 *  - 空态：开场白 + 推荐问题
 */
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import type {
  GetWebAppResponse,
  WebAppConversationMessage,
  WebAppPendingImage,
} from '@/models/web-app'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const props = defineProps<{
  appInfo: GetWebAppResponse['data'] | null
  currentName: string
  messages: WebAppConversationMessage[]
  aiLoading: boolean
  hasStreamContent: boolean
  inputValue: string
  canSend: boolean
  /** 空会话时显示开场白 */
  showOpening: boolean
  /** 待发送图片列表 */
  pendingImages: WebAppPendingImage[]
}>()

const emit = defineEmits<{
  (e: 'update:inputValue', val: string): void
  (e: 'send'): void
  (e: 'stop'): void
  (e: 'scroll-bottom'): void
  (e: 'selectImages', files: File[]): void
  (e: 'removeImage', url: string): void
}>()

/** 图片最多支持 9 张 */
const MAX_IMAGES = 9
/** a-upload 重建 key（选择后清空内部 fileList） */
const uploadKey = ref(0)

/** a-upload 选择图片（auto-upload=false） */
const handleImageChange = (fileList: { file?: File }[]) => {
  uploadKey.value += 1
  const files = fileList.map((item) => item.file).filter((f): f is File => !!f)
  if (files.length === 0) return
  const remainSlots = MAX_IMAGES - props.pendingImages.length
  if (remainSlots <= 0) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  if (files.length > remainSlots) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
  }
  emit('selectImages', files.slice(0, remainSlots))
}


/** avatar：user 和 assistant */
const USER_AVATAR = {
  name: '慕小课',
  color: '#165dff',
}
const AI_AVATAR = {
  get name() {
    return props.appInfo?.name || 'AI'
  },
  color: '#722ed1',
}

/** 回车发送（Shift+Enter 换行） */
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && props.canSend) {
    e.preventDefault()
    emit('send')
  }
}

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:inputValue', target.value)
}

/** 折叠面板：哪些展开 */
const expandedThoughts = ref<Record<string, boolean>>({})
const toggleThoughts = (msgId: string) => {
  expandedThoughts.value[msgId] = !expandedThoughts.value[msgId]
}

/** agent_thought 的 event 类型 → 分组 icon + 标题 */
const thoughtGroupMap: Record<string, { icon: string; title: string; color: string }> = {
  agent_thought: { icon: 'icon-code', title: '隐藏运行流程', color: '#4e5969' },
  long_term_memory_recall: { icon: 'icon-book', title: '从长期记忆召回内容', color: '#00b42a' },
  dataset_retrieval: { icon: 'icon-search', title: '搜索知识库', color: '#165dff' },
  agent_action: { icon: 'icon-link', title: '调用工具', color: '#ff7d00' },
}
const getThoughtGroup = (ev: string) => thoughtGroupMap[ev] || thoughtGroupMap.agent_thought

/** 把某条消息的 agent_thoughts 按 event 分组（模板用） */
const groupThoughts = (msg: WebAppConversationMessage) => {
  if (!msg.agent_thoughts?.length) return []
  const map: Record<string, NonNullable<WebAppConversationMessage['agent_thoughts']>> = {}
  for (const t of msg.agent_thoughts) {
    if (!map[t.event]) map[t.event] = []
    map[t.event].push(t)
  }
  return Object.keys(map).map((ev) => ({ event: ev, items: map[ev] ?? [] }))
}

const inputPlaceholder = computed(() => `给 "${props.appInfo?.name || 'AI'}" 发送消息`)
</script>

<template>
  <section class="flex-1 min-w-0 flex flex-col h-full">
    <!-- 顶部会话标题 -->
    <div class="flex-shrink-0 h-14 px-[clamp(24px,5vw,140px)] flex items-center bg-white">
      <span class="text-[15px] font-medium text-[#1d2129] truncate">{{ currentName }}</span>
    </div>

    <!-- 消息列表区：空会话时居中展示应用信息 + 开场白 + 预设问题 -->
    <div
      v-if="showOpening && appInfo"
      class="flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-[clamp(24px,5vw,140px)] py-6"
    >
      <!-- 应用图标 + 名称 -->
      <img
        v-if="appInfo.icon"
        :src="appInfo.icon"
        alt="app-icon"
        class="w-16 h-16 rounded-[12px] object-cover flex-shrink-0"
      />
      <div
        v-else
        class="w-16 h-16 rounded-[12px] bg-gradient-to-br from-[#3370ff] to-[#165dff] flex items-center justify-center text-white flex-shrink-0"
      >
        <icon-apps :size="28" />
      </div>
      <div class="mt-4 text-[17px] font-medium text-[#1d2129]">{{ appInfo.name }}</div>

      <!-- 开场白（应用编排配置了才显示） -->
      <div
        v-if="appInfo.app_config?.opening_statement"
        class="mt-6 w-full max-w-[560px] bg-[#f2f3f5] rounded-[12px] px-4 py-3 text-[14px] text-[#1d2129] leading-relaxed whitespace-pre-wrap"
      >
        {{ appInfo.app_config.opening_statement }}
      </div>

      <!-- 开场白预设问题（应用编排配置了才显示） -->
      <div
        v-if="appInfo.app_config?.opening_questions?.length"
        class="mt-4 w-full max-w-[560px] flex flex-wrap gap-3"
      >
        <button
          v-for="(q, i) in appInfo.app_config.opening_questions"
          :key="i"
          class="px-4 py-2 bg-white border border-[#e5e6eb] hover:border-[#165dff] rounded-[8px] text-[14px] text-[#1d2129] transition-colors"
          @click="emit('update:inputValue', q); emit('send')"
        >
          {{ q }}
        </button>
      </div>
    </div>

    <!-- 消息列表区 -->
    <div v-else class="flex-1 min-h-0 overflow-y-auto px-[clamp(24px,5vw,140px)] py-6 space-y-5">
      <!-- 消息循环 -->
      <template v-if="messages.length > 0">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="group flex gap-3 items-start"
          :class="{ 'flex-row-reverse': msg.role === 'user' }"
        >
          <!-- Avatar -->
          <div
            class="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
            :style="{ backgroundColor: msg.role === 'user' ? USER_AVATAR.color : AI_AVATAR.color }"
          >
            <icon-user v-if="msg.role === 'user'" :size="18" />
            <icon-apps v-else :size="18" />
          </div>

          <!-- 消息气泡 -->
          <div class="flex flex-col gap-1 min-w-0"
            :class="msg.role === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- 气泡主体 -->
            <div
              class="max-w-[640px] px-4 py-3 text-[14px] leading-relaxed break-words"
              :class="msg.role === 'user'
                ? 'bg-[#165dff] text-white rounded-[12px] rounded-tr-sm whitespace-pre-wrap'
                : 'bg-white border border-[#e5e6eb] text-[#1d2129] rounded-[12px] rounded-tl-sm'"
            >
              <!-- 流式加载中（还没内容）显示转圈 -->
              <template v-if="!msg.content && !msg.image_urls?.length && aiLoading && messages[messages.length - 1]?.id === msg.id">
                <a-spin :size="20" />
              </template>
              <!-- assistant 消息走 Markdown 渲染（代码块显示为代码框） -->
              <MarkdownRenderer
                v-else-if="msg.role === 'assistant'"
                :content="msg.content"
              />
              <!-- 用户消息：图片 + 文本 -->
              <template v-else>
                <div
                  v-if="msg.image_urls?.length"
                  class="mb-2 grid grid-cols-3 gap-1.5"
                >
                  <img
                    v-for="(url, imgIdx) in msg.image_urls"
                    :key="imgIdx"
                    :src="url"
                    alt="upload"
                    class="h-[72px] w-[72px] rounded-md object-cover"
                  />
                </div>
                <span v-if="msg.content">{{ msg.content }}</span>
              </template>
            </div>

            <!-- agent_thoughts 折叠面板（仅 assistant + 有 thoughts） -->
            <div
              v-if="msg.role === 'assistant' && msg.agent_thoughts?.length"
              class="w-full max-w-[640px]"
            >
              <!-- 分组：按 event 类型聚合 -->
              <div v-for="group in groupThoughts(msg)" :key="group.event" class="mb-1.5">
                <button
                  class="thought-toggle"
                  @click="toggleThoughts(msg.id + '-' + group.event)"
                >
                  <component
                    :is="getThoughtGroup(group.event).icon"
                    :size="13"
                    :style="{ color: getThoughtGroup(group.event).color }"
                  />
                  <span class="text-[13px] text-[#4e5969]">
                    {{ getThoughtGroup(group.event).title }}
                  </span>
                  <icon-down
                    :size="12"
                    class="text-[#86909c] transition-transform"
                    :class="{ 'rotate-180': expandedThoughts[msg.id + '-' + group.event] }"
                  />
                </button>
                <div
                  v-if="expandedThoughts[msg.id + '-' + group.event]"
                  class="thought-panel"
                >
                  <template v-for="(t, i) in group.items" :key="i">
                    <div v-if="t.thought" class="thought-item">
                      <div class="thought-label">思考</div>
                      <div class="thought-content">{{ t.thought }}</div>
                    </div>
                    <div v-if="t.observation" class="thought-item">
                      <div class="thought-label">观察</div>
                      <div class="thought-content">{{ t.observation }}</div>
                    </div>
                    <div v-if="t.tool" class="thought-item">
                      <div class="thought-label">工具</div>
                      <div class="thought-content">{{ t.tool }}</div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <!-- 底部 meta（耗时 + tokens）-->
            <div
              v-if="msg.role === 'assistant' && (msg.latency !== undefined || msg.total_token_count !== undefined)"
              class="flex items-center gap-2 text-[12px] text-[#86909c]"
            >
              <template v-if="msg.latency !== undefined">
                <icon-check-circle-fill :size="12" class="text-[#00b42a]" />
                {{ (msg.latency / 1000).toFixed(1) }}s
              </template>
              <template v-if="msg.total_token_count !== undefined">
                <span>·</span>
                <icon-code :size="12" />
                {{ msg.total_token_count.toLocaleString() }} Tokens
              </template>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- 输入区（无分割线，胶囊与消息区左右对齐） -->
    <div class="flex-shrink-0 px-[clamp(24px,5vw,140px)] pt-2 pb-5 bg-white">
      <!-- 待发送图片缩略图 -->
      <div v-if="pendingImages.length" class="mb-2 flex flex-wrap gap-2">
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
            @click="emit('removeImage', img.url)"
          >
            <icon-close :size="10" />
          </div>
        </div>
      </div>

      <div
        class="flex items-center gap-1 h-12 rounded-full border border-[#e5e6eb] bg-white pl-5 pr-2 transition-colors focus-within:border-[#165dff]"
      >
        <!-- 多行 textarea：无边框，内嵌胶囊 -->
        <textarea
          class="flex-1 min-w-0 h-7 leading-7 resize-none border-none bg-transparent text-[14px] outline-none placeholder:text-[#c9cdd4]"
          :placeholder="inputPlaceholder"
          :value="inputValue"
          @input="handleInput"
          @keydown="handleKeyDown"
          rows="1"
        />
        <!-- 附件：图片上传（最多 9 张） -->
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
                size="mini"
                shape="circle"
                class="!w-8 !h-8 !text-[#4e5969] hover:!bg-[#f2f3f5]"
              >
                <icon-plus :size="16" />
              </a-button>
            </a-tooltip>
          </template>
        </a-upload>
        <!-- 流式中显示停止 -->
        <a-tooltip v-if="aiLoading" content="停止生成">
          <a-button
            type="text"
            size="mini"
            shape="circle"
            class="!w-8 !h-8 !text-[#f53f3f] hover:!bg-[#fde7e9]"
            @click="emit('stop')"
          >
            <icon-close :size="15" />
          </a-button>
        </a-tooltip>
        <!-- 发送：与原型一致的灰色纸飞机，禁用变浅 -->
        <a-tooltip v-else content="发送">
          <a-button
            type="text"
            size="mini"
            shape="circle"
            class="!w-8 !h-8 hover:!bg-[#f2f3f5]"
            :class="canSend ? '!text-[#4e5969]' : '!text-[#c9cdd4] cursor-not-allowed'"
            :disabled="!canSend"
            @click="emit('send')"
          >
            <icon-send :size="16" />
          </a-button>
        </a-tooltip>
      </div>
      <div class="mt-3 text-[12px] text-[#c9cdd4] text-center">
        内容由AI生成，无法确保真实准确，仅供参考。
      </div>
    </div>
  </section>
</template>

<style scoped>
@reference "tailwindcss";

.thought-toggle {
  @apply inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-[#f2f3f5] transition-colors cursor-pointer text-left;
}
.thought-panel {
  @apply mt-1.5 bg-[#fafbfc] border border-[#e5e6eb] rounded-md p-3 space-y-2;
}
.thought-item {
  @apply text-[13px];
}
.thought-label {
  @apply text-[12px] text-[#86909c] mb-0.5;
}
.thought-content {
  @apply text-[#4e5969] whitespace-pre-wrap break-words leading-relaxed;
}
</style>
