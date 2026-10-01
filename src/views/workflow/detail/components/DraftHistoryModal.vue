<script setup lang="ts">
/**
 * 草稿历史弹窗
 * 数据来源：GET /workflows/{workflow_id}/draft-graph（仅展示上一次自动保存的草稿）
 * 支持将画布恢复到该草稿版本
 */
import { ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { getDraftGraph } from '@/services/workflow'
import { formatTime } from '@/utils/format'

const props = defineProps({
  /** 弹窗显示状态 */
  visible: {
    type: Boolean,
    required: true,
    default: false,
  },
  /** 工作流ID */
  workflowId: {
    type: String,
    required: true,
  },
  /** 上一次自动保存时间（秒级时间戳，取工作流 updated_at） */
  savedAt: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  /** 恢复草稿：父组件重新从服务端拉取草稿并覆盖画布 */
  (e: 'restore'): void
}>()

/** 加载状态 */
const loading = ref(false)
/** 草稿节点数 */
const nodeCount = ref(0)
/** 草稿连线数 */
const edgeCount = ref(0)
/** 草稿是否为空（尚无任何节点） */
const isEmpty = ref(false)

/** 拉取上一次保存的草稿概要 */
const fetchDraft = async () => {
  if (!props.workflowId) return
  try {
    loading.value = true
    const resp = await getDraftGraph(props.workflowId)
    nodeCount.value = resp.data.nodes?.length ?? 0
    edgeCount.value = resp.data.edges?.length ?? 0
    isEmpty.value = nodeCount.value === 0
  } catch (e) {
    console.error('[getDraftGraph] failed:', e)
    Message.error('草稿加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 弹窗每次打开时拉取最新草稿
watch(
  () => props.visible,
  (val) => {
    if (val) fetchDraft()
  },
)

/** 格式化保存时间：MM-DD HH:mm:ss */
const savedAtText = () =>
  props.savedAt ? formatTime(props.savedAt * 1000, 'MM-DD HH:mm:ss') : '--'

/** 关闭弹窗 */
const handleClose = () => emit('update:visible', false)

/** 恢复到上一次自动保存的草稿 */
const handleRestore = () => {
  emit('restore')
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="草稿历史"
    :width="480"
    :footer="false"
    :mask-closable="false"
    @cancel="handleClose"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <div class="py-1">
      <!-- 说明 -->
      <div class="mb-3 text-[12px] text-[#86909c]">
        展示上一次自动保存的草稿，恢复后将覆盖当前画布内容
      </div>

      <!-- 草稿记录（仅一条） -->
      <a-spin :loading="loading" class="w-full">
        <div
          v-if="!loading"
          class="flex items-center gap-3 rounded-lg border border-[#e5e6eb] px-4 py-3"
        >
          <!-- 时钟图标 -->
          <div
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8f3ff] text-[#165dff]"
          >
            <icon-history :size="18" />
          </div>

          <!-- 草稿信息 -->
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-medium text-[#1d2129]">自动保存草稿</span>
              <span class="rounded bg-[#f2f3f5] px-1.5 py-0.5 text-[11px] text-[#4e5969]">
                {{ savedAtText() }}
              </span>
            </div>
            <div class="mt-0.5 text-[12px] text-[#86909c]">
              <template v-if="isEmpty">空草稿（暂无节点）</template>
              <template v-else>{{ nodeCount }} 个节点 · {{ edgeCount }} 条连线</template>
            </div>
          </div>

          <!-- 恢复按钮 -->
          <a-button type="outline" size="small" :disabled="isEmpty" @click="handleRestore">
            恢复
          </a-button>
        </div>
      </a-spin>
    </div>
  </a-modal>
</template>
