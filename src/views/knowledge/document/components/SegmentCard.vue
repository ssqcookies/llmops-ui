<script setup lang="ts">
import { ref, computed } from 'vue'

/** 片段项类型 —— 与父组件保持一致 */
interface SegmentItem {
  id: string
  dataset_id: string
  document_id: string
  position: number
  content: string
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
  item: SegmentItem
}>()

const emit = defineEmits<{
  edit: []
  delete: []
  toggle: [next: boolean]
}>()

/** content 折叠展示（默认 2 行截断，展开后全部） */
const expanded = ref(false)

/** 是否过长（用于显示展开按钮） */
const hasMore = computed(() => (props.item.content?.length ?? 0) > 120)

const toggleExpand = () => {
  expanded.value = !expanded.value
}

/** 切换启用 */
const handleToggle = (val: boolean | string | number) => {
  emit('toggle', Boolean(val))
}
</script>

<template>
  <div class="seg-card">
    <!-- 头部：片段序号 + 启用开关 + 操作 -->
    <div class="card-head">
      <span class="card-position">片段 #{{ item.position }}</span>
      <div class="head-actions">
        <a-switch
          :model-value="item.enabled"
          size="small"
          @change="handleToggle"
        />
        <a-button type="text" size="mini" class="action-btn" @click="emit('edit')">
          <template #icon>
            <icon-edit />
          </template>
          编辑
        </a-button>
        <a-button
          type="text"
          size="mini"
          class="action-btn action-delete"
          @click="emit('delete')"
        >
          <template #icon>
            <icon-delete />
          </template>
          删除
        </a-button>
      </div>
    </div>

    <!-- 内容区 -->
    <div
      :class="['card-content', expanded ? 'expanded' : '']"
      @click="hasMore ? toggleExpand() : undefined"
    >
      {{ item.content || '（暂无内容）' }}
    </div>

    <!-- 底部：关键词 + 元信息 -->
    <div class="card-foot">
      <div v-if="item.keywords && item.keywords.length > 0" class="keyword-chips">
        <span
          v-for="(kw, idx) in item.keywords"
          :key="idx"
          class="keyword-chip"
        >
          {{ kw }}
        </span>
      </div>
      <div class="meta-row">
        <icon-info-circle class="meta-icon" />
        <span class="meta-text">{{ item.character_count }} 字符 · {{ item.token_count }} Token · 命中 {{ item.hit_count }} 次</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .seg-card {
    @apply bg-white rounded-[8px] border border-[#eef0f3]
           flex flex-col gap-3 p-4
           transition-all duration-200
           hover:shadow-[0_2px_10px_rgba(0,20,60,0.04)] hover:border-[#165dff]/15;
  }

  /* ===== 头部 ===== */
  .card-head {
    @apply flex items-center justify-between gap-2;
  }
  .card-position {
    @apply text-[13px] font-semibold text-[#165dff];
  }
  .head-actions {
    @apply flex items-center gap-1;
  }
  .action-btn :deep(.arco-btn) {
    @apply text-[#4e5969] hover:text-[#165dff] text-[12px] h-[24px] px-1;
  }
  .action-delete :deep(.arco-btn) {
    @apply hover:text-[#f53f3f];
  }

  /* ===== 内容 ===== */
  .card-content {
    @apply text-[13px] text-[#4e5969] leading-[1.7] min-h-[44px]
           overflow-hidden cursor-pointer;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .card-content.expanded {
    -webkit-line-clamp: unset;
    display: block;
    overflow: visible;
  }

  /* ===== 底部 ===== */
  .card-foot {
    @apply flex flex-col gap-2 pt-2 border-t border-[#f2f3f5];
  }
  .keyword-chips {
    @apply flex flex-wrap gap-1;
  }
  .keyword-chip {
    @apply inline-flex items-center px-2 py-0.5 rounded-[4px]
           bg-[#e8f3ff] text-[#165dff] text-[12px] leading-5;
  }
  .meta-row {
    @apply flex items-center gap-1;
  }
  .meta-icon {
    @apply text-[12px] text-[#c9cdd4];
  }
  .meta-text {
    @apply text-[12px] text-[#86909c];
  }
}
</style>
