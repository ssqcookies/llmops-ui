<script setup lang="ts">
import { ref } from 'vue'
import type { CollapseGroup } from '../types'

const props = defineProps<{
  groups: CollapseGroup[]
}>()

const emit = defineEmits<{
  (e: 'add', key: string): void
}>()

const expandedKeys = ref<Set<string>>(new Set())

const isExpanded = (group: CollapseGroup) => {
  if (group.collapsible === false) return true
  if (expandedKeys.value.has(group.key)) return true
  if (group.defaultExpand !== undefined) return group.defaultExpand
  return true
}

const toggleExpand = (group: CollapseGroup) => {
  if (group.collapsible === false) return
  if (expandedKeys.value.has(group.key)) {
    expandedKeys.value.delete(group.key)
  } else {
    expandedKeys.value.add(group.key)
  }
}

const handleAdd = (key: string) => {
  emit('add', key)
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="group in props.groups"
      :key="group.key"
      class="collapse-card"
    >
      <div class="flex items-start justify-between px-4 py-3 border-b border-gray-100">
        <div class="flex items-start gap-2 flex-1">
          <a-button
            v-if="group.collapsible !== false"
            type="text"
            shape="circle"
            size="small"
            class="mt-0.5"
            @click="toggleExpand(group)"
          >
            <template #icon>
              <icon-menu-unfold v-if="isExpanded(group)" :size="16" />
              <icon-menu-fold v-else :size="16" />
            </template>
          </a-button>
          <div v-else class="w-6 h-6" />
          <div class="flex flex-col">
            <span class="font-medium text-gray-900 text-sm">{{ group.title }}</span>
            <span
              v-if="group.description"
              class="text-xs text-gray-500 mt-0.5"
            >
              {{ group.description }}
            </span>
          </div>
        </div>
        <a-button
          v-if="group.showAdd"
          type="text"
          size="small"
          :disabled="group.addDisabled"
          @click="handleAdd(group.key)"
        >
          <template #icon>
            <icon-plus :size="14" />
          </template>
        </a-button>
      </div>
      <div
        v-show="isExpanded(group)"
        class="px-4 py-3"
      >
        <slot :name="group.key" :group="group" />
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.collapse-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden;
}
</style>
