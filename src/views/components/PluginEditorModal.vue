<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { FieldRule } from '@arco-design/web-vue'
import type { ApiToolProviderData } from '@/models/api-tool'
import {
  createCustomPlugin,
  updateCustomPlugin,
  deleteCustomPlugin,
  validateSchema,
  parseOpenAPISchema,
  type PluginHeaderItem,
  type ParsedTool,
} from '@/services/pluginService'

/** 编辑器模式 */
type EditorMode = 'create' | 'edit'

const props = defineProps<{
  visible: boolean
  mode: EditorMode
  providerId?: string
  initialData?: ApiToolProviderData
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'close'): void
  (e: 'success'): void
  (e: 'deleted'): void
}>()

const submitLoading = ref(false)
const deleteLoading = ref(false)
const formRef = ref()

interface EditorForm {
  name: string
  icon: string
  openapiSchema: string
  headers: PluginHeaderItem[]
}

const formData = reactive<EditorForm>({
  name: '',
  icon: '',
  openapiSchema: '',
  headers: [],
})

const rules: Record<string, FieldRule | FieldRule[]> = {
  name: [{ required: true, message: '请输入插件名称' }],
  openapiSchema: [{ required: true, message: '请粘贴 OpenAPI Schema' }],
}

/** 从 initialData 回填表单 */
const resetForm = () => {
  if (props.mode === 'edit' && props.initialData) {
    formData.name = props.initialData.name
    formData.icon = props.initialData.icon
    formData.openapiSchema = props.initialData.openapi_schema
    formData.headers = props.initialData.headers?.length
      ? props.initialData.headers.map((h) => ({ ...h }))
      : []
  } else {
    formData.name = ''
    formData.icon = ''
    formData.openapiSchema = ''
    formData.headers = []
  }
  submitLoading.value = false
  deleteLoading.value = false
}

watch(
  () => props.visible,
  (val) => {
    if (val) resetForm()
  },
)

const modalTitle = computed(() => (props.mode === 'create' ? '新建插件' : '编辑插件'))

/** 解析后的可用工具 */
const parsedTools = computed<ParsedTool[]>(() => parseOpenAPISchema(formData.openapiSchema))

/** icon 上传：FileReader 转 base64 Data URL */
const handleIconUpload = (file: File) => {
  const reader = new FileReader()
  reader.onload = () => {
    formData.icon = reader.result as string
  }
  reader.readAsDataURL(file)
  return false
}

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const addHeader = () => {
  formData.headers.push({ key: '', value: '' })
}

const removeHeader = (idx: number) => {
  formData.headers.splice(idx, 1)
}

const handleDelete = () => {
  if (!props.providerId) return
  Modal.confirm({
    title: '确认删除',
    content: '删除后该插件将无法恢复，关联应用/工作流也会失效，是否继续？',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      deleteLoading.value = true
      try {
        const ok = await deleteCustomPlugin(props.providerId!)
        if (ok) {
          Message.success('删除成功')
          emit('deleted')
          handleClose()
        }
      } finally {
        deleteLoading.value = false
      }
    },
  })
}

const handleSubmit = async () => {
  if (submitLoading.value) return
  if (!formRef.value) {
    Message.error('表单初始化异常，请重试')
    return
  }

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  const schema = formData.openapiSchema.trim()
  if (!schema) {
    Message.error('请粘贴 OpenAPI Schema')
    return
  }

  submitLoading.value = true
  try {
    const isValid = await validateSchema(schema)
    if (!isValid) {
      Message.error('OpenAPI Schema 校验失败，请检查格式')
      return
    }

    const payload = {
      name: formData.name,
      icon: formData.icon,
      openapi_schema: schema,
      headers: formData.headers.filter((h) => h.key.trim()),
    }

    let ok = false
    if (props.mode === 'edit' && props.providerId) {
      ok = await updateCustomPlugin(props.providerId, payload)
    } else {
      ok = await createCustomPlugin({ ...payload, category: 'utility' })
    }

    if (ok) {
      Message.success(props.mode === 'create' ? '创建成功' : '保存成功')
      emit('success')
      handleClose()
    }
  } catch {
    Message.error(props.mode === 'create' ? '创建失败，请稍后重试' : '保存失败，请稍后重试')
  } finally {
    submitLoading.value = false
  }
}
</script>

<template>
  <a-modal
    :visible="visible"
    :title="modalTitle"
    :mask-closable="false"
    :ok-loading="submitLoading"
    :ok-text="mode === 'create' ? '保存' : '保存'"
    width="620px"
    @before-close="handleClose"
    @ok="handleSubmit"
    @cancel="handleClose"
  >
    <a-form ref="formRef" :model="formData" :rules="rules" layout="vertical">
      <!-- Icon 上传 -->
      <a-form-item field="icon">
        <a-upload
          accept="image/*"
          :show-file-list="false"
          :before-upload="handleIconUpload"
          class="icon-upload-wrap"
        >
          <div class="icon-preview">
            <img v-if="formData.icon" :src="formData.icon" alt="plugin-icon" />
            <div v-else class="icon-placeholder">
              <icon-plus :size="20" />
            </div>
          </div>
        </a-upload>
      </a-form-item>

      <!-- 插件名称 -->
      <a-form-item field="name" label="插件名称">
        <a-input
          v-model="formData.name"
          placeholder="请输入插件名称，请确保名称含义清晰"
          allow-clear
          :max-length="60"
          show-word-limit
        />
      </a-form-item>

      <!-- OpenAPI Schema -->
      <a-form-item field="openapiSchema" label="OpenAPI Schema">
        <a-textarea
          v-model="formData.openapiSchema"
          placeholder="在此处输入您的 OpenAPI Schema"
          :auto-size="{ minRows: 5, maxRows: 10 }"
          :max-length="600"
          show-word-limit
        />
      </a-form-item>

      <!-- 可用工具 -->
      <div class="section-title">可用工具</div>
      <a-table
        :data="parsedTools"
        :pagination="false"
        size="small"
        class="tools-table"
      >
        <template #columns>
          <a-table-column title="名称" data-index="name" />
          <a-table-column title="描述" data-index="description" />
          <a-table-column title="方法" data-index="method" />
          <a-table-column title="路径" data-index="path" />
        </template>
      </a-table>

      <!-- Headers -->
      <div class="section-title mt-5">Headers</div>
      <a-table
        :data="formData.headers"
        :pagination="false"
        size="small"
        class="headers-table"
      >
        <template #columns>
          <a-table-column title="Key">
            <template #cell="{ record }">
              <a-input
                v-model="record.key"
                placeholder="请输入请求头键名"
                size="mini"
                allow-clear
              />
            </template>
          </a-table-column>
          <a-table-column title="Value">
            <template #cell="{ record }">
              <a-input
                v-model="record.value"
                placeholder="请输入请求头键值内容"
                size="mini"
                allow-clear
              />
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="60">
            <template #cell="{ rowIndex }">
              <a-button
                type="text"
                size="mini"
                class="delete-btn"
                @click="removeHeader(rowIndex)"
              >
                <icon-delete />
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
      <a-button
        type="text"
        size="small"
        class="add-header-btn"
        @click="addHeader"
      >
        <template #icon><icon-plus /></template>
        新增参数
      </a-button>
    </a-form>

    <template #footer>
      <div class="modal-footer">
        <a-button
          v-if="mode === 'edit'"
          type="text"
          status="danger"
          :loading="deleteLoading"
          @click="handleDelete"
        >
          删除
        </a-button>
        <div class="footer-right">
          <a-button @click="handleClose">取消</a-button>
          <a-button type="primary" :loading="submitLoading" @click="handleSubmit">
            保存
          </a-button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .icon-upload-wrap {
    @apply flex justify-center w-full;
  }
  .icon-preview {
    @apply w-[72px] h-[72px] rounded-[8px] overflow-hidden cursor-pointer
           bg-[#f7f8fa] border border-[#eef0f3] flex items-center justify-center
           hover:border-[#165dff] transition-colors;
  }
  .icon-preview img {
    @apply w-full h-full object-cover;
  }
  .icon-placeholder {
    @apply w-full h-full flex items-center justify-center text-[#86909c];
  }

  .section-title {
    @apply text-[14px] font-medium text-[#1d2129] mb-3;
  }

  .tools-table,
  .headers-table {
    @apply rounded-[6px] border border-[#eef0f3] overflow-hidden;
  }

  .add-header-btn {
    @apply mt-2 text-[#165dff];
  }

  .delete-btn {
    @apply text-[#86909c] hover:text-[#f53f3f];
  }

  .modal-footer {
    @apply flex items-center justify-between w-full;
  }
  .footer-right {
    @apply flex items-center gap-2;
  }
}
</style>
