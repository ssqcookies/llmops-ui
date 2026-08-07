<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { PluginDetail, PluginParam } from '../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: []
}>()

const activeTab = ref<'info' | 'settings'>('info')

const pluginDetail = reactive<PluginDetail>({
  pluginId: 'img-understand',
  name: '图片理解',
  description: '图片理解工具，能够回答用户关于图像内容的问题。支持图像描述、物体识别、OCR文字识别等功能。适用于需要视觉分析的场景。',
  params: [
    { key: 'prompt', label: '提示词', value: '', required: true, type: 'textarea' },
    { key: 'max_length', label: '最大长度', value: '500', required: false, type: 'number' },
    { key: 'language', label: '语言', value: '中文', required: false, type: 'text' },
  ],
})

const tabs: { key: 'info' | 'settings'; label: string }[] = [
  { key: 'info', label: '信息' },
  { key: 'settings', label: '设置' },
]

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeTab.value = 'info'
    }
  }
)

function switchTab(tab: 'info' | 'settings') {
  activeTab.value = tab
}

function handleSave() {
  emit('save')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[1000] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/45" @click="emit('cancel')"></div>
      <div class="relative bg-white rounded-lg shadow-lg w-[560px] max-h-[85vh] flex flex-col">
        <header class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
          <h3 class="text-base font-medium text-[#1d2129]">插件详情</h3>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f2f3f5] text-[#86909c] transition-colors"
            @click="emit('cancel')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="px-5 pt-2 border-b border-[#e5e6eb]">
          <div class="flex gap-0">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="px-4 py-3 text-[13px] relative transition-colors"
              :class="
                activeTab === tab.key
                  ? 'text-[#1677ff] font-medium'
                  : 'text-[#4e5969] hover:text-[#1d2129]'
              "
              @click="switchTab(tab.key)"
            >
              {{ tab.label }}
              <span
                v-if="activeTab === tab.key"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1677ff] rounded-full"
              ></span>
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div v-if="activeTab === 'info'">
            <div class="bg-[#f7f8fa] rounded-lg p-4">
              <h4 class="text-[13px] font-medium text-[#1d2129] mb-2">工具描述</h4>
              <p class="text-[13px] text-[#86909c] leading-6">{{ pluginDetail.description }}</p>
            </div>
          </div>

          <div v-else>
            <div class="space-y-4">
              <div v-for="param in pluginDetail.params" :key="param.key">
                <label class="block text-[13px] text-[#4e5969] mb-1.5">
                  {{ param.label }}
                  <span v-if="param.required" class="text-[#f53f3f] ml-1">*</span>
                </label>
                <textarea
                  v-if="param.type === 'textarea'"
                  v-model="param.value"
                  rows="4"
                  :placeholder="`请输入${param.label}`"
                  class="w-full px-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] resize-none transition-colors"
                ></textarea>
                <input
                  v-else
                  v-model="param.value"
                  :type="param.type === 'number' ? 'number' : 'text'"
                  :placeholder="`请输入${param.label}`"
                  class="w-full px-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] transition-colors"
                >
              </div>
            </div>
          </div>
        </div>

        <footer class="flex justify-end gap-3 px-5 py-4 border-t border-[#e5e6eb]">
          <button
            class="border border-[#e5e6eb] px-5 py-2 rounded-md text-[13px] text-[#4e5969] hover:bg-[#f7f8fa] transition-colors"
            @click="emit('cancel')"
          >
            取消
          </button>
          <button
            class="bg-[#1677ff] text-white px-5 py-2 rounded-md text-[13px] hover:bg-[#4096ff] transition-colors"
            @click="handleSave"
          >
            保存
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>