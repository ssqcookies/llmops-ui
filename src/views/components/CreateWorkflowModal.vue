<script setup lang="ts">
/** 创建/编辑工作流弹窗（个人空间-工作流 Tab） */
import { ref, reactive, watch, computed } from 'vue'
import { Message, type FieldRule, type UploadFile } from '@arco-design/web-vue'
import { uploadImage } from '@/services/upload-file'
import { createWorkflow, updateWorkflow } from '@/services/workflow'
import type { CreateWorkflowRequest, UpdateWorkflowRequest } from '@/models/workflow'

const props = defineProps<{
  visible: boolean
  mode?: 'create' | 'edit'
  workflowId?: string
  initialData?: {
    name: string
    tool_call_name: string
    icon: string
    description: string
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const MAX_NAME = 40
const MAX_TOOL_CALL = 40
const MAX_DESC = 800

const formRef = ref()
const submitting = ref(false)

/** Arco file-list：picture-card 模式用它驱动缩略图回显 */
const fileList = ref<UploadFile[]>([])

const formData = reactive<{
  icon: string
  name: string
  tool_call_name: string
  description: string
}>({
  icon: '',
  name: '',
  tool_call_name: '',
  description: '',
})

const modalTitle = computed(() =>
  props.mode === 'edit' ? '编辑工作流' : '创建工作流',
)

const nameLen = computed(() => formData.name.length)
const toolCallLen = computed(() => formData.tool_call_name.length)
const descLen = computed(() => formData.description.length)

const rules = computed<Record<string, FieldRule | FieldRule[]>>(() => ({
  icon: [{ required: true, message: '请上传工作流图标' }],
  name: [
    { required: true, message: '工作流名称不能为空' },
    { maxLength: MAX_NAME, message: `工作流名称不能超过 ${MAX_NAME} 个字符` },
  ],
  tool_call_name: [
    { required: true, message: '英文名称不能为空' },
    { maxLength: MAX_TOOL_CALL, message: `英文名称不能超过 ${MAX_TOOL_CALL} 个字符` },
  ],
}))

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    submitting.value = false
    if (props.mode === 'edit' && props.initialData) {
      formData.icon = props.initialData.icon || ''
      formData.name = props.initialData.name || ''
      formData.tool_call_name = props.initialData.tool_call_name || ''
      formData.description = props.initialData.description || ''
      // 编辑模式：预构造 fileList，picture-card 自动回显
      if (formData.icon) {
        fileList.value = [
          {
            uid: '-1',
            name: 'icon',
            url: formData.icon,
            status: 'done',
          },
        ]
      } else {
        fileList.value = []
      }
    } else {
      formData.icon = ''
      formData.name = ''
      formData.tool_call_name = ''
      formData.description = ''
      fileList.value = []
    }
    formRef.value?.clearValidate()
  },
)

/**
 * a-upload picture-card + auto-upload=false：
 * before-upload 返回 false 阻止原生上传，手动调 uploadImage API
 * 然后把返回 URL 写回当前 file 对象，Arco 自动渲染缩略图回显
 */
const handleBeforeUpload = async (file: UploadFile) => {
  // 阻止原生上传
  fileList.value = [{ ...file, status: 'uploading' }]
  try {
    const resp = await uploadImage(file as unknown as File)
    const url = resp.data.image_url
    // 更新 fileList 让 Arco 渲染缩略图
    fileList.value = [{ ...file, url, status: 'done' }]
    formData.icon = url
    Message.success('图标上传成功')
    formRef.value?.clearValidate(['icon'])
  } catch {
    fileList.value = []
    Message.error('图标上传失败')
  }
  return false
}

/** picture-card 删除按钮：清空 fileList + 触发表单校验 */
const handleRemove = () => {
  fileList.value = []
  formData.icon = ''
  formRef.value?.validateField(['icon'])
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  submitting.value = true
  try {
    if (props.mode === 'edit' && props.workflowId) {
      const req: UpdateWorkflowRequest = {
        name: formData.name,
        tool_call_name: formData.tool_call_name,
        icon: formData.icon,
        description: formData.description,
      }
      await updateWorkflow(props.workflowId, req)
      Message.success('保存成功')
    } else {
      const req: CreateWorkflowRequest = {
        name: formData.name,
        tool_call_name: formData.tool_call_name,
        icon: formData.icon,
        description: formData.description,
      }
      await createWorkflow(req)
      Message.success('创建成功')
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
    :width="520"
    :footer="false"
    @cancel="handleClose"
    @close="handleClose"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
    >
      <!-- 1. 工作流图标：picture-card 模式自带缩略图回显 + hover 编辑/删除 -->
      <a-form-item field="icon" label="工作流图标" required>
        <a-upload
          v-model:file-list="fileList"
          list-type="picture-card"
          :auto-upload="false"
          accept="image/*"
          :limit="1"
          :show-remove-button="true"
          @before-upload="handleBeforeUpload"
          @remove="handleRemove"
        >
          <div class="w-20 h-20 flex flex-col items-center justify-center text-[#86909c]">
            <icon-plus :size="18" />
            <span class="text-[12px] mt-1">上传图标</span>
          </div>
        </a-upload>
      </a-form-item>

      <!-- 2. 工作流名称 -->
      <a-form-item field="name" label="工作流名称" required>
        <a-input
          v-model="formData.name"
          :max-length="MAX_NAME"
          allow-clear
          placeholder="请输入工作流名称"
        />
        <div class="flex justify-end text-[12px] text-[#86909c] mt-1">{{ nameLen }}/{{ MAX_NAME }}</div>
      </a-form-item>

      <!-- 3. 英文名称 -->
      <a-form-item field="tool_call_name" label="英文名称" required>
        <a-input
          v-model="formData.tool_call_name"
          :max-length="MAX_TOOL_CALL"
          allow-clear
          placeholder="英文名称将于被大模型识别及调用"
        />
        <div class="flex justify-end text-[12px] text-[#86909c] mt-1">{{ toolCallLen }}/{{ MAX_TOOL_CALL }}</div>
      </a-form-item>

      <!-- 4. 应用描述 -->
      <a-form-item field="description" label="应用描述">
        <a-textarea
          v-model="formData.description"
          :max-length="MAX_DESC"
          :auto-size="{ minRows: 3, maxRows: 5 }"
          placeholder="请输入关于该工作流的描述信息，以便 LLM 能准确识别到工作流的用途。"
        />
        <div class="flex justify-end text-[12px] text-[#86909c] mt-1">{{ descLen }}/{{ MAX_DESC }}</div>
      </a-form-item>
    </a-form>

    <!-- 底部按钮 -->
    <div class="flex justify-end gap-2 pt-2">
      <a-button @click="handleClose">取消</a-button>
      <a-button
        type="primary"
        :loading="submitting"
        :disabled="submitting"
        @click="handleSubmit"
      >
        保存
      </a-button>
    </div>
  </a-modal>
</template>
