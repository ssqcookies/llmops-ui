<script setup lang="ts">
import { computed } from 'vue'
import type { ProcessingDoc } from '../types'

const props = defineProps<{
  /** 处理中文档列表（父组件轮询写入） */
  docs: ProcessingDoc[]
  /** 是否全部处理完成（completed / error） */
  done: boolean
}>()

/** 文档状态归一化（小写） */
type DocStatus = 'waiting' | 'parsing' | 'splitting' | 'indexing' | 'completed' | 'error'

const normalizeStatus = (status: string): DocStatus => {
  const s = String(status || '').toLowerCase()
  if (['waiting', 'parsing', 'splitting', 'indexing', 'completed', 'error'].includes(s)) {
    return s as DocStatus
  }
  return 'waiting'
}

/** 状态文案 */
const STATUS_TEXT: Record<DocStatus, string> = {
  waiting: '等待处理',
  parsing: '解析中',
  splitting: '分段中',
  indexing: '索引中',
  completed: '处理完成',
  error: '处理失败',
}

/** 处理中的状态集合 */
const PROCESSING_STATUS: DocStatus[] = ['waiting', 'parsing', 'splitting', 'indexing']

/** 是否处理中（显示 loading） */
const isProcessing = (doc: ProcessingDoc): boolean =>
  PROCESSING_STATUS.includes(normalizeStatus(doc.status))

/** 是否完成 */
const isCompleted = (doc: ProcessingDoc): boolean =>
  normalizeStatus(doc.status) === 'completed'

/** 是否失败 */
const isError = (doc: ProcessingDoc): boolean =>
  normalizeStatus(doc.status) === 'error'

/** 分段进度百分比（0-100），无总分段数时返回 0 */
const progressPercent = (doc: ProcessingDoc): number => {
  if (!doc.segment_count || doc.segment_count <= 0) return 0
  const pct = Math.round((doc.completed_segment_count / doc.segment_count) * 100)
  return Math.min(100, Math.max(0, pct))
}

/** 统计：总数 / 完成数 / 失败数 / 处理中数 */
const stats = computed(() => {
  const total = props.docs.length
  let completed = 0
  let error = 0
  props.docs.forEach((d) => {
    if (isCompleted(d)) completed += 1
    else if (isError(d)) error += 1
  })
  return { total, completed, error, processing: total - completed - error }
})

/** 文件大小格式化 */
const formatSize = (size: number): string => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="processing-step">
    <!-- 顶部总体状态条 -->
    <div :class="['overview-bar', done ? 'overview-bar-done' : 'overview-bar-running']">
      <div class="overview-icon">
        <icon-check-circle-fill v-if="done" :size="18" />
        <icon-loading v-else :size="18" class="overview-spin" />
      </div>
      <div class="overview-text">
        <div class="overview-title">
          {{ done ? '全部文档处理完成' : '文档处理中，请稍候…' }}
        </div>
        <div class="overview-sub">
          共 {{ stats.total }} 个文件 · 完成 {{ stats.completed }}
          <template v-if="stats.error > 0"> · 失败 {{ stats.error }}</template>
          <template v-if="stats.processing > 0"> · 处理中 {{ stats.processing }}</template>
        </div>
      </div>
    </div>

    <!-- 空状态（理论上不会出现，兜底） -->
    <div v-if="docs.length === 0" class="empty-wrap">
      <a-empty description="暂无处理中的文档" />
    </div>

    <!-- 文档处理列表 -->
    <div v-else class="doc-list">
      <div v-for="doc in docs" :key="doc.id" class="doc-row">
        <!-- 文件图标 -->
        <div class="file-badge">
          <icon-file :size="14" />
        </div>

        <!-- 文件名 + 大小 / 错误信息 -->
        <div class="file-main">
          <div class="file-name-row">
            <span class="file-name">{{ doc.name }}</span>
            <span class="file-size">{{ formatSize(doc.size) }}</span>
          </div>
          <!-- 失败原因 -->
          <div v-if="isError(doc) && doc.error" class="file-error">
            {{ doc.error }}
          </div>
          <!-- 处理中：分段进度条 -->
          <div v-else-if="isProcessing(doc) && doc.segment_count > 0" class="progress-wrap">
            <a-progress
              :percent="progressPercent(doc)"
              size="mini"
              :show-text="false"
              class="progress-bar"
            />
            <span class="progress-text">
              {{ doc.completed_segment_count }}/{{ doc.segment_count }} 分段
            </span>
          </div>
        </div>

        <!-- 右侧状态 -->
        <div class="file-status">
          <!-- 处理中：旋转图标 + 文案 -->
          <template v-if="isProcessing(doc)">
            <icon-loading :size="14" class="status-spin" />
            <span class="status-text status-text-running">
              {{ STATUS_TEXT[normalizeStatus(doc.status)] }}
            </span>
          </template>
          <!-- 完成：绿色对勾 -->
          <template v-else-if="isCompleted(doc)">
            <icon-check-circle-fill :size="14" class="status-icon-success" />
            <span class="status-text status-text-success">处理完成</span>
          </template>
          <!-- 失败：红色感叹号 -->
          <template v-else>
            <icon-close-circle-fill :size="14" class="status-icon-error" />
            <span class="status-text status-text-error">处理失败</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .processing-step {
    @apply flex flex-col gap-4;
  }

  /* ===== 顶部总体状态条 ===== */
  .overview-bar {
    @apply flex items-center gap-3 px-5 py-4 rounded-[8px] border;
  }
  .overview-bar-running {
    @apply bg-[#f2f7ff] border-[#bedaff];
  }
  .overview-bar-done {
    @apply bg-[#e8ffea] border-[#aff0b5];
  }
  .overview-icon {
    @apply shrink-0 text-[#165dff];
  }
  .overview-bar-done .overview-icon {
    @apply text-[#00b42a];
  }
  .overview-spin {
    @apply animate-spin;
  }
  .overview-text {
    @apply flex flex-col gap-0.5;
  }
  .overview-title {
    @apply text-[14px] font-semibold text-[#1d2129];
  }
  .overview-sub {
    @apply text-[12px] text-[#86909c];
  }

  /* ===== 文档列表 ===== */
  .empty-wrap {
    @apply flex flex-col items-center justify-center py-16;
  }
  .doc-list {
    @apply flex flex-col gap-2;
  }
  .doc-row {
    @apply flex items-center gap-3 px-4 py-3 rounded-[8px] bg-white border border-[#eef0f3]
           transition-colors hover:border-[#bedaff];
  }
  .file-badge {
    @apply w-8 h-8 rounded-[6px] bg-[#e8f3ff] text-[#165dff]
           flex items-center justify-center shrink-0;
  }
  .file-main {
    @apply flex-1 min-w-0 flex flex-col gap-1;
  }
  .file-name-row {
    @apply flex items-center gap-2;
  }
  .file-name {
    @apply text-[14px] text-[#1d2129] truncate;
  }
  .file-size {
    @apply text-[12px] text-[#86909c] shrink-0;
  }
  .file-error {
    @apply text-[12px] text-[#f53f3f] truncate;
  }
  .progress-wrap {
    @apply flex items-center gap-2;
  }
  .progress-bar {
    @apply flex-1;
  }
  .progress-text {
    @apply text-[12px] text-[#86909c] shrink-0;
  }

  /* ===== 右侧状态 ===== */
  .file-status {
    @apply flex items-center gap-1.5 shrink-0;
  }
  .status-spin {
    @apply text-[#165dff] animate-spin;
  }
  .status-icon-success {
    @apply text-[#00b42a];
  }
  .status-icon-error {
    @apply text-[#f53f3f];
  }
  .status-text {
    @apply text-[13px];
  }
  .status-text-running {
    @apply text-[#165dff];
  }
  .status-text-success {
    @apply text-[#00b42a];
  }
  .status-text-error {
    @apply text-[#f53f3f];
  }
}
</style>
