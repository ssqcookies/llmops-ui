<script setup lang="ts">
/** 大模型节点：卡片显示已选模型 + 提示词 */
import { computed } from 'vue'
import NodeCard from './NodeCard.vue'
import type { WorkflowNodeData } from '../../types'

const props = defineProps<{ data: WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()

/** 已选模型名 */
const modelName = computed(() => props.data.model_config?.model || props.data.model || '')
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')">
    <template #extra>
      <!-- 语言模型配置 -->
      <div
        v-if="modelName"
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 text-[12px] font-medium text-[#4e5969]">语言模型配置</div>
        <div class="flex items-center gap-1.5">
          <div class="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-white">
            <icon-robot :size="11" class="text-[#86909c]" />
          </div>
          <span class="truncate text-[12px] text-[#4e5969]">{{ modelName }}</span>
        </div>
      </div>
      <!-- 提示词 -->
      <div
        v-if="data.prompt"
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 text-[12px] font-medium text-[#4e5969]">提示词</div>
        <div class="text-[12px] leading-relaxed text-[#4e5969] line-clamp-3">
          {{ data.prompt }}
        </div>
      </div>
    </template>
  </NodeCard>
</template>
