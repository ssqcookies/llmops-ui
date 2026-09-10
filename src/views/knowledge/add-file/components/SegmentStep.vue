<script setup lang="ts">
import { ref } from 'vue'
import type { FormInstance, FieldRule } from '@arco-design/web-vue'
import type { CustomSegmentForm, SegmentMode } from '../types'

const props = defineProps<{
  /** 当前分段模式 */
  mode: SegmentMode
  /** 自定义分段表单（父组件持有，子组件直接编辑） */
  form: CustomSegmentForm
}>()

const emit = defineEmits<{
  (e: 'update:mode', mode: SegmentMode): void
}>()

// ============================================================
// 校验
// ============================================================

const formRef = ref<FormInstance | null>(null)

const rules: Record<string, FieldRule | FieldRule[]> = {
  separatorsText: [
    { required: true, message: '请输入分段标识符' },
  ],
  chunkSize: [
    {
      validator: (value, callback) => {
        const num = Number(value)
        if (value === undefined || value === null || !Number.isFinite(num)) {
          callback('请输入100 - 1000的数值')
          return
        }
        if (num < 100 || num > 1000) {
          callback('请输入100 - 1000的数值')
          return
        }
        callback()
      },
    },
  ],
}

/** 父组件调用：校验自定义表单，返回是否通过 */
const validate = async (): Promise<boolean> => {
  if (props.mode !== 'custom') return true
  const err = await formRef.value?.validate()
  return !err
}

defineExpose({ validate })
</script>

<template>
  <div class="segment-step">
    <!-- 卡片 1：自动分段与清洗 -->
    <div
      :class="['mode-card', mode === 'automatic' ? 'mode-card-active' : '']"
      @click="emit('update:mode', 'automatic')"
    >
      <div class="mode-title">自动分段与清洗</div>
      <div class="mode-desc">自动分段与预处理规则</div>
    </div>

    <!-- 卡片 2：自定义（选中后展开表单） -->
    <div :class="['mode-card', mode === 'custom' ? 'mode-card-active' : '']">
      <!-- 卡片头（可点击选择） -->
      <div class="mode-head" @click="emit('update:mode', 'custom')">
        <div class="mode-title">自定义</div>
        <div class="mode-desc">自定义分段规则、分段长度与预处理规则</div>
      </div>

      <!-- 自定义分段表单 -->
      <template v-if="mode === 'custom'">
        <div class="mode-divider"></div>
        <a-form
          ref="formRef"
          :model="form"
          layout="vertical"
          class="custom-form"
          @click.stop
        >
          <!-- 分段标识符 -->
          <a-form-item
            field="separatorsText"
            label="分段标识符"
            required
            :rules="rules.separatorsText"
          >
            <a-input
              v-model="form.separatorsText"
              placeholder="请输入分段标识符，如果有多个标识符，请使用英文逗号进行分割"
              allow-clear
            />
          </a-form-item>

          <!-- 分段最大长度 -->
          <a-form-item
            field="chunkSize"
            label="分段最大长度"
            required
            :rules="rules.chunkSize"
          >
            <a-input-number
              v-model="form.chunkSize"
              :min="100"
              :max="1000"
              :step="10"
              :hide-button="true"
              placeholder="请输入100 - 1000的数值"
              class="chunk-input"
            />
          </a-form-item>

          <!-- 文本预处理规则 -->
          <a-form-item label="文本预处理规则" class="preprocess-item">
            <a-checkbox v-model="form.removeExtraSpaces" class="preprocess-checkbox">
              替换掉连续的空格、换行符和制表符
            </a-checkbox>
            <a-checkbox v-model="form.removeUrlsEmails" class="preprocess-checkbox">
              删除所有 URL 和电子邮件地址
            </a-checkbox>
          </a-form-item>
        </a-form>
      </template>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .segment-step {
    @apply flex flex-col gap-4;
  }

  /* ===== 模式选择卡片 ===== */
  .mode-card {
    @apply bg-white rounded-[8px] border border-[#e5e6eb] px-6 py-5
           cursor-pointer transition-all duration-200
           hover:border-[#94bfff];
  }
  .mode-card-active {
    @apply border-[#165dff] bg-[#f2f7ff];
  }
  /* 自定义卡片选中后表单区域为白底（对齐设计稿） */
  .mode-card-active:last-child {
    @apply bg-white;
  }
  .mode-head {
    @apply cursor-pointer;
  }
  .mode-title {
    @apply text-[16px] font-semibold text-[#1d2129] leading-6;
  }
  .mode-desc {
    @apply text-[13px] text-[#86909c] mt-1.5;
  }
  .mode-divider {
    @apply border-t border-[#e5e6eb] my-5;
  }

  /* ===== 自定义表单 ===== */
  .custom-form {
    @apply flex flex-col gap-1;
  }
  .custom-form :deep(.arco-form-item) {
    @apply mb-4;
  }
  .custom-form :deep(.arco-form-item-label-col) {
    @apply pb-1.5;
  }
  .custom-form :deep(.arco-form-item-label) {
    @apply text-[14px] text-[#1d2129] font-normal;
  }
  .custom-form :deep(.arco-input-wrapper),
  .custom-form :deep(.arco-input-number) {
    @apply rounded-[6px];
  }
  .chunk-input {
    @apply w-full;
  }
  .chunk-input :deep(.arco-input-number) {
    @apply w-full;
  }
  .preprocess-item :deep(.arco-form-item-content) {
    @apply flex flex-col items-start gap-2;
  }
  .preprocess-checkbox {
    @apply text-[14px] text-[#4e5969];
  }
}
</style>
