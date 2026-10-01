<script setup lang="ts">
/** 扩展插件节点：卡片展示已绑定插件 */
import { computed } from 'vue'
import NodeCard from './NodeCard.vue'
import type { WorkflowNodeData } from '../../types'

const props = defineProps<{ data: WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()

/** 已绑定插件信息 */
const plugin = computed(() => ({
  id: (props.data as Record<string, any>).pluginId ?? '',
  name: (props.data as Record<string, any>).pluginName ?? '',
  icon: (props.data as Record<string, any>).pluginIcon ?? '',
}))
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')">
    <template #extra>
      <div
        v-if="plugin.id"
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 text-[12px] font-medium text-[#4e5969]">已绑定插件</div>
        <div class="flex items-center gap-1.5">
          <div class="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden rounded">
            <img v-if="plugin.icon" :src="plugin.icon" :alt="plugin.name" class="h-full w-full object-cover" />
            <icon-apps v-else :size="12" class="text-[#86909c]" />
          </div>
          <span class="truncate text-[12px] text-[#4e5969]">{{ plugin.name }}</span>
        </div>
      </div>
    </template>
  </NodeCard>
</template>
