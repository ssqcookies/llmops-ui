<script setup lang="ts">
/**
 * 微信公众号配置弹窗
 *  - 服务器 IP / 地址(URL) 由后端返回，只读展示
 *  - AppID / AppSecret / Token 由用户填写
 *  - 通过 use-platform hook 对接，不直接调用 service
 */
import { reactive, ref, watch, nextTick } from 'vue'
import { Message } from '@arco-design/web-vue'
import { useGetWechatConfig, useUpdateWechatConfig } from '@/hooks/use-platform'
import type { UpdateWechatConfigRequest } from '@/models/platform'

/** 表单结构（ip/url 为后端返回的只读字段） */
interface WeChatConfigForm {
  server_ip: string
  server_url: string
  wechat_app_id: string
  wechat_app_secret: string
  wechat_token: string
}

const props = defineProps<{
  visible: boolean
  appId: string
}>()
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  /** 配置保存成功，父组件据此刷新渠道状态 */
  (e: 'saved'): void
}>()

// ===== 使用项目已有 hook =====
const { loading: fetchLoading, wechat_config, loadWechatConfig } = useGetWechatConfig()
const { loading: saving, handleUpdateWechatConfig } = useUpdateWechatConfig()

const formRef = ref()
const form = reactive<WeChatConfigForm>({
  server_ip: '',
  server_url: '',
  wechat_app_id: '',
  wechat_app_secret: '',
  wechat_token: '',
})

const rules = {
  wechat_app_id: [{ required: true, message: '请输入开发者 ID (AppID)' }],
  wechat_app_secret: [{ required: true, message: '请输入开发者密码 (AppSecret)' }],
  wechat_token: [{ required: true, message: '请输入令牌 (Token)' }],
}

const handleCancel = () => {
  emit('update:visible', false)
}

const handleSave = async () => {
  // 该版本 Arco 的 validate() 失败时 resolve 错误对象（不 reject），需判断返回值
  const err = await formRef.value?.validate()
  if (err) return
  const req: UpdateWechatConfigRequest = {
    wechat_app_id: form.wechat_app_id,
    wechat_app_secret: form.wechat_app_secret,
    wechat_token: form.wechat_token,
  }
  try {
    // hook 内部成功时已弹出后端返回的 message
    await handleUpdateWechatConfig(props.appId, req)
    emit('saved')
    emit('update:visible', false)
  } catch {
    // 失败时请求层已统一提示，不关闭弹窗
  }
}

/** 复制服务器地址 */
const handleCopyUrl = async () => {
  try {
    await navigator.clipboard.writeText(form.server_url)
    Message.success('地址已复制')
  } catch {
    Message.error('复制失败')
  }
}

// 弹窗每次打开时通过 hook 拉取已保存配置
watch(
  () => props.visible,
  (val) => {
    if (val) loadWechatConfig(props.appId)
  },
)

// 配置数据加载完成后回填表单
watch(wechat_config, async (cfg: Record<string, any>) => {
  form.server_ip = cfg.ip || ''
  form.server_url = cfg.url || ''
  form.wechat_app_id = cfg.wechat_app_id || ''
  form.wechat_app_secret = cfg.wechat_app_secret || ''
  form.wechat_token = cfg.wechat_token || ''
  await nextTick()
  formRef.value?.clearValidate()
})
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
      <!-- 服务器 IP（后端返回，只读） -->
      <a-form-item field="server_ip" label="服务器IP">
        <a-input
          v-model="form.server_ip"
          :loading="fetchLoading"
          placeholder="加载中…"
          readonly
        />
      </a-form-item>

      <!-- 服务器地址 URL（后端返回，只读，可复制） -->
      <a-form-item field="server_url" label="服务器地址(URL)">
        <a-input
          v-model="form.server_url"
          placeholder="加载中…"
          readonly
        >
          <template #append>
            <a-button :disabled="!form.server_url" @click="handleCopyUrl">
              <template #icon><icon-copy :size="14" /></template>
            </a-button>
          </template>
        </a-input>
      </a-form-item>

      <!-- AppID -->
      <a-form-item field="wechat_app_id" label="开发者ID(AppID)">
        <a-input v-model="form.wechat_app_id" placeholder="请输入 AppID" allow-clear />
      </a-form-item>

      <!-- AppSecret -->
      <a-form-item field="wechat_app_secret" label="开发者密码(AppSecret)">
        <a-input-password v-model="form.wechat_app_secret" placeholder="请输入 AppSecret" allow-clear />
      </a-form-item>

      <!-- Token -->
      <a-form-item field="wechat_token" label="令牌(Token)">
        <a-input-password v-model="form.wechat_token" placeholder="请输入 Token" allow-clear />
      </a-form-item>
    </a-form>

    <!-- 底栏按钮 -->
    <div class="flex items-center justify-end gap-2 mt-2">
      <a-button @click="handleCancel">取消</a-button>
      <a-button type="primary" :loading="saving" @click="handleSave">保存</a-button>
    </div>
  </a-modal>
</template>
