<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance, RequestOption, UploadRequest } from '@arco-design/web-vue'
import { uploadImage } from '@/services/upload-file'

/** 弹窗模式 */
type FormMode = 'create' | 'edit'

/** 编辑时透传的原数据 */
interface EditingItem {
  id: string
  name: string
  icon: string
  description: string
}

const props = defineProps<{
  visible: boolean
  mode: FormMode
  editing?: EditingItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'submit', payload: {
    mode: FormMode
    data: { name: string; icon: string; description: string }
    id?: string
  }): void
}>()

// ============================================================
// 状态
// ============================================================

const formRef = ref<FormInstance | null>(null)

/** 表单数据（icon 存上传后返回的 image_url） */
const formData = reactive({
  name: '',
  icon: '',
  description: '',
})

/** 图标上传中 */
const iconUploading = ref(false)
/** 提交 Loading */
const submitLoading = ref(false)

// ============================================================
// 计算属性
// ============================================================

const isEdit = computed(() => props.mode === 'edit')
const title = computed(() => (isEdit.value ? '编辑知识库' : '创建知识库'))

// ============================================================
// 校验规则
// ============================================================

const rules: Record<string, FieldRule | FieldRule[]> = {
  name: [
    { required: true, message: '知识库名称不能为空' },
    { maxLength: 100, message: '名称不能超过 100 个字符' },
  ],
  icon: [
    {
      validator: (value, callback) => {
        if (!value) {
          callback('请上传知识库图标')
          return
        }
        callback()
      },
    },
  ],
  description: [{ maxLength: 2000, message: '描述不能超过 2000 个字符' }],
}

// ============================================================
// 方法
// ============================================================

/** 上传前校验：仅允许图片，大小 2MB 以内 */
const beforeUpload = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {
    Message.error('仅支持上传图片文件')
    return false
  }
  if (file.size > 2 * 1024 * 1024) {
    Message.error('图标大小不能超过 2MB')
    return false
  }
  return true
}

/** a-upload customRequest —— 走项目封装 uploadImage */
const handleCustomRequest = (option: RequestOption): UploadRequest => {
  const file = option.fileItem?.file
  if (!file || !beforeUpload(file)) return {}
  iconUploading.value = true
  uploadImage(file)
    .then((res) => {
      if (res?.data?.image_url) {
        formData.icon = res.data.image_url
        option.onProgress?.(100)
        option.onSuccess?.(res as unknown as XMLHttpRequest)
        // 上传成功后清除 icon 字段的校验报错
        formRef.value?.clearValidate(['icon'])
      } else {
        option.onError?.(new Error('图标上传失败'))
        Message.error('图标上传失败')
      }
    })
    .catch((err) => {
      option.onError?.(err)
      Message.error('图标上传失败')
    })
    .finally(() => {
      iconUploading.value = false
    })
  return {}
}

/** 移除已上传图标（删除按钮在 a-upload 外部，不会触发文件选择） */
const handleRemoveIcon = () => {
  formData.icon = ''
}

/** 弹窗打开时重置 / 填充编辑数据 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    nextTick(() => {
      formData.name = ''
      formData.icon = ''
      formData.description = ''
      if (isEdit.value && props.editing) {
        formData.name = props.editing.name
        formData.icon = props.editing.icon
        formData.description = props.editing.description
      }
      formRef.value?.clearValidate()
    })
  },
)

/** 提交 */
const handleSubmit = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  submitLoading.value = true
  emit('submit', {
    mode: props.mode,
    data: {
      name: formData.name,
      icon: formData.icon,
      description: formData.description,
    },
    id: isEdit.value ? props.editing?.id : undefined,
  })
  // 兜底 1s 后解除 loading（真正关闭由父组件控制）
  setTimeout(() => {
    submitLoading.value = false
  }, 1000)
}

/** 取消 */
const handleCancel = () => {
  emit('update:visible', false)
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="title"
    :mask-closable="false"
    :width="520"
    ok-text="保存"
    cancel-text="取消"
    :ok-loading="submitLoading"
    @ok="handleSubmit"
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
      <!-- 知识库图标（上传 / 回显） -->
      <a-form-item field="icon" label="知识库图标" required :rules="rules.icon">
        <div class="icon-upload-wrap">
          <a-upload
            :custom-request="handleCustomRequest"
            :show-file-list="false"
            :show-remove-icon="false"
            accept="image/*"
            class="icon-upload"
          >
            <!-- Arco Upload 自定义触发器必须使用 #upload-button 具名插槽 -->
            <template #upload-button>
              <!-- 无图：虚线上传方块 -->
              <div v-if="!formData.icon" class="icon-trigger">
                <icon-loading v-if="iconUploading" class="trigger-icon spin" />
                <template v-else>
                  <icon-plus class="trigger-icon" :size="22" />
                  <span class="trigger-text">上传图标</span>
                </template>
              </div>
              <!-- 有图：预览（点击可替换） -->
              <div v-else class="icon-preview-wrap">
                <img :src="formData.icon" alt="知识库图标" class="icon-preview" />
                <div class="preview-mask">
                  <icon-refresh :size="16" />
                  <span>点击替换</span>
                </div>
              </div>
            </template>
          </a-upload>
          <!-- 删除按钮放在 a-upload 外部，点击不会触发文件选择 -->
          <div
            v-if="formData.icon"
            class="icon-remove-btn"
            title="移除图标"
            @click="handleRemoveIcon"
          >
            <icon-close :size="12" />
          </div>
        </div>
      </a-form-item>

      <!-- 知识库名称 -->
      <a-form-item field="name" label="知识库名称" required :rules="rules.name">
        <a-input
          v-model="formData.name"
          placeholder="知识库名称不能为空"
          :max-length="100"
          show-word-limit
        />
      </a-form-item>

      <!-- 知识库描述 -->
      <a-form-item field="description" label="知识库描述" :rules="rules.description">
        <a-textarea
          v-model="formData.description"
          placeholder="输入知识库内容的描述。"
          :max-length="2000"
          show-word-limit
          :auto-size="{ minRows: 4, maxRows: 8 }"
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

  /* ===== 图标上传区 ===== */
  .icon-upload-wrap {
    @apply relative inline-block;
  }
  .icon-upload :deep(.arco-upload),
  .icon-upload :deep(.arco-upload-trigger) {
    @apply inline-block;
  }

  /* 无图：虚线方块触发器 */
  .icon-trigger {
    @apply w-[140px] h-[140px] rounded-[8px] bg-[#f7f8fa]
           border border-dashed border-[#c9cdd4]
           flex flex-col items-center justify-center gap-1
           cursor-pointer transition-colors
           hover:border-[#165dff] hover:bg-[#f2f7ff];
  }
  .trigger-icon {
    @apply text-[#86909c];
  }
  .trigger-text {
    @apply text-[14px] text-[#4e5969];
  }
  .spin {
    animation: spin 1s linear infinite;
  }

  /* 有图：预览（hover 显示替换遮罩） */
  .icon-preview-wrap {
    @apply relative w-[140px] h-[140px] rounded-[8px] overflow-hidden
           border border-[#eef0f3] cursor-pointer;
  }
  .icon-preview {
    @apply w-full h-full object-cover;
  }
  .preview-mask {
    @apply absolute inset-0 bg-black/45 text-white text-[12px]
           flex flex-col items-center justify-center gap-1
           opacity-0 transition-opacity;
  }
  .icon-preview-wrap:hover .preview-mask {
    @apply opacity-100;
  }

  /* 删除按钮（a-upload 外部，右上角悬浮） */
  .icon-remove-btn {
    @apply absolute -top-2 -right-2 w-5 h-5 rounded-full
           bg-[#f53f3f] text-white flex items-center justify-center
           cursor-pointer shadow-[0_2px_6px_rgba(245,63,63,0.4)]
           hover:bg-[#f76560] transition-colors z-10;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
