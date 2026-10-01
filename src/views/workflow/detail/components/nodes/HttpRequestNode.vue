<script setup lang="ts">
/** HTTP 请求节点 */
import NodeCard from './NodeCard.vue'
import type { WorkflowNodeData } from '../../types'

defineProps<{ data: WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')">
    <!-- 基本信息：方法徽标 + 请求地址 -->
    <template #extra>
      <div class="mt-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]">
        <div class="flex items-center gap-1.5">
          <span
            class="shrink-0 rounded bg-[#165dff] px-1.5 py-0.5 text-[10px] font-semibold leading-tight text-white"
          >
            {{ data.method || 'GET' }}
          </span>
          <span
            class="min-w-0 flex-1 truncate text-[11px] text-[#4e5969]"
            :title="data.url"
          >
            {{ data.url || '未配置请求地址' }}
          </span>
        </div>
      </div>
    </template>
  </NodeCard>
</template>
