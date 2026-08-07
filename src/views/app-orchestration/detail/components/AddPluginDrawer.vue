<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { PluginItem } from '../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const activeTab = ref<'custom' | 'builtin' | 'all'>('custom')
const searchKeyword = ref('')

const plugins = reactive<PluginItem[]>([
  { pluginId: 'p1', name: '图片理解', description: '回答用户关于图像的问题', enabled: true, category: 'builtin' },
  { pluginId: 'p2', name: '必应搜索', description: '必应搜索引擎，搜索天气、汇率等', enabled: true, category: 'builtin' },
  { pluginId: 'p3', name: '代码解释器', description: '执行代码并返回结果', enabled: false, category: 'builtin' },
  { pluginId: 'p4', name: '数据库查询', description: '查询数据库获取业务数据', enabled: false, category: 'builtin' },
  { pluginId: 'p5', name: '自定义翻译', description: '多语言翻译工具', enabled: true, category: 'custom' },
  { pluginId: 'p6', name: '数据格式化', description: '格式化输出数据', enabled: false, category: 'custom' },
])

const tabs: { key: 'custom' | 'builtin' | 'all'; label: string }[] = [
  { key: 'custom', label: '自定义插件' },
  { key: 'builtin', label: '内置' },
  { key: 'all', label: '全部' },
]

const filteredPlugins = computed(() => {
  let list = plugins
  if (activeTab.value === 'custom') {
    list = list.filter((p) => p.category === 'custom')
  } else if (activeTab.value === 'builtin') {
    list = list.filter((p) => p.category === 'builtin')
  }
  const keyword = searchKeyword.value.trim()
  if (keyword) {
    list = list.filter(
      (p) => p.name.includes(keyword) || p.description.includes(keyword)
    )
  }
  return list
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      activeTab.value = 'custom'
      searchKeyword.value = ''
    }
  }
)

function switchTab(tab: 'custom' | 'builtin' | 'all') {
  activeTab.value = tab
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[1000]">
      <div class="absolute inset-0 bg-black/45" @click="emit('close')"></div>
      <div class="absolute right-0 top-0 bottom-0 w-[520px] bg-white shadow-xl flex flex-col">
        <header class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb] flex-shrink-0">
          <h3 class="text-base font-medium text-[#1d2129]">添加插件</h3>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f2f3f5] text-[#86909c] transition-colors"
            @click="emit('close')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="px-5 pt-3 border-b border-[#e5e6eb] flex-shrink-0">
          <div class="flex gap-0 mb-3">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              class="px-4 py-2 text-[13px] relative transition-colors"
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

          <div class="relative mb-3">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-[#86909c]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索插件"
              class="w-full pl-9 pr-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] transition-colors"
            >
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-4">
          <div
            v-if="activeTab === 'custom'"
            class="mb-4"
          >
            <button
              class="w-full py-4 border-2 border-dashed border-[#e5e6eb] rounded-lg text-[13px] text-[#4e5969] hover:border-[#1677ff] hover:text-[#1677ff] hover:bg-[#f0f5ff] transition-colors flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>创建自定义插件</span>
            </button>
          </div>

          <div class="space-y-2">
            <div
              v-for="plugin in filteredPlugins"
              :key="plugin.pluginId"
              class="flex items-center gap-3 p-3 rounded-lg border border-[#e5e6eb] hover:border-[#c9cdd4] hover:bg-[#fafbfc] transition-colors"
            >
              <div class="w-9 h-9 rounded-lg bg-[#e8f3ff] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-medium text-[#1d2129] truncate">{{ plugin.name }}</div>
                <div class="text-[12px] text-[#86909c] truncate">{{ plugin.description }}</div>
              </div>
              <button
                class="flex items-center justify-center w-7 h-7 rounded-md bg-[#1677ff] text-white hover:bg-[#4096ff] transition-colors flex-shrink-0"
                title="添加"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          <div v-if="filteredPlugins.length === 0" class="text-center py-12 text-[13px] text-[#86909c]">
            暂无插件
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>