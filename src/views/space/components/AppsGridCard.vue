<script setup lang="ts">
import { Dropdown, Modal } from '@arco-design/web-vue'
import type { AppCard, AppCardAction } from '@/models/personalSpace'

const props = defineProps<{
  item: AppCard
}>()

const emit = defineEmits<{
  analyze: [item: AppCard]
  edit: [item: AppCard]
  copy: [item: AppCard]
  delete: [item: AppCard]
}>()

const handleAction = (actionKey: string | number | Record<string, any> | undefined) => {
  if (!actionKey || typeof actionKey !== 'string') return
  const key = actionKey as AppCardAction
  if (key === 'delete') {
    Modal.warning({
      title: '要删除该应用吗？',
      content: '删除后，已发布的 WebApp、开放 API 等将无法使用，且无法恢复。如需临时关闭，请使用禁用功能。',
      hideCancel: false,
      cancelText: '取消',
      okText: '确认',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        emit('delete', props.item)
      },
    })
    return
  }
  if (key === 'analyze') emit('analyze', props.item)
  if (key === 'edit') emit('edit', props.item)
  if (key === 'copy') emit('copy', props.item)
}

/** 所有者头像首字符 */
const ownerFirstChar = (props.item.owner.name || '?').charAt(0)
</script>

<template>
  <div class="space-card">
    <!-- 卡片头部：图标 + 名称 + 来源标签 + 验证徽章 + 更多操作 -->
    <div class="card-head">
      <img :src="item.icon" alt="app-icon" class="card-icon" />
      <div class="card-title-wrap">
        <div class="card-title-row">
          <span class="card-title">{{ item.name }}</span>
          <!-- 来源标签：广场应用显示，个人创建不显示 -->
          <span v-if="item.source === 'builtin'" class="source-tag">广场</span>
          <icon-check-circle-fill v-if="item.verified" class="verified-icon" />
        </div>
        <div class="card-model-info">{{ item.modelInfo }}</div>
      </div>
      <Dropdown class="card-actions" trigger="click" @select="handleAction">
        <div class="more-btn" @click.stop>
          <icon-more :size="16" />
        </div>
        <template #content>
          <a-doption value="analyze">分析</a-doption>
          <a-doption value="edit">编辑应用</a-doption>
          <a-doption value="copy">创建副本</a-doption>
          <a-doption value="delete" class="opt-delete">删除</a-doption>
        </template>
      </Dropdown>
    </div>

    <!-- 描述：2行截断 -->
    <div class="card-desc">{{ item.description }}</div>

    <!-- 分割线 -->
    <div class="card-divider"></div>

    <!-- 底部信息行 -->
    <div class="card-foot">
      <a-avatar :size="14" class="owner-avatar">
        <img v-if="item.owner.avatar" :src="item.owner.avatar" alt="owner" />
        <span v-else>{{ ownerFirstChar }}</span>
      </a-avatar>
      <span class="owner-name">{{ item.owner.name }}</span>
      <span class="foot-dot">·</span>
      <span class="foot-meta">最近编辑 {{ item.lastEditTime }}</span>
    </div>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

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
  .card-title-row {
    @apply flex items-center gap-1.5 truncate;
  }
  .card-title {
    @apply text-[15px] font-semibold text-[#1d2129] truncate;
  }
  /* 来源标签：广场应用 */
  .source-tag {
    @apply shrink-0 px-1.5 py-0 rounded-[4px] text-[11px] font-medium
           bg-[#f2f3f5] text-[#4e5969] leading-[16px];
  }
  .verified-icon {
    @apply text-[#00b42a] text-[14px] shrink-0;
  }
  .card-model-info {
    @apply text-[12px] text-[#86909c] mt-1 truncate;
  }
  .card-actions {
    @apply shrink-0;
  }
  /* 右上角「...」按钮：灰底圆角方块，常驻显示（对齐 KnowledgeGridCard 风格） */
  .more-btn {
    @apply w-8 h-8 rounded-[6px] bg-[#f2f3f5] flex items-center justify-center
           text-[#4e5969] cursor-pointer transition-colors
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
  .owner-avatar {
    @apply bg-[#165dff] text-white text-[10px] font-medium;
  }
  .owner-name {
    @apply text-[#165dff] truncate;
  }
  .foot-dot {
    @apply text-[#c9cdd4] mx-0.5;
  }
  .foot-meta {
    @apply truncate;
  }
}

.opt-delete :deep(.arco-dropdown-option) {
  @apply text-[#f53f3f];
}
</style>
