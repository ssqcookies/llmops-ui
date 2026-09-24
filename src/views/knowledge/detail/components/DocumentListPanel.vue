<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getDocumentsWithPage,
  updateDocumentEnabled,
  retryDocument,
} from '@/services/dataset'

// ============================================================
// 类型（本组件独有）
// ============================================================

/** 文档列表项 —— 对齐 GetDocumentsWithPageResponse list 元素 */
interface DocumentRow {
  id: string
  name: string
  character_count: number
  hit_count: number
  position: number
  enabled: boolean
  disabled_at: number
  status: string
  error: string
  updated_at: number
  created_at: number
}

/** 表格列配置类型 */
type Column = {
  title: string
  dataIndex: keyof DocumentRow | 'actions'
  width?: number
  ellipsis?: boolean
  align?: 'left' | 'center' | 'right'
  slotName?: string
}

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  datasetId: string
  /** 空状态提示文案 */
  emptyHint?: string
}>()

const emit = defineEmits<{
  view: [item: DocumentRow]
  rename: [item: DocumentRow]
  delete: [item: DocumentRow]
}>()

// ============================================================
// 状态
// ============================================================

const loading = ref(false)
const searchInput = ref('')
const searchWord = ref('')

const dataList = ref<DocumentRow[]>([])

const pagination = reactive({
  current_page: 1,
  page_size: 20,
  total: 0,
})

/** 行操作 loading 标记（按 rowId 索引） */
const rowActionLoading = ref<Record<string, boolean>>({})

// ============================================================
// 静默轮询：存在处理中文档时自动刷新
// ============================================================

/** 轮询定时器 */
let pollTimer: ReturnType<typeof setInterval> | null = null

/** 处理中状态集合（非终态） */
const PROCESSING_STATUS = ['waiting', 'parsing', 'splitting', 'indexing']

/** 是否有处理中的文档 */
const hasProcessingDoc = computed(() =>
  dataList.value.some((d) =>
    PROCESSING_STATUS.includes(String(d.status || '').toLowerCase()),
  ),
)

// ============================================================
// 计算属性
// ============================================================

const isEmpty = computed(() => !loading.value && dataList.value.length === 0)

const columns = computed<Column[]>(() => [
  { title: '文档名称', dataIndex: 'name', ellipsis: true, slotName: 'name' },
  { title: '字符数', dataIndex: 'character_count', width: 110, align: 'left' },
  { title: '命中次数', dataIndex: 'hit_count', width: 110, align: 'left' },
  { title: '文档处理状态', dataIndex: 'status', width: 130, slotName: 'status' },
  { title: '是否禁用', dataIndex: 'enabled', width: 120, slotName: 'enabled' },
  { title: '更新时间', dataIndex: 'updated_at', width: 160, slotName: 'updated_at' },
  { title: '操作', dataIndex: 'actions', width: 200, align: 'left', slotName: 'actions' },
])

// ============================================================
// 方法
// ============================================================

/** 拉取文档列表（可静默模式，不显示 loading） */
const fetchList = async (silent = false) => {
  if (!props.datasetId) return
  if (!silent) loading.value = true
  try {
    const res = await getDocumentsWithPage(props.datasetId, {
      current_page: pagination.current_page,
      page_size: pagination.page_size,
      search_word: searchWord.value,
    })
    if (res?.data?.list) {
      dataList.value = res.data.list as DocumentRow[]
      pagination.total = res.data.paginator.total_record ?? 0
    } else {
      dataList.value = []
      pagination.total = 0
    }
  } catch {
    if (!silent) {
      dataList.value = []
      pagination.total = 0
    }
  } finally {
    if (!silent) loading.value = false
  }
}

/** 停止轮询 */
const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

/** 启动轮询（仅在有处理中文档时，且未在轮询中） */
const startPolling = () => {
  if (pollTimer || !hasProcessingDoc.value) return
  pollTimer = setInterval(() => {
    fetchList(true)
  }, 3000)
}

/** 搜索回车 */
const onSearchEnter = () => {
  searchWord.value = searchInput.value.trim()
  pagination.current_page = 1
  fetchList()
}
/** 清除搜索 */
const onSearchClear = () => {
  searchInput.value = ''
  searchWord.value = ''
  pagination.current_page = 1
  fetchList()
}

/** 翻页 */
const onPageChange = (page: number) => {
  pagination.current_page = page
  fetchList()
}
const onPageSizeChange = (size: number) => {
  pagination.page_size = size
  pagination.current_page = 1
  fetchList()
}

/** 点击行名 → 跳转详情 */
const handleView = (row: DocumentRow) => {
  emit('view', row)
}

/** 点击重命名 */
const handleRename = (row: DocumentRow) => {
  emit('rename', row)
}

/** 点击删除 */
const handleDelete = (row: DocumentRow) => {
  emit('delete', row)
}

/** 是否可操作启用/禁用：仅文档处理状态为 completed 时允许（前端拦截，不发请求） */
const canToggleEnabled = (status: string): boolean =>
  String(status || '').toLowerCase() === 'completed'

/** 切换启用状态（直接调用 services） */
const handleToggleEnabled = async (
  row: DocumentRow,
  next: boolean | string | number,
) => {
  // 前端拦截：非 completed 状态一律不允许操作，不走接口
  if (!canToggleEnabled(row.status)) {
    Message.warning('仅处理完成的文档可操作启用/禁用')
    return
  }
  const value = Boolean(next)
  rowActionLoading.value[row.id] = true
  try {
    await updateDocumentEnabled(props.datasetId, row.id, value)
    row.enabled = value
    Message.success(value ? '已启用' : '已禁用')
  } catch {
    // 失败时回退 UI 状态：表格会重新拉取
    Message.error('操作失败，请稍后重试')
    await fetchList()
  } finally {
    rowActionLoading.value[row.id] = false
  }
}

/** 重试文档处理（处理失败时调用） */
const handleRetry = async (row: DocumentRow) => {
  if (!props.datasetId) return
  try {
    await retryDocument(props.datasetId, row.id)
    Message.success('已重新提交处理')
    // 重新拉取列表刷新状态
    await fetchList()
  } catch {
    Message.error('重试失败，请稍后重试')
  }
}

/** 时间戳 → YYYY-MM-DD HH:mm */
const formatTime = (ts: number): string => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const y = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${month}-${day} ${hour}:${min}`
}

/**
 * 文档处理状态文案映射
 * 状态机：WAITING → PARSING → SPLITTING → INDEXING → COMPLETED / ERROR
 */
const statusText = (status: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'waiting':
      return 'waiting'
    case 'parsing':
      return '解析中'
    case 'splitting':
      return '分片中'
    case 'indexing':
      return '向量化中'
    case 'completed':
      return '已完成'
    case 'error':
      return '处理失败'
    default:
      return status || '-'
  }
}

/** 状态样式 class */
const statusClass = (status: string): string => {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return 'status-success'
    case 'error':
      return 'status-error'
    case 'waiting':
      return 'status-default'
    case 'parsing':
    case 'splitting':
    case 'indexing':
      return 'status-pending'
    default:
      return 'status-default'
  }
}

// ============================================================
// 监听
// ============================================================

watch(
  () => props.datasetId,
  (val) => {
    if (val) {
      pagination.current_page = 1
      stopPolling()
      fetchList()
    }
  },
)

/** 列表数据更新后：无处理中文档 → 停轮询；有处理中 → 启动轮询 */
watch(dataList, () => {
  if (hasProcessingDoc.value) {
    startPolling()
  } else {
    stopPolling()
  }
})

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  fetchList()
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="doc-panel">
    <!-- 工具栏：搜索 -->
    <div class="panel-toolbar">
      <a-input
        v-model="searchInput"
        placeholder="请输入文档名称"
        size="medium"
        allow-clear
        class="search-input"
        @press-enter="onSearchEnter"
        @clear="onSearchClear"
      >
        <template #prefix>
          <a-button type="text" class="search-btn" @click="onSearchEnter">
            <icon-search />
          </a-button>
        </template>
      </a-input>
    </div>

    <!-- 表格区域 -->
    <div class="panel-table-wrap">
      <a-spin v-if="loading" :loading="true" class="panel-spin" tip="加载中..." />

      <div v-if="isEmpty && !loading" class="panel-empty">
        <div class="empty-illustration">
          <icon-folder class="empty-icon" />
        </div>
        <div class="empty-text">
          {{ emptyHint || '未找到相关结果' }}
        </div>
      </div>

      <a-table
        v-if="!isEmpty"
        :data="dataList"
        :columns="columns"
        :pagination="false"
        row-key="id"
        :loading="loading"
        class="doc-table"
      >
        <template #name="{ record }">
          <a-button type="text" class="name-btn" @click="handleView(record)">
            {{ record.name }}
          </a-button>
        </template>

        <template #status="{ record }">
          <span class="status-cell">
            <span :class="['status-tag', statusClass(record.status)]">
              {{ statusText(record.status) }}
            </span>
            <!-- 处理失败：显示刷新图标，点击重试 -->
            <a-tooltip
              v-if="String(record.status || '').toLowerCase() === 'error'"
              content="点击重试"
              :mini="true"
            >
              <a-button
                type="text"
                size="mini"
                class="retry-btn"
                :loading="!!rowActionLoading[record.id]"
                @click.stop="handleRetry(record)"
              >
                <template #icon>
                  <icon-refresh :size="12" />
                </template>
              </a-button>
            </a-tooltip>
          </span>
        </template>

        <!-- 是否禁用：圆点 + 文案（仅展示，切换入口在操作列开关） -->
        <template #enabled="{ record }">
          <span class="enabled-state">
            <span :class="['enabled-dot', record.enabled ? 'enabled-dot-on' : 'enabled-dot-off']" />
            <span :class="record.enabled ? 'enabled-text-on' : 'enabled-text-off'">
              {{ record.enabled ? '可用' : '已禁用' }}
            </span>
          </span>
        </template>

        <template #updated_at="{ record }">
          <span class="cell-time">{{ formatTime(record.updated_at || record.created_at) }}</span>
        </template>

        <template #actions="{ record }">
          <div class="row-actions">
            <!-- 仅 completed 状态可切换；其余状态禁用并提示（前端拦截） -->
            <a-tooltip
              :content="canToggleEnabled(record.status) ? undefined : '仅处理完成的文档可操作启用/禁用'"
              :mini="true"
            >
              <span class="switch-wrap">
                <a-switch
                  :model-value="record.enabled"
                  :loading="!!rowActionLoading[record.id]"
                  :disabled="!canToggleEnabled(record.status)"
                  size="small"
                  @change="(val) => handleToggleEnabled(record, val)"
                />
              </span>
            </a-tooltip>
            <a-button
              type="text"
              size="mini"
              class="action-btn"
              @click="handleRename(record)"
            >
              <template #icon>
                <icon-edit />
              </template>
              重命名
            </a-button>
            <a-button
              type="text"
              size="mini"
              class="action-btn action-delete"
              @click="handleDelete(record)"
            >
              <template #icon>
                <icon-delete />
              </template>
              删除
            </a-button>
          </div>
        </template>
      </a-table>

      <!-- 分页 -->
      <div v-if="!isEmpty" class="panel-pagination">
        <a-pagination
          :current="pagination.current_page"
          :page-size="pagination.page_size"
          :total="pagination.total"
          show-total
          show-page-size
          :page-size-options="[10, 20, 50, 100]"
          @change="onPageChange"
          @page-size-change="onPageSizeChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .doc-panel {
    @apply bg-white rounded-[8px] border border-[#eef0f3] flex flex-col;
  }
  .panel-toolbar {
    @apply flex items-center justify-between gap-4 px-4 py-3 border-b border-[#f2f3f5];
  }
  .search-input {
    width: 280px;
  }
  .search-input :deep(.arco-input-wrapper) {
    @apply rounded-[6px] h-[32px];
  }
  .search-btn {
    @apply h-7 w-7 flex items-center justify-center text-[#86909c] hover:text-[#165dff] !p-0;
  }

  .panel-table-wrap {
    @apply relative w-full min-h-[300px];
  }
  .panel-spin {
    @apply absolute inset-0 z-10 flex items-center justify-center w-full min-h-[300px] bg-white/50 rounded-[8px];
  }

  /* 空状态 */
  .panel-empty {
    @apply flex flex-col items-center justify-center py-20;
  }
  .empty-illustration {
    @apply w-20 h-20 rounded-full bg-[#f7f8fa] flex items-center justify-center mb-4;
  }
  .empty-icon {
    @apply text-[36px] text-[#c9cdd4];
  }
  .empty-text {
    @apply text-[14px] text-[#4e5969];
  }

  .doc-table :deep(.arco-table-th) {
    @apply bg-[#f7f8fa] text-[#4e5969] text-[12px] font-medium;
  }
  .doc-table :deep(.arco-table-td) {
    @apply text-[13px] text-[#1d2129];
  }

  .name-btn :deep(.arco-btn) {
    @apply text-[#165dff] hover:text-[#4080ff] !p-0 h-auto text-[13px];
  }

  .cell-time {
    @apply text-[12px] text-[#86909c];
  }

  /* 状态标签 */
  .status-tag {
    @apply inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] leading-5;
  }
  .status-cell {
    @apply inline-flex items-center gap-1;
  }
  .status-success {
    @apply bg-[#e8ffea] text-[#00b42a];
  }
  .status-error {
    @apply bg-[#ffece8] text-[#f53f3f];
  }
  .status-pending {
    @apply bg-[#fff3e0] text-[#ff7d00];
  }
  .status-default {
    @apply bg-[#f2f3f5] text-[#86909c];
  }
  /* 重试按钮 */
  .retry-btn {
    @apply !w-5 !h-5 rounded text-[#f53f3f] hover:!bg-[#ffece8];
  }
  .retry-btn :deep(.arco-btn) {
    @apply text-[12px];
  }

  /* 是否禁用列：圆点 + 文案 */
  .enabled-state {
    @apply inline-flex items-center gap-2;
  }
  .enabled-dot {
    @apply w-2.5 h-2.5 rounded-full shrink-0;
  }
  .enabled-dot-on {
    @apply bg-[#00b42a];
  }
  .enabled-dot-off {
    @apply bg-[#c9cdd4];
  }
  .enabled-text-on {
    @apply text-[13px] text-[#4e5969];
  }
  .enabled-text-off {
    @apply text-[13px] text-[#86909c];
  }

  /* 行操作 */
  .row-actions {
    @apply flex items-center gap-2;
  }
  /* disabled 的 switch 不接收鼠标事件，外层 span 承接 tooltip 悬浮 */
  .switch-wrap {
    @apply inline-flex items-center;
  }
  .action-btn :deep(.arco-btn) {
    @apply text-[#4e5969] hover:text-[#165dff] text-[12px] h-[24px] px-1;
  }
  .action-delete :deep(.arco-btn) {
    @apply hover:text-[#f53f3f];
  }

  .panel-pagination {
    @apply flex justify-end px-4 py-3 border-t border-[#f2f3f5];
  }
}
</style>
