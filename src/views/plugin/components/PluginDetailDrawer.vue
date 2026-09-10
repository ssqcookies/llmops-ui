<script setup lang="ts">
import { computed, watch } from 'vue'
import type { PluginDetail, ToolParam } from '@/models/plugin'

const props = defineProps<{
  /** 抽屉显示控制（v-model:visible） */
  visible: boolean
  /** 当前插件详情数据（懒加载：点击卡片→请求→赋值） */
  detail: PluginDetail | null
  /** 详情 loading（懒加载时显示骨架/空状态提示） */
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'close'): void
}>()

/** 打开状态变更 → 懒加载后销毁内部状态按project-baseline由父组件控制数据，此处仅渲染 */
watch(
  () => props.visible,
  (val) => {
    if (!val) {
      emit('close')
    }
  },
)

const handleClose = () => {
  emit('update:visible', false)
}

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
    @before-close="handleClose"
  >
    <!-- 骨架/空态：未加载 -->
    <a-spin
      v-if="loading && !detail"
      :loading="true"
      class="flex items-center justify-center h-[300px] w-full"
      tip="加载详情中..."
    />

    <!-- 详情主体 -->
    <div v-else-if="detail" class="flex flex-col gap-6 h-full w-full">
      <!-- 1. 头部：图标 + 插件名 + 提供商 + 工具数 -->
      <div class="flex items-start gap-4 pb-4 border-b border-[#eef0f3]">
        <div class="shrink-0 w-[52px] h-[52px] drawer-icon rounded-[10px] overflow-hidden">
          <img
            :src="detail.icon"
            :alt="detail.name"
            class="w-full h-full object-cover"
          />
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
      <div class="flex flex-col gap-2">
        <p class="drawer-desc-text">{{ detail.description }}</p>

        <!-- 使用限制提示（特殊样式标注） -->
        <a-alert
          v-if="detail.usageWarning && detail.usageWarning.length"
          type="warning"
          :show-icon="true"
          class="mt-1"
        >
          <template #content>{{ detail.usageWarning }}</template>
        </a-alert>
      </div>

      <!-- 3. 工具列表区 -->
      <div class="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1 scrollbar-w-none">
        <span class="tool-list-title">{{ toolCountText }}</span>

        <div class="flex flex-col gap-3">
          <div
            v-for="tool in detail.tools"
            :key="tool.toolId"
            class="tool-card"
          >
            <div class="flex flex-col gap-1.5 mb-2">
              <h4 class="tool-card-name">{{ tool.name }}</h4>
              <p class="tool-card-desc">{{ tool.description }}</p>
            </div>

            <!-- 参数列表（仅当有参数时显示） -->
            <div v-if="tool.params && tool.params.length" class="flex flex-col gap-0">
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
                    color="grey"
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
    @apply text-[13px] text-[#4e5969] leading-[1.75] whitespace-pre-wrap m-0;
  }

  .tool-list-title {
    @apply text-[12px] text-[#4e5969] font-medium leading-5;
  }
  .tool-card {
    @apply bg-[#fafbfc] rounded-[10px] border border-[#eef0f3] p-4;
  }
  .tool-card-name {
    @apply text-[14px] font-semibold text-[#1d2129] leading-5 m-0;
  }
  .tool-card-desc {
    @apply text-[12px] text-[#4e5969] leading-[1.7] m-0;
  }
  .tool-param-header {
    @apply flex items-center gap-2 mt-2 mb-1.5;
  }
  .tool-param-header > span:first-child {
    @apply text-[11px] text-[#86909c] font-medium;
  }
  .tool-param-divider {
    @apply flex-1 h-px bg-[#eef0f3] inline-block;
  }
  .tool-param-row {
    @apply flex flex-col gap-0.5 py-1.5;
  }
  .tool-param-name {
    @apply text-[12px] text-[#1d2129] font-medium;
  }
  .tool-param-type {
    @apply text-[11px] rounded-[10px] !px-2 !py-0;
  }
  .tool-param-required {
    @apply text-[11px] rounded-[10px] !px-2 !py-0;
  }
  .tool-param-desc {
    @apply pl-0 text-[12px] text-[#86909c] leading-[1.6] m-0;
  }
}
</style>
