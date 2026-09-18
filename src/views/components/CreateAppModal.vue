<script setup lang="ts">
/** 创建/编辑 AI 应用弹窗（个人空间-AI应用 Tab + 全局创建入口共用） */
import { ref, reactive, watch, computed } from 'vue'
import { Message, type FieldRule } from '@arco-design/web-vue'
import { uploadImage } from '@/services/upload-file'
import {
  createApp,
  updateApp,
} from '@/services/app'
import type { CreateAppRequest, UpdateAppRequest } from '@/models/app'

const props = defineProps<{
  /** 弹窗可见性（v-model:visible） */
  visible: boolean
  /** 模式：create / edit */
  mode?: 'create' | 'edit'
  /** 编辑时传入的应用 ID */
  appId?: string
  /** 编辑时回填的初始数据 */
  initialData?: {
    name: string
    icon: string
    description: string
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  /** 创建/编辑成功后触发，父组件刷新列表 */
  (e: 'success'): void
}>()

const MAX_NAME = 40
const MAX_DESC = 800

const formRef = ref()
const submitting = ref(false)
const uploadingIcon = ref(false)

const formData = reactive<{
  icon: string
  name: string
  description: string
}>({
  icon: '',
  name: '',
  description: '',
})

/** 弹窗标题 */
const modalTitle = computed(() =>
  props.mode === 'edit' ? '编辑应用' : '创建AI应用',
)

/** 表单校验规则 */
const rules = computed<Record<string, FieldRule | FieldRule[]>>(() => ({
  name: [
    { required: true, message: '应用名称不能为空' },
    { maxLength: MAX_NAME, message: `应用名称不能超过 ${MAX_NAME} 个字符` },
  ],
  description: [
    { maxLength: MAX_DESC, message: `应用描述不能超过 ${MAX_DESC} 个字符` },
  ],
}))

/** 弹窗打开时初始化表单 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    submitting.value = false
    uploadingIcon.value = false
    if (props.mode === 'edit' && props.initialData) {
      formData.icon = props.initialData.icon || ''
      formData.name = props.initialData.name || ''
      formData.description = props.initialData.description || ''
    } else {
      formData.icon = ''
      formData.name = ''
      formData.description = ''
    }
    formRef.value?.clearValidate()
  },
)

/** 自定义上传：调 uploadImage 拿 URL */
const handleUploadIcon = async (file: File) => {
  if (!file) return
  uploadingIcon.value = true
  try {
    const resp = await uploadImage(file)
    formData.icon = resp.data.image_url
    Message.success('图标上传成功')
    // a-upload 使用自定义插槽时 Arco Form 无法感知字段变化，需手动清除必填校验
    formRef.value?.clearValidate(['icon'])
  } catch {
    Message.error('图标上传失败')
  } finally {
    uploadingIcon.value = false
  }
}

const handleBeforeUpload = (file: File) => {
  handleUploadIcon(file)
  return false
}

/** 删除已上传图标 */
const handleRemoveIcon = () => {
  formData.icon = ''
  // 值清空后主动触发必填校验，提示用户重新上传
  formRef.value?.validateField(['icon'])
}

/** 关闭弹窗 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 提交表单 */
const handleSubmit = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  if (!formData.icon) {
    Message.warning('请上传应用图标')
    return
  }
  submitting.value = true
  try {
    if (props.mode === 'edit' && props.appId) {
      const req: UpdateAppRequest = {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
      }
      const resp = await updateApp(props.appId, req)
      Message.success(resp.message || '保存成功')
    } else {
      const req: CreateAppRequest = {
        name: formData.name,
        icon: formData.icon,
        description: formData.description,
      }
      const resp = await createApp(req)
      Message.success(resp.message || '创建成功')
    }
    emit('success')
    emit('update:visible', false)
  } catch {
    // 错误已由 request 层统一提示
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :mask-closable="false"
    :width="480"
    :footer="false"
    @cancel="handleClose"
    @close="handleClose"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      class="app-form"
    >
      <!-- 1. 应用图标上传 -->
      <a-form-item field="icon" label="应用图标" required>
        <a-upload
          :show-file-list="false"
          :show-remove-button="false"
          :auto-upload="false"
          accept="image/*"
          :on-before-upload="handleBeforeUpload"
        >
          <template #upload-button>
            <div class="icon-uploader">
              <!-- 无图标：虚线占位 -->
              <div v-if="!formData.icon" class="icon-placeholder">
                <a-spin v-if="uploadingIcon" :loading="true" />
                <template v-else>
                  <icon-plus :size="20" />
                  <span class="icon-placeholder-text">上传图标</span>
                </template>
              </div>
              <!-- 已上传：图片预览 -->
              <div v-else class="icon-preview">
                <img :src="formData.icon" alt="app-icon" class="icon-img" />
                <div v-if="uploadingIcon" class="icon-loading-mask">
                  <a-spin :loading="true" />
                </div>
                <div class="icon-hover-mask">
                  <icon-refresh :size="16" />
                  <span>点击替换</span>
                </div>
              </div>
            </div>
          </template>
        </a-upload>
        <!-- 删除按钮（图标已上传时显示） -->
        <a-button
          v-if="formData.icon"
          type="text"
          size="mini"
          class="icon-remove-btn"
          @click="handleRemoveIcon"
        >
          <template #icon><icon-close /></template>
          删除
        </a-button>
      </a-form-item>

      <!-- 2. 应用名称 -->
      <a-form-item field="name" label="应用名称" required>
        <a-input
          v-model="formData.name"
          :max-length="MAX_NAME"
          placeholder="请输入应用名称"
          show-word-limit
        />
      </a-form-item>

      <!-- 3. 应用描述 -->
      <a-form-item field="description" label="应用描述">
        <a-textarea
          v-model="formData.description"
          :max-length="MAX_DESC"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          placeholder="请输入应用描述"
          show-word-limit
        />
      </a-form-item>
    </a-form>

    <!-- 底部按钮 -->
    <div class="flex justify-end gap-3 mt-2">
      <a-button @click="handleClose">取消</a-button>
      <a-button type="primary" :loading="submitting" @click="handleSubmit">
        保存
      </a-button>
    </div>
  </a-modal>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .app-form {
    @apply flex flex-col gap-1 py-2;
  }
  .icon-uploader {
    @apply w-[80px] h-[80px] rounded-[8px] overflow-hidden;
  }
  .icon-placeholder {
    @apply w-full h-full border-[1.5px] border-dashed border-[#c9cdd4]
           rounded-[8px] bg-[#f7f8fa] flex flex-col items-center justify-center gap-1
           text-[#86909c] cursor-pointer transition-colors
           hover:border-[#165dff] hover:text-[#165dff];
  }
  .icon-placeholder-text {
    @apply text-[12px];
  }
  .icon-preview {
    @apply relative w-full h-full rounded-[8px] overflow-hidden cursor-pointer;
  }
  .icon-img {
    @apply w-full h-full object-cover;
  }
  .icon-loading-mask {
    @apply absolute inset-0 bg-black/40 flex items-center justify-center;
  }
  .icon-hover-mask {
    @apply absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1
           text-white text-[12px] opacity-0 transition-opacity;
  }
  .icon-preview:hover .icon-hover-mask {
    @apply opacity-100;
  }
  .icon-remove-btn {
    @apply text-[#86909c] mt-1;
  }
}
</style>
