<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'

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

const formRef = ref<FormInstance | null>(null)
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
      formRef.value?.clearValidate()
    })
  },
)

const rules: Record<string, FieldRule | FieldRule[]> = {
  k: [
    { required: true, message: '请输入召回数量' },
    {
      validator: (value, callback) => {
        const num = Number(value)
        if (!Number.isFinite(num) || num < 1 || num > 50) {
          callback('范围 1-50')
          return
        }
        callback()
      },
    },
  ],
  score: [
    { required: true, message: '请输入最小匹配度' },
    {
      validator: (value, callback) => {
        const num = Number(value)
        if (!Number.isFinite(num) || num < 0 || num > 1) {
          callback('范围 0-1')
          return
        }
        callback()
      },
    },
  ],
}

const handleConfirm = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  emit('update', { ...local.value })
}

const handleCancel = () => {
  emit('update:visible', false)
}

/** a-popover visible 双向更新 */
const onVisibleChange = (val: boolean | undefined) => {
  emit('update:visible', Boolean(val))
}
</script>

<template>
  <a-popover
    :visible="visible"
    trigger="click"
    position="br"
    :popup-container="'body'"
    class="setting-popover"
    @update:visible="onVisibleChange"
  >
    <a-button type="outline" size="medium" class="setting-btn">
      <template #icon>
        <icon-settings />
      </template>
      检索设置
    </a-button>

    <template #content>
      <div class="popover-content">
        <div class="popover-title">检索设置</div>
        <a-form
          ref="formRef"
          :model="local"
          :rules="rules"
          layout="vertical"
          class="setting-form"
        >
          <a-form-item field="retrieval_strategy" label="检索策略">
            <a-radio-group v-model="local.retrieval_strategy" type="button" size="small">
              <a-radio value="hybrid">混合检索</a-radio>
              <a-radio value="vector">向量检索</a-radio>
              <a-radio value="fulltext">全文检索</a-radio>
            </a-radio-group>
          </a-form-item>

          <a-form-item field="k" label="最大召回数量" :rules="rules.k">
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
          </a-form-item>

          <a-form-item field="score" label="最小匹配度" :rules="rules.score">
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
          </a-form-item>
        </a-form>

        <div class="popover-footer">
          <a-button size="small" @click="handleCancel">取消</a-button>
          <a-button type="primary" size="small" @click="handleConfirm">确定</a-button>
        </div>
      </div>
    </template>
  </a-popover>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .setting-btn :deep(.arco-btn) {
    @apply border border-[#165dff] text-[#165dff] rounded-[6px] h-[36px] px-3 bg-white;
  }
  .setting-btn :deep(.arco-btn:hover) {
    @apply bg-[#e8f3ff];
  }

  .popover-content {
    @apply w-[340px] flex flex-col gap-3 p-1;
  }
  .popover-title {
    @apply text-[14px] font-semibold text-[#1d2129] pb-1;
  }
  .setting-form {
    @apply flex flex-col gap-2;
  }
  .slider-row {
    @apply flex items-center gap-3;
  }
  .num-input {
    @apply w-[80px];
  }
  .popover-footer {
    @apply flex justify-end gap-2 pt-2 border-t border-[#f2f3f5];
  }
}
</style>
