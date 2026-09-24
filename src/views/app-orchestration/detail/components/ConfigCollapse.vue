<script setup lang="ts">
import { ref } from 'vue'
import type { CollapseGroup } from '../types'

const props = defineProps<{
  groups: CollapseGroup[]
}>()

defineEmits<{
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
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="group in props.groups"
      :key="group.key"
      class="collapse-card"
    >
      <!-- 头部：折叠箭头 + icon + 标题描述 + 右侧自定义内容（开关 / 添加按钮） -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-[#f2f3f5]">
        <div class="flex items-center gap-2.5 flex-1 min-w-0">
          <!-- 折叠箭头 -->
          <a-button
            v-if="group.collapsible !== false"
            type="text"
            shape="circle"
            size="mini"
            class="shrink-0"
            @click="toggleExpand(group)"
          >
            <template #icon>
              <icon-menu-unfold v-if="isExpanded(group)" :size="14" />
              <icon-menu-fold v-else :size="14" />
            </template>
          </a-button>
          <div v-else class="w-6 h-6 shrink-0" />

          <!-- 左侧图标（原型图风格：圆角方块 + 渐变底） -->
          <div
            v-if="group.icon"
            class="w-7 h-7 rounded-[6px] bg-gradient-to-br from-[#3370ff] to-[#165dff] flex items-center justify-center text-white shrink-0"
          >
            <component :is="group.icon" :size="14" />
          </div>

          <!-- 标题 + 描述 -->
          <div class="flex flex-col min-w-0">
            <span class="font-medium text-[#1d2129] text-[14px] truncate">{{ group.title }}</span>
            <span
              v-if="group.description"
              class="text-[12px] text-[#86909c] mt-0.5 truncate"
            >
              {{ group.description }}
            </span>
          </div>
        </div>

        <!-- 右侧自定义内容（开关 select / 添加按钮 / 设置按钮等） -->
        <div class="flex items-center gap-2 shrink-0">
          <slot :name="`header-right-${group.key}`" :group="group" />
          <a-button
            v-if="group.showAdd"
            type="text"
            size="small"
            :disabled="group.addDisabled"
            @click="$emit('add', group.key)"
          >
            <template #icon><icon-plus :size="14" /></template>
          </a-button>
        </div>
      </div>

      <!-- 内容区 -->
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
  @apply bg-white rounded-lg border border-[#f2f3f5] overflow-hidden;
}
</style>
