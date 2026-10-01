<script setup lang="ts">
/** 知识库检索节点 */
import { computed } from 'vue'
import NodeCard from './NodeCard.vue'

const props = defineProps<{
  data: import('../../types').WorkflowNodeData
  selected?: boolean
}>()
defineEmits<{ (e: 'click'): void }>()

/** 关联知识库列表（兼容 knowledgeBases / datasets 两种字段） */
const knowledgeBases = computed(() => {
  const list = (props.data.knowledgeBases ?? (props.data as any).datasets ?? []) as Array<{
    id: string
    name: string
  }>
  return list
})
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')">
    <template #extra>
      <div
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 text-[12px] font-medium text-[#4e5969]">关联知识库</div>
        <!-- 知识库列表：图标 + 名称 -->
        <div v-if="knowledgeBases.length" class="flex flex-col gap-1">
          <div
            v-for="kb in knowledgeBases"
            :key="kb.id"
            class="flex items-center gap-1.5 text-[12px] text-[#4e5969]"
          >
            <img
              v-if="kb.icon"
              :src="kb.icon"
              :alt="kb.name"
              class="h-3.5 w-3.5 shrink-0 rounded-sm object-cover"
            />
            <icon-book v-else :size="12" class="shrink-0 text-[#722ed1]" />
            <span class="truncate">{{ kb.name }}</span>
          </div>
        </div>
        <!-- 空列表：显示短横杠避免大面积留白 -->
        <div v-else class="text-[12px] text-[#86909c]">—</div>
      </div>
    </template>
  </NodeCard>
</template>
