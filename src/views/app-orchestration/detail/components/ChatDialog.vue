<script setup lang="ts">
/**
 * 应用编排 - 预览与调试对话面板
 *  - 空状态：应用图标 + 应用名称
 *  - 消息流：用户蓝色气泡 / AI 浅灰气泡（Markdown）
 *  - AI 消息状态：已完成（绿✓）/ 已手动终止（橙✕），并展示耗时与 Tokens
 *  - 已搜索知识库折叠面板（命中知识库时回答气泡显示蓝色边框）
 *  - 输入区：图片附件（最多 9 张）、语音输入入口（开关控制显隐）、发送
 *  - 流式生成中在输入框上方显示“停止响应”
 */
import { ref, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { ChatMessageItem, ChatPendingImage } from '../types'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

const props = defineProps<{
  messageList: ChatMessageItem[]
  isLoading: boolean
  appName: string
  appIcon?: string
  /** 语音输入开关（由应用编排“语音输入”配置决定） */
  voiceInputEnabled: boolean
  /** 语音输出开关（由应用编排“语音输出”配置决定） */
  voiceOutputEnabled: boolean
  /** 待发送图片列表（上传 / 预览由父组件管理） */
  pendingImages: ChatPendingImage[]
}>()

const emit = defineEmits<{
  (e: 'send', query: string, imageUrls: string[]): void
  (e: 'deleteMessage', message: ChatMessageItem | null): void
  (e: 'stopResponse'): void
  (e: 'selectImages', files: File[]): void
  (e: 'removeImage', url: string): void
  (e: 'playVoice', message: ChatMessageItem): void
}>()

/** 图片最多支持 9 张 */
const MAX_IMAGES = 9

const inputValue = ref('')
const messageScrollRef = ref<HTMLElement | null>(null)

/** 是否可发送：有文本且图片均已上传完成 */
const canSend = computed(
  () => inputValue.value.trim().length > 0 && props.pendingImages.every((img) => !img.uploading),
)

/** 新消息 / 流式输出时滚动到底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (messageScrollRef.value) {
    messageScrollRef.value.scrollTop = messageScrollRef.value.scrollHeight
  }
}
watch(
  () => [props.messageList.length, props.messageList[props.messageList.length - 1]?.content],
  scrollToBottom,
)
watch(() => props.isLoading, scrollToBottom)

const handleSend = () => {
  if (!canSend.value) return
  const imageUrls = props.pendingImages.map((img) => img.url)
  emit('send', inputValue.value.trim(), imageUrls)
  inputValue.value = ''
}

const handleKeydown = () => {
  handleSend()
}

/** a-upload 选择图片（auto-upload=false，file 为原始 File） */
const uploadKey = ref(0)
const handleImageChange = (fileList: { file?: File }[]) => {
  // 重建 a-upload 清空其内部 fileList，避免重复选择时累计
  uploadKey.value += 1
  const files = fileList.map((item) => item.file).filter((f): f is File => !!f)
  if (files.length === 0) return
  const remainSlots = MAX_IMAGES - props.pendingImages.length
  if (remainSlots <= 0) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  const accepted = files.slice(0, remainSlots)
  if (files.length > remainSlots) {
    Message.warning(`最多上传 ${MAX_IMAGES} 张图片`)
  }
  emit('selectImages', accepted)
}

const handleRemoveImage = (url: string) => {
  emit('removeImage', url)
}

/** 语音输入：仅展示入口，识别能力待接入 */
const handleVoiceInput = () => {
  // TODO: 接入浏览器语音识别（SpeechRecognition），识别结果回填 inputValue
}

const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    Message.success('已复制')
  } catch {
    Message.error('复制失败')
  }
}

const handleDelete = (message: ChatMessageItem) => {
  emit('deleteMessage', message)
}

const handleStop = () => {
  emit('stopResponse')
}

const handleRecommendationClick = (question: string) => {
  if (props.isLoading) return
  emit('send', question, [])
}

/** “已搜索知识库”折叠状态：按消息 id 记录 */
const expandedKnowledge = ref<Record<string, boolean>>({})
const toggleKnowledge = (msgId: string) => {
  expandedKnowledge.value[msgId] = !expandedKnowledge.value[msgId]
}

/** 耗时：毫秒 → “1.7s” / “800ms” */
const formatLatency = (ms?: number) => {
  if (ms === undefined) return ''
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}
</script>

<template>
  <div class="flex h-full w-full flex-col bg-white">
    <!-- 消息区域 -->
    <div ref="messageScrollRef" class="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
      <!-- 空状态：应用图标 + 应用名称 -->
      <div
        v-if="messageList.length === 0"
        class="flex h-full flex-col items-center justify-center gap-4 px-6"
      >
        <img
          v-if="appIcon"
          :src="appIcon"
          alt="app-icon"
          class="h-[72px] w-[72px] rounded-[20px] object-cover"
        />
        <div
          v-else
          class="flex h-[72px] w-[72px] items-center justify-center rounded-[20px] bg-gradient-to-br from-[#3370ff] to-[#165dff]"
        >
          <icon-apps :size="34" class="text-white" />
        </div>
        <span class="text-[24px] font-semibold leading-8 text-[#1d2129]">{{ appName }}</span>
      </div>

      <!-- 消息列表 -->
      <div v-else class="flex flex-col gap-5 px-4 py-5">
        <div
          v-for="message in messageList"
          :key="message.id"
          class="group flex items-start gap-2.5"
          :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
        >
          <!-- 头像 -->
          <div class="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden">
            <template v-if="message.role === 'user'">
              <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#165dff]">
                <icon-user :size="18" class="text-white" />
              </div>
            </template>
            <template v-else>
              <img
                v-if="appIcon"
                :src="appIcon"
                alt="ai-icon"
                class="h-9 w-9 rounded-full object-cover"
              />
              <div
                v-else
                class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#3370ff] to-[#165dff]"
              >
                <icon-apps :size="18" class="text-white" />
              </div>
            </template>
          </div>

          <!-- 消息内容列 -->
          <div
            class="flex min-w-0 max-w-[78%] flex-col gap-1"
            :class="message.role === 'user' ? 'items-end' : 'items-start'"
          >
            <!-- 名称 -->
            <span class="text-[13px] font-medium leading-[18px] text-[#1d2129]">
              {{ message.role === 'user' ? '我' : appName }}
            </span>

            <!-- 已搜索知识库折叠入口（仅 AI 命中知识库时） -->
            <div v-if="message.role === 'assistant' && message.knowledgeItems?.length" class="w-full">
              <div
                class="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#e5e6eb] bg-white px-3 py-1.5 transition-colors hover:bg-[#f7f8fa]"
                @click="toggleKnowledge(message.id)"
              >
                <icon-book :size="14" class="text-[#3370ff]" />
                <span class="text-[13px] text-[#3370ff]">已搜索知识库</span>
                <icon-down
                  :size="12"
                  class="text-[#3370ff] transition-transform"
                  :class="{ 'rotate-180': expandedKnowledge[message.id] }"
                />
              </div>
              <div
                v-if="expandedKnowledge[message.id]"
                class="mt-1.5 w-full space-y-2 rounded-lg border border-[#e5e6eb] bg-[#fafbfc] p-3"
              >
                <div v-for="(item, idx) in message.knowledgeItems" :key="idx">
                  <div class="mb-0.5 text-[12px] font-medium text-[#4e5969]">{{ item.title }}</div>
                  <div class="whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[#86909c]">
                    {{ item.content }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 消息气泡 -->
            <div
              v-if="message.content || message.role === 'user'"
              class="max-w-full break-words px-4 py-3 text-[14px] leading-relaxed"
              :class="
                message.role === 'user'
                  ? 'whitespace-pre-wrap rounded-[12px] rounded-tr-sm bg-[#165dff] text-white'
                  : [
                      'rounded-[12px] rounded-tl-sm border border-[#e5e6eb] bg-white text-[#1d2129]',
                      message.knowledgeItems?.length
                        ? 'border-2 border-[#3370ff]'
                        : '',
                    ]
              "
            >
              <!-- 用户消息：图片 + 文本 -->
              <template v-if="message.role === 'user'">
                <div
                  v-if="message.images?.length"
                  class="mb-2 grid grid-cols-3 gap-1.5"
                >
                  <img
                    v-for="(url, imgIdx) in message.images"
                    :key="imgIdx"
                    :src="url"
                    alt="upload"
                    class="h-[72px] w-[72px] rounded-md object-cover"
                  />
                </div>
                <span v-if="message.content">{{ message.content }}</span>
              </template>
              <!-- AI 消息走 Markdown 渲染（代码块支持复制） -->
              <MarkdownRenderer v-else :content="message.content" />
            </div>

            <!-- 流式等待：AI 消息尚无内容时显示转圈 -->
            <div
              v-if="message.role === 'assistant' && !message.content && isLoading"
              class="rounded-[12px] rounded-tl-sm border border-[#e5e6eb] bg-white px-4 py-3.5"
            >
              <a-spin :size="16" />
            </div>

            <!-- AI 消息 meta：状态 + 耗时 + tokens + 复制/删除 -->
            <div
              v-if="message.role === 'assistant' && message.status"
              class="flex w-full items-center gap-2 text-[12px] leading-5 text-[#86909c]"
            >
              <!-- 状态 -->
              <span
                v-if="message.status === 'completed'"
                class="flex items-center gap-0.5 text-[#00b42a]"
              >
                <icon-check :size="13" />
                已完成
              </span>
              <span v-else class="flex items-center gap-0.5 text-[#ff7d00]">
                <icon-close :size="13" />
                已手动终止
              </span>
              <!-- 耗时 -->
              <span v-if="message.latency !== undefined">{{ formatLatency(message.latency) }}</span>
              <!-- Tokens -->
              <span v-if="message.tokens !== undefined">| {{ message.tokens.toLocaleString() }} Tokens</span>
              <!-- 操作：hover 显示 -->
              <span class="ml-auto flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <a-tooltip content="复制">
                  <a-button
                    type="text"
                    size="mini"
                    shape="circle"
                    class="!h-6 !w-6 hover:!bg-[#f2f3f5]"
                    @click="handleCopy(message.content)"
                  >
                    <template #icon><icon-copy :size="14" /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip content="删除">
                  <a-button
                    type="text"
                    size="mini"
                    shape="circle"
                    class="!h-6 !w-6 hover:!bg-[#f2f3f5]"
                    @click="handleDelete(message)"
                  >
                    <template #icon><icon-delete :size="14" /></template>
                  </a-button>
                </a-tooltip>
              </span>
              <!-- 语音播放：开启语音输出后常驻显示 -->
              <a-tooltip v-if="voiceOutputEnabled && message.status === 'completed'" content="语音播放">
                <a-button
                  type="text"
                  size="mini"
                  shape="circle"
                  class="!h-6 !w-6 hover:!bg-[#f2f3f5]"
                  @click="emit('playVoice', message)"
                >
                  <template #icon><icon-play-circle :size="15" /></template>
                </a-button>
              </a-tooltip>
            </div>

            <!-- 推荐问题（仅 AI 消息，原型样式：灰色圆角卡片） -->
            <div
              v-if="message.role === 'assistant' && message.recommendations?.length && message.status === 'completed'"
              class="mt-2 flex w-full flex-col items-start gap-2.5"
            >
              <div
                v-for="(rec, recIdx) in message.recommendations"
                :key="recIdx"
                class="w-fit max-w-full cursor-pointer break-words rounded-2xl bg-[#f2f3f5] px-4 py-3 text-[15px] leading-relaxed text-[#4e5969] transition-colors hover:bg-[#e5e6eb]"
                @click="handleRecommendationClick(rec)"
              >
                {{ rec }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入区域 -->
    <div class="flex-shrink-0 bg-white px-4 pb-4 pt-2">
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
            @click="handleRemoveImage(img.url)"
          >
            <icon-close :size="10" />
          </div>
        </div>
      </div>

      <!-- 流式生成中：停止响应 -->
      <div v-if="isLoading" class="mb-2 flex justify-center">
        <a-button
          type="outline"
          shape="round"
          class="!px-5"
          @click="handleStop"
        >
          <template #icon><icon-pause-circle :size="16" class="text-[#3370ff]" /></template>
          <span class="text-[#3370ff]">停止响应</span>
        </a-button>
      </div>

      <div class="flex items-center gap-2">
        <!-- 左侧：清空对话 -->
        <a-tooltip content="清空对话">
          <a-button
            type="text"
            size="large"
            shape="circle"
            class="flex-shrink-0 !bg-transparent"
            @click="emit('deleteMessage', null)"
          >
            <template #icon>
              <icon-delete :size="22" class="text-[#4e5969]" />
            </template>
          </a-button>
        </a-tooltip>

        <!-- 胶囊输入框 -->
        <div
          class="flex h-12 flex-1 items-center gap-1.5 rounded-full border border-[#e5e6eb] bg-white pl-5 pr-2"
        >
          <a-input
            v-model="inputValue"
            placeholder="发送消息或创建 AI 应用..."
            class="flex-1 !border-none !bg-transparent
              [&_.arco-input-wrapper]:!border-none [&_.arco-input-wrapper]:!bg-transparent
              [&_.arco-input-wrapper]:!px-0 [&_.arco-input-wrapper]:!shadow-none
              [&_.arco-input-wrapper.arco-input-focus]:!shadow-none
              [&_.arco-input]:!bg-transparent [&_.arco-input]:!text-[14px]
              [&_.arco-input::placeholder]:!text-[#c9cdd4]"
            @press-enter="handleKeydown"
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
                  class="flex-shrink-0 !bg-transparent hover:!bg-[#f2f3f5]"
                >
                  <template #icon>
                    <icon-plus-circle :size="22" class="text-[#4e5969]" />
                  </template>
                </a-button>
              </a-tooltip>
            </template>
          </a-upload>

          <!-- 语音输入：由应用编排“语音输入”开关决定显隐 -->
          <a-tooltip v-if="voiceInputEnabled" content="语音输入">
            <a-button
              type="text"
              shape="circle"
              class="flex-shrink-0 !bg-transparent hover:!bg-[#f2f3f5]"
              @click="handleVoiceInput"
            >
              <template #icon>
                <icon-voice :size="22" class="text-[#4e5969]" />
              </template>
            </a-button>
          </a-tooltip>

          <!-- 发送 -->
          <a-button
            type="text"
            shape="circle"
            class="flex-shrink-0 !bg-transparent hover:!bg-transparent
              [&.arco-btn:active]:!bg-transparent [&.arco-btn-disabled]:!bg-transparent"
            :disabled="!canSend"
            @click="handleSend"
          >
            <template #icon>
              <icon-send
                :size="20"
                :class="canSend ? 'text-[#3370ff]' : 'text-[#c9cdd4]'"
              />
            </template>
          </a-button>
        </div>
      </div>

      <!-- 底部提示文字 -->
      <div class="mt-2.5 text-center text-[12px] leading-5 text-[#c9cdd4]">
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
