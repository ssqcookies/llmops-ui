<script setup lang="ts">
import { ref, computed } from 'vue'

/** 命中项类型 —— 与父组件保持一致 */
interface HitItem {
  id: string
  document: {
    id: string
    name: string
    extension: string
    mime_type: string
  }
  dataset_id: string
  score: number
  position: number
  keywords: string[]
  character_count: number
  token_count: number
  hit_count: number
  enabled: boolean
  disabled_at: number
  status: string
  error: string
  updated_at: number
  created_at: number
}

const props = defineProps<{
  item: HitItem
  /** 序号（从 1 开始） */
  index: number
}>()

/** 是否展开详情 */
const expanded = ref(false)

const toggleExpand = () => {
  expanded.value = !expanded.value
}

/** score 百分比展示 */
const scorePercent = computed(() => {
  const v = Number(props.item.score) || 0
  return (v * 100).toFixed(1)
})

/** 文档图标（按扩展名映射全局 icon 组件名） */
const docIcon = computed(() => {
  const ext = props.item.document?.extension?.toLowerCase() || ''
  if (ext === 'pdf') return 'icon-file-pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'icon-file-image'
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'icon-file-audio'
  if (['mp4', 'avi', 'mov', 'mkv', 'webm'].includes(ext)) return 'icon-file-video'
  return 'icon-file'
})

/** 文档名（兜底文案） */
const docName = computed(() => props.item.document?.name || '未知文档')
</script>

<template>
  <div class="hit-card">
    <!-- 头部：序号 + 文档信息 + score -->
    <div class="card-head" @click="toggleExpand">
      <span class="card-index">{{ index }}</span>
      <component :is="docIcon" class="doc-icon" />
      <div class="head-info">
        <div class="head-title-row">
          <span class="head-title">{{ docName }}</span>
          <span v-if="item.position" class="position-tag">片段 #{{ item.position }}</span>
        </div>
        <div class="head-meta">
          <span class="meta-item">{{ item.character_count }} 字符</span>
          <span class="meta-dot">·</span>
          <span class="meta-item">{{ item.token_count }} Token</span>
          <span class="meta-dot">·</span>
          <span class="meta-item">命中 {{ item.hit_count }} 次</span>
        </div>
      </div>
      <div class="score-wrap">
        <span class="score-value">{{ scorePercent }}%</span>
        <span class="score-label">相似度</span>
      </div>
      <component
        :is="expanded ? 'icon-down' : 'icon-right'"
        class="expand-icon"
      />
    </div>

    <!-- 展开内容 -->
    <div v-if="expanded" class="card-detail">
      <!-- 关键词 -->
      <div v-if="item.keywords && item.keywords.length > 0" class="detail-row">
        <span class="detail-label">关键词</span>
        <div class="keyword-chips">
          <span
            v-for="(kw, idx) in item.keywords"
            :key="idx"
            class="keyword-chip"
          >
            {{ kw }}
          </span>
        </div>
      </div>

      <!-- 文档元信息 -->
      <div class="detail-row">
        <span class="detail-label">文档ID</span>
        <span class="detail-value">{{ item.document?.id || '-' }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">片段ID</span>
        <span class="detail-value">{{ item.id }}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">状态</span>
        <span :class="['detail-status', item.enabled ? 'status-on' : 'status-off']">
          {{ item.enabled ? '启用' : '禁用' }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .hit-card {
    @apply bg-white rounded-[8px] border border-[#eef0f3]
           transition-all duration-200
           hover:shadow-[0_2px_10px_rgba(0,20,60,0.04)] hover:border-[#165dff]/15;
  }

  /* ===== 头部 ===== */
  .card-head {
    @apply flex items-center gap-3 p-3 cursor-pointer;
  }
  .card-index {
    @apply w-6 h-6 rounded-full bg-[#165dff]/10 text-[#165dff]
           flex items-center justify-center text-[12px] font-semibold shrink-0;
  }
  .doc-icon {
    @apply text-[24px] text-[#165dff] shrink-0;
  }
  .head-info {
    @apply flex-1 min-w-0 flex flex-col gap-1;
  }
  .head-title-row {
    @apply flex items-center gap-2;
  }
  .head-title {
    @apply text-[14px] font-medium text-[#1d2129] truncate;
  }
  .position-tag {
    @apply text-[11px] text-[#86909c] bg-[#f2f3f5] px-1.5 py-0.5 rounded-[4px] shrink-0;
  }
  .head-meta {
    @apply flex items-center gap-1.5 text-[12px] text-[#86909c];
  }
  .meta-item {
    @apply leading-5;
  }
  .meta-dot {
    @apply text-[#c9cdd4];
  }

  /* ===== score 区 ===== */
  .score-wrap {
    @apply flex flex-col items-end shrink-0;
  }
  .score-value {
    @apply text-[16px] font-semibold text-[#165dff] leading-6;
  }
  .score-label {
    @apply text-[11px] text-[#86909c] leading-4;
  }
  .expand-icon {
    @apply text-[16px] text-[#86909c] shrink-0;
  }

  /* ===== 详情区 ===== */
  .card-detail {
    @apply flex flex-col gap-2 px-3 pb-3 pt-1 border-t border-[#f2f3f5];
  }
  .detail-row {
    @apply flex items-start gap-2 text-[12px];
  }
  .detail-label {
    @apply text-[#86909c] w-[64px] shrink-0 leading-5;
  }
  .detail-value {
    @apply text-[#4e5969] break-all leading-5;
  }
  .keyword-chips {
    @apply flex flex-wrap gap-1 flex-1;
  }
  .keyword-chip {
    @apply inline-flex items-center px-2 py-0.5 rounded-[4px]
           bg-[#e8f3ff] text-[#165dff] text-[12px] leading-5;
  }
  .detail-status {
    @apply inline-flex items-center px-1.5 py-0.5 rounded-[4px] text-[11px] leading-4;
  }
  .status-on {
    @apply bg-[#e8ffea] text-[#00b42a];
  }
  .status-off {
    @apply bg-[#f2f3f5] text-[#86909c];
  }
}
</style>
