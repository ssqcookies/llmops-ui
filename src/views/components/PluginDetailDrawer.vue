<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PluginDetail, ToolParam } from '@/models/plugin'

const props = defineProps<{
  /** 抽屉显示控制（v-model:visible） */
  visible: boolean
  /** 当前插件详情数据（懒加载：点击卡片→请求→赋值） */
  detail: PluginDetail | null
  /** 详情 loading（懒加载时显示骨架/空状态提示） */
  loading?: boolean
  /** 是否展示编辑按钮（个人空间插件 tab 需要） */
  editable?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'edit'): void
}>()

/** 当前已展开参数的工具ID集合（卡片默认折叠，点击切换） */
const expandedToolIds = ref<Set<string>>(new Set())

/** 切换插件详情时重置展开状态 */
watch(
  () => props.detail?.pluginId,
  () => {
    expandedToolIds.value = new Set()
  },
)

/** Arco Drawer 点 X / 遮罩 / ESC 均触发 cancel，受控模式下需手动回写 visible */
const handleClose = () => {
  emit('update:visible', false)
}

const handleEdit = () => {
  emit('edit')
}

/** 切换工具卡片展开/折叠 */
const toggleTool = (toolId: string) => {
  const next = new Set(expandedToolIds.value)
  if (next.has(toolId)) {
    next.delete(toolId)
  } else {
    next.add(toolId)
  }
  expandedToolIds.value = next
}

const isExpanded = (toolId: string) => expandedToolIds.value.has(toolId)

/** 必填参数判断 */
const isRequired = (p: ToolParam) => !!p.required

/** 工具数量文本 */
const toolCountText = computed(() => {
  const n = props.detail?.toolCount ?? 0
  return `包含 ${n} 个工具`
})
</script>

<template>
  <a-drawer
    :visible="visible"
    title="工具详情"
    :width="520"
    :footer="false"
    :mask-closable="true"
    @cancel="handleClose"
  >
    <!-- 骨架/空态：未加载 -->
    <a-spin
      v-if="loading && !detail"
      :loading="true"
      class="flex items-center justify-center h-[300px] w-full"
      tip="加载详情中..."
    />

    <!-- 详情主体 -->
    <div v-else-if="detail" class="flex flex-col gap-5 h-full w-full">
      <!-- 1. 头部：图标 + 插件名 + 提供商 + 工具数 -->
      <div class="flex items-start gap-4">
        <div class="shrink-0 w-[52px] h-[52px] drawer-icon rounded-[10px] overflow-hidden">
          <img
            :src="detail.icon"
            :alt="detail.name"
            class="w-full h-full object-cover"
          >
        </div>
        <div class="flex flex-col gap-1.5 min-w-0 flex-1">
          <h3 class="drawer-plugin-name">{{ detail.name }}</h3>
          <div class="drawer-provider-row">
            <span>提供商 {{ detail.provider }}</span>
            <span class="drawer-dot" />
            <span>{{ detail.toolCount }} 插件</span>
          </div>
        </div>
      </div>

      <!-- 2. 插件描述区（不截断多行） -->
      <p class="drawer-desc-text">{{ detail.description }}</p>

      <!-- 编辑按钮（仅 editable 模式：个人空间插件 tab） -->
      <a-button
        v-if="editable"
        type="outline"
        size="large"
        class="edit-btn"
        @click="handleEdit"
      >
        <template #icon><icon-settings /></template>
        编辑
      </a-button>

      <!-- 3. 工具列表区 -->
      <div class="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
        <span class="tool-list-title">{{ toolCountText }}</span>

        <div
          v-for="tool in detail.tools"
          :key="tool.toolId"
          class="tool-card"
          :class="{ 'tool-card-expanded': isExpanded(tool.toolId) }"
          @click="toggleTool(tool.toolId)"
        >
          <!-- 卡片头部：名称 + 描述（常驻） -->
          <div class="flex flex-col gap-1.5">
            <h4 class="tool-card-name">{{ tool.name }}</h4>
            <p class="tool-card-desc">{{ tool.description }}</p>
          </div>

          <!-- 参数列表（点击卡片展开后显示） -->
          <div
            v-if="isExpanded(tool.toolId) && tool.params && tool.params.length"
            class="tool-params"
            @click.stop
          >
            <div class="tool-param-header">
              <span>参数</span>
              <span class="tool-param-divider" />
            </div>
            <div
              v-for="p in tool.params"
              :key="p.name"
              class="tool-param-row"
            >
              <div class="flex items-center gap-2 flex-wrap">
                <span class="tool-param-name">{{ p.name }}</span>
                <a-tag
                  size="small"
                  color="gray"
                  :bordered="false"
                  class="tool-param-type"
                >
                  {{ p.type }}
                </a-tag>
                <a-tag
                  v-if="isRequired(p)"
                  size="small"
                  color="red"
                  :bordered="false"
                  class="tool-param-required"
                >
                  必填
                </a-tag>
              </div>
              <p
                v-if="p.description"
                class="tool-param-desc"
              >
                {{ p.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 无详情（异常占位） -->
    <a-empty
      v-else
      class="mt-10"
      description="暂无插件详情"
    />
  </a-drawer>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .drawer-icon {
    @apply bg-[#f7f8fa] border border-[#eef0f3];
  }
  .drawer-plugin-name {
    @apply text-[17px] font-semibold text-[#1d2129] leading-6 m-0;
  }
  .drawer-provider-row {
    @apply flex items-center gap-2 text-[12px] text-[#86909c] leading-5;
  }
  .drawer-dot {
    @apply w-[3px] h-[3px] rounded-full bg-[#c9cdd4] inline-block;
  }
  .drawer-desc-text {
    @apply text-[13px] text-[#4e5969] leading-[1.75] whitespace-pre-wrap m-0
           pb-5 border-b border-[#eef0f3];
  }
  .edit-btn {
    @apply w-full rounded-[6px] h-[38px];
  }
  .edit-btn :deep(.arco-btn) {
    @apply w-full border border-[#e5e6eb] text-[#1d2129] bg-white hover:bg-[#f2f3f5];
  }

  .tool-list-title {
    @apply text-[13px] text-[#86909c] leading-5;
  }
  .tool-card {
    @apply bg-white rounded-[10px] border border-[#e5e6eb] p-4
           cursor-pointer transition-colors
           hover:border-[#165dff];
  }
  .tool-card-expanded {
    @apply border-[#165dff];
  }
  .tool-card-name {
    @apply text-[15px] font-semibold text-[#1d2129] leading-6 m-0;
  }
  .tool-card-desc {
    @apply text-[13px] text-[#4e5969] leading-[1.7] m-0;
  }
  .tool-params {
    @apply mt-3 pt-1;
  }
  .tool-param-header {
    @apply flex items-center gap-2 mb-1.5;
  }
  .tool-param-header > span:first-child {
    @apply text-[12px] text-[#86909c];
  }
  .tool-param-divider {
    @apply flex-1 h-px bg-[#eef0f3] inline-block;
  }
  .tool-param-row {
    @apply flex flex-col gap-0.5 py-1.5;
  }
  .tool-param-name {
    @apply text-[13px] text-[#1d2129] font-medium;
  }
  .tool-param-type {
    @apply text-[12px] !px-2 !py-0;
  }
  .tool-param-required {
    @apply text-[12px] !px-2 !py-0;
  }
  .tool-param-desc {
    @apply pl-0 text-[12px] text-[#86909c] leading-[1.6] m-0;
  }
}
</style>
