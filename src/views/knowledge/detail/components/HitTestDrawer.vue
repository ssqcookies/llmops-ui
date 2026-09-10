<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { hit, getDatasetQueries } from '@/services/dataset'
import type { HitRequest } from '@/models/dataset'
import RetrievalSettingPopover from './RetrievalSettingPopover.vue'
import HitCard from './HitCard.vue'

// ============================================================
// 类型（本组件独有）
// ============================================================

/** 命中结果项 —— 对齐 HitResponse data 元素 */
interface HitItem {
  id: string
  document: {
    id: string
    name: string
    extension: string
    mime_type: string
  }
  dataset_id: string
  score: number
  position: number
  keywords: string[]
  character_count: number
  token_count: number
  hit_count: number
  enabled: boolean
  disabled_at: number
  status: string
  error: string
  updated_at: number
  created_at: number
}

/** 最近查询项 —— 对齐 GetDatasetQueriesResponse data 元素 */
interface QueryRecord {
  id: string
  query: string
  source: string
  dataset_id: string
  created_at: number
}

/** 检索配置（对齐 HitRequest 的 retrieval_strategy/k/score，不含 query） */
interface RetrievalConfig {
  retrieval_strategy: string
  k: number
  score: number
}

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  visible: boolean
  datasetId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

// ============================================================
// 状态
// ============================================================

/** 查询输入 */
const queryInput = ref('')
/** 命中结果 */
const hitList = ref<HitItem[]>([])
/** 最近查询记录 */
const recentQueries = ref<QueryRecord[]>([])
/** 加载命中 */
const hitLoading = ref(false)
/** 加载最近查询 */
const queriesLoading = ref(false)

/** 检索设置弹层可见性 */
const settingPopoverVisible = ref(false)

/** 检索配置（默认值：混合检索 + k=3 + score=0.5） */
const retrievalConfig = reactive<RetrievalConfig>({
  retrieval_strategy: 'hybrid',
  k: 3,
  score: 0.5,
})

// ============================================================
// 计算属性
// ============================================================

const isEmptyHits = computed(
  () => !hitLoading.value && hitList.value.length === 0 && queryInput.value,
)

const hasSearched = computed(() => !!queryInput.value)

// ============================================================
// 方法
// ============================================================

/** 触发召回测试 */
const handleHit = async () => {
  const query = queryInput.value.trim()
  if (!query) {
    Message.warning('请输入查询内容')
    return
  }
  if (!props.datasetId) return
  hitLoading.value = true
  try {
    const req: HitRequest = {
      retrieval_strategy: retrievalConfig.retrieval_strategy,
      k: retrievalConfig.k,
      query,
      score: retrievalConfig.score,
    }
    const res = await hit(props.datasetId, req)
    hitList.value = (res?.data ?? []) as HitItem[]
    // 拉取最新最近查询
    fetchRecentQueries()
  } catch {
    hitList.value = []
  } finally {
    hitLoading.value = false
  }
}

/** 拉取最近查询 */
const fetchRecentQueries = async () => {
  if (!props.datasetId) return
  queriesLoading.value = true
  try {
    const res = await getDatasetQueries(props.datasetId)
    recentQueries.value = (res?.data ?? []) as QueryRecord[]
  } catch {
    recentQueries.value = []
  } finally {
    queriesLoading.value = false
  }
}

/** 点击最近查询项 → 复用查询 */
const handlePickQuery = (record: QueryRecord) => {
  queryInput.value = record.query
  handleHit()
}

/** 检索设置更新 */
const handleConfigUpdate = (config: RetrievalConfig) => {
  retrievalConfig.retrieval_strategy = config.retrieval_strategy
  retrievalConfig.k = config.k
  retrievalConfig.score = config.score
  settingPopoverVisible.value = false
  if (queryInput.value) handleHit()
}

/** 关闭抽屉 */
const handleClose = () => {
  emit('update:visible', false)
}

/** 抽屉打开时重置并拉取最近查询 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    queryInput.value = ''
    hitList.value = []
    fetchRecentQueries()
  },
)

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  if (props.visible) fetchRecentQueries()
})
</script>

<template>
  <a-drawer
    :visible="visible"
    :width="720"
    :mask-closable="true"
    :footer="false"
    :unmount-on-close="true"
    class="hit-drawer"
    @cancel="handleClose"
    @close="handleClose"
  >
    <template #title>
      <span class="drawer-title">召回测试</span>
    </template>

    <div class="hit-body">
      <!-- ============== 1. 顶部：查询输入 + 检索设置 ============== -->
      <div class="hit-toolbar">
        <a-input
          v-model="queryInput"
          placeholder="请输入查询内容"
          allow-clear
          class="hit-query-input"
          @press-enter="handleHit"
        >
          <template #prefix>
            <a-button type="text" class="hit-search-btn" @click="handleHit">
              <icon-search />
            </a-button>
          </template>
        </a-input>

        <RetrievalSettingPopover
          v-model:visible="settingPopoverVisible"
          :config="retrievalConfig"
          @update="handleConfigUpdate"
        />
      </div>

      <!-- ============== 2. 最近查询 ============== -->
      <section v-if="recentQueries.length > 0" class="recent-section">
        <div class="section-label">最近查询</div>
        <div class="recent-chips">
          <span
            v-for="item in recentQueries"
            :key="item.id"
            class="recent-chip"
            @click="handlePickQuery(item)"
          >
            <icon-history class="chip-icon" />
            <span class="chip-text">{{ item.query }}</span>
          </span>
        </div>
      </section>

      <!-- ============== 3. 命中结果列表 ============== -->
      <section class="hit-result-section">
        <div class="section-head">
          <span class="section-label">命中结果</span>
          <span v-if="hitList.length > 0" class="section-count">
            共 {{ hitList.length }} 条
          </span>
        </div>

        <a-spin v-if="hitLoading" :loading="true" class="hit-spin" tip="检索中..." />

        <div v-if="isEmptyHits && !hitLoading" class="hit-empty">
          <icon-search class="empty-icon" />
          <span class="empty-text">未找到相关结果</span>
        </div>

        <div v-if="!hitLoading && hitList.length > 0" class="hit-list">
          <HitCard
            v-for="(item, idx) in hitList"
            :key="item.id"
            :item="item"
            :index="idx + 1"
          />
        </div>

        <div v-if="!hasSearched && !hitLoading" class="hit-placeholder">
          <icon-search class="placeholder-icon" />
          <span class="placeholder-text">输入查询内容并点击搜索按钮进行召回测试</span>
        </div>
      </section>
    </div>
  </a-drawer>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .drawer-title {
    @apply text-[16px] font-semibold text-[#1d2129];
  }

  .hit-body {
    @apply flex flex-col gap-5;
  }

  /* ===== 顶部工具栏 ===== */
  .hit-toolbar {
    @apply flex items-center gap-3;
  }
  .hit-query-input {
    @apply flex-1;
  }
  .hit-query-input :deep(.arco-input-wrapper) {
    @apply rounded-[6px] h-[36px];
  }
  .hit-search-btn {
    @apply h-7 w-7 flex items-center justify-center text-[#86909c] hover:text-[#165dff] !p-0;
  }

  /* ===== 最近查询区 ===== */
  .recent-section {
    @apply flex flex-col gap-2;
  }
  .section-label {
    @apply text-[13px] font-medium text-[#4e5969] leading-5;
  }
  .recent-chips {
    @apply flex flex-wrap gap-2;
  }
  .recent-chip {
    @apply inline-flex items-center gap-1 px-2.5 py-1 rounded-[16px]
           bg-[#f2f3f5] text-[#4e5969] text-[12px] cursor-pointer
           hover:bg-[#e8f3ff] hover:text-[#165dff] transition-colors;
  }
  .chip-icon {
    @apply text-[12px] text-[#86909c];
  }
  .chip-text {
    @apply truncate max-w-[200px];
  }

  /* ===== 命中结果区 ===== */
  .hit-result-section {
    @apply flex flex-col gap-3 flex-1 min-h-[300px];
  }
  .section-head {
    @apply flex items-center justify-between;
  }
  .section-count {
    @apply text-[12px] text-[#86909c];
  }
  .hit-spin {
    @apply flex items-center justify-center w-full py-12;
  }
  .hit-empty {
    @apply flex flex-col items-center justify-center py-12 gap-3;
  }
  .empty-icon {
    @apply text-[36px] text-[#c9cdd4];
  }
  .empty-text {
    @apply text-[14px] text-[#86909c];
  }
  .hit-list {
    @apply flex flex-col gap-3;
  }
  .hit-placeholder {
    @apply flex flex-col items-center justify-center py-16 gap-3;
  }
  .placeholder-icon {
    @apply text-[40px] text-[#c9cdd4];
  }
  .placeholder-text {
    @apply text-[14px] text-[#86909c];
  }
}
</style>
