<script setup lang="ts">
/** 检索设置 Modal —— 从 Popover 改为 Modal 样式 */
import { ref, watch, nextTick } from 'vue'

/** 检索配置 —— 对齐 HitRequest 的 retrieval_strategy / k / score */
interface RetrievalConfig {
  retrieval_strategy: string
  k: number
  score: number
}

const props = defineProps<{
  visible: boolean
  config: RetrievalConfig
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'update', config: RetrievalConfig): void
}>()

const local = ref<RetrievalConfig>({ ...props.config })

watch(
  () => props.config,
  (val) => {
    local.value = { ...val }
  },
  { deep: true },
)

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    nextTick(() => {
      local.value = { ...props.config }
    })
  },
)

const handleConfirm = () => {
  emit('update', { ...local.value })
  emit('update:visible', false)
}

const handleCancel = () => {
  emit('update:visible', false)
}

/** 关闭 Modal（点击遮罩 / ×） */
const handleModalCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    :width="440"
    :footer="false"
    :mask-closable="true"
    :unmount-on-close="true"
    :hide-title="true"
    :closable="false"
    class="setting-modal"
    @cancel="handleModalCancel"
  >
    <!-- 标题栏 -->
    <div class="modal-head">
      <span class="modal-title">检索设置</span>
      <div class="modal-close" @click="handleModalCancel">
        <icon-close :size="16" />
      </div>
    </div>

    <!-- 表单区 -->
    <div class="modal-body">
      <!-- 检索策略 -->
      <div class="form-row">
        <div class="form-label">
          检索策略
          <a-tooltip content="向量检索基于语义相似度，全文检索基于关键词匹配，混合检索结合两者优势">
            <icon-info-circle class="info-icon" />
          </a-tooltip>
        </div>
        <a-radio-group v-model="local.retrieval_strategy" type="button" size="small">
          <a-radio value="hybrid">混合检索</a-radio>
          <a-radio value="vector">向量检索</a-radio>
          <a-radio value="fulltext">全文检索</a-radio>
        </a-radio-group>
      </div>

      <!-- 最大召回数量 -->
      <div class="form-row">
        <div class="form-label">
          最大召回数量
          <a-tooltip content="单次召回返回的最大片段数量，建议 3-10">
            <icon-info-circle class="info-icon" />
          </a-tooltip>
        </div>
        <div class="slider-row">
          <a-slider
            v-model="local.k"
            :min="1"
            :max="50"
            :step="1"
            class="flex-1"
          />
          <a-input-number
            v-model="local.k"
            :min="1"
            :max="50"
            :step="1"
            size="small"
            class="num-input"
          />
        </div>
      </div>

      <!-- 最小匹配度 -->
      <div class="form-row">
        <div class="form-label">
          最小匹配度
          <a-tooltip content="相似度低于此阈值的片段将被过滤，建议 0.0-0.8">
            <icon-info-circle class="info-icon" />
          </a-tooltip>
        </div>
        <div class="slider-row">
          <a-slider
            v-model="local.score"
            :min="0"
            :max="1"
            :step="0.01"
            class="flex-1"
          />
          <a-input-number
            v-model="local.score"
            :min="0"
            :max="1"
            :step="0.01"
            size="small"
            class="num-input"
          />
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
  /* ===== Modal 容器 ===== */
  .setting-modal :deep(.arco-modal-body) {
    @apply p-0;
  }
  .setting-modal :deep(.arco-modal-content) {
    @apply rounded-[8px] overflow-hidden;
  }

  /* ===== 标题栏 ===== */
  .modal-head {
    @apply flex items-center justify-between px-5 py-4 border-b border-[#f2f3f5];
  }
  .modal-title {
    @apply text-[16px] font-semibold text-[#1d2129];
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
    @apply flex items-center gap-1 text-[14px] text-[#1d2129];
  }
  .info-icon {
    @apply text-[14px] text-[#86909c] cursor-help;
  }
  .slider-row {
    @apply flex items-center gap-3;
  }
  .num-input {
    @apply w-[80px] shrink-0;
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
