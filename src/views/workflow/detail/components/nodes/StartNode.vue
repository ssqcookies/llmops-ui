<script setup lang="ts">
/** 开始节点 */
import NodeCard from './NodeCard.vue'
defineProps<{ data: import('../../types').WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-source="true" @click="$emit('click')" />
</template>
