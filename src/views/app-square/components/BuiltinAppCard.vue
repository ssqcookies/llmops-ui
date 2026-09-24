<script setup lang="ts">
/** 应用广场内置应用卡片（单按钮：加入工作区，已加入则禁用） */
import type { GetBuiltinAppsResponse } from '@/models/builtin-app'

/** 内置应用列表项类型 */
type BuiltinAppItem = GetBuiltinAppsResponse['data'][number]

const props = defineProps<{
  /** 应用数据 */
  item: BuiltinAppItem
  /** 是否已加入个人工作区（取自接口 is_added） */
  added: boolean
  /** 加入中（按钮 loading，防重复点击） */
  adding: boolean
}>()

const emit = defineEmits<{
  /** 点击「加入工作区」按钮 */
  (e: 'add', item: BuiltinAppItem): void
}>()

const handleAdd = () => {
  if (props.added || props.adding) return
  emit('add', props.item)
}

/** 模型信息（厂商 · 模型展示名 label），label 缺失时回退 model / name，空值/占位值过滤 */
const modelInfo = (item: BuiltinAppItem): string => {
  const cfg = item.model_config
  if (!cfg) return ''
  const provider = (cfg.provider || '').trim()
  const modelLabel = (cfg.label || cfg.model || cfg.name || '').trim()
  const PLACEHOLDERS = new Set(['assistant', 'default', 'unknown', '未设置', ''])
  const pValid = !!provider && !PLACEHOLDERS.has(provider.toLowerCase())
  const mValid = !!modelLabel && !PLACEHOLDERS.has(modelLabel.toLowerCase())
  if (pValid && mValid) return `${provider} · ${modelLabel}`
  if (pValid) return provider
  if (mValid) return modelLabel
  return ''
}
</script>

<template>
  <div class="square-card">
    <!-- 卡片头部：图标 + 名称 + 厂商·模型 -->
    <div class="card-head">
      <img :src="item.icon" :alt="item.name" class="card-icon" />
      <div class="card-title-wrap">
        <span class="card-title">{{ item.name }}</span>
        <span v-if="modelInfo(item)" class="card-model-info">{{ modelInfo(item) }}</span>
      </div>
    </div>

    <!-- 描述：2行截断 -->
    <div class="card-desc">{{ item.description }}</div>

    <!-- 底部：加入工作区按钮（已加入 → 禁用态「已加入」） -->
    <div class="card-foot">
      <a-button
        v-if="!added"
        type="outline"
        size="small"
        class="add-btn"
        :loading="adding"
        @click="handleAdd"
      >
        <template #icon><icon-plus /></template>
        加入工作区
      </a-button>
      <a-button
        v-else
        type="outline"
        size="small"
        class="added-btn"
        disabled
      >
        <template #icon><icon-check /></template>
        已加入
      </a-button>
    </div>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .square-card {
    @apply flex flex-col bg-white rounded-[8px] border border-[#eef0f3] p-4 min-h-[180px]
           transition-all duration-200
           hover:shadow-[0_4px_16px_rgba(0,20,60,0.06)] hover:border-[#165dff]/20;
  }
  .card-head {
    @apply flex items-start gap-3;
  }
  .card-icon {
    @apply w-11 h-11 rounded-[10px] object-cover shrink-0;
  }
  .card-title-wrap {
    @apply flex flex-col gap-1 min-w-0 flex-1;
  }
  .card-title {
    @apply text-[15px] font-semibold text-[#1d2129] truncate leading-5;
  }
  .card-model-info {
    @apply text-[12px] text-[#86909c] truncate;
  }
  .card-desc {
    @apply mt-3 text-[13px] text-[#4e5969] leading-[20px] overflow-hidden flex-1;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .card-foot {
    @apply mt-4 pt-3 border-t border-[#f2f3f5];
  }
  /* 加入工作区按钮（蓝描边） */
  .add-btn :deep(.arco-btn) {
    border-color: #165dff;
    color: #165dff;
    background-color: #ffffff;
    border-radius: 6px;
  }
  .add-btn :deep(.arco-btn:hover) {
    background-color: #e8f3ff;
    border-color: #4080ff;
    color: #165dff;
  }
  /* 已加入按钮（灰底禁用态） */
  .added-btn :deep(.arco-btn) {
    border-color: #e5e6eb;
    color: #86909c;
    background-color: #f7f8fa;
    border-radius: 6px;
  }
}
</style>
