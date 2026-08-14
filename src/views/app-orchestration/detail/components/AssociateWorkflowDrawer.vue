<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WorkflowItem } from '../types'

const props = defineProps<{
  visible: boolean
  selectedIds: string[]
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  confirm: [ids: string[]]
}>()

const searchKeyword = ref('')
const innerSelectedIds = ref<string[]>([])

const mockWorkflows: WorkflowItem[] = [
  { id: 'wf-1', name: '客户服务流程', description: '处理客户咨询、投诉和售后问题的完整流程' },
  { id: 'wf-2', name: '订单处理流程', description: '从下单到发货的全链路订单管理流程' },
  { id: 'wf-3', name: '数据分析流程', description: '自动收集数据、生成报告并推送通知' },
  { id: 'wf-4', name: '内容审核流程', description: '对用户生成内容进行自动审核和过滤' },
  { id: 'wf-5', name: '营销活动流程', description: '自动化营销活动创建、执行和效果追踪' },
  { id: 'wf-6', name: '合同审批流程', description: '合同起草、审核、签署的全流程管理' },
  { id: 'wf-7', name: '入职流程', description: '新员工入职手续办理和培训安排' },
  { id: 'wf-8', name: '报销审批流程', description: '员工报销申请提交、审核和打款流程' },
]

watch(
  () => props.visible,
  (val) => {
    if (val) {
      searchKeyword.value = ''
      innerSelectedIds.value = [...props.selectedIds]
    }
  },
)

const filteredWorkflows = computed(() => {
  if (!searchKeyword.value) return mockWorkflows
  const kw = searchKeyword.value.toLowerCase()
  return mockWorkflows.filter(
    (w) =>
      w.name.toLowerCase().includes(kw) ||
      w.description.toLowerCase().includes(kw),
  )
})

const isSelected = (id: string) => innerSelectedIds.value.includes(id)

const toggleSelect = (id: string) => {
  const idx = innerSelectedIds.value.indexOf(id)
  if (idx > -1) {
    innerSelectedIds.value.splice(idx, 1)
  } else {
    innerSelectedIds.value.push(id)
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleConfirm = () => {
  emit('confirm', [...innerSelectedIds.value])
  handleClose()
}
</script>

<template>
  <a-drawer
    :visible="visible"
    title="选择关联工作流"
    placement="right"
    :width="560"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <div class="flex flex-col h-full">
      <div class="px-6 py-4 border-b border-gray-200">
        <a-input-search v-model="searchKeyword" placeholder="搜索工作流名称或描述" allow-clear />
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div
          v-for="wf in filteredWorkflows"
          :key="wf.id"
          class="flex items-start gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-all"
          :class="isSelected(wf.id) ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'"
          @click="toggleSelect(wf.id)"
        >
          <a-checkbox
            :checked="isSelected(wf.id)"
            @click.stop
            @change="toggleSelect(wf.id)"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">{{ wf.name }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ wf.description }}</div>
          </div>
        </div>

        <a-empty v-if="filteredWorkflows.length === 0" description="未找到匹配的工作流" />
      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          <span class="text-blue-600 font-medium">{{ innerSelectedIds.length }}</span>
          个工作流被选中
        </div>
        <div class="flex gap-3">
          <a-button @click="handleClose">取消</a-button>
          <a-button type="primary" @click="handleConfirm">添加</a-button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>