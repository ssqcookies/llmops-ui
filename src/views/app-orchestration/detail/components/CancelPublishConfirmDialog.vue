<script setup lang="ts">
const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()
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
              <div class="flex-shrink-0 w-10 h-10 rounded-full bg-[#fff7e6] flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ff7d00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div class="flex-1 pt-0.5">
                <h3 class="text-base font-medium text-[#1d2129] mb-2">确认取消发布?</h3>
                <p class="text-[13px] text-[#4e5969] leading-5">
                  取消发布后，当前已发布的版本将被撤回，用户将无法访问应用。此操作不可撤销。
                </p>
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
              class="px-4 py-1.5 rounded-md bg-[#f53f3f] text-white text-[13px] font-medium hover:bg-[#cb2634] transition cursor-pointer"
              @click="emit('confirm')"
            >
              确认取消
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
