<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { createSegment, updateSegment } from '@/services/dataset'

/** 编辑对象类型 */
interface SegmentItem {
  id: string
  content: string
  keywords: string[]
  [key: string]: unknown
}

const props = defineProps<{
  visible: boolean
  datasetId: string
  documentId: string
  /** 编辑时传入；新增时为 null */
  item?: SegmentItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const formRef = ref<FormInstance | null>(null)
const formData = reactive<{ content: string; keywords: string[] }>({
  content: '',
  keywords: [],
})
const submitLoading = ref(false)

const isEdit = computed(() => !!props.item)
const title = computed(() => (isEdit.value ? '编辑片段' : '添加片段'))
const okText = computed(() => (isEdit.value ? '保存' : '添加'))

const rules: Record<string, FieldRule | FieldRule[]> = {
  content: [
    { required: true, message: '请输入片段内容' },
    { maxLength: 5000, message: '片段内容不能超过 5000 字符' },
  ],
}

/** 弹窗打开时重置 / 填充 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    nextTick(() => {
      formData.content = props.item?.content ?? ''
      formData.keywords = props.item?.keywords ? [...props.item.keywords] : []
      formRef.value?.clearValidate()
    })
  },
)

const handleOk = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  if (!props.datasetId || !props.documentId) return
  submitLoading.value = true
  try {
    const payload = {
      content: formData.content,
      keywords: formData.keywords,
    }
    if (isEdit.value && props.item) {
      await updateSegment(props.datasetId, props.documentId, props.item.id, payload)
      Message.success('保存成功')
      emit('success')
    } else {
      await createSegment(props.datasetId, props.documentId, payload)
      Message.success('添加成功')
      emit('success')
    }
  } catch {
    Message.error(isEdit.value ? '保存失败，请稍后重试' : '添加失败，请稍后重试')
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
    :width="600"
    :ok-text="okText"
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
      <a-form-item field="content" label="片段内容" :rules="rules.content">
        <a-textarea
          v-model="formData.content"
          placeholder="请输入片段内容"
          :max-length="5000"
          show-word-limit
          :auto-size="{ minRows: 4, maxRows: 10 }"
        />
      </a-form-item>

      <a-form-item field="keywords" label="关键词">
        <a-input-tag
          v-model="formData.keywords"
          placeholder="输入关键词后回车，可添加多个"
          allow-clear
          :max-tag-count="10"
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
