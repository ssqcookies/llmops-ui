<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { RetrievalConfig, RetrievalStrategy } from '../types'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  cancel: []
  save: []
}>()

const localConfig = reactive<RetrievalConfig>({
  retrievalStrategy: 'hybrid',
  maxRecallCount: 10,
  minMatchScore: 0.5,
})

const strategies: { key: RetrievalStrategy; label: string; desc: string }[] = [
  { key: 'hybrid', label: '混合检索', desc: '结合向量检索与全文检索，效果最佳' },
  { key: 'vector', label: '向量检索', desc: '基于语义相似度的向量匹配' },
  { key: 'fulltext', label: '全文检索', desc: '基于关键词的传统全文搜索' },
]

watch(
  () => props.visible,
  (val) => {
    if (val) {
      localConfig.retrievalStrategy = 'hybrid'
      localConfig.maxRecallCount = 10
      localConfig.minMatchScore = 0.5
    }
  }
)

function fillPercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100
}

function handleSave() {
  emit('save')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[1000] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/45" @click="emit('cancel')"></div>
      <div class="relative bg-white rounded-lg shadow-lg w-[480px] max-h-[85vh] flex flex-col">
        <header class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
          <h3 class="text-base font-medium text-[#1d2129]">检索设置</h3>
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

        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <section>
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">检索策略</h4>
            <div class="space-y-2">
              <label
                v-for="s in strategies"
                :key="s.key"
                class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
                :class="
                  localConfig.retrievalStrategy === s.key
                    ? 'border-[#1677ff] bg-[#f0f5ff]'
                    : 'border-[#e5e6eb] hover:border-[#c9cdd4] hover:bg-[#fafbfc]'
                "
              >
                <input
                  type="radio"
                  name="retrievalStrategy"
                  :value="s.key"
                  v-model="localConfig.retrievalStrategy"
                  class="sr-only"
                >
                <div
                  class="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors"
                  :class="
                    localConfig.retrievalStrategy === s.key
                      ? 'border-[#1677ff]'
                      : 'border-[#c9cdd4]'
                  "
                >
                  <div
                    v-if="localConfig.retrievalStrategy === s.key"
                    class="w-2 h-2 rounded-full bg-[#1677ff]"
                  ></div>
                </div>
                <div class="flex-1">
                  <div class="text-[13px] font-medium text-[#1d2129]">{{ s.label }}</div>
                  <div class="text-[12px] text-[#86909c] mt-0.5">{{ s.desc }}</div>
                </div>
              </label>
            </div>
          </section>

          <section>
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">最大召回数量</h4>
            <div class="flex items-center gap-3">
              <div class="flex-1 relative h-6 flex items-center">
                <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.maxRecallCount, 1, 50) + '%' }"></div>
                <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.maxRecallCount, 1, 50) + '%' }"></div>
                <input type="range" min="1" max="50" step="1" v-model="localConfig.maxRecallCount" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
              </div>
              <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.maxRecallCount }}</span>
            </div>
          </section>

          <section>
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">最小匹配度</h4>
            <div class="flex items-center gap-3">
              <div class="flex-1 relative h-6 flex items-center">
                <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.minMatchScore, 0, 1) + '%' }"></div>
                <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.minMatchScore, 0, 1) + '%' }"></div>
                <input type="range" min="0" max="1" step="0.01" v-model="localConfig.minMatchScore" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
              </div>
              <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ Math.round(localConfig.minMatchScore * 100) }}%</span>
            </div>
          </section>
        </div>

        <footer class="flex justify-end gap-3 px-5 py-4 border-t border-[#e5e6eb]">
          <button
            class="border border-[#e5e6eb] px-5 py-2 rounded-md text-[13px] text-[#4e5969] hover:bg-[#f7f8fa] transition-colors"
            @click="emit('cancel')"
          >
            取消
          </button>
          <button
            class="bg-[#1677ff] text-white px-5 py-2 rounded-md text-[13px] hover:bg-[#4096ff] transition-colors"
            @click="handleSave"
          >
            保存
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>