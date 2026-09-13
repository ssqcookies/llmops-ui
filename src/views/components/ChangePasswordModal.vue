<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Message, type FormInstance, type FieldRule } from '@arco-design/web-vue'
import { updatePassword } from '@/services/account'

const props = defineProps<{
  visible: boolean
  /** 是否已设置过密码：true=修改（需原密码），false=首次设置（无原密码） */
  hasPassword: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
}>()

const formRef = ref<FormInstance | null>(null)
const submitting = ref(false)

const form = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

/** 密码格式：至少包含一个字母和一个数字，长度 8-16 */
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()._-]{8,16}$/

const rules = computed<Record<string, FieldRule | FieldRule[]>>(() => {
  const base: Record<string, FieldRule | FieldRule[]> = {
    newPassword: [
      { required: true, message: '请输入新密码' },
      {
        validator: (value, callback) => {
          if (!value) {
            callback('请输入新密码')
            return
          }
          if (value.length < 8 || value.length > 16) {
            callback('密码长度需为 8-16 位')
            return
          }
          if (!passwordPattern.test(value)) {
            callback('密码需至少包含一个字母和一个数字')
            return
          }
          callback()
        },
      },
    ],
    confirmPassword: [
      { required: true, message: '请再次输入新密码' },
      {
        validator: (value, callback) => {
          if (value !== form.newPassword) {
            callback('两次输入的新密码不一致')
            return
          }
          callback()
        },
      },
    ],
  }
  // 仅修改密码时校验原密码
  if (props.hasPassword) {
    base.oldPassword = [{ required: true, message: '请输入原密码' }]
  }
  return base
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      form.oldPassword = ''
      form.newPassword = ''
      form.confirmPassword = ''
      submitting.value = false
    }
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
    await updatePassword(form.newPassword)
    Message.success(props.hasPassword ? '密码修改成功' : '密码设置成功')
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
    :title="hasPassword ? '修改密码' : '设置密码'"
    :mask-closable="false"
    :confirm-loading="submitting"
    :ok-text="hasPassword ? '确认修改' : '确认设置'"
    cancel-text="取消"
    @before-close="handleClose"
    @ok="handleSubmit"
    @cancel="handleClose"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      class="password-form"
    >
      <!-- 仅修改密码时显示原密码 -->
      <a-form-item v-if="hasPassword" field="oldPassword" label="原密码">
        <a-input-password
          v-model="form.oldPassword"
          placeholder="请输入原密码"
          allow-clear
        />
      </a-form-item>
      <a-form-item field="newPassword" label="新密码">
        <a-input-password
          v-model="form.newPassword"
          placeholder="8-16 位，需包含字母和数字"
          allow-clear
        />
      </a-form-item>
      <a-form-item field="confirmPassword" label="确认新密码">
        <a-input-password
          v-model="form.confirmPassword"
          placeholder="请再次输入新密码"
          allow-clear
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .password-form {
    @apply flex flex-col gap-1 py-2;
  }
}
</style>
