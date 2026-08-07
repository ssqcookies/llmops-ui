<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', data: { version: string; remark: string }): void
}>()

const version = ref('')
const remark = ref('')

watch(
  () => props.visible,
  (val) => {
    if (val) {
      const now = new Date()
      const y = now.getFullYear()
      const m = String(now.getMonth() + 1).padStart(2, '0')
      const d = String(now.getDate()).padStart(2, '0')
      version.value = `v${y}${m}${d}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
      remark.value = ''
    }
  }
)

function handleConfirm() {
  emit('confirm', { version: version.value, remark: remark.value })
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
          class="relative bg-white rounded-xl shadow-2xl overflow-hidden w-[400px]"
        >
          <div class="px-5 pt-5 pb-4">
            <div class="flex gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-[#e8f3ff] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div class="flex-1 pt-0.5">
                <h3 class="text-base font-medium text-[#1d2129] mb-2">确认发布?</h3>
                <p class="text-[13px] text-[#4e5969] leading-5">
                  发布后新版本将立即生效，用户看到的将是最新发布的版本。请确认所有配置已正确设置。
                </p>
              </div>
            </div>

            <div class="mt-4 space-y-3">
              <div class="space-y-1.5">
                <label class="block text-[13px] font-medium text-[#1d2129]">版本号</label>
                <input
                  v-model="version"
                  type="text"
                  placeholder="请输入版本号"
                  class="w-full px-3 py-2 text-[13px] border border-[#e5e6eb] rounded-lg outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors"
                />
              </div>
              <div class="space-y-1.5">
                <label class="block text-[13px] font-medium text-[#1d2129]">发布备注</label>
                <textarea
                  v-model="remark"
                  rows="2"
                  placeholder="请输入本次发布的备注信息（可选）"
                  class="w-full px-3 py-2 text-[13px] border border-[#e5e6eb] rounded-lg resize-none outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors leading-6"
                />
              </div>
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
              @click="handleConfirm"
            >
              确认发布
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
