<script lang="ts" setup>
/** 工作流节点通用卡片主体：图标 + 标题 + 输入字段 + 输出字段 */
import { computed, inject, type ComputedRef } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { WorkflowNodeData, NodeField } from '../../types'

const props = defineProps<{
  data: WorkflowNodeData
  /** 是否显示左侧输入连接点 */
  showTarget?: boolean
  /** 是否显示右侧输出连接点 */
  showSource?: boolean
  /** vue-flow 选中态 */
  selected?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()

/** 引用显示映射：`节点ID/字段名` -> `节点标题/字段名`（由画布页 provide） */
const refDisplayMap = inject<ComputedRef<Record<string, string>>>('refDisplayMap')

/** 类型标签格式化：reference 显示「引用」，其余大写展示（兼容旧数据 String/Number） */
const TYPE_LABELS: Record<string, string> = {
  reference: '引用',
  string: 'String',
  int: 'Int',
  float: 'Float',
  number: 'Number',
  boolean: 'Boolean',
}
const formatType = (type: string) => TYPE_LABELS[String(type).toLowerCase()] ?? type

/**
 * 解析输入字段的展示值与变量引用
 * 优先级：reference > value.content.if_vr_name > value 字符串 > 空
 * 引用实际值以节点ID拼接（防重名），显示时反查为节点标题
 */
const resolveFieldValue = (field: NodeField): { ref: string | null; text: string } => {
  const toDisplay = (raw: string) => refDisplayMap?.value[raw] ?? raw
  if (field.reference) return { ref: toDisplay(field.reference), text: '' }
  const v = field.value
  if (v && typeof v === 'object') {
    const ifVrName = (v as any).content?.if_vr_name
    if (ifVrName) return { ref: toDisplay(String(ifVrName)), text: '' }
    const content = (v as any).content
    if (typeof content === 'string' && content) return { ref: null, text: content }
  }
  if (typeof v === 'string' && v) return { ref: null, text: v }
  return { ref: null, text: '' }
}

/** 调试状态 */
const debugStatus = computed(() => (props.data as Record<string, any>).debugStatus ?? '')
</script>

<template>
  <div
    class="group relative w-[360px] rounded-lg border bg-white transition-all duration-200"
    :class="[
      selected
        ? 'border-[#165dff] shadow-[0_4px_20px_rgba(22,93,255,0.15)]'
        : 'border-[#e5e6eb] hover:border-[#165dff] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.12)]',
      selected ? 'is-selected' : '',
    ]"
  >
    <!-- 左侧输入连接点 -->
    <Handle
      v-if="showTarget"
      type="target"
      :position="Position.Left"
      :is-connectable-start="false"
      :is-connectable-end="true"
      class="node-handle"
      @click.stop
    >
      <icon-plus :size="8" class="handle-icon" />
    </Handle>

    <!-- 节点头部：图标 + 标题 + 调试状态 -->
    <div class="flex items-center gap-2 border-b border-[#f2f3f5] px-3 py-2.5">
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
        :style="{ backgroundColor: data.color }"
      >
        <component :is="data.icon" :size="15" />
      </div>
      <span class="truncate text-[14px] font-medium text-[#1d2129]">{{ data.label }}</span>
      <!-- 调试状态指示 -->
      <div v-if="debugStatus" class="ml-auto flex items-center gap-1">
        <span
          v-if="debugStatus === 'succeeded'"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-[#00b42a] text-white text-[10px]"
        >✓</span>
        <span
          v-else-if="debugStatus === 'failed'"
          class="flex h-4 w-4 items-center justify-center rounded-full bg-[#f53f3f] text-white text-[10px]"
        >✗</span>
        <span
          v-else-if="debugStatus === 'running'"
          class="flex h-4 w-4 items-center justify-center"
        >
          <svg class="animate-spin h-3.5 w-3.5 text-[#165dff]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.2"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          </svg>
        </span>
      </div>
    </div>

    <!-- 节点内容区 -->
    <div class="px-3 py-2">
      <!-- 输入字段：灰底 + 内阴影，与输出区视觉区分 -->
      <div
        v-if="data.inputs?.length"
        class="mb-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <!-- 标题行：输入 | 引用值（开始节点为流程入参定义，无引用值列） -->
        <div class="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-[#4e5969]">
          <icon-down :size="10" />
          <span class="flex-1">输入</span>
          <span v-if="data.nodeType !== 'start'" class="pr-1 font-normal">引用值</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="field in data.inputs"
            :key="field.name"
            class="flex items-center justify-between gap-2 text-[12px]"
          >
            <div class="flex min-w-0 items-center gap-1.5">
              <span class="truncate text-[#1d2129]">{{ field.name }}</span>
              <span v-if="field.required" class="shrink-0 text-[#f53f3f]">*</span>
              <span class="shrink-0 rounded bg-[#e9ebf0] px-1.5 py-0.5 text-[11px] text-[#4e5969]">
                {{ formatType(field.type) }}
              </span>
            </div>
            <!-- 引用值：白框样式（开始节点为流程入参定义，不展示值列） -->
            <span
              v-if="data.nodeType !== 'start' && resolveFieldValue(field).ref"
              class="flex max-w-[170px] shrink-0 items-center gap-1 rounded-md border border-[#e5e6eb] bg-white px-1.5 py-0.5 text-[11px] text-[#4e5969] shadow-sm"
              :title="`引用值：${resolveFieldValue(field).ref}`"
            >
              <icon-link :size="10" class="shrink-0 text-[#86909c]" />
              <span class="truncate">{{ resolveFieldValue(field).ref }}</span>
            </span>
            <!-- 固定值纯文本 -->
            <span
              v-else-if="data.nodeType !== 'start' && resolveFieldValue(field).text"
              class="shrink-0 truncate text-[#4e5969]"
              :title="resolveFieldValue(field).text"
            >
              {{ resolveFieldValue(field).text }}
            </span>
            <span
              v-else-if="data.nodeType !== 'start'"
              class="shrink-0 text-[#86909c]"
            >—</span>
          </div>
        </div>
      </div>

      <!-- 插槽：节点特有内容（如知识库列表、提示词等） -->
      <slot name="extra" />

      <!-- 输出字段：灰底 + 内阴影，与输入区保持一致 -->
      <div
        v-if="data.outputs?.length"
        class="mt-2 rounded-lg bg-[#f5f6f8] p-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)]"
      >
        <div class="mb-1.5 flex items-center gap-1 text-[12px] font-medium text-[#4e5969]">
          <icon-down :size="10" class="rotate-180" />
          <span class="flex-1">输出</span>
          <span v-if="data.nodeType === 'end'" class="pr-1 font-normal">引用值</span>
        </div>
        <div class="flex flex-col gap-1.5">
          <div
            v-for="field in data.outputs"
            :key="field.name"
            class="flex items-center justify-between gap-2 text-[12px]"
          >
            <div class="flex min-w-0 items-center gap-1.5">
              <span class="truncate text-[#1d2129]">{{ field.name }}</span>
              <span class="shrink-0 rounded bg-[#e9ebf0] px-1.5 py-0.5 text-[11px] text-[#4e5969]">
                {{ formatType(field.type) }}
              </span>
            </div>
            <!-- 引用值：结束节点输出参数支持引用上游变量，与输入区展示一致 -->
            <template v-if="data.nodeType === 'end'">
              <span
                v-if="resolveFieldValue(field).ref"
                class="flex max-w-[170px] shrink-0 items-center gap-1 rounded-md border border-[#e5e6eb] bg-white px-1.5 py-0.5 text-[11px] text-[#4e5969] shadow-sm"
                :title="`引用值：${resolveFieldValue(field).ref}`"
              >
                <icon-link :size="10" class="shrink-0 text-[#86909c]" />
                <span class="truncate">{{ resolveFieldValue(field).ref }}</span>
              </span>
              <span
                v-else-if="resolveFieldValue(field).text"
                class="shrink-0 truncate text-[#4e5969]"
                :title="resolveFieldValue(field).text"
              >
                {{ resolveFieldValue(field).text }}
              </span>
              <span v-else class="shrink-0 text-[#86909c]">—</span>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧输出连接点 -->
    <Handle
      v-if="showSource"
      type="source"
      :position="Position.Right"
      :is-connectable-start="true"
      :is-connectable-end="false"
      class="node-handle"
      @click.stop
    >
      <icon-plus :size="8" class="handle-icon" />
    </Handle>
  </div>
</template>

<style scoped>
/* 连接句柄：常驻显示，hover 或选中时高亮 */
.node-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 14px !important;
  width: 14px !important;
  border: 2px solid #fff !important;
  background: #c9cdd4 !important;
  transition: background 0.2s;
}

.group:hover .node-handle,
.group.is-selected .node-handle {
  background: #165dff !important;
}

/* 加号图标：默认深灰，hover/选中变白 */
.handle-icon {
  color: #4e5969;
}

.group:hover .handle-icon,
.group.is-selected .handle-icon {
  color: #fff;
}
</style>
