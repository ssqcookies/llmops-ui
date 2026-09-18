<script setup lang="ts">
/** 片段详情 Modal —— 点击命中卡片弹出 */
import { ref, watch, nextTick } from 'vue'

interface HitItem {
  id: string
  position: number
  /** 片段内容（markdown / 纯文本） */
  content?: string
  keywords: string[]
  /** 字符数（兜底展示用） */
  character_count?: number
}

const props = defineProps<{
  visible: boolean
  item: HitItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'confirm', item: HitItem): void
}>()

/** 关键词 chips（内部可编辑） */
const localKeywords = ref<string[]>([])

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    nextTick(() => {
      localKeywords.value = [...(props.item?.keywords ?? [])]
    })
  },
)

/** 移除某个关键词 */
const removeKeyword = (idx: number) => {
  localKeywords.value.splice(idx, 1)
}

const handleConfirm = () => {
  if (props.item) {
    emit('confirm', { ...props.item, keywords: localKeywords.value })
  }
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('update:visible', false)
}

const handleClose = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    :width="520"
    :footer="false"
    :mask-closable="true"
    :unmount-on-close="true"
    :hide-title="true"
    :closable="false"
    class="segment-modal"
    @cancel="handleClose"
  >
    <!-- 标题栏 -->
    <div class="modal-head">
      <span class="modal-title">片段详情
        <span v-if="item" class="title-tag">#{{ item.position }}</span>
      </span>
      <div class="modal-close" @click="handleClose">
        <icon-close :size="16" />
      </div>
    </div>

    <!-- 表单区 -->
    <div class="modal-body" v-if="item">
      <!-- 片段内容 -->
      <div class="form-row">
        <div class="form-label required">片段内容</div>
        <div class="content-box">
          <pre class="content-text">{{ item.content || `片段 #${item.position} · ${item.character_count ?? 0} 字符` }}</pre>
        </div>
      </div>

      <!-- 关键词 -->
      <div class="form-row">
        <div class="form-label">关键词</div>
        <div class="keyword-list">
          <div
            v-for="(kw, idx) in localKeywords"
            :key="idx"
            class="keyword-chip"
          >
            <span class="chip-text">{{ kw }}</span>
            <div class="chip-close" @click="removeKeyword(idx)">
              <icon-close :size="12" />
            </div>
          </div>
          <div v-if="localKeywords.length === 0" class="keyword-empty">
            暂无关键词
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="modal-footer">
      <a-button size="small" class="btn-cancel" @click="handleCancel">取消</a-button>
      <a-button type="primary" size="small" class="btn-ok" @click="handleConfirm">确定</a-button>
    </div>
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .segment-modal :deep(.arco-modal-body) {
    @apply p-0;
  }
  .segment-modal :deep(.arco-modal-content) {
    @apply rounded-[8px] overflow-hidden;
  }

  /* ===== 标题栏 ===== */
  .modal-head {
    @apply flex items-center justify-between px-5 py-4 border-b border-[#f2f3f5];
  }
  .modal-title {
    @apply text-[16px] font-semibold text-[#1d2129];
  }
  .title-tag {
    @apply ml-1 text-[13px] text-[#86909c] font-normal;
  }
  .modal-close {
    @apply w-6 h-6 flex items-center justify-center
           text-[#86909c] rounded-[4px] cursor-pointer
           hover:bg-[#f2f3f5] hover:text-[#1d2129] transition-colors;
  }

  /* ===== 表单区 ===== */
  .modal-body {
    @apply flex flex-col gap-5 px-5 py-5;
  }
  .form-row {
    @apply flex flex-col gap-2;
  }
  .form-label {
    @apply text-[14px] text-[#1d2129] leading-6;
  }
  .form-label.required::before {
    content: '*';
    @apply text-[#f53f3f] mr-0.5;
  }

  /* 片段内容预览框 */
  .content-box {
    @apply bg-[#f7f8fa] rounded-[6px] border border-[#eef0f3] p-4;
  }
  .content-text {
    @apply text-[13px] text-[#4e5969] leading-[22px] whitespace-pre-wrap break-all font-sans;
    @apply max-h-[240px] overflow-y-auto;
  }

  /* 关键词 chips */
  .keyword-list {
    @apply flex flex-wrap gap-2 min-h-[32px] items-center;
  }
  .keyword-chip {
    @apply inline-flex items-center gap-1 px-2 py-1 rounded-[4px]
           bg-[#e8f3ff] text-[#165dff] text-[12px] leading-5;
  }
  .chip-text {
    @apply leading-none;
  }
  .chip-close {
    @apply w-3.5 h-3.5 flex items-center justify-center
           text-[#165dff] rounded-full cursor-pointer
           hover:bg-[#165dff] hover:text-white transition-colors;
  }
  .keyword-empty {
    @apply text-[12px] text-[#86909c];
  }

  /* ===== 底部按钮 ===== */
  .modal-footer {
    @apply flex items-center justify-end gap-2 px-5 py-4 border-t border-[#f2f3f5];
  }
  .btn-cancel {
    @apply rounded-[6px];
  }
  .btn-ok {
    @apply rounded-[6px];
  }
}
</style>
