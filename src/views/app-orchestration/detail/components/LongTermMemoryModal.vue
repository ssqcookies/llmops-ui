<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  useGetDebugConversationSummary,
  useUpdateDebugConversationSummary,
} from '@/hooks/use-app'

const props = defineProps<{
  visible: boolean
  appId: string
  /** 长期记忆开关状态（对应 long_term_memory.enable） */
  enabled: boolean
}>()

const emit = defineEmits<{
  /** 记忆保存成功 */
  (e: 'saved'): void
  (e: 'cancel'): void
}>()

// ===== 使用项目已有 hooks =====
const { loading: fetchLoading, debug_conversation_summary, loadDebugConversationSummary } =
  useGetDebugConversationSummary()
const { loading: saving, handleUpdateDebugConversationSummary } =
  useUpdateDebugConversationSummary()

/** 编辑态内容 */
const content = ref('')
/** 是否处于编辑态 */
const isEditing = ref(false)

/** 是否已有保存的记忆 */
const hasMemory = computed(() => !!debug_conversation_summary.value.trim())

// 弹窗每次打开时拉取已保存的记忆
watch(
  () => props.visible,
  (val) => {
    if (val) {
      isEditing.value = false
      content.value = ''
      loadDebugConversationSummary(props.appId)
    }
  },
)

/** 进入编辑态，回填已保存的记忆 */
const handleEdit = () => {
  content.value = debug_conversation_summary.value
  isEditing.value = true
}

/** 退出编辑态，不保存 */
const handleCancelEdit = () => {
  isEditing.value = false
}

/** 保存编辑内容 */
const handleSave = async () => {
  try {
    // hook 内部成功时已弹出后端返回的 message
    await handleUpdateDebugConversationSummary(props.appId, content.value)
    emit('saved')
  } catch {
    // 失败时请求层已统一提示，不关闭弹窗
  }
}

/** 删除全部记忆（POST 空字符串），成功后停留在弹窗展示空状态 */
const handleDelete = async () => {
  try {
    await handleUpdateDebugConversationSummary(props.appId, '')
    debug_conversation_summary.value = ''
    isEditing.value = false
  } catch {
    // 失败时请求层已统一提示
  }
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="长期记忆"
    :footer="false"
    :mask-closable="false"
    :width="560"
    @cancel="handleCancel"
  >
    <a-spin :loading="fetchLoading" class="w-full">
      <!-- 未开启：仅文案引导（已有记忆时提示记忆已保留） -->
      <div v-if="!enabled" class="flex flex-col items-center gap-2 py-10">
        <icon-book :size="32" class="text-gray-300" />
        <div class="text-sm font-medium text-gray-900">长期记忆未开启</div>
        <div class="text-xs leading-5 text-gray-400 text-center">
          开启后 Agent 将总结对话内容，用于更好地响应你的消息。<br />
          请在左侧编排面板中打开「长期记忆」开关。
        </div>
        <div v-if="hasMemory" class="text-xs text-gray-400">
          你之前积累的记忆已保留，重新开启后将继续生效。
        </div>
      </div>

      <!-- 已开启，暂无记忆 -->
      <div v-else-if="!hasMemory" class="flex flex-col items-center gap-2 py-10">
        <icon-book :size="32" class="text-gray-300" />
        <div class="text-sm text-gray-500">暂无记忆，开始对话后会自动生成</div>
      </div>

      <!-- 已开启，已有记忆：只读展示 + 编辑/删除 -->
      <div v-else class="flex flex-col gap-4 py-2">
        <a-alert type="info" class="rounded">
          长期记忆允许 Agent 跨对话记住你的偏好和重要信息，使交互更加个性化。
        </a-alert>

        <!-- 只读展示 -->
        <div
          v-if="!isEditing"
          class="bg-gray-50 rounded px-4 py-3 text-sm leading-6 text-gray-700 whitespace-pre-wrap break-words"
        >
          {{ debug_conversation_summary }}
        </div>
        <!-- 编辑态 -->
        <a-textarea
          v-else
          v-model="content"
          placeholder="请输入长期记忆内容..."
          :auto-size="{ minRows: 8 }"
          :max-length="5000"
          show-word-limit
        />

        <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <template v-if="!isEditing">
            <a-popconfirm
              content="确定删除全部长期记忆吗？删除后不可恢复。"
              type="warning"
              @ok="handleDelete"
            >
              <a-button status="danger" :loading="saving">删除</a-button>
            </a-popconfirm>
            <a-button type="primary" @click="handleEdit">编辑</a-button>
          </template>
          <template v-else>
            <a-button :disabled="saving" @click="handleCancelEdit">取消</a-button>
            <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
          </template>
        </div>
      </div>
    </a-spin>
  </a-modal>
</template>
