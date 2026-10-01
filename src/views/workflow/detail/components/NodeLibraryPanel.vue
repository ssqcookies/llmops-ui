<script setup lang="ts">
/** 节点库面板：展示 8 种可添加的节点类型，支持拖拽到画布 */
import { NODE_META, NODE_TYPES } from '../node-config'
import type { WorkflowNodeType } from '../types'

const emit = defineEmits<{
  /** 拖拽开始：传递节点类型 */
  (e: 'dragStart', type: WorkflowNodeType): void
  /** 点击添加节点 */
  (e: 'add', type: WorkflowNodeType): void
}>()

/** 拖拽开始：设置拖拽数据 */
const handleDragStart = (e: DragEvent, type: WorkflowNodeType) => {
  e.dataTransfer?.setData('application/vueflow', type)
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragStart', type)
}
</script>

<template>
  <div class="w-[260px] rounded-lg border border-[#e5e6eb] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
    <div class="flex flex-col">
      <div
        v-for="type in NODE_TYPES"
        :key="type"
        class="flex cursor-grab items-start gap-2.5 border-b border-[#f2f3f5] px-3 py-2.5 last:border-b-0 transition-colors hover:bg-[#f7f8fa] active:cursor-grabbing"
        draggable="true"
        @dragstart="handleDragStart($event, type)"
        @click="emit('add', type)"
      >
        <div
          class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
          :style="{ backgroundColor: NODE_META[type].color }"
        >
          <component :is="NODE_META[type].icon" :size="15" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[13px] font-medium text-[#1d2129]">{{ NODE_META[type].label }}节点</div>
          <div class="mt-0.5 text-[11px] leading-relaxed text-[#86909c]">
            {{ NODE_META[type].description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
