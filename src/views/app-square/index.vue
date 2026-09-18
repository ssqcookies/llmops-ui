<script setup lang="ts">
/** 应用广场：浏览内置应用模板，加入工作区（引用关系，已加入不可重复） */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import BuiltinAppCard from './components/BuiltinAppCard.vue'
import {
  getBuiltinAppCategories,
  getBuiltinApps,
  addBuiltinAppToSpace,
} from '@/services/builtin-app'
import type {
  GetBuiltinAppCategoriesResponse,
  GetBuiltinAppsResponse,
} from '@/models/builtin-app'

/** localStorage key —— 持久化已加入工作区的内置应用 id */
const STORAGE_KEY = 'builtin_app_added_ids'

/** 从 localStorage 读取已加入 id 集合 */
const loadAddedIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return new Set(parsed.filter((x) => typeof x === 'string'))
    return new Set()
  } catch {
    return new Set()
  }
}

/** 写入 localStorage */
const saveAddedIds = (set: Set<string>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // 忽略 localStorage 写入错误（隐私模式等）
  }
}

/** 内置应用分类项 */
type CategoryItem = GetBuiltinAppCategoriesResponse['data'][number]
/** 内置应用项 */
type BuiltinAppItem = GetBuiltinAppsResponse['data'][number]

/** 分类列表 */
const categories = ref<CategoryItem[]>([])
/** 当前激活分类 key（'all' 表示全部） */
const activeCategory = ref<string>('all')
/** 搜索关键词 */
const searchInput = ref('')
/** 应用列表 */
const appList = ref<BuiltinAppItem[]>([])
/** 加载状态 */
const loading = ref(false)

/** 已加入工作区的内置应用 id 集合 —— 从 localStorage 恢复，持久化跨页面/跨刷新 */
const addedIds = reactive<Set<string>>(loadAddedIds())

/** 加入中（防重复点击） */
const addingId = ref<string>('')

/** 监听 addedIds 变化，自动持久化到 localStorage */
watch(
  () => addedIds.size,
  () => saveAddedIds(addedIds),
)

/** 分类标签列表（首项为「全部」） */
const categoryTabs = computed(() => [
  { category: 'all', name: '全部' },
  ...categories.value,
])

/** 按分类 + 关键词过滤后的列表 */
const filteredApps = computed<BuiltinAppItem[]>(() => {
  let list = appList.value
  if (activeCategory.value !== 'all') {
    list = list.filter((a) => a.category === activeCategory.value)
  }
  const kw = searchInput.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(
      (a) =>
        a.name.toLowerCase().includes(kw) ||
        a.description.toLowerCase().includes(kw),
    )
  }
  return list
})

/** 判断某个内置应用是否已加入工作区：后端返回优先，fallback 到前端本地 Set */
const isAdded = (item: BuiltinAppItem): boolean => {
  if (item.added !== undefined) return item.added
  return addedIds.has(item.id)
}

/** 空状态类型 */
const emptyType = computed<'none' | 'empty' | 'no-result'>(() => {
  if (appList.value.length === 0) return 'empty'
  if (filteredApps.value.length === 0) return 'no-result'
  return 'none'
})

/** 拉取分类 */
const fetchCategories = async () => {
  try {
    const res = await getBuiltinAppCategories()
    categories.value = res.data
  } catch {
    categories.value = []
  }
}

/** 拉取内置应用列表 */
const fetchApps = async () => {
  loading.value = true
  try {
    const res = await getBuiltinApps()
    // 合并状态：后端返回的 added 字段 + 前端 localStorage 已记录的 id
    appList.value = res.data.map((a) => ({
      ...a,
      added: a.added ?? addedIds.has(a.id),
    }))
    // 后端返回 added=true 的也要同步到 localStorage（防止之前漏记）
    res.data.forEach((a) => {
      if (a.added) addedIds.add(a.id)
    })
  } catch {
    appList.value = []
  } finally {
    loading.value = false
  }
}

/** 切换分类 */
const handleCategoryChange = (key: string | number) => {
  activeCategory.value = String(key)
}

/** 搜索回车 */
const handleSearchEnter = () => {
  const kw = searchInput.value || '(空)'
  Message.info(`搜索：${kw}`)
}

/** 搜索清除 */
const handleSearchClear = () => {
  searchInput.value = ''
}

/** 加入工作区（引用关系，不重复；成功后不再跳转，留在广场页面继续浏览） */
const handleAddToSpace = async (item: BuiltinAppItem) => {
  if (addingId.value === item.id || isAdded(item)) return
  addingId.value = item.id
  try {
    const res = await addBuiltinAppToSpace(item.id)
    addedIds.add(item.id)
    // 同步更新列表里的 added 状态
    const target = appList.value.find((a) => a.id === item.id)
    if (target) target.added = true
    Message.success(res.message || '已加入工作区')
  } catch {
    // 错误已由 request 层统一提示（后端如果返回"已加入"错误也会被拦截）
  } finally {
    addingId.value = ''
  }
}

onMounted(() => {
  fetchCategories()
  fetchApps()
})
</script>

<template>
  <div class="square-page">
    <div class="max-w-page mx-auto w-full px-8 py-6 flex flex-col gap-5">
      <!-- 1. 顶部标题栏 -->
      <div class="page-head">
        <div class="head-left">
          <div class="head-icon">
            <icon-app />
          </div>
          <span class="head-title">应用广场</span>
        </div>
      </div>

      <!-- 2. 分类标签 + 搜索行 -->
      <div class="filter-row">
        <div class="category-tabs">
          <div
            v-for="cat in categoryTabs"
            :key="cat.category"
            class="category-tab"
            :class="{ 'category-tab-active': activeCategory === cat.category }"
            @click="handleCategoryChange(cat.category)"
          >
            {{ cat.name }}
          </div>
        </div>

        <a-input
          v-model="searchInput"
          placeholder="搜索应用名称或描述"
          size="large"
          allow-clear
          class="search-input"
          @press-enter="handleSearchEnter"
          @clear="handleSearchClear"
        >
          <template #prefix>
            <a-button type="text" class="search-btn" @click="handleSearchEnter">
              <icon-search />
            </a-button>
          </template>
        </a-input>
      </div>

      <!-- 3. 内容区 -->
      <section class="content-wrap">
        <!-- 全局 Loading -->
        <a-spin
          v-if="loading"
          :loading="true"
          class="global-spin"
          tip="加载中..."
        />

        <!-- 空状态 -->
        <div v-else-if="emptyType !== 'none'" class="empty-wrap">
          <a-empty
            :description="
              emptyType === 'empty' ? '应用广场暂无应用' : '未找到相关结果'
            "
          />
        </div>

        <!-- 卡片网格 -->
        <div v-else class="cards-grid">
          <BuiltinAppCard
            v-for="item in filteredApps"
            :key="item.id"
            :item="item"
            :added="isAdded(item)"
            :adding="addingId === item.id"
            @add="handleAddToSpace"
          />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .square-page {
    @apply w-full min-h-screen bg-[#fafbfc];
  }
  .max-w-page {
    max-width: 1440px;
  }
  .page-head {
    @apply flex items-center justify-between;
  }
  .head-left {
    @apply flex items-center gap-3;
  }
  .head-icon {
    @apply w-10 h-10 rounded-[10px] bg-[#165dff] flex items-center justify-center text-white text-[18px] shrink-0;
  }
  .head-title {
    @apply text-[22px] font-semibold text-[#1d2129] leading-none;
  }

  /* 分类 + 搜索行 */
  .filter-row {
    @apply flex items-center justify-between gap-4 flex-wrap;
  }
  .category-tabs {
    @apply flex items-center gap-1 flex-wrap;
  }
  .category-tab {
    @apply px-3 py-1.5 rounded-[16px] text-[13px] text-[#4e5969]
           cursor-pointer transition-colors bg-[#f2f3f5]
           hover:text-[#165dff] hover:bg-[#e8f3ff];
  }
  .category-tab-active {
    @apply bg-[#165dff] text-white font-medium
           hover:bg-[#165dff] hover:text-white;
  }
  .search-input {
    width: 260px;
  }
  .search-input :deep(.arco-input-wrapper) {
    height: 40px;
    border-radius: 6px;
  }
  .search-btn {
    @apply h-8 w-8 flex items-center justify-center text-[#86909c] hover:text-[#165dff] !p-0;
  }

  /* 内容区 */
  .content-wrap {
    @apply relative w-full min-h-[360px];
  }
  .global-spin {
    @apply absolute inset-0 z-10 flex items-center justify-center w-full min-h-[360px] bg-white/50 rounded-[8px];
  }

  /* 卡片网格（3列响应式） */
  .cards-grid {
    @apply grid gap-5;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 1280px) {
    .cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 768px) {
    .cards-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .search-input {
      width: 100%;
    }
  }

  /* 空状态 */
  .empty-wrap {
    @apply flex flex-col items-center justify-center py-24;
  }
}
</style>
