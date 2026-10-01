<script setup lang="ts">
/**
 * 紧凑参数行列表（HTTP 节点 HEADERS / PARAMS / BODY 复用）
 * 每行：参数名 | 类型（引用/STRING/INT/FLOAT/BOOLEAN）| 值 | 删除
 * 字段对象为父组件响应式数组中的同一引用，内部直接修改即可双向同步
 */
import { computed } from 'vue'
import type { HttpParam } from '../types'

/** 引用字段选项分组（前置节点） */
interface ReferenceGroup {
  nodeId: string
  nodeTitle: string
  fields: { name: string }[]
}

const props = withDefaults(
  defineProps<{
    /** 参数列表（v-model 风格，直接修改对象属性） */
    fields: HttpParam[]
    /** 引用字段分组选项 */
    referenceOptions?: ReferenceGroup[]
    /** 参数名校验错误信息（与行索引对齐，非空时标红） */
    errors?: string[]
    /** 是否显示列标题行 */
    showHeader?: boolean
    /** 参数名是否禁用编辑（如模板转换节点固定 output） */
    nameDisabled?: boolean
    /** 类型是否禁用切换（固定输出节点类型不可修改） */
    typeDisabled?: boolean
    /** 是否隐藏删除按钮（如模板转换节点固定 output 不可删除） */
    hideRemove?: boolean
  }>(),
  {
    referenceOptions: () => [],
    errors: () => [],
    showHeader: true,
    nameDisabled: false,
    typeDisabled: false,
    hideRemove: false,
  },
)

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'remove', idx: number): void
}>()

/** 类型选项：引用 + 4 种字面量类型（对齐 VariableType） */
const typeOptions = [
  { label: '引用', value: 'reference' },
  { label: 'STRING', value: 'string' },
  { label: 'INT', value: 'int' },
  { label: 'FLOAT', value: 'float' },
  { label: 'BOOLEAN', value: 'boolean' },
]

/** 各字面量类型的默认值 */
const getDefaultValue = (type: string): string | number | boolean => {
  if (type === 'int' || type === 'float') return 0
  if (type === 'boolean') return false
  return ''
}

/** 类型切换：引用清空固定值，其他类型填入默认值并清空引用 */
const handleTypeChange = (field: HttpParam, type: unknown) => {
  const t = String(type)
  if (t === 'reference') {
    field.value = ''
  } else {
    field.reference = ''
    field.value = getDefaultValue(t)
  }
}

/** 写入字段值 */
const setValue = (field: HttpParam, val: unknown) => {
  field.value = val as string | number | boolean
}

/** 引用字段下拉数据（分组：标签为 节点标题/字段名，值为 节点ID/字段名） */
const referenceSelectOptions = computed(() =>
  props.referenceOptions.map((g) => ({
    isGroup: true,
    label: g.nodeTitle,
    options: g.fields.map((f) => ({
      label: `${g.nodeTitle}/${f.name}`,
      value: `${g.nodeId}/${f.name}`,
    })),
  })),
)

/** 弹层挂到触发元素父节点，抽屉滚动时跟随 */
const getPopupContainer = (node: HTMLElement) => node.parentElement ?? document.body

const asBool = (field: HttpParam) => Boolean(field.value)
const asNum = (field: HttpParam) => Number(field.value || 0)
const asStr = (field: HttpParam) => {
  const v = field.value
  // 后端嵌套对象 {type,content} 兜底：提取 content 字面量，避免 [object Object]
  if (v && typeof v === 'object') {
    const content = (v as Record<string, any>).content
    return typeof content === 'string' ? content : ''
  }
  return String(v ?? '')
}
</script>

<template>
  <div>
    <!-- 列标题 -->
    <div v-if="showHeader" class="mb-2 flex items-center gap-2 px-0.5 text-[12px] text-[#86909c]">
      <span class="w-[88px] shrink-0">参数名</span>
      <span class="w-[96px] shrink-0">类型</span>
      <span class="min-w-0 flex-1">值</span>
      <span class="w-5 shrink-0"></span>
    </div>

    <div
      v-for="(field, idx) in fields"
      :key="idx"
      class="mb-1.5 flex items-center gap-2 rounded-md border border-transparent px-0.5 py-0.5 hover:border-[#e5e6eb] hover:bg-[#fafbfc]"
    >
      <!-- 参数名 -->
      <div class="w-[88px] shrink-0">
        <a-input
          v-model="field.name"
          size="mini"
          class="w-full"
          placeholder="参数名"
          :error="!!errors[idx]"
          :disabled="nameDisabled"
        />
      </div>

      <!-- 类型 -->
      <div class="w-[96px] shrink-0">
        <a-select
          v-model="field.type"
          size="mini"
          :options="typeOptions"
          class="w-full"
          :disabled="typeDisabled"
          :get-popup-container="getPopupContainer"
          @change="(val) => handleTypeChange(field, val)"
        />
      </div>

      <!-- 值 -->
      <div class="min-w-0 flex-1">
        <a-select
          v-if="field.type === 'reference'"
          v-model="field.reference"
          size="mini"
          class="w-full"
          placeholder="请选择引用字段"
          allow-clear
          :options="referenceSelectOptions"
          :get-popup-container="getPopupContainer"
        >
          <template #empty>
            <div class="flex items-center justify-center gap-1 py-3 text-[12px] text-[#86909c]">
              <icon-info-circle :size="13" />
              <span>暂无可引用字段</span>
            </div>
          </template>
        </a-select>
        <a-switch
          v-else-if="field.type === 'boolean'"
          :model-value="asBool(field)"
          size="small"
          @update:model-value="(val) => setValue(field, val)"
        />
        <a-input-number
          v-else-if="field.type === 'int'"
          :model-value="asNum(field)"
          size="mini"
          :precision="0"
          class="w-full"
          @update:model-value="(val) => setValue(field, val)"
        />
        <a-input-number
          v-else-if="field.type === 'float'"
          :model-value="asNum(field)"
          size="mini"
          :precision="2"
          :step="0.1"
          class="w-full"
          @update:model-value="(val) => setValue(field, val)"
        />
        <a-input
          v-else
          :model-value="asStr(field)"
          size="mini"
          class="w-full"
          placeholder="请输入参数值"
          allow-clear
          @update:model-value="(val) => setValue(field, val)"
        />
      </div>

      <!-- 删除（模板转换节点固定 output 不可删除时隐藏） -->
      <a-button v-if="!hideRemove" type="text" size="mini" class="flex h-5 w-5 shrink-0 items-center justify-center !p-0" @click="emit('remove', idx)">
        <template #icon><icon-minus-circle :size="13" class="text-[#c9cdd4] transition-colors hover:text-[#f53f3f]" /></template>
      </a-button>
      <div v-else class="w-5 shrink-0"></div>
    </div>
  </div>
</template>
