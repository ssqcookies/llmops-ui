<script setup lang="ts">
/** Python 代码执行节点 */
import NodeCard from './NodeCard.vue'
defineProps<{ data: import('../../types').WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" :show-source="true" @click="$emit('click')" />
</template>
