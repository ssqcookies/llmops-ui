<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { RouteLocationRaw } from 'vue-router'
import {
  getDataset,
  deleteDocument,
} from '@/services/dataset'
import type { GetDatasetResponse } from '@/models/dataset'
import { ROUTE_NAME } from '@/constants'
import DocumentListPanel from './components/DocumentListPanel.vue'
import HitTestDrawer from './components/HitTestDrawer.vue'
import RenameDocumentModal from './components/RenameDocumentModal.vue'

// ============================================================
// 类型（本页面独有，仅本文件使用）
// ============================================================

/** 知识库详情数据 —— 对齐 GetDatasetResponse.data */
interface DatasetDetail {
  id: string
  icon: string
  name: string
  description: string
  document_count: number
  hit_count: number
  related_app_count: number
  character_count: number
  updated_at: number
  created_at: number
}

/** 文档项（用于重命名 / 启用切换 / 删除 / 跳详情的事件 payload） */
interface DocumentItem {
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

// ============================================================
// 路由参数
// ============================================================

const route = useRoute()
const router = useRouter()

const datasetId = computed(() => String(route.params.datasetId || ''))

// ============================================================
// 状态
// ============================================================

/** 详情基础 Loading */
const detailLoading = ref(false)
/** 详情数据 */
const detail = ref<DatasetDetail | null>(null)

/** 召回测试抽屉 */
const hitDrawerVisible = ref(false)
/** 召回测试抽屉刷新信号（文档删改后 +1 触发联动） */
const hitRefreshKey = ref(0)

/** 重命名弹窗 */
const renameVisible = ref(false)
const renamingItem = ref<DocumentItem | null>(null)

/** 文档列表 key（用于刷新列表） */
const listRefreshKey = ref(0)

// ============================================================
// 计算属性
// ============================================================

const isEmptyDocs = computed(
  () => !!detail.value && detail.value.document_count === 0,
)

// ============================================================
// 方法
// ============================================================

/** 拉取知识库详情 */
const fetchDetail = async () => {
  if (!datasetId.value) return
  detailLoading.value = true
  try {
    const res: GetDatasetResponse | undefined = await getDataset(datasetId.value)
    if (res?.data) {
      detail.value = res.data as unknown as DatasetDetail
    } else {
      detail.value = null
    }
  } catch {
    detail.value = null
  } finally {
    detailLoading.value = false
  }
}

/** 返回个人空间-知识库 Tab（/space/knowledge） */
const handleBack = () => {
  router.push('/space/knowledge')
}

/** 打开召回测试抽屉 */
const openHitTest = () => {
  hitDrawerVisible.value = true
}

/** 跳转添加文件页面（全页面三步流程） */
const openAddFile = () => {
  router.push({
    name: ROUTE_NAME.KNOWLEDGE_ADD_FILE,
    params: { datasetId: datasetId.value },
  } as RouteLocationRaw)
}

/** 文档操作：重命名 */
const handleRename = (item: DocumentItem) => {
  renamingItem.value = item
  renameVisible.value = true
}

/** 重命名成功 */
const handleRenameSuccess = () => {
  renameVisible.value = false
  renamingItem.value = null
  // 刷新列表 + 详情统计
  listRefreshKey.value += 1
  fetchDetail()
  // 刷新召回测试（如有打开）
  hitRefreshKey.value += 1
}

/** 文档操作：删除（统一通过 Modal.confirm） */
const handleDelete = (item: DocumentItem) => {
  Modal.confirm({
    title: '确认删除',
    content: '确认删除该条数据？删除后数据不可恢复',
    okText: '确认删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await deleteDocument(datasetId.value, item.id)
        Message.success('删除成功')
        listRefreshKey.value += 1
        fetchDetail()
        // 刷新召回测试（如有打开）
        hitRefreshKey.value += 1
      } catch {
        Message.error('删除失败，请稍后重试')
      }
    },
  })
}

/** 文档操作：跳转到文档详情 */
const handleViewDocument = (item: DocumentItem) => {
  router.push({
    name: ROUTE_NAME.KNOWLEDGE_DOCUMENT_DETAIL,
    params: { datasetId: datasetId.value, documentId: item.id },
  } as RouteLocationRaw)
}

// ============================================================
// 监听
// ============================================================

watch(
  () => datasetId.value,
  (val) => {
    if (val) fetchDetail()
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
      <!-- ============== 1. 顶部：返回 + 知识库信息卡 ============== -->
      <header class="page-head">
        <div class="head-left">
          <a-button type="text" class="back-btn" @click="handleBack">
            <template #icon>
              <icon-left />
            </template>
            返回
          </a-button>
          <div class="divider-v" />
          <!-- 知识库信息 -->
          <div v-if="detailLoading" class="kb-loading">
            <a-spin :loading="true" />
          </div>
          <template v-else-if="detail">
            <img :src="detail.icon" :alt="detail.name" class="kb-icon" />
            <div class="kb-info">
              <div class="kb-name">{{ detail.name }}</div>
              <div class="kb-stats">
                {{ detail.document_count }} 文档 · {{ detail.character_count }} 字符 ·
                {{ detail.hit_count }} 命中次数 · {{ detail.related_app_count }} 关联应用
              </div>
            </div>
          </template>
        </div>

        <div class="head-right">
          <a-button
            type="outline"
            size="large"
            class="btn-outline-primary"
            @click="openHitTest"
          >
            <template #icon>
              <icon-search />
            </template>
            召回测试
          </a-button>
          <a-button
            type="primary"
            size="large"
            class="btn-primary"
            @click="openAddFile"
          >
            <template #icon>
              <icon-plus />
            </template>
            添加文件
          </a-button>
        </div>
      </header>

      <!-- ============== 2. 描述区域 ============== -->
      <section v-if="detail" class="kb-desc-wrap">
        <div class="kb-desc-label">知识库描述</div>
        <div class="kb-desc">{{ detail.description || '暂无描述' }}</div>
      </section>

      <!-- ============== 3. 文档列表区 ============== -->
      <section class="content-wrap">
        <DocumentListPanel
          :key="listRefreshKey"
          :dataset-id="datasetId"
          :empty-hint="isEmptyDocs ? '暂无文档，点击右上角「添加文件」开始上传' : undefined"
          @view="handleViewDocument"
          @rename="handleRename"
          @delete="handleDelete"
        />
      </section>

      <!-- ============== 弹窗 / 抽屉挂载点 ============== -->
      <HitTestDrawer
        v-model:visible="hitDrawerVisible"
        :dataset-id="datasetId"
        :refresh-key="hitRefreshKey"
      />

      <RenameDocumentModal
        v-model:visible="renameVisible"
        :dataset-id="datasetId"
        :item="renamingItem"
        @success="handleRenameSuccess"
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
  .kb-loading {
    @apply flex items-center justify-center h-[44px];
  }
  .kb-icon {
    @apply w-11 h-11 rounded-[10px] object-cover shrink-0 bg-[#f7f8fa];
  }
  .kb-info {
    @apply flex flex-col gap-1 min-w-0 flex-1;
  }
  .kb-name {
    @apply text-[20px] font-semibold text-[#1d2129] leading-6 truncate;
  }
  .kb-stats {
    @apply text-[12px] text-[#86909c] leading-5 truncate;
  }
  .head-right {
    @apply flex items-center gap-3 shrink-0;
  }

  /* ===== 描述区 ===== */
  .kb-desc-wrap {
    @apply bg-white rounded-[8px] border border-[#eef0f3] p-4 flex flex-col gap-2;
  }
  .kb-desc-label {
    @apply text-[13px] text-[#86909c] leading-5;
  }
  .kb-desc {
    @apply text-[14px] text-[#1d2129] leading-6;
  }

  /* ===== 蓝色描边按钮 ===== */
  .btn-outline-primary :deep(.arco-btn) {
    @apply border border-[#165dff] text-[#165dff] rounded-[6px] h-[38px] px-5 bg-white;
  }
  .btn-outline-primary :deep(.arco-btn:hover) {
    @apply bg-[#e8f3ff];
  }
  .btn-primary :deep(.arco-btn) {
    @apply rounded-[6px] h-[38px] px-5;
  }

  /* ===== 内容区 ===== */
  .content-wrap {
    @apply relative w-full min-h-[360px];
  }
}
</style>
