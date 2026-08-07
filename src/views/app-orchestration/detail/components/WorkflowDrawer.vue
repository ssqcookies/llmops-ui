<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { WorkflowItem } from '../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const searchKeyword = ref('')

const workflows = reactive<WorkflowItem[]>([
  { workflowId: 'w1', name: '客服问答流程', description: '处理常见客服问题的自动化流程', selected: false },
  { workflowId: 'w2', name: '数据分析流程', description: '数据清洗、分析、可视化流程', selected: false },
  { workflowId: 'w3', name: '合同审核流程', description: '合同条款审核与风险提示', selected: false },
  { workflowId: 'w4', name: '营销活动流程', description: '营销活动策划与执行流程', selected: false },
  { workflowId: 'w5', name: '投诉处理流程', description: '客户投诉接收与处理流程', selected: false },
])

const filteredWorkflows = computed(() => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return workflows
  return workflows.filter(
    (w) => w.name.includes(keyword) || w.description.includes(keyword)
  )
})

const selectedCount = computed(() => workflows.filter((w) => w.selected).length)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      searchKeyword.value = ''
      workflows.forEach((w) => (w.selected = false))
    }
  }
)

function toggleSelect(workflow: WorkflowItem) {
  workflow.selected = !workflow.selected
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[1000]">
      <div class="absolute inset-0 bg-black/45" @click="emit('cancel')"></div>
      <div class="absolute right-0 top-0 bottom-0 w-[480px] bg-white shadow-xl flex flex-col">
        <header class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb] flex-shrink-0">
          <h3 class="text-base font-medium text-[#1d2129]">关联工作流</h3>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f2f3f5] text-[#86909c] transition-colors"
            @click="emit('cancel')"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div class="px-5 py-3 border-b border-[#e5e6eb] flex-shrink-0">
          <div class="relative">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-[#86909c]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索工作流"
              class="w-full pl-9 pr-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] transition-colors"
            >
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-3">
          <div class="space-y-2">
            <div
              v-for="workflow in filteredWorkflows"
              :key="workflow.workflowId"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                workflow.selected
                  ? 'border-[#1677ff] bg-[#f0f5ff]'
                  : 'border-[#e5e6eb] hover:border-[#c9cdd4] hover:bg-[#fafbfc]'
              "
              @click="toggleSelect(workflow)"
            >
              <div
                class="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                :class="
                  workflow.selected
                    ? 'border-[#1677ff] bg-[#1677ff]'
                    : 'border-[#c9cdd4] bg-white'
                "
              >
                <svg v-if="workflow.selected" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-medium text-[#1d2129]">{{ workflow.name }}</div>
                <div class="text-[12px] text-[#86909c] mt-0.5">{{ workflow.description }}</div>
              </div>
            </div>
          </div>

          <div v-if="filteredWorkflows.length === 0" class="text-center py-12 text-[13px] text-[#86909c]">
            暂无工作流
          </div>
        </div>

        <footer class="flex items-center justify-between px-5 py-4 border-t border-[#e5e6eb] flex-shrink-0">
          <span class="text-[13px] text-[#4e5969]">
            已选择 <span class="text-[#1677ff] font-medium">{{ selectedCount }}</span> 项
          </span>
          <div class="flex gap-3">
            <button
              class="border border-[#e5e6eb] px-5 py-2 rounded-md text-[13px] text-[#4e5969] hover:bg-[#f7f8fa] transition-colors"
              @click="emit('cancel')"
            >
              取消
            </button>
            <button
              class="bg-[#1677ff] text-white px-5 py-2 rounded-md text-[13px] hover:bg-[#4096ff] transition-colors"
              @click="handleConfirm"
            >
              添加
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Teleport>
</template>