<script setup lang="ts">
/**
 * 飞书 Bot 配置弹窗
 *  - App ID / App Secret / Encrypt Key / Verification Token
 *  - 接口 TODO：后端未提供飞书配置的 get/save 接口
 */
import { reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'

interface FeishuConfigForm {
  app_id: string
  app_secret: string
  encrypt_key: string
  verification_token: string
}

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const formRef = ref()
const form = reactive<FeishuConfigForm>({
  app_id: '',
  app_secret: '',
  encrypt_key: '',
  verification_token: '',
})

const rules = {
  app_id: [{ required: true, message: '请输入 App ID' }],
  app_secret: [{ required: true, message: '请输入 App Secret' }],
}

const loading = ref(false)

const handleCancel = () => {
  emit('update:visible', false)
}

const handleSave = async () => {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  try {
    loading.value = true
    // TODO: 对接后端飞书配置保存接口
    // await saveFeishuConfig(form)
    Message.success('保存成功')
    emit('update:visible', false)
  } catch {
    // 请求层统一提示
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  async (val) => {
    if (!val) return
    try {
      // TODO: 对接后端飞书配置获取接口
      // const resp = await getFeishuConfig()
      // Object.assign(form, resp.data)
    } catch {
      // 未配置时使用默认空值
    }
  },
)
</script>

<template>
  <a-modal
    :visible="visible"
    title="飞书 Bot 配置"
    :footer="false"
    :width="520"
    unmount-on-close
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="form"
      :rules="rules"
      layout="vertical"
      class="mt-2"
    >
      <!-- App ID -->
      <a-form-item field="app_id" label="App ID">
        <a-input v-model="form.app_id" placeholder="请输入飞书应用 App ID" />
      </a-form-item>

      <!-- App Secret -->
      <a-form-item field="app_secret" label="App Secret">
        <a-input-password v-model="form.app_secret" placeholder="请输入飞书应用 App Secret" />
      </a-form-item>

      <!-- Encrypt Key（可选） -->
      <a-form-item field="encrypt_key" label="Encrypt Key（可选）">
        <a-input-password v-model="form.encrypt_key" placeholder="如开启消息加密请填写" />
      </a-form-item>

      <!-- Verification Token -->
      <a-form-item field="verification_token" label="Verification Token">
        <a-input-password v-model="form.verification_token" placeholder="请输入事件订阅的验证 Token" />
      </a-form-item>
    </a-form>

    <!-- 底栏按钮 -->
    <div class="flex items-center justify-end gap-2 mt-2">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="loading" @click="handleSave">保存</a-button>
    </div>
  </a-modal>
</template>
