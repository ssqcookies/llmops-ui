<script setup lang="ts">
import { reactive, watch } from 'vue'
import type { ModelConfig, ModelOption } from '../types'

const props = defineProps<{
  visible: boolean
  modelConfig: ModelConfig
}>()

const emit = defineEmits<{
  cancel: []
  save: [config: ModelConfig]
}>()

const modelOptions: ModelOption[] = [
  { modelId: 'gpt-4o', label: 'GPT-4o', maxTokens: 12800 },
  { modelId: 'gpt-4o-mini', label: 'GPT-4o Mini', maxTokens: 12800 },
  { modelId: 'gpt-4-turbo', label: 'GPT-4 Turbo', maxTokens: 12800 },
  { modelId: 'doubao-pro', label: '豆包 Pro', maxTokens: 12800 },
  { modelId: 'doubao-lite', label: '豆包 Lite', maxTokens: 12800 },
  { modelId: 'deepseek-v3', label: 'DeepSeek V3', maxTokens: 12800 },
]

const localConfig = reactive<ModelConfig>({
  modelId: '',
  temperature: 0.7,
  topP: 0.9,
  presencePenalty: 0,
  frequencyPenalty: 0,
  contextRounds: 10,
  maxResponseTokens: 4096,
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      Object.assign(localConfig, props.modelConfig)
    }
  }
)

function fillPercent(value: number, min: number, max: number): number {
  return ((value - min) / (max - min)) * 100
}

function handleSave() {
  emit('save', { ...localConfig })
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="fixed inset-0 z-[1000] flex items-center justify-center">
      <div class="absolute inset-0 bg-black/45" @click="emit('cancel')"></div>
      <div class="relative bg-white rounded-lg shadow-lg w-[560px] max-h-[85vh] flex flex-col">
        <header class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
          <h3 class="text-base font-medium text-[#1d2129]">模型设置</h3>
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
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">模型选择</h4>
            <select
              v-model="localConfig.modelId"
              class="w-full px-3 py-2 border border-[#e5e6eb] rounded-md text-[13px] outline-none focus:border-[#1677ff] bg-white transition-colors"
            >
              <option v-for="m in modelOptions" :key="m.modelId" :value="m.modelId">{{ m.label }}</option>
            </select>
          </section>

          <section>
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">参数区</h4>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-24 flex-shrink-0">温度</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.temperature, 0, 2) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.temperature, 0, 2) + '%' }"></div>
                  <input type="range" min="0" max="2" step="0.1" v-model="localConfig.temperature" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.temperature.toFixed(1) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-24 flex-shrink-0">Top P</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.topP, 0, 1) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.topP, 0, 1) + '%' }"></div>
                  <input type="range" min="0" max="1" step="0.01" v-model="localConfig.topP" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.topP.toFixed(2) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-24 flex-shrink-0">存在惩罚</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.presencePenalty, -2, 2) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.presencePenalty, -2, 2) + '%' }"></div>
                  <input type="range" min="-2" max="2" step="0.1" v-model="localConfig.presencePenalty" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.presencePenalty.toFixed(1) }}</span>
              </div>

              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-24 flex-shrink-0">频率惩罚</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.frequencyPenalty, -2, 2) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.frequencyPenalty, -2, 2) + '%' }"></div>
                  <input type="range" min="-2" max="2" step="0.1" v-model="localConfig.frequencyPenalty" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.frequencyPenalty.toFixed(1) }}</span>
              </div>
            </div>
          </section>

          <section>
            <h4 class="text-[13px] font-medium text-[#1d2129] mb-3">输入及输出设置</h4>
            <div class="space-y-4">
              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-28 flex-shrink-0">上下文轮数</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.contextRounds, 1, 50) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.contextRounds, 1, 50) + '%' }"></div>
                  <input type="range" min="1" max="50" step="1" v-model="localConfig.contextRounds" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-12 text-right tabular-nums">{{ localConfig.contextRounds }}</span>
              </div>

              <div class="flex items-center gap-3">
                <label class="text-[13px] text-[#4e5969] w-28 flex-shrink-0">最大回复Token</label>
                <div class="flex-1 relative h-6 flex items-center">
                  <div class="absolute w-full h-1.5 bg-[#e5e6eb] rounded-full"></div>
                  <div class="absolute h-1.5 bg-[#1677ff] rounded-full pointer-events-none" :style="{ width: fillPercent(localConfig.maxResponseTokens, 1024, 32768) + '%' }"></div>
                  <div class="absolute w-4 h-4 bg-white border-2 border-[#1677ff] rounded-full shadow-sm pointer-events-none -translate-x-1/2 top-1/2 -translate-y-1/2" :style="{ left: fillPercent(localConfig.maxResponseTokens, 1024, 32768) + '%' }"></div>
                  <input type="range" min="1024" max="32768" step="1" v-model="localConfig.maxResponseTokens" class="relative w-full h-6 opacity-0 cursor-pointer z-10">
                </div>
                <span class="text-[13px] text-[#1d2129] w-14 text-right tabular-nums">{{ localConfig.maxResponseTokens }}</span>
              </div>
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