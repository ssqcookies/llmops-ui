<script setup lang="ts">
/** 模板转换节点 */
import NodeCard from './NodeCard.vue'
defineProps<{ data: import('../../types').WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')">
    <template #extra>
      <div
        v-if="data.template"
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 text-[12px] font-medium text-[#4e5969]">模板内容</div>
        <div class="text-[12px] leading-relaxed text-[#4e5969] line-clamp-3">
          {{ data.template }}
        </div>
      </div>
    </template>
  </NodeCard>
</template>
