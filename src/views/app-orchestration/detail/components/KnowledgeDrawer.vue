<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { KnowledgeBaseItem } from '../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
  confirm: []
}>()

const MAX_SELECT = 5

const searchKeyword = ref('')

const knowledgeBases = reactive<KnowledgeBaseItem[]>([
  { kbId: 'kb1', name: '产品文档库', description: '包含产品使用说明、FAQ等', documentCount: 32, selected: false },
  { kbId: 'kb2', name: '技术文档库', description: 'API文档、技术架构说明', documentCount: 18, selected: false },
  { kbId: 'kb3', name: '企业规章制度', description: '公司内部规章制度与流程', documentCount: 45, selected: false },
  { kbId: 'kb4', name: '行业知识库', description: '行业分析报告与市场数据', documentCount: 27, selected: false },
  { kbId: 'kb5', name: '客户服务手册', description: '客服标准话术与处理流程', documentCount: 15, selected: false },
  { kbId: 'kb6', name: '财务知识库', description: '财务制度、税务法规', documentCount: 22, selected: false },
])

const filteredKBs = computed(() => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return knowledgeBases
  return knowledgeBases.filter(
    (kb) => kb.name.includes(keyword) || kb.description.includes(keyword)
  )
})

const selectedCount = computed(() => knowledgeBases.filter((kb) => kb.selected).length)

const reachedLimit = computed(() => selectedCount.value >= MAX_SELECT)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      searchKeyword.value = ''
      knowledgeBases.forEach((kb) => (kb.selected = false))
    }
  }
)

function toggleSelect(kb: KnowledgeBaseItem) {
  if (kb.selected) {
    kb.selected = false
  } else if (!reachedLimit.value) {
    kb.selected = true
  }
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
          <h3 class="text-base font-medium text-[#1d2129]">添加知识库</h3>
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
              placeholder="搜索知识库"
              class="w-full pl-9 pr-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] transition-colors"
            >
          </div>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-3">
          <div class="space-y-2">
            <div
              v-for="kb in filteredKBs"
              :key="kb.kbId"
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="
                kb.selected
                  ? 'border-[#1677ff] bg-[#f0f5ff]'
                  : 'border-[#e5e6eb] hover:border-[#c9cdd4] hover:bg-[#fafbfc]'
              "
              @click="toggleSelect(kb)"
            >
              <div
                class="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                :class="
                  kb.selected
                    ? 'border-[#1677ff] bg-[#1677ff]'
                    : 'border-[#c9cdd4] bg-white'
                "
              >
                <svg v-if="kb.selected" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-[13px] font-medium text-[#1d2129]">{{ kb.name }}</span>
                  <span class="text-[12px] text-[#86909c] bg-[#f2f3f5] px-1.5 py-0.5 rounded">
                    {{ kb.documentCount }} 篇文档
                  </span>
                </div>
                <div class="text-[12px] text-[#86909c] mt-0.5">{{ kb.description }}</div>
              </div>
            </div>
          </div>

          <div v-if="filteredKBs.length === 0" class="text-center py-12 text-[13px] text-[#86909c]">
            暂无知识库
          </div>
        </div>

        <footer class="flex items-center justify-between px-5 py-4 border-t border-[#e5e6eb] flex-shrink-0">
          <span class="text-[13px] text-[#4e5969]">
            已选择 <span class="text-[#1677ff] font-medium">{{ selectedCount }}</span>
            <span class="text-[#86909c]"> / {{ MAX_SELECT }} 项</span>
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
              :disabled="selectedCount === 0"
              :class="{ 'opacity-50 cursor-not-allowed': selectedCount === 0 }"
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