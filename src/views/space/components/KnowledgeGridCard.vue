<script setup lang="ts">
import { computed } from 'vue'
import { Dropdown, Modal } from '@arco-design/web-vue'

/** 卡片数据 —— 对齐 getDatasetsWithPage 接口返回 data.list 元素 */
interface KnowledgeGridItem {
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

/** 卡片操作 key */
type CardAction = 'settings' | 'edit' | 'delete'

const props = defineProps<{
  item: KnowledgeGridItem
}>()

const emit = defineEmits<{
  settings: [item: KnowledgeGridItem]
  edit: [item: KnowledgeGridItem]
  delete: [item: KnowledgeGridItem]
}>()

/** 操作菜单 select */
const handleAction = (actionKey: string | number | Record<string, any> | undefined) => {
  if (!actionKey || typeof actionKey !== 'string') return
  const key = actionKey as CardAction
  if (key === 'settings') {
    emit('settings', props.item)
    return
  }
  if (key === 'edit') {
    emit('edit', props.item)
    return
  }
  if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除该条数据？删除后数据不可恢复',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        emit('delete', props.item)
      },
    })
  }
}

/** 时间戳 → MM-DD HH:mm */
const formatTime = (ts: number): string => {
  if (!ts) return '-'
  const d = new Date(ts * 1000)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
}

const lastEditTime = computed(() =>
  formatTime(props.item.updated_at || props.item.created_at),
)

/** 字符数 → 千字符（对齐原型「17 千字符」） */
const charsK = computed(() => {
  const raw = Number(props.item.character_count) || 0
  return raw >= 1000 ? Math.round(raw / 1000) : raw
})
</script>

<template>
  <div class="space-card" @click="emit('settings', item)">
    <!-- 卡片头部 -->
    <div class="card-head">
      <img :src="item.icon" :alt="item.name" class="card-icon" />
      <div class="card-title-wrap">
        <span class="card-title">{{ item.name }}</span>
        <div class="card-model-info">
          {{ item.document_count }} 文档 · {{ charsK }} 千字符 ·
          {{ item.related_app_count }} 关联应用
        </div>
      </div>
      <!-- 右上角操作菜单（常驻显示） -->
      <Dropdown class="card-actions" trigger="click" @select="handleAction">
        <div class="more-btn" @click.stop>
          <icon-more :size="16" />
        </div>
        <template #content>
          <a-doption value="settings">设置</a-doption>
          <a-doption value="edit">编辑</a-doption>
          <a-doption value="delete" class="opt-delete">删除</a-doption>
        </template>
      </Dropdown>
    </div>

    <div class="card-desc">{{ item.description || '暂无描述' }}</div>
    <div class="card-divider"></div>

    <div class="card-foot">
      <a-avatar :size="18" class="foot-avatar">
        <icon-user :size="10" />
      </a-avatar>
      <span class="foot-meta">最近编辑 {{ lastEditTime }}</span>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .space-card {
    @apply relative flex flex-col bg-white rounded-[8px] border border-[#eef0f3] p-4 min-h-[210px] cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,20,60,0.06)] hover:translate-y-0.5 hover:border-[#165dff]/20;
  }
  .card-head {
    @apply flex items-start gap-3;
  }
  .card-icon {
    @apply w-11 h-11 rounded-[10px] object-cover shrink-0 bg-[#f7f8fa];
  }
  .card-title-wrap {
    @apply flex-1 min-w-0;
  }
  .card-title {
    @apply block text-[15px] font-semibold text-[#1d2129] truncate leading-5;
  }
  .card-model-info {
    @apply text-[12px] text-[#86909c] mt-1 truncate;
  }
  .card-actions {
    @apply shrink-0;
  }
  /* 右上角「...」按钮：浅灰圆角方块，常驻显示（对齐原型截图） */
  .more-btn {
    @apply w-8 h-8 rounded-[6px] bg-[#f2f3f5] flex items-center justify-center
           text-[#4e5969] text-[18px] cursor-pointer transition-colors
           hover:bg-[#e5e6eb] hover:text-[#1d2129];
  }
  .card-desc {
    @apply mt-3 text-[13px] text-[#4e5969] leading-[20px] overflow-hidden;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  .card-divider {
    @apply mt-4 mb-3 border-t border-[#f2f3f5];
  }
  .card-foot {
    @apply flex items-center gap-1.5 text-[12px] text-[#86909c] mt-auto;
  }
  .foot-avatar {
    @apply bg-[#165dff] text-white shrink-0;
  }
  .foot-meta {
    @apply truncate;
  }
}

.opt-delete :deep(.arco-dropdown-option) {
  @apply text-[#f53f3f];
}
</style>
