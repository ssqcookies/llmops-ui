<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import type { RequestOption, UploadRequest } from '@arco-design/web-vue'
import { uploadFile } from '@/services/upload-file'
import type { UploadedFile } from '../types'

/** 允许的扩展名 */
const ACCEPT_EXTENSIONS = ['pdf', 'txt', 'doc', 'docx', 'md']
/** 单文件大小上限：10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024
/** 最多上传 10 个文件 */
const MAX_FILE_COUNT = 10

const props = defineProps<{
  /** 已上传文件列表（父组件持有） */
  files: UploadedFile[]
}>()

const emit = defineEmits<{
  (e: 'uploaded', file: UploadedFile): void
  (e: 'remove', id: string): void
}>()

/** 上传前校验：类型 / 大小 / 数量 */
const beforeUpload = (file: File, currentCount: number): boolean => {
  if (currentCount >= MAX_FILE_COUNT) {
    Message.warning(`最多可上传 ${MAX_FILE_COUNT} 个文件`)
    return false
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ACCEPT_EXTENSIONS.includes(ext)) {
    Message.error('仅支持 PDF、TXT、DOC、DOCX、MD 格式文件')
    return false
  }
  if (file.size > MAX_FILE_SIZE) {
    Message.error('每个文件不超过 10MB')
    return false
  }
  return true
}

/** a-upload customRequest —— 走项目封装 uploadFile */
const handleCustomRequest = (option: RequestOption): UploadRequest => {
  const file = option.fileItem?.file
  // currentCount 由父组件 files 传入，此处通过闭包参数无法直接拿到，用 DOM 旁路：
  // 实际数量校验在点击层 onBeforeUpload 更合适，这里兜底再取
  if (!file) return {}
  uploadFile(file)
    .then((res) => {
      if (res?.data) {
        emit('uploaded', {
          id: res.data.id,
          name: res.data.name,
          size: res.data.size,
          extension: res.data.extension,
        })
        option.onProgress?.(100)
        option.onSuccess?.(res as unknown as XMLHttpRequest)
      } else {
        option.onError?.(new Error('上传失败'))
        Message.error('上传失败')
      }
    })
    .catch((err) => {
      option.onError?.(err)
      Message.error('上传失败')
    })
  return {}
}

/** a-upload before-upload 钩子（携带当前文件数） */
const handleBeforeUpload = (file: File): boolean => beforeUpload(file, props.files.length)

/** 文件大小格式化 */
const formatSize = (size: number): string => {
  if (!size) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="upload-step">
    <!-- 拖拽上传区（自定义触发器使用 #upload-button 具名插槽） -->
    <a-upload
      draggable
      multiple
      :limit="MAX_FILE_COUNT"
      :show-file-list="false"
      accept=".pdf,.txt,.doc,.docx,.md"
      :before-upload="handleBeforeUpload"
      :custom-request="handleCustomRequest"
      class="upload-zone"
    >
      <template #upload-button>
        <div class="upload-trigger">
          <icon-plus :size="22" class="upload-plus" />
          <div class="upload-text">点击或拖拽文件到此处上传</div>
          <div class="upload-hint">
            支持PDF、TXT、DOC、DOCX、MD，最多可上传10个文件，每个文件不超过10MB
          </div>
        </div>
      </template>
    </a-upload>

    <!-- 已上传文件列表 -->
    <div v-if="files.length > 0" class="file-list">
      <div v-for="file in files" :key="file.id" class="file-row">
        <div class="file-badge">
          <icon-file :size="13" />
        </div>
        <span class="file-name">{{ file.name }}</span>
        <span class="file-size">{{ formatSize(file.size) }}</span>
        <div class="file-remove" title="删除" @click="emit('remove', file.id)">
          <icon-delete :size="15" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .upload-step {
    @apply flex flex-col gap-4;
  }

  /* ===== 拖拽上传区 ===== */
  .upload-zone {
    @apply w-full;
  }
  .upload-zone :deep(.arco-upload-drag) {
    @apply w-full rounded-[8px] bg-[#f2f3f5] border border-dashed border-[#c9cdd4]
           hover:border-[#165dff] hover:bg-[#f2f7ff] transition-colors;
  }
  .upload-zone :deep(.arco-upload-drag .arco-upload-trigger) {
    @apply w-full;
  }
  .upload-trigger {
    @apply w-full flex flex-col items-center justify-center gap-1 py-12 cursor-pointer;
  }
  .upload-plus {
    @apply text-[#4e5969] mb-1;
  }
  .upload-text {
    @apply text-[14px] text-[#1d2129];
  }
  .upload-hint {
    @apply text-[12px] text-[#86909c];
  }

  /* ===== 文件行 ===== */
  .file-list {
    @apply flex flex-col gap-2;
  }
  .file-row {
    @apply flex items-center gap-3 h-11 px-4 rounded-[6px] bg-[#f7f8fa];
  }
  .file-badge {
    @apply w-5 h-5 rounded-[4px] bg-[#165dff] text-white flex items-center justify-center shrink-0;
  }
  .file-name {
    @apply flex-1 text-[14px] text-[#1d2129] truncate;
  }
  .file-size {
    @apply text-[12px] text-[#86909c] shrink-0;
  }
  .file-remove {
    @apply w-6 h-6 flex items-center justify-center text-[#86909c]
           cursor-pointer rounded-[4px] transition-colors
           hover:text-[#f53f3f] hover:bg-[#ffece8] shrink-0;
  }
}
</style>
