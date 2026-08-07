<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  content?: string
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'save', content: string): void
}>()

const MAX_LENGTH = 2000
const text = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      text.value = props.content ?? ''
    }
  }
)

const charCount = computed(() => text.value.length)

function handleSave() {
  emit('save', text.value)
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
            <h3 class="text-base font-medium text-[#1d2129]">长期记忆</h3>
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

          <div class="px-5 py-4 space-y-3">
            <div class="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span class="text-[13px] text-[#4e5969]">
                在此配置长期记忆信息，应用会在对话中自动使用这些记忆来提供更个性化的服务
              </span>
            </div>

            <textarea
              v-model="text"
              :rows="10"
              :maxlength="MAX_LENGTH"
              placeholder="请输入长期记忆内容，例如用户偏好、历史背景等..."
              class="w-full px-3 py-2.5 text-[13px] border border-[#e5e6eb] rounded-lg resize-none outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors leading-6"
            />

            <div class="flex items-center justify-between">
              <span class="text-[12px] text-[#86909c]">
                支持记录用户偏好、历史交互等信息
              </span>
              <span class="text-[12px] text-[#86909c]">
                {{ charCount }} / {{ MAX_LENGTH }}
              </span>
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
              更新记忆
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
