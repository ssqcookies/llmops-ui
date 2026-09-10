<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

/** 弹窗提交loading状态 */
const submitLoading = ref(false)

/** 当前步骤 */
const currentStep = ref(1)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      currentStep.value = 1
      submitLoading.value = false
    }
  },
)

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

/** 确认提交 */
const handleSubmit = () => {
  submitLoading.value = true
  // TODO: 预留接口调用位置
  setTimeout(() => {
    submitLoading.value = false
    handleClose()
  }, 1000)
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="创建 AI 应用"
    :mask-closable="false"
    :footer="false"
    @before-close="handleClose"
  >
    <div class="flex flex-col gap-4">
      <a-steps :current="currentStep" size="small" line-less>
        <a-step title="基础信息" description="填写应用基本信息" />
        <a-step title="能力配置" description="配置 AI 能力" />
        <a-step title="发布上线" description="完成创建并发布" />
      </a-steps>

      <div class="min-h-[240px] py-4">
        <a-empty description="创建 AI 应用引导流程占位" />
      </div>

      <div class="flex justify-between items-center">
        <a-button
          v-if="currentStep > 1"
          @click="currentStep--"
        >
          上一步
        </a-button>
        <span v-else />
        <div class="flex gap-2">
          <a-button @click="handleClose">取消</a-button>
          <a-button
            v-if="currentStep < 3"
            type="primary"
            @click="currentStep++"
          >
            下一步
          </a-button>
          <a-button
            v-else
            type="primary"
            :loading="submitLoading"
            @click="handleSubmit"
          >
            完成创建
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>
