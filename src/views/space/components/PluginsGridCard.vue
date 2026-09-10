<script setup lang="ts">
import { Dropdown, Modal, Message } from '@arco-design/web-vue'
import type { PluginSpaceCard, PluginCardAction } from '@/models/personalSpace'

const props = defineProps<{
  item: PluginSpaceCard
}>()

const emit = defineEmits<{
  settings: [item: PluginSpaceCard]
  delete: [item: PluginSpaceCard]
  click: [item: PluginSpaceCard]
}>()

const handleAction = (actionKey: string | number | Record<string, any> | undefined) => {
  if (!actionKey || typeof actionKey !== 'string') return
  const key = actionKey as PluginCardAction
  if (key === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: '确认删除该条数据？删除后数据不可恢复',
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { status: 'danger' },
      onOk: () => {
        emit('delete', props.item)
        Message.success('删除成功')
      },
    })
    return
  }
  if (key === 'settings') emit('settings', props.item)
}

const ownerFirstChar = (props.item.owner.name || '?').charAt(0)
</script>

<template>
  <div class="space-card" @click="emit('click', props.item)">
    <!-- 卡片头部 -->
    <div class="card-head">
      <img :src="item.icon" alt="plugin-icon" class="card-icon" />
      <div class="card-title-wrap">
        <div class="card-title-row">
          <span class="card-title">{{ item.name }}</span>
          <icon-check-circle-fill v-if="item.verified" class="verified-icon" />
        </div>
        <div class="card-model-info">提供商 {{ item.provider }} · {{ item.toolCount }}插件</div>
      </div>
      <Dropdown class="card-actions" @select="handleAction">
        <a-button type="text" class="more-btn" @click.stop>
          <icon-more />
        </a-button>
        <template #content>
          <a-doption value="settings">设置</a-doption>
          <a-doption value="delete" class="opt-delete">删除</a-doption>
        </template>
      </Dropdown>
    </div>

    <div class="card-desc">{{ item.description }}</div>
    <div class="card-divider"></div>

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
    @apply w-11 h-11 rounded-[10px] object-cover shrink-0;
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
  .verified-icon {
    @apply text-[#00b42a] text-[14px] shrink-0;
  }
  .card-model-info {
    @apply text-[12px] text-[#86909c] mt-1 truncate;
  }
  .card-actions {
    @apply shrink-0 -mr-1 -mt-1;
  }
  .more-btn {
    @apply h-7 w-7 flex items-center justify-center text-[#86909c] hover:text-[#1d2129];
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
