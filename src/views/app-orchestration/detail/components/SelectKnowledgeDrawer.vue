<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { KnowledgeItem } from '../types'

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

const mockKnowledges: KnowledgeItem[] = [
  { id: 'kb-1', name: '产品说明书库', description: '包含所有产品线的详细技术文档和使用说明' },
  { id: 'kb-2', name: 'FAQ 知识库', description: '常见问题解答集合，覆盖用户最常遇到的问题' },
  { id: 'kb-3', name: '行业政策法规', description: '相关行业的法律法规、政策文件和合规要求' },
  { id: 'kb-4', name: '竞品分析报告', description: '主要竞争对手的产品分析、市场策略和对比研究' },
  { id: 'kb-5', name: '客户案例库', description: '典型客户成功案例和应用场景介绍' },
  { id: 'kb-6', name: '技术白皮书', description: '技术架构、实现原理和最佳实践的详细文档' },
  { id: 'kb-7', name: '市场营销素材', description: '品牌故事、宣传文案和营销活动素材库' },
  { id: 'kb-8', name: '内部培训资料', description: '员工培训手册、课程资料和学习文档' },
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

const filteredKnowledges = computed(() => {
  if (!searchKeyword.value) return mockKnowledges
  const kw = searchKeyword.value.toLowerCase()
  return mockKnowledges.filter(
    (k) =>
      k.name.toLowerCase().includes(kw) ||
      k.description.toLowerCase().includes(kw),
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
    title="选择引用知识库"
    placement="right"
    :width="560"
    :footer="false"
    unmount-on-close
    @cancel="handleClose"
  >
    <div class="flex flex-col h-full">
      <div class="px-6 py-4 border-b border-gray-200">
        <a-input-search v-model="searchKeyword" placeholder="搜索知识库名称或描述" allow-clear />
      </div>

      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <div
          v-for="kb in filteredKnowledges"
          :key="kb.id"
          class="flex items-start gap-3 p-4 bg-white border rounded-lg cursor-pointer transition-all"
          :class="isSelected(kb.id) ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'"
          @click="toggleSelect(kb.id)"
        >
          <a-checkbox
            :checked="isSelected(kb.id)"
            @click.stop
            @change="toggleSelect(kb.id)"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800">{{ kb.name }}</div>
            <div class="text-xs text-gray-500 mt-1">{{ kb.description }}</div>
          </div>
        </div>

        <a-empty v-if="filteredKnowledges.length === 0" description="未找到匹配的知识库" />
      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          <span class="text-blue-600 font-medium">{{ innerSelectedIds.length }}</span>
          个知识库被选中
        </div>
        <div class="flex gap-3">
          <a-button @click="handleClose">取消</a-button>
          <a-button type="primary" @click="handleConfirm">添加</a-button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>