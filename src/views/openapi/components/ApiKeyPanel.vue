<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Modal, Message } from '@arco-design/web-vue'
import { getApiKeysWithPage } from '@/services/api-key'
import { deleteApiKey, updateApiKeyIsActive } from '@/services/api-key'
import type { GetApiKeysWithPageResponse } from '@/models/api-key'
import ApiKeyFormModal from './ApiKeyFormModal.vue'

/** 列表行类型 */
type ApiKeyItem = GetApiKeysWithPageResponse['data']['list'][number]

// 列表数据
const loading = ref(false)
const apiKeys = ref<ApiKeyItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// 弹窗状态
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<ApiKeyItem | null>(null)

// 加载列表
const loadList = async () => {
  loading.value = true
  try {
    const resp = await getApiKeysWithPage({
      current_page: currentPage.value,
      page_size: pageSize.value,
    })
    apiKeys.value = resp.data.list
    total.value = resp.data.paginator.total_record
  } catch {
    // 错误已由 request 层统一提示
  } finally {
    loading.value = false
  }
}

// 新增
const handleCreate = () => {
  formMode.value = 'create'
  editing.value = null
  formVisible.value = true
}

// 编辑
const handleEdit = (record: ApiKeyItem) => {
  formMode.value = 'edit'
  editing.value = record
  formVisible.value = true
}

// 复制秘钥到剪贴板
const handleCopyKey = async (record: ApiKeyItem) => {
  try {
    await navigator.clipboard.writeText(record.api_key)
    Message.success('秘钥已复制')
  } catch {
    Message.error('复制失败')
  }
}

// 启用/禁用切换
const handleToggleActive = async (record: ApiKeyItem) => {
  const next = !record.is_active
  try {
    await updateApiKeyIsActive(record.id, next)
    record.is_active = next
  } catch {
    // 失败不回滚，下次加载列表会重新同步
  }
}

// 删除确认（按原型图：标题 + 文案 + 取消/确认）
const handleDelete = (record: ApiKeyItem) => {
  Modal.warning({
    title: '要删除秘钥吗？',
    content:
      '删除秘钥后，无法使用该秘钥访问 LLMops 个人空间中的所有 Agent，并且无法恢复，如果临时关闭请使用禁用功能。',
    hideCancel: false,
    cancelText: '取消',
    okText: '确认',
    onOk: async () => {
      try {
        await deleteApiKey(record.id)
        await loadList()
      } catch {
        // 错误已由 request 层统一提示
      }
    },
  })
}

// 保存后刷新
const handleSaved = () => {
  loadList()
}

// 分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadList()
}

const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadList()
}

// 表格列定义
const columns = computed(() => [
  { title: '秘钥', dataIndex: 'api_key', slotName: 'apiKey' },
  { title: '状态', dataIndex: 'is_active', slotName: 'status', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', slotName: 'createdAt', width: 180 },
  { title: '备注', dataIndex: 'remark', slotName: 'remark', ellipsis: true },
  { title: '操作', slotName: 'actions', width: 160, fixed: 'right' as const },
])

onMounted(() => {
  loadList()
})
</script>

<template>
  <div class="api-key-panel">
    <!-- 顶部操作栏 -->
    <div class="panel-header">
      <span class="panel-title">秘钥管理</span>
      <a-button type="primary" @click="handleCreate">
        <template #icon><icon-plus /></template>
        新增秘钥
      </a-button>
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data="apiKeys"
      :loading="loading"
      :pagination="false"
      row-key="id"
      :scroll="{ x: 800 }"
    >
      <!-- 秘钥列：长字符串截断 + 复制图标 -->
      <template #apiKey="{ record }">
        <div class="flex items-center gap-1">
          <a-tooltip :content="record.api_key" position="tl">
            <span class="api-key-cell">{{ record.api_key }}</span>
          </a-tooltip>
          <a-tooltip content="复制秘钥" mini>
            <a-button
              type="text"
              size="mini"
              :style="{ color: '#86909c', padding: '2px' }"
              @click="handleCopyKey(record)"
            >
              <template #icon><icon-copy :size="14" /></template>
            </a-button>
          </a-tooltip>
        </div>
      </template>

      <!-- 状态列：可用（绿）/ 已禁用（灰） -->
      <template #status="{ record }">
        <span
          class="status-tag"
          :class="record.is_active ? 'status-active' : 'status-disabled'"
        >
          <span class="status-dot" />
          {{ record.is_active ? '可用' : '已禁用' }}
        </span>
      </template>

      <!-- 创建时间 -->
      <template #createdAt="{ record }">
        <span class="time-cell">{{ record.created_at }}</span>
      </template>

      <!-- 备注 -->
      <template #remark="{ record }">
        <span class="remark-cell">{{ record.remark || '—' }}</span>
      </template>

      <!-- 操作列：编辑 + 更多（启用/禁用 + 删除） -->
      <template #actions="{ record }">
        <div class="flex items-center gap-2">
          <a-button type="text" size="mini" @click="handleEdit(record)">
            编辑
          </a-button>
          <a-dropdown trigger="click" position="br">
            <a-button type="text" size="mini">
              <template #icon><icon-more /></template>
            </a-button>
            <template #content>
              <a-doption @click="handleToggleActive(record)">
                {{ record.is_active ? '禁用' : '启用' }}
              </a-doption>
              <a-doption class="danger-option" @click="handleDelete(record)">
                删除
              </a-doption>
            </template>
          </a-dropdown>
        </div>
      </template>
    </a-table>

    <!-- 分页 -->
    <div class="panel-pagination">
      <a-pagination
        :current="currentPage"
        :page-size="pageSize"
        :total="total"
        show-total
        show-page-size
        @change="handlePageChange"
        @page-size-change="handlePageSizeChange"
      />
    </div>

    <!-- 弹窗挂载点位 -->
    <ApiKeyFormModal
      v-model:visible="formVisible"
      :mode="formMode"
      :editing="editing"
      @saved="handleSaved"
    />
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .api-key-panel {
    @apply flex flex-col gap-4;
  }
  .panel-header {
    @apply flex items-center justify-between;
  }
  .panel-title {
    @apply text-[15px] font-medium text-[#1d2129];
  }
  .api-key-cell {
    @apply text-[13px] text-[#4e5969] font-mono
           block max-w-[240px] truncate;
  }
  .time-cell {
    @apply text-[13px] text-[#86909c];
  }
  .remark-cell {
    @apply text-[13px] text-[#4e5969] block max-w-[200px] truncate;
  }
  .status-tag {
    @apply inline-flex items-center gap-1 px-2 py-0.5
           rounded-[6px] text-[12px] leading-5;
  }
  .status-active {
    @apply text-[#00b42a] bg-[#e8ffea];
  }
  .status-disabled {
    @apply text-[#86909c] bg-[#f2f3f5];
  }
  .status-dot {
    @apply w-1.5 h-1.5 rounded-full;
  }
  .status-active .status-dot {
    @apply bg-[#00b42a];
  }
  .status-disabled .status-dot {
    @apply bg-[#c9cdd4];
  }
  .panel-pagination {
    @apply flex justify-end pt-2;
  }
}
</style>

<style scoped lang="css">
.danger-option {
  color: #f53f3f !important;
}
</style>
