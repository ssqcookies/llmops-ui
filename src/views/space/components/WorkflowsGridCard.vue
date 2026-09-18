<script setup lang="ts">
import { ref } from 'vue'
import { Dropdown, Modal, Message } from '@arco-design/web-vue'
import type { WorkflowCard } from '@/models/personalSpace'

const props = defineProps<{
  item: WorkflowCard
}>()

const emit = defineEmits<{
  edit: [item: WorkflowCard]
  delete: [item: WorkflowCard]
}>()

/** 菜单开关（用于 stopPropagation 阻止卡片 click） */
const menuVisible = ref(false)

const ownerFirstChar = (props.item.owner.name || '?').charAt(0)

const handleEdit = () => {
  menuVisible.value = false
  emit('edit', props.item)
}

const handleDelete = () => {
  menuVisible.value = false
  Modal.confirm({
    title: '要删除该工作流？',
    content:
      '删除工作流后，发布的WebApp、开放API以及关联的社交媒体平台无法使用该工作流，如需暂停使用工作流，可使用取消发布功能。',
    okText: '确认',
    cancelText: '取消',
    onOk: () => {
      emit('delete', props.item)
    },
  })
}
</script>

<template>
  <div
    class="relative flex flex-col bg-white rounded-[8px] border border-[#eef0f3] p-4 min-h-[210px] cursor-pointer transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,20,60,0.06)] hover:translate-y-0.5 hover:border-[#165dff]/20"
  >
    <!-- 卡片头部：图标 + 标题 + 更多菜单 -->
    <div class="flex items-start gap-3">
      <img
        :src="item.icon"
        :alt="item.name"
        class="w-11 h-11 rounded-[10px] object-cover shrink-0"
      />
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5 truncate">
          <span class="text-[15px] font-semibold text-[#1d2129] truncate">{{ item.name }}</span>
          <!-- 状态标签：已发布=绿色，草稿=灰色 -->
          <a-tag
            v-if="item.status === 'published'"
            size="small"
            color="green"
            class="shrink-0 !rounded-[4px] !text-[11px] !leading-[16px]"
          >
            已发布
          </a-tag>
          <a-tag
            v-else
            size="small"
            color="gray"
            class="shrink-0 !rounded-[4px] !text-[11px] !leading-[16px]"
          >
            草稿
          </a-tag>
        </div>
        <div class="text-[12px] text-[#86909c] mt-1 truncate">
          {{ item.workflowName }} · {{ item.nodeCount }} 节点
        </div>
      </div>
      <Dropdown
        v-model:popup-visible="menuVisible"
        trigger="click"
        class="shrink-0 -mr-1 -mt-1"
        @click.stop
      >
        <a-button type="text" class="h-7 w-7 flex items-center justify-center text-[#86909c] hover:text-[#1d2129] !p-0">
          <icon-more />
        </a-button>
        <template #content>
          <a-doption @click="handleEdit">编辑工作流</a-doption>
          <a-doption class="text-[#f53f3f]" @click="handleDelete">删除</a-doption>
        </template>
      </Dropdown>
    </div>

    <!-- 描述（2 行截断） -->
    <div
      class="mt-3 text-[13px] text-[#4e5969] leading-[20px] overflow-hidden"
      style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;"
    >
      {{ item.description }}
    </div>

    <!-- 分割线 -->
    <div class="mt-4 mb-3 border-t border-[#f2f3f5]" />

    <!-- 卡片底部：owner 头像 + 名称 + 最近编辑时间 -->
    <div class="flex items-center gap-1.5 text-[12px] text-[#86909c] mt-auto">
      <a-avatar :size="14" class="bg-[#165dff] text-white text-[10px] font-medium">
        <img v-if="item.owner.avatar" :src="item.owner.avatar" alt="owner" />
        <span v-else>{{ ownerFirstChar }}</span>
      </a-avatar>
      <span class="text-[#165dff] truncate">{{ item.owner.name }}</span>
      <span class="text-[#c9cdd4] mx-0.5">·</span>
      <span class="truncate">最近编辑 {{ item.lastEditTime }}</span>
    </div>
  </div>
</template>
