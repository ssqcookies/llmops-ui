<script setup lang="ts">
/** 召回测试 Modal —— 按原型图重写：左右分栏，左源文本+最近查询表格，右命中卡片网格 */
import { ref, reactive, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { hit, getDatasetQueries } from '@/services/dataset'
import type { HitRequest } from '@/models/dataset'
import RetrievalSettingPopover from './RetrievalSettingPopover.vue'
import SegmentDetailModal from './SegmentDetailModal.vue'
import HitCard from './HitCard.vue'

// ============================================================
// 类型（本组件独有）
// ============================================================

/** 命中结果项 —— 对齐 HitResponse data 元素 */
interface HitItem {
  id: string
  content?: string
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
  /** 查询来源标识（hit_testing / query 等） */
  source: string
  dataset_id: string
  created_at: number
  /** 本次查询命中的 Top1 文档名（可选，后端补字段） */
  top_document?: string
}

/** 检索配置 */
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
  /** 外部刷新信号：父组件增 1 时清缓存 + 重拉 queries（文档删改后联动） */
  refreshKey?: number
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

// ============================================================
// 状态
// ============================================================

/** 源文本 */
const queryInput = ref('')
/** 字数上限 */
const MAX_QUERY_LEN = 200
/** 命中结果 */
const hitList = ref<HitItem[]>([])
/** 最近查询记录 */
const recentQueries = ref<QueryRecord[]>([])
/** 加载状态 */
const hitLoading = ref(false)
const queriesLoading = ref(false)
/** 检索设置 Modal 可见性 */
const settingVisible = ref(false)
/** 片段详情 Modal 可见性 */
const segmentDetailVisible = ref(false)
const currentSegment = ref<HitItem | null>(null)

/**
 * 查询结果缓存：query 文本 → hit 结果列表
 * 点击最近查询时优先读缓存，避免重复请求
 */
const hitCache = new Map<string, HitItem[]>()

/** 检索配置（默认：混合检索 + k=3 + score=0.5） */
const retrievalConfig = reactive<RetrievalConfig>({
  retrieval_strategy: 'hybrid',
  k: 3,
  score: 0.5,
})

// ============================================================
// 计算属性
// ============================================================

/** 字数 */
const queryLen = computed(() => queryInput.value.length)

const hasSearched = computed(() => !!queryInput.value)

const isEmptyHits = computed(
  () => !hitLoading.value && hitList.value.length === 0 && hasSearched.value,
)

// ============================================================
// 方法
// ============================================================

/** 格式化时间戳 → MM-DD HH:mm */
const formatTime = (ts: number): string => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

/** 数据源列显示：优先 top_document（命中文档名），fallback source 友好名 */
const getSourceDisplay = (record: QueryRecord): string => {
  if (record.top_document) return record.top_document
  const map: Record<string, string> = {
    hit_testing: 'Hit Testing',
    HitTesting: 'Hit Testing',
    query: 'Query',
    Query: 'Query',
    app_testing: '应用测试',
  }
  const src = record.source ?? ''
  if (src && map[src]) return map[src]
  return src || '-'
}

/** 生成缓存 key：query + 检索配置，保证不同策略下互不污染 */
const buildCacheKey = (query: string, cfg: RetrievalConfig) =>
  `${query}::${cfg.retrieval_strategy}::${cfg.k}::${cfg.score}`

/** 触发召回测试 */
const handleHit = async () => {
  const query = queryInput.value.trim()
  if (!query) {
    Message.warning('请输入查询内容')
    return
  }
  if (!props.datasetId) return

  // 命中前先查缓存（同 query + 同检索配置）
  const cacheKey = buildCacheKey(query, retrievalConfig)
  if (hitCache.has(cacheKey)) {
    hitList.value = hitCache.get(cacheKey)!
    return
  }

  hitLoading.value = true
  try {
    const req: HitRequest = {
      retrieval_strategy: retrievalConfig.retrieval_strategy,
      k: retrievalConfig.k,
      query,
      score: retrievalConfig.score,
    }
    const res = await hit(props.datasetId, req)
    const list = (res?.data ?? []) as HitItem[]
    hitList.value = list
    hitCache.set(cacheKey, list)
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

/**
 * 点击最近查询记录 → 复用该查询的命中结果
 * 优先读 hitCache（当前会话内已测过的 query），没有才重新请求
 */
const handlePickQuery = (record: QueryRecord) => {
  queryInput.value = record.query
  handleHit()
}

/** 检索设置更新 */
const handleConfigUpdate = (config: RetrievalConfig) => {
  retrievalConfig.retrieval_strategy = config.retrieval_strategy
  retrievalConfig.k = config.k
  retrievalConfig.score = config.score
  if (hasSearched.value) handleHit()
}

/** 点击命中卡片 → 打开片段详情 */
const handleCardClick = (item: HitItem) => {
  currentSegment.value = item
  segmentDetailVisible.value = true
}

/** 关闭 Modal */
const handleClose = () => {
  emit('update:visible', false)
}

/** Modal 打开时重置 */
watch(
  () => props.visible,
  (val) => {
    if (!val) return
    queryInput.value = ''
    hitList.value = []
    hitCache.clear()
    fetchRecentQueries()
  },
)

/**
 * 外部刷新信号：文档删改后，父组件会增 1 触发这里
 * - Modal 打开时：清 hitCache + 重拉 queries 列表
 * - Modal 关闭时：下次打开 watch visible 已经会完整刷新
 */
watch(
  () => props.refreshKey,
  () => {
    if (!props.visible) return
    hitCache.clear()
    fetchRecentQueries()
  },
)
</script>

<template>
  <a-modal
    :visible="visible"
    :width="1100"
    :footer="false"
    :mask-closable="true"
    :unmount-on-close="true"
    :body-style="{ padding: 0 }"
    :hide-title="true"
    :closable="false"
    class="hit-modal"
    @cancel="handleClose"
  >
    <!-- 标题栏 -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-[#f2f3f5]">
      <div class="flex flex-col gap-0.5">
        <span class="text-[18px] font-semibold text-[#1d2129]">召回测试</span>
        <span class="text-[13px] text-[#86909c]">基于给定的查询文本测试知识库的召回效果</span>
      </div>
      <div
        class="w-8 h-8 flex items-center justify-center text-[#86909c] rounded-[4px] cursor-pointer hover:bg-[#f2f3f5] hover:text-[#1d2129] transition-colors"
        @click="handleClose"
      >
        <icon-close :size="18" />
      </div>
    </div>

    <!-- 主体：左右分栏 -->
    <div class="flex items-stretch h-[560px]">
      <!-- ============ 左栏 ============ -->
      <div
        class="w-[42%] min-w-[440px] flex flex-col gap-4 p-5 border-r border-[#f2f3f5]"
      >
        <!-- 胶囊形输入区 -->
        <div class="flex flex-col gap-2">
          <!-- 胶囊输入框（对齐原型图：白底+消息icon+发送按钮） -->
          <div
            class="flex items-center gap-2 bg-white border border-[#e5e6eb] rounded-full pl-4 pr-3 h-12"
          >
            <!-- 左侧消息图标 -->
            <icon-message class="text-[#86909c] shrink-0" :size="18" />
            <!-- 输入框 -->
            <a-input
              v-model="queryInput"
              :max-length="MAX_QUERY_LEN"
              placeholder="发送消息或创建 AI 应用..."
              class="source-input flex-1"
              @press-enter="handleHit"
            />
            <!-- 发送按钮（框内右侧：蓝色实心圆形） -->
            <a-button
              type="primary"
              shape="circle"
              size="small"
              class="shrink-0"
              :loading="hitLoading"
              :disabled="queryLen === 0"
              @click="handleHit"
            >
              <template #icon><icon-send /></template>
            </a-button>
          </div>
          <!-- 底部提示文字 + 设置 -->
          <div class="flex items-center justify-between px-3">
            <span class="text-[12px] text-[#86909c]">内容由AI生成，无法确保真实准确，仅供参考。</span>
            <div class="flex items-center gap-2">
              <span class="text-[12px] text-[#c9cdd4]">{{ queryLen }}/{{ MAX_QUERY_LEN }}</span>
              <a-tooltip content="检索设置">
                <a-button
                  type="text"
                  size="mini"
                  class="setting-btn !px-1"
                  @click="settingVisible = true"
                >
                  <template #icon><icon-settings /></template>
                </a-button>
              </a-tooltip>
            </div>
          </div>
        </div>

        <!-- 最近查询表格 -->
        <div
          class="flex flex-col flex-1 bg-white rounded-[8px] border border-[#eef0f3] overflow-hidden"
        >
          <div
            class="px-4 py-3 text-[14px] font-semibold text-[#1d2129] border-b border-[#f2f3f5]"
          >
            最近查询
          </div>
          <div class="flex flex-col flex-1 overflow-hidden">
            <!-- 表头：Grid + Tailwind -->
            <div class="table-head">
              <span class="truncate">数据源</span>
              <span class="truncate">文本</span>
              <span class="text-right">时间</span>
            </div>
            <a-spin v-if="queriesLoading" :loading="true" class="py-8 flex items-center justify-center" />
            <div v-else-if="recentQueries.length === 0" class="py-8 text-center text-[13px] text-[#86909c]">
              暂无查询记录
            </div>
            <div v-else class="flex flex-col overflow-y-auto">
              <div
                v-for="item in recentQueries"
                :key="item.id"
                class="table-row border-b border-[#f7f8fa] last:border-b-0 cursor-pointer hover:bg-[#f2f7ff]"
                @click="handlePickQuery(item)"
              >
                <span class="truncate text-[12px] text-[#4e5969]">{{ getSourceDisplay(item) }}</span>
                <span class="text-[13px] text-[#1d2129] truncate">{{ item.query }}</span>
                <span class="text-right text-[12px] text-[#86909c]">{{ formatTime(item.created_at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============ 右栏 ============ -->
      <div class="flex-1 p-5 overflow-y-auto">
        <a-spin v-if="hitLoading" :loading="true" class="h-full flex items-center justify-center" tip="检索中..." />

        <!-- 空状态 -->
        <div v-else-if="isEmptyHits" class="flex flex-col items-center justify-center py-16 gap-3">
          <icon-search class="text-[40px] text-[#c9cdd4]" />
          <span class="text-[14px] text-[#86909c]">未找到相关结果</span>
        </div>

        <!-- 初始占位 -->
        <div v-else-if="!hasSearched" class="flex flex-col items-center justify-center py-16 gap-3">
          <icon-search class="text-[40px] text-[#c9cdd4]" />
          <span class="text-[14px] text-[#86909c]">输入查询内容并点击「测试」进行召回测试</span>
        </div>

        <!-- 命中卡片网格 -->
        <div v-else class="grid grid-cols-2 gap-3">
          <HitCard
            v-for="item in hitList"
            :key="item.id"
            :item="item"
            @click="handleCardClick"
          />
        </div>
      </div>
    </div>

    <!-- ============== 子组件挂载点 ============== -->
    <RetrievalSettingPopover
      v-model:visible="settingVisible"
      :config="retrievalConfig"
      @update="handleConfigUpdate"
    />
    <SegmentDetailModal
      v-model:visible="segmentDetailVisible"
      :item="currentSegment"
    />
  </a-modal>
</template>

<style scoped lang="css">
/* ===== Grid 列模板 —— 表头与表行共用，保证精确对齐 =====
   Tailwind class 无法表达 grid-template-columns，必须原生 CSS */
.table-head,
.table-row {
  display: grid;
  grid-template-columns: 80px 1fr 100px;
  column-gap: 12px;
  align-items: center;
  padding-left: 16px;
  padding-right: 16px;
}
.table-head {
  padding-top: 8px;
  padding-bottom: 8px;
  font-size: 12px;
  color: #86909c;
  background: #fafbfc;
}
.table-row {
  padding-top: 10px;
  padding-bottom: 10px;
}

/* ===== :deep() 穿透 Arco Design 组件 ===== */
.hit-modal :deep(.arco-modal-body) {
  padding: 0;
}
.hit-modal :deep(.arco-modal-content) {
  border-radius: 8px;
  overflow: hidden;
}
/* ===== 胶囊输入框 —— 彻底清除 Arco Input 自带灰色底/边框/focus 阴影 ===== */
.source-input :deep(.arco-input-wrapper) {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.source-input :deep(.arco-input-wrapper:hover) {
  border: none !important;
  box-shadow: none !important;
}
.source-input :deep(.arco-input-wrapper.arco-input-focus) {
  border: none !important;
  box-shadow: none !important;
}
.source-input :deep(.arco-input) {
  background: transparent !important;
  font-size: 14px;
  height: 40px;
}
.setting-btn :deep(.arco-btn) {
  padding: 0 4px;
  height: 24px;
  color: #c9cdd4;
}
.setting-btn :deep(.arco-btn:hover) {
  color: #165dff;
  background: transparent;
}
</style>
