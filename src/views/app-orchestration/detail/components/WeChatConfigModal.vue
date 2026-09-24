<script setup lang="ts">
/**
 * 微信公众号配置弹窗
 *  - 服务器 IP / URL / AppID / AppSecret / Token
 *  - 接口 TODO：后端未提供微信公众号配置的 get/save 接口
 */
import { reactive, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'

interface WeChatConfigForm {
  server_ip: string
  server_url: string
  app_id: string
  app_secret: string
  token: string
}

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const formRef = ref()
const form = reactive<WeChatConfigForm>({
  server_ip: '114.132.46.5',
  server_url: 'https://llmops.shortvar.com/api/wechat/4bb580ec-cb2a-47d4-a024-9787819fb7da',
  app_id: '',
  app_secret: '',
  token: '',
})

const rules = {
  server_ip: [{ required: true, message: '请输入服务器 IP' }],
  server_url: [{ required: true, message: '请输入服务器地址(URL)' }],
  app_id: [{ required: true, message: '请输入开发者 ID (AppID)' }],
  app_secret: [{ required: true, message: '请输入开发者密码 (AppSecret)' }],
  token: [{ required: true, message: '请输入令牌 (Token)' }],
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
    // TODO: 对接后端微信公众号配置保存接口
    // await saveWeChatConfig(form)
    Message.success('保存成功')
    emit('update:visible', false)
  } catch {
    // 请求层统一提示
  } finally {
    loading.value = false
  }
}

// 弹窗打开时加载已保存的配置
watch(
  () => props.visible,
  async (val) => {
    if (!val) return
    try {
      // TODO: 对接后端微信公众号配置获取接口
      // const resp = await getWeChatConfig()
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
    title="微信公众号配置"
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
      <!-- 服务器 IP -->
      <a-form-item field="server_ip" label="服务器IP">
        <a-input v-model="form.server_ip" placeholder="请输入服务器 IP" />
      </a-form-item>

      <!-- 服务器 URL -->
      <a-form-item field="server_url" label="服务器地址(URL)">
        <a-input v-model="form.server_url" placeholder="请输入回调 URL" />
      </a-form-item>

      <!-- AppID -->
      <a-form-item field="app_id" label="开发者ID(AppID)">
        <a-input v-model="form.app_id" placeholder="请输入 AppID" />
      </a-form-item>

      <!-- AppSecret -->
      <a-form-item field="app_secret" label="开发者密码(AppSecret)">
        <a-input-password v-model="form.app_secret" placeholder="请输入 AppSecret" />
      </a-form-item>

      <!-- Token -->
      <a-form-item field="token" label="令牌(Token)">
        <a-input-password v-model="form.token" placeholder="请输入 Token" />
      </a-form-item>
    </a-form>

    <!-- 底栏按钮 -->
    <div class="flex items-center justify-end gap-2 mt-2">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="loading" @click="handleSave">保存</a-button>
    </div>
  </a-modal>
</template>
