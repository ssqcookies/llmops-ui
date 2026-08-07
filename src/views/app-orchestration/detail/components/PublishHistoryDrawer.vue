<script setup lang="ts">
import { computed } from 'vue'
import type { PublishRecord } from '../types'

const props = defineProps<{
  visible: boolean
  currentVersion?: PublishRecord
  historyVersions?: PublishRecord[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'rollback', version: string): void
}>()

const versions = computed(() => props.historyVersions ?? [])
const hasMore = computed(() => versions.value.length > 0)

function handleRollback(version: string) {
  emit('rollback', version)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="visible" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/40" @click="emit('close')"></div>

        <div
          class="absolute right-0 top-0 bottom-0 bg-white shadow-2xl flex flex-col w-[400px]"
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-[#e5e6eb]">
            <h3 class="text-base font-medium text-[#1d2129]">发布历史</h3>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[#f2f3f5] text-[#86909c] hover:text-[#4e5969] transition cursor-pointer"
              @click="emit('close')"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div>
              <div class="text-[13px] font-medium text-[#1d2129] mb-2">当前版本</div>
              <div
                class="rounded-xl p-4 text-white shadow-sm bg-gradient-to-br from-[#1677ff] to-[#4096ff]"
              >
                <div class="flex items-center gap-2 mb-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[12px] font-medium">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    当前版本
                  </span>
                </div>
                <div class="text-xl font-semibold mb-1">{{ currentVersion?.version ?? '-' }}</div>
                <div class="text-[12px] text-white/80">{{ currentVersion?.publishTime ?? '-' }}</div>
              </div>
            </div>

            <div>
              <div class="text-[13px] font-medium text-[#1d2129] mb-2">历史版本</div>

              <div v-if="hasMore" class="space-y-2">
                <div
                  v-for="ver in versions"
                  :key="ver.version"
                  class="flex items-center justify-between p-3 rounded-lg border border-[#e5e6eb] hover:border-[#1677ff] hover:bg-[#f5f8ff] transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <div class="text-[13px] font-medium text-[#1d2129]">{{ ver.version }}</div>
                    <div class="text-[12px] text-[#86909c] mt-0.5">{{ ver.publishTime }}</div>
                  </div>
                  <button
                    class="flex items-center gap-1 px-2.5 py-1 rounded-md text-[12px] text-[#1677ff] border border-[#e5e6eb] hover:border-[#1677ff] hover:bg-[#e8f3ff] transition cursor-pointer flex-shrink-0"
                    @click="handleRollback(ver.version)"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    回退
                  </button>
                </div>
              </div>

              <div v-else class="flex flex-col items-center justify-center py-10 text-center">
                <div class="w-16 h-16 rounded-full bg-[#f7f8fa] flex items-center justify-center mb-3">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9cdd4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <p class="text-[13px] text-[#4e5969]">暂无历史版本</p>
                <p class="text-[12px] text-[#86909c] mt-1">当前版本为第一个发布版本</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
