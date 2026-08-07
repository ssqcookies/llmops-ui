<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ModerationConfig } from '../types'

const props = defineProps<{
  visible: boolean
  config?: ModerationConfig
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', config: ModerationConfig): void
}>()

const MAX_KEYWORDS_LENGTH = 1000
const MAX_PRESET_LENGTH = 500

const keywordsText = ref('')
const checkInput = ref(false)
const checkOutput = ref(false)
const presetReply = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val && props.config) {
      keywordsText.value = props.config.keywords?.join('\n') ?? ''
      checkInput.value = props.config.checkInput ?? false
      checkOutput.value = props.config.checkOutput ?? false
      presetReply.value = props.config.presetReply ?? ''
    }
  }
)

const keywordsCharCount = computed(() => keywordsText.value.length)
const presetCharCount = computed(() => presetReply.value.length)
const showPreset = computed(() => checkInput.value || checkOutput.value)

function handleSave() {
  const keywords = keywordsText.value
    .split('\n')
    .map((k) => k.trim())
    .filter(Boolean)
  emit('save', {
    keywords,
    checkInput: checkInput.value,
    checkOutput: checkOutput.value,
    presetReply: presetReply.value,
  })
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
          class="relative bg-white rounded-xl shadow-2xl overflow-hidden w-[520px]"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
            <h3 class="text-base font-medium text-[#1d2129]">内容审查设置</h3>
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

          <div class="px-5 py-4 space-y-5">
            <div class="space-y-2">
              <label class="block text-[13px] font-medium text-[#1d2129]">关键词列表</label>
              <textarea
                v-model="keywordsText"
                rows="4"
                :maxlength="MAX_KEYWORDS_LENGTH"
                placeholder="每行输入一个关键词，例如：&#10;违规内容&#10;敏感词&#10;禁止话题"
                class="w-full px-3 py-2.5 text-[13px] border border-[#e5e6eb] rounded-lg resize-none outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors leading-6"
              />
              <div class="flex items-center justify-between">
                <span class="text-[12px] text-[#86909c]">每行一个关键词，命中后将触发审查</span>
                <span class="text-[12px] text-[#86909c]">{{ keywordsCharCount }} / {{ MAX_KEYWORDS_LENGTH }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between py-2">
              <div>
                <label class="text-[13px] font-medium text-[#1d2129]">审查输入内容</label>
                <p class="text-[12px] text-[#86909c] mt-0.5">对用户发送的内容进行关键词检测</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" class="sr-only peer" v-model="checkInput" />
                <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
                  <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
                </div>
              </label>
            </div>

            <div v-if="showPreset" class="space-y-2">
              <label class="block text-[13px] font-medium text-[#1d2129]">预设回复</label>
              <textarea
                v-model="presetReply"
                rows="3"
                :maxlength="MAX_PRESET_LENGTH"
                placeholder="当内容被审查拦截时，返回给用户的预设回复内容..."
                class="w-full px-3 py-2.5 text-[13px] border border-[#e5e6eb] rounded-lg resize-none outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors leading-6"
              />
              <div class="flex items-center justify-end">
                <span class="text-[12px] text-[#86909c]">{{ presetCharCount }} / {{ MAX_PRESET_LENGTH }}</span>
              </div>
            </div>

            <div class="flex items-center justify-between py-2">
              <div>
                <label class="text-[13px] font-medium text-[#1d2129]">审查输出内容</label>
                <p class="text-[12px] text-[#86909c] mt-0.5">对应用返回的内容进行关键词检测</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input type="checkbox" class="sr-only peer" v-model="checkOutput" />
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
