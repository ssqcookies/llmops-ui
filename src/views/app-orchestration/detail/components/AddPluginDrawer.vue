<script setup lang="ts">
import { computed } from 'vue'
import type { PluginCategory, PluginItem } from '../types'
import { getIcon } from '../icons'

const getPluginIcon = (name: string) => getIcon(name)

const props = defineProps<{
  visible: boolean
  category: PluginCategory
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:category': [value: PluginCategory]
  add: [pluginId: string]
}>()

const categories: PluginCategory[] = ['全部', 'Google', '搜索', '天气', '旅行', '自定义插件', '内置']

const mockPlugins: PluginItem[] = [
  { id: '1', name: 'Google 搜索', description: '使用 Google 搜索引擎搜索互联网信息', icon: 'icon-search', category: 'Google' },
  { id: '2', name: 'Google 日历', description: '管理 Google 日历事件和提醒', icon: 'icon-calendar', category: 'Google' },
  { id: '3', name: 'Gmail 邮件', description: '读取和发送 Gmail 邮件', icon: 'icon-mail', category: 'Google' },
  { id: '4', name: '通用搜索', description: '通用搜索引擎插件，支持多引擎切换', icon: 'icon-search', category: '搜索' },
  { id: '5', name: '学术搜索', description: '搜索学术论文和研究成果', icon: 'icon-book', category: '搜索' },
  { id: '6', name: '新闻搜索', description: '搜索最新新闻资讯', icon: 'icon-file', category: '搜索' },
  { id: '7', name: '天气预报', description: '查询全球城市天气预报', icon: 'icon-cloud', category: '天气' },
  { id: '8', name: '空气质量', description: '查询实时空气质量指数', icon: 'icon-cloud', category: '天气' },
  { id: '9', name: '酒店预订', description: '搜索和预订酒店', icon: 'icon-home', category: '旅行' },
  { id: '10', name: '机票查询', description: '查询航班信息和机票价格', icon: 'icon-location', category: '旅行' },
  { id: '11', name: '地图导航', description: '提供路线规划和导航服务', icon: 'icon-location', category: '旅行' },
  { id: '12', name: '代码解释器', description: '内置 Python 代码执行环境', icon: 'icon-code', category: '内置' },
  { id: '13', name: '网页浏览器', description: '内置浏览器，可访问网页', icon: 'icon-link', category: '内置' },
  { id: '14', name: '文件处理', description: '处理上传的文件内容', icon: 'icon-file', category: '内置' },
  { id: '15', name: '数据查询', description: '自然语言转 SQL 查询数据库', icon: 'icon-storage', category: '自定义插件' },
  { id: '16', name: 'API 网关', description: '调用内部 API 接口', icon: 'icon-tool', category: '自定义插件' },
]

const filteredPlugins = computed(() => {
  if (props.category === '全部') return mockPlugins
  return mockPlugins.filter(p => p.category === props.category)
})

const handleAdd = (pluginId: string) => {
  emit('add', pluginId)
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleCategoryChange = (cat: PluginCategory) => {
  emit('update:category', cat)
}
</script>

<template>
  <a-drawer
    :visible="visible"
    title="添加插件"
    placement="right"
    :width="720"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <div class="flex h-full">
      <div class="w-48 flex-shrink-0 border-r border-gray-200 p-4">
        <div
          v-for="cat in categories"
          :key="cat"
          class="px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors"
          :class="category === cat ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-600 hover:bg-gray-100'"
          @click="handleCategoryChange(cat)"
        >
          {{ cat }}
        </div>
      </div>

      <div class="flex-1 flex flex-col min-w-0">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div class="text-base font-medium text-gray-800">{{ category }}</div>
          <a-button type="primary" size="small" @click="handleAdd('new-custom')">
            <template #icon><icon-plus /></template>
            创建自定义插件
          </a-button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-for="plugin in filteredPlugins"
            :key="plugin.id"
            class="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
              <component :is="getPluginIcon(plugin.icon)" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 truncate">{{ plugin.name }}</div>
              <div class="text-xs text-gray-500 truncate mt-1">{{ plugin.description }}</div>
            </div>
            <a-button type="primary" size="small" @click="handleAdd(plugin.id)">
              <template #icon><icon-plus /></template>
              添加
            </a-button>
          </div>

          <a-empty v-if="filteredPlugins.length === 0" description="暂无插件" />
        </div>
      </div>
    </div>
  </a-drawer>
</template>