<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Message, type FormInstance, type FieldRule } from '@arco-design/web-vue'
import {
  createApiKey,
  updateApiKey,
} from '@/services/api-key'
import type {
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  GetApiKeysWithPageResponse,
} from '@/models/api-key'

/** 列表行类型 */
type ApiKeyItem = GetApiKeysWithPageResponse['data']['list'][number]

const props = defineProps<{
  visible: boolean
  /** 弹窗模式：create / edit */
  mode: 'create' | 'edit'
  /** 编辑时传入的行数据 */
  editing?: ApiKeyItem | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const formRef = ref<FormInstance | null>(null)
const submitting = ref(false)
const MAX_REMARK = 2000

const form = reactive<{
  is_active: boolean
  remark: string
}>({
  is_active: true,
  remark: '',
})

const rules = computed<Record<string, FieldRule | FieldRule[]>>(() => ({
  remark: [
    {
      validator: (value: unknown, callback) => {
        if (typeof value === 'string' && value.length > MAX_REMARK) {
          callback(`备注不能超过 ${MAX_REMARK} 个字符`)
          return
        }
        callback()
      },
    },
  ],
}))

/** 弹窗打开时初始化表单数据 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    if (props.mode === 'edit' && props.editing) {
      form.is_active = props.editing.is_active
      form.remark = props.editing.remark || ''
    } else {
      form.is_active = true
      form.remark = ''
    }
    formRef.value?.clearValidate()
    submitting.value = false
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSubmit = async () => {
  const err = await formRef.value?.validate()
  if (err) return
  submitting.value = true
  try {
    if (props.mode === 'create') {
      const req: CreateApiKeyRequest = {
        is_active: form.is_active,
        remark: form.remark,
      }
      const resp = await createApiKey(req)
      Message.success(resp.message)
    } else if (props.editing) {
      const req: UpdateApiKeyRequest = {
        is_active: form.is_active,
        remark: form.remark,
      }
      const resp = await updateApiKey(props.editing.id, req)
      Message.success(resp.message)
    }
    emit('saved')
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
    :title="mode === 'create' ? '新增秘钥' : '编辑秘钥'"
    :mask-closable="false"
    :confirm-loading="submitting"
    ok-text="保存"
    cancel-text="取消"
    :width="480"
    :on-before-ok="() => false"
    @cancel="handleClose"
    @close="handleClose"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      class="api-key-form"
    >
      <!-- 秘钥状态 -->
      <a-form-item field="is_active" label="秘钥状态" required>
        <div class="flex items-center gap-2">
          <a-switch v-model="form.is_active" />
          <span class="text-[13px] text-[#86909c]">
            {{ form.is_active ? '可用' : '禁用' }}
          </span>
        </div>
      </a-form-item>

      <!-- 秩钥备注 -->
      <a-form-item field="remark" label="秘钥备注">
        <a-textarea
          v-model="form.remark"
          :max-length="MAX_REMARK"
          :auto-size="{ minRows: 4, maxRows: 8 }"
          placeholder="请输入秘钥备注，用于描述秘钥基础信息"
          show-word-limit
        />
      </a-form-item>
    </a-form>

    <!-- 底部按钮（自定义 footer） -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <a-button @click="handleClose">取消</a-button>
        <a-button
          type="primary"
          :loading="submitting"
          @click="handleSubmit"
        >
          保存
        </a-button>
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .api-key-form {
    @apply flex flex-col gap-1 py-2;
  }
}
</style>
