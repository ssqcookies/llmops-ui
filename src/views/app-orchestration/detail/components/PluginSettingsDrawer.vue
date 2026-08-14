<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { PluginItem } from '../types'
import { getIcon } from '../icons'

const props = defineProps<{
  visible: boolean
  plugin: PluginItem | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  save: []
}>()

const activeTab = ref('info')

const enabled = ref(true)
const apiEndpoint = ref('https://api.example.com')
const apiKey = ref('')
const timeout = ref(30)
const retryCount = ref(3)

const formModel = reactive({
  enabled: true,
  apiEndpoint: 'https://api.example.com',
  apiKey: '',
  timeout: 30,
  retryCount: 3,
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeTab.value = 'info'
      formModel.enabled = true
      formModel.apiEndpoint = 'https://api.example.com'
      formModel.apiKey = ''
      formModel.timeout = 30
      formModel.retryCount = 3
    }
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save')
  handleClose()
}
</script>

<template>
  <a-drawer
    :visible="visible"
    title="插件信息 & 设置"
    placement="right"
    :width="520"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <div v-if="plugin" class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto">
        <a-tabs v-model:active-key="activeTab" size="large">
          <a-tab-pane key="info" title="信息">
            <div class="py-4">
              <div class="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div class="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center text-gray-600">
                  <component :is="getIcon(plugin.icon)" />
                </div>
                <div class="flex-1">
                  <div class="text-lg font-medium text-gray-800">{{ plugin.name }}</div>
                  <div class="text-sm text-gray-500 mt-1">{{ plugin.description }}</div>
                </div>
              </div>

              <a-descriptions :column="1" bordered size="medium">
                <a-descriptions-item label="插件 ID">
                  {{ plugin.id }}
                </a-descriptions-item>
                <a-descriptions-item label="分类">
                  <a-tag color="arcoblue">{{ plugin.category }}</a-tag>
                </a-descriptions-item>
                <a-descriptions-item label="版本">
                  v1.0.0
                </a-descriptions-item>
                <a-descriptions-item label="开发者">
                  系统内置
                </a-descriptions-item>
                <a-descriptions-item label="更新时间">
                  2026-08-01
                </a-descriptions-item>
              </a-descriptions>
            </div>
          </a-tab-pane>

          <a-tab-pane key="settings" title="设置">
            <div class="py-4 space-y-6">
              <a-form :model="formModel" layout="vertical">
                <a-form-item field="enabled" label="启用插件">
                  <div class="flex items-center gap-3">
                    <a-switch v-model="formModel.enabled" />
                    <span class="text-xs text-gray-500">
                      关闭后该插件将不会被调用
                    </span>
                  </div>
                </a-form-item>

                <a-form-item field="apiEndpoint" label="API 端点">
                  <a-input v-model="formModel.apiEndpoint" placeholder="请输入 API 端点地址" />
                </a-form-item>

                <a-form-item field="apiKey" label="API 密钥">
                  <a-input-password v-model="formModel.apiKey" placeholder="请输入 API 密钥" />
                </a-form-item>

                <a-form-item field="timeout" label="超时时间（秒）">
                  <a-input-number v-model="formModel.timeout" :min="1" :max="300" />
                </a-form-item>

                <a-form-item field="retryCount" label="重试次数">
                  <a-input-number v-model="formModel.retryCount" :min="0" :max="10" />
                </a-form-item>
              </a-form>
            </div>
          </a-tab-pane>
        </a-tabs>
      </div>

      <div class="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-200 flex justify-end gap-3">
        <a-button @click="handleClose">取消</a-button>
        <a-button type="primary" @click="handleSave">保存</a-button>
      </div>
    </div>

    <a-empty v-else description="未选择插件" />
  </a-drawer>
</template>