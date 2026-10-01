<script setup lang="ts">
/** 结束节点 */
import NodeCard from './NodeCard.vue'
defineProps<{ data: import('../../types').WorkflowNodeData; selected?: boolean }>()
defineEmits<{ (e: 'click'): void }>()
</script>

<template>
  <NodeCard :data="data" :selected="selected" :show-target="true" @click="$emit('click')" />
</template>
