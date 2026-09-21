<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import type { CategoryOption, PluginCategory, PluginCard, PluginDetail, PluginListQuery } from '@/models/plugin'
import { fetchCategoryOptions, fetchPluginCards, fetchPluginDetail } from '@/services/pluginService'
import PluginDetailDrawer from '../components/PluginDetailDrawer.vue'
import PluginEditorModal from '../components/PluginEditorModal.vue'

// ============================================================
// 常量 / 分类选项（从接口 2.1 动态加载）
// ============================================================

const categoryOptions = ref<CategoryOption[]>([
  { value: 'all', label: '全部' },
])

// ============================================================
// 响应式状态
// ============================================================

/** 列表加载态 */
const loading = ref(false)

/** 当前筛选条件 */
const query = reactive<PluginListQuery>({
  category: 'all',
  keyword: '',
  page: 1,
  pageSize: 20,
})

/** 搜索框绑定值（回车/搜索按钮才同步到 query.keyword） */
const searchInput = ref('')

/** 插件卡片列表 */
const pluginList = ref<PluginCard[]>([])

/** 创建自定义插件弹窗可见性 */
const createModalVisible = ref(false)

/** 工具详情抽屉状态 */
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerDetail = ref<PluginDetail | null>(null)

// ============================================================
// 计算属性
// ============================================================

/** 搜索&分类组合过滤后的展示列表 */
const displayList = computed(() => {
  const kw = query.keyword.trim().toLowerCase()
  return pluginList.value.filter((p) => {
    const matchCategory = query.category === 'all' || p.category === query.category
    const matchKeyword = !kw
      || p.name.toLowerCase().includes(kw)
      || p.description.toLowerCase().includes(kw)
      || p.provider.toLowerCase().includes(kw)
    return matchCategory && matchKeyword
  })
})

/** 空状态类型：'none' | 'no-result'（筛选无结果） | 'empty'（平台无插件） */
const emptyType = computed<'none' | 'no-result' | 'empty'>(() => {
  if (loading.value) return 'none'
  if (pluginList.value.length === 0) return 'empty'
  if (displayList.value.length === 0) return 'no-result'
  return 'none'
})

// ============================================================
// 方法
// ============================================================

/** 拉取插件卡片列表（走 service 层，接口失败自动 fallback 到动态 mock） */
const fetchPluginList = async () => {
  loading.value = true
  try {
    pluginList.value = await fetchPluginCards()
  } catch {
    pluginList.value = []
  } finally {
    loading.value = false
  }
}

/** 分类切换（AND 组合规则：切换分类清空搜索词并重新请求） */
const handleCategoryChange = (val: PluginCategory) => {
  if (query.category === val) return
  query.category = val
  query.keyword = ''
  searchInput.value = ''
  fetchPluginList()
}

/** 回车触发搜索（保留当前分类） */
const handleSearchEnter = () => {
  query.keyword = searchInput.value.trim()
}

/** 清除搜索：手动点 a-input clear */
const handleSearchClear = () => {
  query.keyword = ''
}

/** 打开详情抽屉 + 懒加载详情数据（走 service 层懒加载） */
const openPluginDetail = async (card: PluginCard) => {
  drawerVisible.value = true
  drawerLoading.value = true
  drawerDetail.value = null
  try {
    drawerDetail.value = await fetchPluginDetail(card)
  } catch {
    drawerDetail.value = null
  } finally {
    drawerLoading.value = false
  }
}

/** 分类 change 包装（模板中不做 TS cast） */
const onCategoryChange = (val: string | number | boolean) => {
  if (typeof val === 'string') {
    handleCategoryChange(val as PluginCategory)
  }
}

/** 打开创建自定义插件弹窗 */
const openCreateModal = () => {
  createModalVisible.value = true
}

// ============================================================
// 生命周期
// ============================================================

onMounted(async () => {
  categoryOptions.value = await fetchCategoryOptions()
  await fetchPluginList()
})

</script>

<template>
  <div class="w-full min-h-screen bg-[#fafbfc] page-root">
    <div class="max-w-page mx-auto w-full px-8 py-6 flex flex-col gap-5">
      <!-- ========== 1. 顶部标题操作栏 ========== -->
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- 蓝色圆形拼图图标 -->
          <div class="title-icon">
            <icon-apps :size="20" />
          </div>
          <h1 class="page-title">插件广场</h1>
        </div>

        <!-- 创建自定义插件（蓝色描边按钮） -->
        <a-button
          type="outline"
          size="large"
          class="btn-outline-primary"
          @click="openCreateModal"
        >
          创建自定义插件
        </a-button>
      </header>

      <!-- ========== 2. 分类筛选 + 搜索区 ========== -->
      <section class="flex items-center justify-between gap-4 flex-wrap">
        <!-- 分类标签栏（单选切换） -->
        <div class="flex items-center gap-2 flex-wrap">
          <a-radio-group
            type="button"
            :model-value="query.category"
            @update:model-value="onCategoryChange"
            size="large"
            class="category-radio-group"
          >
            <a-radio
              v-for="opt in categoryOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </a-radio>
          </a-radio-group>
        </div>

        <!-- 搜索框（右对齐） -->
        <a-input
          v-model="searchInput"
          placeholder="请输入插件名称"
          allow-clear
          size="large"
          class="search-input"
          @clear="handleSearchClear"
          @press-enter="handleSearchEnter"
        >
          <template #prefix>
            <a-button
              type="text"
              class="search-icon-btn"
              size="mini"
              @click="handleSearchEnter"
            >
              <template #icon><icon-search :size="16" /></template>
            </a-button>
          </template>
        </a-input>
      </section>

      <!-- ========== 3. 卡片网格 / 空状态 ========== -->
      <section class="w-full relative min-h-[360px]">
        <!-- 加载中遮罩 -->
        <a-spin
          v-if="loading"
          :loading="true"
          class="absolute inset-0 z-10 flex items-center justify-center w-full min-h-[360px]"
          tip="加载中..."
        />

        <!-- 空状态 -->
        <div
          v-if="emptyType !== 'none'"
          class="flex flex-col items-center justify-center py-20 w-full"
        >
          <div class="empty-illustration mb-5" />
          <p class="empty-text">
            {{ emptyType === 'empty' ? '暂无可用插件' : '未找到相关结果' }}
          </p>
          <a-button
            v-if="emptyType === 'empty'"
            type="outline"
            size="medium"
            class="mt-5 btn-outline-primary-outline"
            @click="openCreateModal"
          >
            立即创建
          </a-button>
        </div>

        <!-- 卡片网格（3列宽屏，2列中屏，1列窄屏；3列响应式） -->
        <div
          v-else
          class="card-grid"
        >
          <div
            v-for="card in displayList"
            :key="card.pluginId"
            class="plugin-card"
            @click="openPluginDetail(card)"
          >
            <!-- 上：图标+名称+提供商+描述 -->
            <div class="plugin-card-top">
              <div class="plugin-card-head flex items-start gap-3 mb-3">
                <div class="plugin-icon shrink-0">
                  <img
                    :src="card.icon"
                    :alt="card.name"
                    class="w-full h-full object-cover"
                  />
                </div>
                <div class="flex flex-col gap-1 min-w-0 flex-1">
                  <h3 class="plugin-name">{{ card.name }}</h3>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="provider-label">提供商 {{ card.provider }}</span>
                    <span class="provider-dot" />
                    <span class="provider-count">{{ card.toolCount }}插件</span>
                  </div>
                </div>
              </div>
              <p class="plugin-desc">{{ card.description }}</p>
            </div>

            <!-- 下：发布者+时间 -->
            <div class="plugin-card-footer">
              <div class="flex items-center gap-2">
                <div class="publisher-avatar">
                  <a-avatar :size="14" class="avatar-inner">
                    {{ card.publisher.name ? card.publisher.name.charAt(0) : '罐' }}
                  </a-avatar>
                </div>
                <span class="publisher-name">{{ card.publisher.name }}</span>
                <span class="footer-sep">·</span>
                <span class="publish-time">发布时间 {{ card.publishTime }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ========== 弹窗 & 抽屉挂载 ========== -->
    <PluginEditorModal
      v-model:visible="createModalVisible"
      mode="create"
      @success="fetchPluginList"
    />

    <PluginDetailDrawer
      v-model:visible="drawerVisible"
      :detail="drawerDetail"
      :loading="drawerLoading"
    />
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .page-root {
    min-height: calc(100vh - 0px);
  }
  .max-w-page {
    max-width: 1440px;
  }

  /* 标题栏 */
  .title-icon {
    @apply w-[40px] h-[40px] rounded-[10px] bg-[#165dff]
           text-white flex items-center justify-center shrink-0;
  }
  .page-title {
    @apply text-[22px] font-bold text-[#1d2129] leading-7 m-0;
    letter-spacing: -0.2px;
  }
  .btn-outline-primary :deep(.arco-btn) {
    @apply border border-[#165dff] text-[#165dff] rounded-[6px] h-[38px]
           px-5 bg-white hover:bg-[#e8f3ff];
    background-color: #ffffff;
  }
  .btn-outline-primary-outline :deep(.arco-btn) {
    @apply border border-[#165dff] text-[#165dff] rounded-[6px] h-[32px]
           px-4 bg-white hover:bg-[#e8f3ff];
    background-color: #ffffff;
  }

  /* 分类筛选 */
  .category-radio-group :deep(.arco-radio-button) {
    @apply rounded-[6px];
  }
  .category-radio-group :deep(.arco-radio-button-item) {
    @apply h-[36px] px-4 text-[13px] text-[#4e5969];
  }
  .category-radio-group :deep(.arco-radio-button-item.arco-radio-button-item-checked) {
    @apply bg-[#e5e6eb] text-[#1d2129] font-medium;
    color: #1d2129;
    background-color: #e5e6eb;
  }

  /* 搜索框 */
  .search-input {
    width: 240px;
  }
  .search-input :deep(.arco-input-wrapper) {
    @apply rounded-[6px] h-[38px] px-3;
  }
  .search-icon-btn {
    @apply !text-[#86909c] !h-[28px] !w-[28px] !p-0;
  }

  /* 空状态插图（线框风：中心圆+星标+环绕轨道+气泡+卡片） */
  .empty-illustration {
    width: 160px;
    height: 130px;
    background:
      radial-gradient(circle at center, #ffffff 0 38px, transparent 39px),
      radial-gradient(circle at center, #e5e6eb 0 48px, transparent 49px),
      radial-gradient(ellipse 90% 35% at center, transparent 58%, #e5e6eb 59% 60%, transparent 61%),
      radial-gradient(ellipse 60% 22% at center, transparent 58%, #e5e6eb 59% 60%, transparent 61%),
      radial-gradient(circle at 72% 32%, #165dff 0 8px, transparent 9px);
    position: relative;
  }
  .empty-illustration::before {
    content: "";
    position: absolute;
    width: 40px;
    height: 28px;
    background: #ffffff;
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    left: 12px;
    top: 28px;
    background-image: linear-gradient(180deg, #165dff 0 40%, transparent 40%);
    background-size: 100% 8px;
    background-repeat: no-repeat;
    background-position: 6px 8px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
  }
  .empty-illustration::after {
    content: "";
    position: absolute;
    width: 44px;
    height: 30px;
    background: #ffffff;
    border: 1px solid #e5e6eb;
    border-radius: 6px;
    right: 10px;
    top: 52px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    background-image:
      linear-gradient(180deg, transparent 12px, #eef0f3 12px 13px, transparent 13px 20px, #eef0f3 20px 21px, transparent 21px);
    background-repeat: no-repeat;
    background-position: 8px 8px / 30px 100%;
    background-size: 30px 100%;
  }
  .empty-text {
    @apply text-[14px] text-[#4e5969] leading-5 m-0;
  }

  /* 卡片网格 */
  .card-grid {
    @apply grid gap-4 w-full;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 1280px) {
    .card-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 768px) {
    .card-grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }

  .plugin-card {
    @apply bg-white rounded-[8px] border border-[#eef0f3] cursor-pointer
           flex flex-col transition-all duration-150
           hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:-translate-y-0.5
           hover:border-[#165dff]/20;
    min-height: 210px;
  }
  .plugin-card-top {
    @apply p-5 flex-1 min-h-0;
  }
  .plugin-card-head {
    align-items: flex-start;
  }
  .plugin-icon {
    @apply w-[44px] h-[44px] rounded-[10px] overflow-hidden shrink-0
           bg-[#f7f8fa] border border-[#eef0f3];
  }
  .plugin-name {
    @apply text-[15px] font-semibold text-[#1d2129] leading-5 m-0 truncate;
  }
  .provider-label {
    @apply text-[12px] text-[#86909c] leading-5;
  }
  .provider-dot {
    @apply w-[3px] h-[3px] rounded-full bg-[#c9cdd4] inline-block mx-1;
  }
  .provider-count {
    @apply text-[12px] text-[#86909c] leading-5;
  }
  .plugin-desc {
    @apply text-[13px] text-[#4e5969] leading-[1.75] m-0 line-clamp-2
           text-ellipsis overflow-hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .plugin-card-footer {
    @apply px-5 py-3 border-t border-[#f2f3f5];
  }
  .publisher-avatar {
    @apply flex items-center justify-center shrink-0;
  }
  .avatar-inner {
    @apply !text-[10px] !font-semibold;
    background-color: #165dff;
    color: #ffffff;
  }
  .publisher-name {
    @apply text-[12px] text-[#165dff] leading-5;
  }
  .footer-sep {
    @apply text-[12px] text-[#c9cdd4] mx-0.5;
  }
  .publish-time {
    @apply text-[12px] text-[#86909c] leading-5;
  }
}
</style>
