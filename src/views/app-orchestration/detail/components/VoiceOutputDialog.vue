<script setup lang="ts">
import { ref, watch } from 'vue'
import type { VoiceOption } from '../types'

const props = defineProps<{
  visible: boolean
  voice?: string
  autoPlay?: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', data: { voice: string; autoPlay: boolean }): void
}>()

const voiceOptions: VoiceOption[] = [
  { value: 'female-1', label: '温柔女声 · 晓芸' },
  { value: 'female-2', label: '活力女声 · 小悦' },
  { value: 'male-1', label: '沉稳男声 · 志远' },
  { value: 'male-2', label: '阳光男声 · 小宇' },
  { value: 'child', label: '童真童声 · 小星' },
]

const selectedVoice = ref('female-1')
const autoPlayEnabled = ref(false)

watch(
  () => props.visible,
  (val) => {
    if (val) {
      selectedVoice.value = props.voice ?? 'female-1'
      autoPlayEnabled.value = props.autoPlay ?? false
    }
  }
)

function handleSave() {
  emit('save', { voice: selectedVoice.value, autoPlay: autoPlayEnabled.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/40" @click="emit('cancel')"></div>

        <div
          class="relative bg-white rounded-xl shadow-2xl overflow-hidden w-[420px]"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
            <h3 class="text-base font-medium text-[#1d2129]">语音输出设置</h3>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f2f3f5] text-[#86909c] hover:text-[#4e5969] transition cursor-pointer"
              @click="emit('cancel')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="px-5 py-5 space-y-5">
            <div class="space-y-2">
              <label class="block text-[13px] font-medium text-[#1d2129]">音色选择</label>
              <div class="relative">
                <select
                  v-model="selectedVoice"
                  class="w-full appearance-none px-3 py-2 pr-9 text-[13px] border border-[#e5e6eb] rounded-lg outline-none focus:border-[#1677ff] bg-white text-[#1d2129] transition-colors cursor-pointer"
                >
                  <option
                    v-for="opt in voiceOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
                <svg
                  class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#86909c]"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <p class="text-[12px] text-[#86909c]">选择应用回复时使用的音色</p>
            </div>

            <div class="flex items-center justify-between">
              <div>
                <label class="block text-[13px] font-medium text-[#1d2129]">自动播放</label>
                <p class="text-[12px] text-[#86909c] mt-0.5">收到回复后自动播放语音</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  v-model="autoPlayEnabled"
                >
                <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
                  <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
                </div>
              </label>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#e5e6eb] bg-[#fafbfc]">
            <button
              class="px-4 py-1.5 rounded-md border border-[#e5e6eb] text-[13px] text-[#4e5969] hover:border-[#1677ff] hover:text-[#1677ff] transition cursor-pointer"
              @click="emit('cancel')"
            >
              取消
            </button>
            <button
              class="px-4 py-1.5 rounded-md bg-[#1677ff] text-white text-[13px] font-medium hover:bg-[#4096ff] transition cursor-pointer"
              @click="handleSave"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
