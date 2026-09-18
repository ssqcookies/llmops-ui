<script setup lang="ts">
/** 召回测试命中卡片 —— 网格卡片样式 */
import { computed } from 'vue'

/** 命中项类型 —— 与父组件保持一致 */
interface HitItem {
  id: string
  /** 片段内容（markdown 文本）—— 后端响应里可能在别处，这里用 position 做兜底展示 */
  content?: string
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
}>()

const emit = defineEmits<{
  /** 点击卡片 → 打开片段详情 */
  (e: 'click', item: HitItem): void
}>()

/** score 归一化：后端返回 0-1 小数，转为百分比进度 */
const scorePercent = computed(() => {
  const v = Number(props.item.score) || 0
  return Math.min(100, Math.max(0, v * 100))
})

/** 来源文档名 */
const docName = computed(() => props.item.document?.name || '未知文档')

/** 圆形进度条 SVG 参数 */
const CIRCUMFERENCE = 2 * Math.PI * 16 // r=16
const strokeDashoffset = computed(() => {
  return CIRCUMFERENCE - (scorePercent.value / 100) * CIRCUMFERENCE
})
</script>

<template>
  <div class="hit-card" @click="emit('click', item)">
    <!-- 顶部：圆形分数进度 + score 数字 -->
    <div class="card-top">
      <div class="score-ring">
        <svg :width="36" :height="36" viewBox="0 0 36 36">
          <!-- 背景环 -->
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="#e8e8ea"
            stroke-width="3"
          />
          <!-- 进度环 -->
          <circle
            cx="18" cy="18" r="16"
            fill="none"
            stroke="#165dff"
            stroke-width="3"
            stroke-linecap="round"
            stroke-dasharray="100.53"
            :stroke-dashoffset="strokeDashoffset"
            transform="rotate(-90 18 18)"
            class="score-ring-progress"
          />
        </svg>
        <span class="score-number">{{ Number(item.score).toFixed(2) }}</span>
      </div>
    </div>

    <!-- 中部：片段摘要（3 行截断） -->
    <div class="card-snippet">
      {{ item.content || `#${item.position} · ${item.character_count} 字符` }}
    </div>

    <!-- 底部分割线 -->
    <div class="card-divider"></div>

    <!-- 底部：来源文档 -->
    <div class="card-source">
      <icon-folder class="source-icon" />
      <span class="source-name">{{ docName }}</span>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .hit-card {
    @apply flex flex-col bg-white rounded-[8px] border border-[#eef0f3] p-4
           cursor-pointer transition-all duration-200
           hover:shadow-[0_4px_16px_rgba(0,20,60,0.06)] hover:border-[#165dff]/30;
  }

  /* ===== 分数环 ===== */
  .card-top {
    @apply flex items-center justify-start;
  }
  .score-ring {
    @apply relative w-9 h-9;
  }
  .score-ring-progress {
    transition: stroke-dashoffset 0.6s ease;
  }
  .score-number {
    @apply absolute inset-0 flex items-center justify-center
           text-[13px] font-semibold text-[#1d2129] leading-none;
  }

  /* ===== 片段摘要 ===== */
  .card-snippet {
    @apply mt-3 text-[13px] text-[#4e5969] leading-[20px]
           overflow-hidden flex-1 min-h-[60px];
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
  }

  /* ===== 分割线 ===== */
  .card-divider {
    @apply border-t border-[#f2f3f5] my-3;
  }

  /* ===== 来源文档 ===== */
  .card-source {
    @apply flex items-center gap-1.5 text-[12px] text-[#86909c];
  }
  .source-icon {
    @apply text-[14px];
  }
  .source-name {
    @apply truncate;
  }
}
</style>
