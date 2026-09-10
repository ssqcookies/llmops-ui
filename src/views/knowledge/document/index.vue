<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { RouteLocationRaw } from 'vue-router'
import { getDocument, deleteSegment, updateSegmentEnabled } from '@/services/dataset'
import type { GetDocumentResponse } from '@/models/dataset'
import { ROUTE_NAME } from '@/constants'
import SegmentListPanel from './components/SegmentListPanel.vue'
import SegmentEditModal from './components/SegmentEditModal.vue'

// ============================================================
// 类型（本页面独有）
// ============================================================

/** 文档详情 —— 对齐 GetDocumentResponse.data */
interface DocumentDetail {
  id: string
  dataset_id: string
  name: string
  segment_count: number
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

/** 片段项（事件 payload 用，对齐 GetSegmentsWithPageResponse list 元素） */
interface SegmentItem {
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
// 路由参数
// ============================================================

const route = useRoute()
const router = useRouter()

const datasetId = computed(() => String(route.params.datasetId || ''))
const documentId = computed(() => String(route.params.documentId || ''))

// ============================================================
// 状态
// ============================================================

const detailLoading = ref(false)
const detail = ref<DocumentDetail | null>(null)

/** 片段列表刷新 key */
const listRefreshKey = ref(0)

/** 添加 / 编辑片段弹窗 */
const editModalVisible = ref(false)
const editingSegment = ref<SegmentItem | null>(null)
/** 切换中标记（避免点击 toggle 时立即请求再次冲突） */
const toggleLoading = ref<Record<string, boolean>>({})

// ============================================================
// 计算属性
// ============================================================

const isEmptySegments = computed(
  () => !!detail.value && detail.value.segment_count === 0,
)

// ============================================================
// 方法
// ============================================================

const fetchDetail = async () => {
  if (!datasetId.value || !documentId.value) return
  detailLoading.value = true
  try {
    const res: GetDocumentResponse | undefined = await getDocument(
      datasetId.value,
      documentId.value,
    )
    if (res?.data) {
      detail.value = res.data as unknown as DocumentDetail
    } else {
      detail.value = null
    }
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

/** 返回知识库详情 */
const handleBack = () => {
  router.push({
    name: ROUTE_NAME.KNOWLEDGE_DETAIL,
    params: { datasetId: datasetId.value },
  } as RouteLocationRaw)
}

/** 打开新增片段弹窗 */
const openCreateSegment = () => {
  editingSegment.value = null
  editModalVisible.value = true
}

/** 打开编辑片段弹窗 */
const openEditSegment = (item: SegmentItem) => {
  editingSegment.value = item
  editModalVisible.value = true
}

/** 删除片段 —— Modal.confirm */
const handleDeleteSegment = (item: SegmentItem) => {
  Modal.confirm({
    title: '确认删除',
    content: '确认删除该条数据？删除后数据不可恢复',
    okText: '确认删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await deleteSegment(datasetId.value, documentId.value, item.id)
        Message.success('删除成功')
        listRefreshKey.value += 1
        fetchDetail()
      } catch {
        Message.error('删除失败，请稍后重试')
      }
    },
  })
}

/** 切换片段启用状态 */
const handleToggleSegment = async (item: SegmentItem, next: boolean) => {
  toggleLoading.value[item.id] = true
  try {
    await updateSegmentEnabled(datasetId.value, documentId.value, item.id, next)
    item.enabled = next
    Message.success(next ? '已启用' : '已禁用')
  } catch {
    Message.error('操作失败，请稍后重试')
    listRefreshKey.value += 1
  } finally {
    toggleLoading.value[item.id] = false
  }
}

/** 弹窗提交成功 */
const handleSegmentEditSuccess = () => {
  editModalVisible.value = false
  editingSegment.value = null
  listRefreshKey.value += 1
  fetchDetail()
}

// ============================================================
// 监听
// ============================================================

watch(
  () => [datasetId.value, documentId.value],
  () => {
    if (datasetId.value && documentId.value) fetchDetail()
  },
)

// ============================================================
// 生命周期
// ============================================================

onMounted(() => {
  fetchDetail()
})
</script>

<template>
  <div class="page-root w-full min-h-screen bg-[#fafbfc]">
    <div class="max-w-page mx-auto w-full px-8 py-6 flex flex-col gap-5">
      <!-- ============== 1. 顶部信息栏 ============== -->
      <header class="page-head">
        <div class="head-left">
          <a-button type="text" class="back-btn" @click="handleBack">
            <template #icon>
              <icon-left />
            </template>
            返回
          </a-button>
          <div class="divider-v" />
          <div v-if="detailLoading" class="doc-loading">
            <a-spin :loading="true" />
          </div>
          <template v-else-if="detail">
            <icon-file class="doc-icon" />
            <div class="doc-info">
              <div class="doc-name">{{ detail.name }}</div>
              <div class="doc-stats">
                {{ detail.segment_count }} 片段 · {{ detail.character_count }} 字符 ·
                {{ detail.hit_count }} 命中次数
              </div>
            </div>
          </template>
        </div>

        <a-button
          type="primary"
          size="large"
          class="btn-primary"
          @click="openCreateSegment"
        >
          <template #icon>
            <icon-plus />
          </template>
          添加片段
        </a-button>
      </header>

      <!-- ============== 2. 文档元信息卡 ============== -->
      <section v-if="detail" class="doc-meta-wrap">
        <div class="meta-item">
          <span class="meta-label">状态</span>
          <span :class="['meta-tag', detail.enabled ? 'tag-on' : 'tag-off']">
            {{ detail.enabled ? '启用' : '禁用' }}
          </span>
        </div>
        <div class="meta-item">
          <span class="meta-label">处理状态</span>
          <span class="meta-value">{{ detail.status || '-' }}</span>
        </div>
        <div v-if="detail.error" class="meta-item">
          <span class="meta-label">错误信息</span>
          <span class="meta-value meta-error">{{ detail.error }}</span>
        </div>
      </section>

      <!-- ============== 3. 片段列表 ============== -->
      <section class="content-wrap">
        <SegmentListPanel
          :key="listRefreshKey"
          :dataset-id="datasetId"
          :document-id="documentId"
          :empty-hint="isEmptySegments ? '暂无片段，点击右上角「添加片段」开始创建' : undefined"
          @edit="openEditSegment"
          @delete="handleDeleteSegment"
          @toggle="handleToggleSegment"
        />
      </section>

      <!-- ============== 弹窗挂载点 ============== -->
      <SegmentEditModal
        v-model:visible="editModalVisible"
        :dataset-id="datasetId"
        :document-id="documentId"
        :item="editingSegment"
        @success="handleSegmentEditSuccess"
      />
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  /* ===== 页面外层 ===== */
  .page-root {
    min-height: calc(100vh - 0px);
  }
  .max-w-page {
    max-width: 1440px;
  }

  /* ===== 顶部信息栏 ===== */
  .page-head {
    @apply flex items-center justify-between gap-3;
  }
  .head-left {
    @apply flex items-center gap-3 flex-1 min-w-0;
  }
  .back-btn {
    @apply text-[#4e5969] hover:text-[#165dff] !px-2 !h-[36px] shrink-0;
  }
  .divider-v {
    @apply w-px h-5 bg-[#e5e6eb] shrink-0;
  }
  .doc-loading {
    @apply flex items-center justify-center h-[44px];
  }
  .doc-icon {
    @apply text-[36px] text-[#165dff] shrink-0;
  }
  .doc-info {
    @apply flex flex-col gap-1 min-w-0 flex-1;
  }
  .doc-name {
    @apply text-[20px] font-semibold text-[#1d2129] leading-6 truncate;
  }
  .doc-stats {
    @apply text-[12px] text-[#86909c] leading-5 truncate;
  }

  .btn-primary :deep(.arco-btn) {
    @apply rounded-[6px] h-[38px] px-5;
  }

  /* ===== 文档元信息卡 ===== */
  .doc-meta-wrap {
    @apply bg-white rounded-[8px] border border-[#eef0f3] p-4 flex items-center gap-6 flex-wrap;
  }
  .meta-item {
    @apply flex items-center gap-2;
  }
  .meta-label {
    @apply text-[13px] text-[#86909c] leading-5;
  }
  .meta-value {
    @apply text-[13px] text-[#1d2129] leading-5;
  }
  .meta-tag {
    @apply inline-flex items-center px-2 py-0.5 rounded-[4px] text-[12px] leading-5;
  }
  .tag-on {
    @apply bg-[#e8ffea] text-[#00b42a];
  }
  .tag-off {
    @apply bg-[#f2f3f5] text-[#86909c];
  }
  .meta-error {
    @apply text-[#f53f3f] break-all;
  }

  /* ===== 内容区 ===== */
  .content-wrap {
    @apply relative w-full min-h-[360px];
  }
}
</style>
