<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { getSegmentsWithPage } from '@/services/dataset'
import SegmentCard from './SegmentCard.vue'

// ============================================================
// 类型（本组件独有）
// ============================================================

/** 片段项 —— 对齐 GetSegmentsWithPageResponse list 元素 */
interface SegmentRow {
  id: string
  dataset_id: string
  document_id: string
  position: number
  content: string
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

// ============================================================
// Props
// ============================================================

const props = defineProps<{
  datasetId: string
  documentId: string
  emptyHint?: string
}>()

const emit = defineEmits<{
  edit: [item: SegmentRow]
  delete: [item: SegmentRow]
  toggle: [item: SegmentRow, next: boolean]
}>()

// ============================================================
// 状态
// ============================================================

const loading = ref(false)
const searchInput = ref('')
const searchWord = ref('')

const dataList = ref<SegmentRow[]>([])
const pagination = reactive({
  current_page: 1,
  page_size: 20,
  total: 0,
})

// ============================================================
// 计算属性
// ============================================================

const isEmpty = computed(() => !loading.value && dataList.value.length === 0)

// ============================================================
// 方法
// ============================================================

const fetchList = async () => {
  if (!props.datasetId || !props.documentId) return
  loading.value = true
  try {
    const res = await getSegmentsWithPage(props.datasetId, props.documentId, {
      current_page: pagination.current_page,
      page_size: pagination.page_size,
      search_word: searchWord.value,
    })
    if (res?.data?.list) {
      dataList.value = res.data.list as SegmentRow[]
      pagination.total = res.data.paginator.total_record ?? 0
    } else {
      dataList.value = []
      pagination.total = 0
    }
  } catch {
    dataList.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const onSearchEnter = () => {
  searchWord.value = searchInput.value.trim()
  pagination.current_page = 1
  fetchList()
}

const onSearchClear = () => {
  searchInput.value = ''
  searchWord.value = ''
  pagination.current_page = 1
  fetchList()
}

const onPageChange = (page: number) => {
  pagination.current_page = page
  fetchList()
}

const onPageSizeChange = (size: number) => {
  pagination.page_size = size
  pagination.current_page = 1
  fetchList()
}

/** 卡片事件分发 */
const handleEdit = (item: SegmentRow) => emit('edit', item)
const handleDelete = (item: SegmentRow) => emit('delete', item)
const handleToggle = (item: SegmentRow, next: boolean) => emit('toggle', item, next)

// ============================================================
// 监听
// ============================================================

watch(
  () => [props.datasetId, props.documentId],
  () => {
    if (props.datasetId && props.documentId) {
      pagination.current_page = 1
      fetchList()
    }
  },
)

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  fetchList()
})
</script>

<template>
  <div class="seg-panel">
    <!-- 工具栏：搜索 -->
    <div class="panel-toolbar">
      <a-input
        v-model="searchInput"
        placeholder="请输入片段内容"
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

    <!-- 卡片网格 -->
    <div class="panel-content">
      <a-spin v-if="loading" :loading="true" class="panel-spin" tip="加载中..." />

      <div v-if="isEmpty && !loading" class="panel-empty">
        <div class="empty-illustration">
          <icon-folder class="empty-icon" />
        </div>
        <div class="empty-text">{{ emptyHint || '未找到相关结果' }}</div>
      </div>

      <div v-if="!isEmpty" class="card-grid">
        <SegmentCard
          v-for="item in dataList"
          :key="item.id"
          :item="item"
          @edit="handleEdit(item)"
          @delete="handleDelete(item)"
          @toggle="handleToggle.bind(null, item)"
        />
      </div>

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
  .seg-panel {
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

  .panel-content {
    @apply relative w-full min-h-[300px] p-4 flex flex-col gap-4;
  }
  .panel-spin {
    @apply absolute inset-0 z-10 flex items-center justify-center w-full min-h-[300px] bg-white/50 rounded-[8px];
  }

  /* 卡片网格：2 列宽屏 / 1 列窄屏 */
  .card-grid {
    @apply grid gap-4 w-full;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  @media (max-width: 1024px) {
    .card-grid {
      grid-template-columns: minmax(0, 1fr);
    }
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

  .panel-pagination {
    @apply flex justify-end pt-2 border-t border-[#f2f3f5];
  }
}
</style>
