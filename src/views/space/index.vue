<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type {
  PersonalSpaceTab,
  PersonalTabOption,
  AppCard,
  PluginSpaceCard,
  WorkflowCard,
} from '@/models/personalSpace'
import type { PluginDetail } from '@/models/plugin'
import type { ApiToolProviderData } from '@/models/api-tool'
import type { CreateDatasetRequest, UpdateDatasetRequest } from '@/models/dataset'
import {
  fetchPersonalPlugins,
  deletePersonalPlugin,
  apiProviderToDetail,
} from '@/services/personalSpaceService'
import { getCustomPluginDetail } from '@/services/pluginService'
import {
  getDatasetsWithPage,
  createDataset,
  updateDataset,
  deleteDataset,
} from '@/services/dataset'
import { MOCK_APPS, MOCK_WORKFLOWS } from '@/mock/personalSpace'
import AppsGridCard from './components/AppsGridCard.vue'
import PluginsGridCard from './components/PluginsGridCard.vue'
import WorkflowsGridCard from './components/WorkflowsGridCard.vue'
import KnowledgeGridCard from './components/KnowledgeGridCard.vue'
import KnowledgeFormModal from './components/KnowledgeFormModal.vue'
import PluginEditorModal from '../components/PluginEditorModal.vue'
import PluginDetailDrawer from '../components/PluginDetailDrawer.vue'
import { ROUTE_NAME } from '@/constants'

// ============================================================
// 常量
// ============================================================

/** 4 Tab 配置 —— 提纲定义顺序：AI应用 / 插件 / 工作流 / 知识库 */
const TAB_OPTIONS: PersonalTabOption[] = [
  { key: 'apps', label: 'AI应用', searchPlaceholder: '搜索', createBtnText: '创建 AI 应用' },
  { key: 'plugins', label: '插件', searchPlaceholder: '搜索', createBtnText: '创建自定义插件' },
  { key: 'workflows', label: '工作流', searchPlaceholder: '搜索', createBtnText: '创建工作流' },
  { key: 'knowledge', label: '知识库', searchPlaceholder: '请输入知识库名称', createBtnText: '创建知识库' },
]

// ============================================================
// 类型（本模块独有，仅本文件使用）
// ============================================================

/** 知识库列表项 —— 对齐 getDatasetsWithPage 接口返回 data.list 元素 */
interface DatasetListItem {
  id: string
  name: string
  icon: string
  description: string
  document_count: number
  character_count: number
  related_app_count: number
  updated_at: number
  created_at: number
}

// ============================================================
// 状态
// ============================================================

const route = useRoute()
const router = useRouter()

/** 合法 Tab key 集合（用于 query.tab 校验） */
const VALID_TABS: PersonalSpaceTab[] = ['apps', 'plugins', 'workflows', 'knowledge']
/** 当前激活 Tab（支持通过 ?tab=knowledge 定位，详情返回时使用） */
const queryTab = route.query.tab as string
const activeTab = ref<PersonalSpaceTab>(
  VALID_TABS.includes(queryTab as PersonalSpaceTab)
    ? (queryTab as PersonalSpaceTab)
    : 'apps',
)
/** 搜索输入框 v-model */
const searchInput = ref('')
/** 列表全局 Loading（切换 Tab、首次加载、分页） */
const loading = ref(false)
/** 底部"加载更多"指示 */
const loadMoreLoading = ref(false)

/** 列表数据 */
const appList = ref<AppCard[]>([])
const pluginList = ref<PluginSpaceCard[]>([])
const workflowList = ref<WorkflowCard[]>([])
const knowledgeList = ref<DatasetListItem[]>([])

/** 知识库实际生效搜索词（回车/清除同步，走接口检索） */
const knowledgeSearchWord = ref('')

/** 个人空间-插件创建弹窗可见性 */
const createPluginModalVisible = ref(false)

/** 个人空间-知识库创建/编辑弹窗 */
const knowledgeModalVisible = ref(false)
const knowledgeModalMode = ref<'create' | 'edit'>('create')
const editingDataset = ref<DatasetListItem | null>(null)

/** 工具详情抽屉 */
const drawerVisible = ref(false)
const drawerLoading = ref(false)
const drawerDetail = ref<PluginDetail | null>(null)

/** 编辑插件弹窗 */
const editModalVisible = ref(false)
const editingProviderId = ref<string>('')
const editingInitialData = ref<ApiToolProviderData | undefined>(undefined)

// ============================================================
// 计算属性
// ============================================================

const currentTabOption = computed<PersonalTabOption>(
  () => (TAB_OPTIONS.find((t) => t.key === activeTab.value) ?? TAB_OPTIONS[0]) as PersonalTabOption,
)

/** 关键词小写辅助 */
const kwLower = computed(() => searchInput.value.trim().toLowerCase())

/** 过滤后的列表（AND 包含匹配） */
const filteredApps = computed<AppCard[]>(() => {
  if (!kwLower.value) return appList.value
  const kw = kwLower.value
  return appList.value.filter(
    (c) =>
      c.name.toLowerCase().includes(kw) ||
      c.description.toLowerCase().includes(kw) ||
      c.modelInfo.toLowerCase().includes(kw),
  )
})
const filteredPlugins = computed<PluginSpaceCard[]>(() => {
  if (!kwLower.value) return pluginList.value
  const kw = kwLower.value
  return pluginList.value.filter(
    (c) =>
      c.name.toLowerCase().includes(kw) ||
      c.description.toLowerCase().includes(kw) ||
      c.provider.toLowerCase().includes(kw),
  )
})
const filteredWorkflows = computed<WorkflowCard[]>(() => {
  if (!kwLower.value) return workflowList.value
  const kw = kwLower.value
  return workflowList.value.filter(
    (c) =>
      c.name.toLowerCase().includes(kw) ||
      c.description.toLowerCase().includes(kw) ||
      c.workflowName.toLowerCase().includes(kw),
  )
})
/** 知识库列表走接口检索（search_word），前端不再二次过滤 */
const filteredKnowledge = computed<DatasetListItem[]>(() => knowledgeList.value)

/** 空状态类型（当前激活 Tab） */
type EmptyType = 'none' | 'empty' | 'no-result'
const currentEmptyType = computed<EmptyType>(() => {
  switch (activeTab.value) {
    case 'apps':
      if (appList.value.length === 0) return 'empty'
      if (filteredApps.value.length === 0) return 'no-result'
      return 'none'
    case 'plugins':
      if (pluginList.value.length === 0) return 'empty'
      if (filteredPlugins.value.length === 0) return 'no-result'
      return 'none'
    case 'workflows':
      if (workflowList.value.length === 0) return 'empty'
      if (filteredWorkflows.value.length === 0) return 'no-result'
      return 'none'
    case 'knowledge':
      if (knowledgeList.value.length === 0) {
        return knowledgeSearchWord.value ? 'no-result' : 'empty'
      }
      return 'none'
    default:
      return 'none'
  }
})

/** 当前显示是否为空（方便模板条件） */
const isContentEmpty = computed(() => currentEmptyType.value !== 'none')

// ============================================================
// 方法
// ============================================================

/** 拉取知识库列表（走 dataset 服务，支持接口检索） */
const fetchKnowledgeList = async () => {
  loading.value = true
  try {
    const res = await getDatasetsWithPage(1, 20, knowledgeSearchWord.value)
    knowledgeList.value = (res?.data?.list ?? []) as DatasetListItem[]
  } catch {
    knowledgeList.value = []
  } finally {
    loading.value = false
  }
}

/** 拉取当前 Tab 列表（AI应用/工作流为演示 Mock，插件/知识库走真实服务） */
const fetchTabLists = async () => {
  loading.value = true
  try {
    const [apps, plugins, knowledge] = await Promise.all([
      Promise.resolve(MOCK_APPS),
      fetchPersonalPlugins(),
      getDatasetsWithPage(1, 20, knowledgeSearchWord.value).catch(() => null),
    ])
    appList.value = apps
    pluginList.value = plugins
    workflowList.value = MOCK_WORKFLOWS
    knowledgeList.value = (knowledge?.data?.list ?? []) as DatasetListItem[]
  } finally {
    loading.value = false
  }
}

/** Tab 切换事件 —— 保留当前搜索词继续作用在新 Tab */
const onTabChange = (key: string | number) => {
  activeTab.value = String(key) as PersonalSpaceTab
}

/** 搜索回车 */
const onSearchEnter = () => {
  // 知识库 Tab：走接口检索
  if (activeTab.value === 'knowledge') {
    knowledgeSearchWord.value = searchInput.value.trim()
    fetchKnowledgeList()
    return
  }
  // 其余 Tab：computed 本地即时过滤，此处仅提示（后续可替换为服务端检索）
  Message.info(`搜索：${searchInput.value || '(空)'}`)
}
/** 搜索清除 */
const onSearchClear = () => {
  searchInput.value = ''
  if (activeTab.value === 'knowledge') {
    knowledgeSearchWord.value = ''
    fetchKnowledgeList()
  }
}
/** 点击搜索图标 */
const onSearchIconClick = () => onSearchEnter()

/** 右上角创建按钮 —— 根据当前 Tab 分发 */
const onCreateClick = () => {
  if (activeTab.value === 'plugins') {
    createPluginModalVisible.value = true
    return
  }
  if (activeTab.value === 'knowledge') {
    knowledgeModalMode.value = 'create'
    editingDataset.value = null
    knowledgeModalVisible.value = true
    return
  }
  // TODO: 打开对应创建弹窗（CreateAppFlow / CreateWorkflow）
  const btn = currentTabOption.value.createBtnText
  Message.success(`点击：${btn}（弹窗预留挂载）`)
}

// ============================================================
// 卡片操作事件（4 类卡片 emit 映射）
// ============================================================

const handleAppAction = (action: string, item: AppCard) => {
  Message.info(`[AI应用] ${action}：${item.name}`)
  if (action === 'delete') {
    appList.value = appList.value.filter((x) => x.id !== item.id)
  }
}
const handlePluginAction = async (action: string, item: PluginSpaceCard) => {
  Message.info(`[插件] ${action}：${item.name}`)
  if (action === 'delete') {
    const ok = await deletePersonalPlugin(item.id)
    if (ok) {
      pluginList.value = pluginList.value.filter((x) => x.id !== item.id)
      Message.success('删除成功')
    } else {
      Message.error('删除失败，请稍后重试')
    }
  }
  if (action === 'settings') {
    await openPluginDetail(item)
  }
}

/** 打开插件详情抽屉（个人空间：可编辑） */
const openPluginDetail = async (item: PluginSpaceCard) => {
  drawerVisible.value = true
  drawerLoading.value = true
  drawerDetail.value = null
  editingProviderId.value = item.id
  editingInitialData.value = undefined
  try {
    const provider = await getCustomPluginDetail(item.id)
    if (provider) {
      drawerDetail.value = apiProviderToDetail(provider)
      editingInitialData.value = provider
    }
  } catch {
    drawerDetail.value = null
  } finally {
    drawerLoading.value = false
  }
}

/** 抽屉中点击编辑 */
const handleDrawerEdit = () => {
  if (!editingInitialData.value) return
  editModalVisible.value = true
}

/** 编辑/删除成功后刷新 */
const handlePluginChange = () => {
  fetchTabLists()
}
const handleWorkflowAction = (action: string, item: WorkflowCard) => {
  Message.info(`[工作流] ${action}：${item.name}`)
  if (action === 'delete') {
    workflowList.value = workflowList.value.filter((x) => x.id !== item.id)
  }
}
/** 知识库卡片：点击 / 设置 → 进入知识库详情 */
const handleKnowledgeSettings = (item: DatasetListItem) => {
  router.push({
    name: ROUTE_NAME.KNOWLEDGE_DETAIL,
    params: { datasetId: item.id },
  } as RouteLocationRaw)
}

/** 知识库卡片：编辑 → 打开编辑弹窗 */
const handleKnowledgeEdit = (item: DatasetListItem) => {
  knowledgeModalMode.value = 'edit'
  editingDataset.value = item
  knowledgeModalVisible.value = true
}

/** 知识库卡片：删除 → 调接口后刷新（卡片内已弹确认框） */
const handleKnowledgeDelete = async (item: DatasetListItem) => {
  try {
    await deleteDataset(item.id)
    Message.success('删除成功')
    await fetchKnowledgeList()
  } catch {
    Message.error('删除失败，请稍后重试')
  }
}

/** 知识库创建/编辑弹窗提交 —— 按 mode 分发 createDataset / updateDataset */
const handleKnowledgeSubmit = async (payload: {
  mode: 'create' | 'edit'
  data: CreateDatasetRequest | UpdateDatasetRequest
  id?: string
}) => {
  try {
    if (payload.mode === 'edit' && payload.id) {
      await updateDataset(payload.id, payload.data as UpdateDatasetRequest)
      Message.success('保存成功')
    } else {
      await createDataset(payload.data as CreateDatasetRequest)
      Message.success('创建成功')
    }
    knowledgeModalVisible.value = false
    editingDataset.value = null
    await fetchKnowledgeList()
  } catch {
    Message.error(payload.mode === 'edit' ? '保存失败，请稍后重试' : '创建失败，请稍后重试')
  }
}

/** 加载更多 —— 演示用 loading 1s 后关闭指示器 */
const handleLoadMore = async () => {
  if (loadMoreLoading.value) return
  loadMoreLoading.value = true
  await new Promise((r) => setTimeout(r, 900))
  loadMoreLoading.value = false
}

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  fetchTabLists()
})

</script>

<template>
  <div class="w-full min-h-screen bg-[#fafbfc] page-root">
    <div class="max-w-page mx-auto w-full px-8 py-6 flex flex-col gap-5">
      <!-- ============== 1. 顶部标题 + 操作栏 ============== -->
      <div class="page-head">
        <div class="head-left">
          <div class="head-icon">
            <icon-user />
          </div>
          <span class="head-title">个人空间</span>
        </div>
        <!-- 右上角动态创建按钮（蓝描边） -->
        <a-button type="outline" size="large" class="btn-outline-primary" @click="onCreateClick">
          {{ currentTabOption.createBtnText }}
        </a-button>
      </div>

      <!-- ============== 2. Tab 切换 + 搜索行 ============== -->
      <div class="tabs-search-row">
        <a-tabs
          :active-key="activeTab"
          type="line"
          size="large"
          class="space-tabs"
          @change="onTabChange"
        >
          <a-tab-pane key="apps" title="AI应用" />
          <a-tab-pane key="plugins" title="插件" />
          <a-tab-pane key="workflows" title="工作流" />
          <a-tab-pane key="knowledge" title="知识库" />
        </a-tabs>

        <a-input
          v-model="searchInput"
          :placeholder="currentTabOption.searchPlaceholder"
          size="large"
          allow-clear
          class="search-input"
          @press-enter="onSearchEnter"
          @clear="onSearchClear"
        >
          <template #prefix>
            <a-button type="text" class="search-btn" @click="onSearchIconClick">
              <icon-search />
            </a-button>
          </template>
        </a-input>
      </div>

      <!-- ============== 3. 内容区（Loading / Empty / Grid） ============== -->
      <section class="content-wrap">
        <!-- 全局 Loading 蒙层（仅当 loading=true 时挂载，避免无加载时也遮挡内容） -->
        <a-spin
          v-if="loading"
          :loading="true"
          class="global-spin"
          tip="加载中..."
        />

        <!-- 空状态插图（按当前 Tab 计算） -->
        <div v-if="isContentEmpty" class="empty-wrap">
          <!-- 空插画（纯 CSS 绘制，无原生 svg） -->
          <div class="empty-illustration">
            <div class="orbit-ring" />
            <div class="orbit-ring orbit-ring-inner" />
            <div class="center-core">
              <div class="core-star" />
            </div>
            <div class="card-chip card-chip-1">
              <div class="chip-line" />
              <div class="chip-line chip-line-2" />
              <div class="chip-line chip-line-3" />
            </div>
            <div class="card-chip card-chip-2">
              <div class="chip-bar chip-bar-1" />
              <div class="chip-bar chip-bar-2" />
              <div class="chip-bar chip-bar-3" />
            </div>
            <span class="orbit-dot orbit-dot-1" />
            <span class="orbit-dot orbit-dot-2" />
          </div>
          <div class="empty-text">
            <template v-if="currentEmptyType === 'empty'">
              暂无内容，点击右上角「{{ currentTabOption.createBtnText }}」开始创建吧
            </template>
            <template v-else>未找到相关结果</template>
          </div>
          <a-button
            v-if="currentEmptyType === 'empty'"
            type="outline"
            size="medium"
            class="btn-outline-primary-sm"
            @click="onCreateClick"
          >
            {{ currentTabOption.createBtnText }}
          </a-button>
        </div>

        <!-- Tab 1：AI应用 网格 -->
        <div v-if="activeTab === 'apps' && !isContentEmpty" class="cards-grid">
          <AppsGridCard
            v-for="item in filteredApps"
            :key="item.id"
            :item="item"
            @analyze="handleAppAction('analyze', item)"
            @edit="handleAppAction('edit', item)"
            @copy="handleAppAction('copy', item)"
            @delete="handleAppAction('delete', item)"
          />
        </div>

        <!-- Tab 2：插件 网格 -->
        <div v-if="activeTab === 'plugins' && !isContentEmpty" class="cards-grid">
          <PluginsGridCard
            v-for="item in filteredPlugins"
            :key="item.id"
            :item="item"
            @click="openPluginDetail(item)"
            @settings="handlePluginAction('settings', item)"
            @delete="handlePluginAction('delete', item)"
          />
        </div>

        <!-- Tab 3：工作流 网格 -->
        <div v-if="activeTab === 'workflows' && !isContentEmpty" class="cards-grid">
          <WorkflowsGridCard
            v-for="item in filteredWorkflows"
            :key="item.id"
            :item="item"
            @edit="handleWorkflowAction('edit', item)"
            @delete="handleWorkflowAction('delete', item)"
          />
        </div>

        <!-- Tab 4：知识库 网格（整卡点击进入详情，右上角菜单：设置/编辑/删除） -->
        <div v-if="activeTab === 'knowledge' && !isContentEmpty" class="cards-grid">
          <KnowledgeGridCard
            v-for="item in filteredKnowledge"
            :key="item.id"
            :item="item"
            @settings="handleKnowledgeSettings(item)"
            @edit="handleKnowledgeEdit(item)"
            @delete="handleKnowledgeDelete(item)"
          />
        </div>
      </section>

      <!-- ============== 4. 底部加载更多指示器 ============== -->
      <div v-if="!isContentEmpty" class="load-more" @click="handleLoadMore">
        <icon-loading :class="{ 'icon-spin': loadMoreLoading }" />
        <span>{{ loadMoreLoading ? '加载中' : '加载更多' }}</span>
      </div>

      <!-- ============== 全局弹窗挂载 ============== -->
      <PluginEditorModal
        v-model:visible="createPluginModalVisible"
        mode="create"
        @success="handlePluginChange"
      />

      <!-- 知识库创建/编辑弹窗（个人空间-知识库 Tab） -->
      <KnowledgeFormModal
        v-model:visible="knowledgeModalVisible"
        :mode="knowledgeModalMode"
        :editing="editingDataset"
        @submit="handleKnowledgeSubmit"
      />

      <PluginDetailDrawer
        v-model:visible="drawerVisible"
        :detail="drawerDetail"
        :loading="drawerLoading"
        :editable="true"
        @edit="handleDrawerEdit"
      />

      <PluginEditorModal
        v-model:visible="editModalVisible"
        mode="edit"
        :provider-id="editingProviderId"
        :initial-data="editingInitialData"
        @success="handlePluginChange"
        @deleted="handlePluginChange"
      />
    </div>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  /* ===== 页面外层（对齐插件广场基线：1440px 居中 + px-8 py-6 统一留白） ===== */
  .page-root {
    min-height: calc(100vh - 0px);
  }
  .max-w-page {
    max-width: 1440px;
  }

  /* ===== 头部标题栏 ===== */
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

  /* ===== 蓝色描边按钮 ===== */
  .btn-outline-primary :deep(.arco-btn) {
    border-color: #165dff;
    color: #165dff;
    background-color: #ffffff;
    border-radius: 6px;
  }
  .btn-outline-primary :deep(.arco-btn:hover) {
    background-color: #e8f3ff;
    border-color: #4080ff;
    color: #165dff;
  }
  .btn-outline-primary-sm :deep(.arco-btn) {
    border-color: #165dff;
    color: #165dff;
    background-color: #ffffff;
    border-radius: 6px;
  }
  .btn-outline-primary-sm :deep(.arco-btn:hover) {
    background-color: #e8f3ff;
    border-color: #4080ff;
    color: #165dff;
  }

  /* ===== Tab + 搜索行 ===== */
  .tabs-search-row {
    @apply flex items-center justify-between gap-4 flex-wrap;
  }
  .space-tabs {
    @apply flex-1 min-w-[480px];
  }
  .space-tabs :deep(.arco-tabs-header-title-text) {
    font-size: 14px;
    font-weight: 500;
  }
  .space-tabs :deep(.arco-tabs-header-title-active .arco-tabs-header-title-text) {
    color: #165dff;
    font-weight: 600;
  }
  .search-input {
    width: 240px;
  }
  .search-input :deep(.arco-input-wrapper) {
    height: 40px;
    border-radius: 6px;
  }
  .search-btn {
    @apply h-8 w-8 flex items-center justify-center text-[#86909c] hover:text-[#165dff] !p-0;
  }

  /* ===== 内容区 ===== */
  .content-wrap {
    @apply relative w-full min-h-[360px];
  }
  .global-spin {
    @apply absolute inset-0 z-10 flex items-center justify-center w-full min-h-[360px] bg-white/50 rounded-[8px];
  }

  /* ===== 卡片网格（3列响应式） ===== */
  .cards-grid {
    @apply grid gap-5;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  @media (max-width: 1280px) {
    .cards-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .space-tabs {
      min-width: 360px;
    }
  }
  @media (max-width: 768px) {
    .cards-grid {
      grid-template-columns: minmax(0, 1fr);
    }
    .search-input {
      width: 100%;
    }
    .space-tabs {
      min-width: 100%;
    }
  }

  /* ===== 空状态 ===== */
  .empty-wrap {
    @apply flex flex-col items-center justify-center py-24;
  }
  .empty-text {
    @apply text-[14px] text-[#4e5969] mt-6 mb-4 text-center px-6;
  }

  /* ===== 底部加载更多 ===== */
  .load-more {
    @apply flex items-center justify-center gap-2 py-6 text-[14px] text-[#86909c] cursor-pointer select-none;
  }
  .icon-spin {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ====================================================
 * 空状态插图：纯 CSS 绘制（无原生 <svg>）
 * 参考插件广场模块的线框风格：中心圆 + 星标 + 环绕对话气泡/卡片 + 轨道线
 * ==================================================== */
.empty-illustration {
  @apply relative;
  width: 260px;
  height: 200px;
}

/* 外层轨道 */
.orbit-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 230px;
  height: 160px;
  border-radius: 50%;
  border: 1.5px solid #86909c;
  transform: translate(-50%, -50%) rotate(-8deg);
  opacity: 0.85;
}
.orbit-ring-inner {
  width: 160px;
  height: 110px;
  border-color: #165dff;
  transform: translate(-50%, -50%) rotate(14deg);
  border-style: dashed;
  border-width: 1px;
  opacity: 0.75;
}

/* 中心核心 + 星标 */
.center-core {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 66px;
  height: 66px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #ffffff 0%, #f2f7ff 55%, #dbe7ff 100%);
  box-shadow: 0 4px 14px rgba(22, 119, 255, 0.12), inset 0 -3px 0 rgba(22, 119, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.core-star {
  width: 14px;
  height: 14px;
  background: linear-gradient(135deg, #1d2129 0%, #4e5969 100%);
  clip-path: polygon(
    50% 0%, 62% 35%, 98% 35%, 69% 58%,
    79% 92%, 50% 72%, 21% 92%, 31% 58%,
    2% 35%, 38% 35%
  );
  transform: rotate(-18deg);
}

/* 左侧卡片状 chip（黑卡 带 3 条文字线） */
.card-chip {
  position: absolute;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
  z-index: 3;
}
.card-chip-1 {
  left: 12px;
  top: 32px;
  width: 64px;
  height: 46px;
  background: #1d2129;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border-radius: 6px;
}
.card-chip-1 .chip-line {
  height: 3px;
  background: #ffffff;
  border-radius: 2px;
  opacity: 0.92;
  width: 100%;
}
.card-chip-1 .chip-line-2 {
  width: 72%;
}
.card-chip-1 .chip-line-3 {
  width: 55%;
}

/* 右侧蓝色横条 chip（带3个横条） */
.card-chip-2 {
  right: 16px;
  top: 70px;
  width: 60px;
  height: 42px;
  background: #165dff;
  border-radius: 6px;
  padding: 8px 7px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.card-chip-2 .chip-bar {
  height: 3px;
  background: #ffffff;
  border-radius: 2px;
  opacity: 0.95;
}
.card-chip-2 .chip-bar-1 {
  width: 88%;
}
.card-chip-2 .chip-bar-2 {
  width: 65%;
}
.card-chip-2 .chip-bar-3 {
  width: 78%;
}

/* 轨道上的装饰点 */
.orbit-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #165dff;
  z-index: 4;
  box-shadow: 0 0 0 2px #ffffff;
}
.orbit-dot-1 {
  left: 34px;
  top: 108px;
}
.orbit-dot-2 {
  right: 56px;
  top: 56px;
}
</style>
