<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { updateDocumentName } from '@/services/dataset'

/** 编辑对象类型 */
interface DocumentItem {
  id: string
  name: string
  [key: string]: unknown
}

const props = defineProps<{
  visible: boolean
  datasetId: string
  item?: DocumentItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance | null>(null)
const formData = reactive({ name: '' })
const submitLoading = ref(false)

const rules: Record<string, FieldRule | FieldRule[]> = {
  name: [
    { required: true, message: '请输入文档名称' },
    { maxLength: 100, message: '名称不能超过 100 个字符' },
  ],
}

/** 弹窗打开时填充原数据 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    nextTick(() => {
      formData.name = props.item?.name ?? ''
      formRef.value?.clearValidate()
    })
  },
)

const title = computed(() => '重命名')

const handleOk = async () => {
  const validErr = await formRef.value?.validate()
  if (validErr) return
  if (!props.datasetId || !props.item?.id) return
  submitLoading.value = true
  try {
    await updateDocumentName(props.datasetId, props.item.id, formData.name)
    Message.success('保存成功')
    emit('success')
  } catch {
    Message.error('保存失败，请稍后重试')
  } finally {
    submitLoading.value = false
  }
}

const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="title"
    :mask-closable="false"
    :width="480"
    :ok-text="'保存'"
    :ok-loading="submitLoading"
    cancel-text="取消"
    @ok="handleOk"
    @cancel="handleCancel"
    @close="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      class="form-wrap"
    >
      <a-form-item field="name" label="文档名称" :rules="rules.name">
        <a-input
          v-model="formData.name"
          placeholder="请输入文档名称"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .form-wrap {
    @apply py-2;
  }
}
</style>
