<script setup lang="ts">
/**
 * 选择插件弹窗
 * 数据来源：fetchPluginCards（内置 + 自定义合并）
 * 左侧导航：自定义插件 / 内置插件 + 分类筛选
 * 右侧列表：插件卡片，单选确认后回传
 */
import { ref, computed, watch } from 'vue'
import { fetchPluginCards, fetchCategoryOptions } from '@/services/pluginService'
import type { PluginCard, PluginCategory, CategoryOption } from '@/models/plugin'

const props = defineProps({
  /** 弹窗显示状态 */
  visible: {
    type: Boolean,
    required: true,
    default: false,
  },
  /** 当前已绑定的插件 ID */
  selectedId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  /** 确认选择：返回选中的插件卡片信息 */
  (e: 'confirm', plugin: PluginCard): void
}>()

/** 列表加载状态 */
const loading = ref(false)
/** 完整插件列表 */
const allPlugins = ref<PluginCard[]>([])
/** 分类选项 */
const categories = ref<CategoryOption[]>([])
/** 当前导航：custom / builtin */
const activeTab = ref<'builtin' | 'custom'>('builtin')
/** 当前分类筛选 */
const activeCategory = ref<PluginCategory>('all')
/** 搜索关键词 */
const keyword = ref('')
/** 弹窗内临时选中的插件 ID */
const pickedId = ref('')

/** 筛选后的插件列表 */
const filteredList = computed(() => {
  let list = allPlugins.value
  // 导航筛选：builtin:pluginId 以 'builtin:' 开头；custom:以 'api:' 开头
  if (activeTab.value === 'builtin') {
    list = list.filter((p) => p.pluginId.startsWith('builtin:'))
  } else {
    list = list.filter((p) => p.pluginId.startsWith('api:'))
  }
  // 分类筛选
  if (activeCategory.value !== 'all') {
    list = list.filter((p) => p.category === activeCategory.value)
  }
  // 关键词搜索
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.provider.toLowerCase().includes(kw) ||
        p.description.toLowerCase().includes(kw),
    )
  }
  return list
})

/** 拉取插件列表 + 分类 */
const fetchList = async () => {
  try {
    loading.value = true
    const [cards, cats] = await Promise.all([fetchPluginCards(), fetchCategoryOptions()])
    allPlugins.value = cards
    categories.value = cats
  } catch (e) {
    console.error('[PluginPickerModal] fetchList failed:', e)
    allPlugins.value = []
  } finally {
    loading.value = false
  }
}

// 每次打开：初始化选中、清空筛选并拉取列表
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    pickedId.value = props.selectedId
    activeTab.value = 'builtin'
    activeCategory.value = 'all'
    keyword.value = ''
    void fetchList()
  },
)

/** 选择插件（单选） */
const handlePick = (plugin: PluginCard) => {
  pickedId.value = plugin.pluginId
}

/** 确认选择 */
const handleConfirm = () => {
  const picked = allPlugins.value.find((p) => p.pluginId === pickedId.value)
  if (picked) emit('confirm', picked)
  emit('update:visible', false)
}

/** 关闭弹窗 */
const handleCancel = () => emit('update:visible', false)
</script>

<template>
  <a-modal
    :visible="visible"
    :width="720"
    :footer="false"
    :mask-closable="true"
    :body-style="{ padding: '0' }"
    @cancel="handleCancel"
    @update:visible="(val) => emit('update:visible', val)"
  >
    <!-- 弹窗主体：左导航 + 右列表 -->
    <div class="flex h-[520px]">
      <!-- 左侧导航 -->
      <div class="flex w-[180px] shrink-0 flex-col border-r border-[#f2f3f5] bg-[#fafbfc] p-3">
        <!-- 导航：自定义 / 内置 -->
        <div class="mb-4 flex flex-col gap-1">
          <div
            class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors"
            :class="activeTab === 'builtin' ? 'bg-[#e8f3ff] text-[#165dff] font-medium' : 'text-[#4e5969] hover:bg-[#f2f3f5]'"
            @click="activeTab = 'builtin'; activeCategory = 'all'"
          >
            <icon-apps :size="15" />
            <span>内置插件</span>
          </div>
          <div
            class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] transition-colors"
            :class="activeTab === 'custom' ? 'bg-[#e8f3ff] text-[#165dff] font-medium' : 'text-[#4e5969] hover:bg-[#f2f3f5]'"
            @click="activeTab = 'custom'; activeCategory = 'all'"
          >
            <icon-tool :size="15" />
            <span>自定义插件</span>
          </div>
        </div>

        <!-- 分类筛选（仅内置插件显示） -->
        <template v-if="activeTab === 'builtin' && categories.length">
          <div class="mb-2 text-[12px] font-medium text-[#86909c]">类别</div>
          <div class="flex flex-col gap-1">
            <div
              v-for="cat in categories"
              :key="cat.value"
              class="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors"
              :class="activeCategory === cat.value ? 'bg-[#e8f3ff] text-[#165dff] font-medium' : 'text-[#4e5969] hover:bg-[#f2f3f5]'"
              @click="activeCategory = cat.value"
            >
              <icon-grid :size="13" />
              <span>{{ cat.label }}</span>
            </div>
          </div>
        </template>
      </div>

      <!-- 右侧列表 -->
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- 顶部标题 + 搜索 -->
        <div class="flex items-center justify-between border-b border-[#f2f3f5] px-4 py-3">
          <span class="text-[15px] font-semibold text-[#1d2129]">
            {{ activeTab === 'builtin' ? '内置插件' : '自定义插件' }}
          </span>
          <a-input-search
            v-model="keyword"
            placeholder="搜索插件"
            size="small"
            class="!w-[200px]"
            allow-clear
          />
        </div>

        <!-- 插件列表 -->
        <div class="flex-1 overflow-y-auto p-3">
          <a-spin :loading="loading" class="w-full">
            <div v-if="filteredList.length" class="flex flex-col gap-2">
              <div
                v-for="plugin in filteredList"
                :key="plugin.pluginId"
                class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all"
                :class="pickedId === plugin.pluginId
                  ? 'border-[#165dff] bg-[#e8f3ff]'
                  : 'border-[#e5e6eb] hover:border-[#bedaff] hover:bg-[#f7f8fa]'"
                @click="handlePick(plugin)"
              >
                <!-- 插件图标 -->
                <div class="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f2f3f5]">
                  <img
                    v-if="plugin.icon"
                    :src="plugin.icon"
                    :alt="plugin.name"
                    class="h-full w-full object-cover"
                  />
                  <icon-apps v-else :size="18" class="text-[#86909c]" />
                </div>
                <!-- 插件信息 -->
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate text-[14px] font-medium text-[#1d2129]">{{ plugin.name }}</span>
                    <span class="shrink-0 text-[12px] text-[#86909c]">{{ plugin.provider }}</span>
                  </div>
                  <div class="truncate text-[12px] text-[#86909c]">{{ plugin.description }}</div>
                </div>
                <!-- 选中标记 -->
                <div v-if="pickedId === plugin.pluginId" class="shrink-0">
                  <icon-check-circle-fill :size="18" class="text-[#165dff]" />
                </div>
              </div>
            </div>
            <!-- 空状态 -->
            <div v-else-if="!loading" class="flex flex-col items-center justify-center py-16 text-[#c9cdd4]">
              <icon-empty :size="40" class="mb-2" />
              <span class="text-[13px]">暂无插件</span>
            </div>
          </a-spin>
        </div>

        <!-- 底部操作 -->
        <div class="flex items-center justify-end gap-2 border-t border-[#f2f3f5] px-4 py-3">
          <a-button size="small" @click="handleCancel">取消</a-button>
          <a-button size="small" type="primary" :disabled="!pickedId" @click="handleConfirm">确认</a-button>
        </div>
      </div>
    </div>
  </a-modal>
</template>
