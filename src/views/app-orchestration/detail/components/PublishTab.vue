<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PublishRecord, PublishStatus } from '../types'

const props = defineProps<{
  appId: string
}>()

const emit = defineEmits<{
  (e: 'cancelPublish', version: string): void
}>()

const statusFilter = ref<'all' | PublishStatus>('all')
const timeSort = ref<'latest' | 'earliest'>('latest')

const mockRecords = ref<PublishRecord[]>([
  {
    version: 'v1.0.3',
    publishTime: '2026-08-06 14:30:00',
    publisher: '张三',
    remark: '优化对话流程，增加开场白',
    status: 'published',
    isCurrent: true,
  },
  {
    version: 'v1.0.2',
    publishTime: '2026-08-05 10:15:00',
    publisher: '李四',
    remark: '修复知识库检索问题',
    status: 'canceled',
    isCurrent: false,
  },
  {
    version: 'v1.0.1',
    publishTime: '2026-08-03 16:45:00',
    publisher: '王五',
    remark: '新增语音输入功能',
    status: 'published',
    isCurrent: false,
  },
  {
    version: 'v1.0.0',
    publishTime: '2026-08-01 09:00:00',
    publisher: '张三',
    remark: '初始版本发布',
    status: 'published',
    isCurrent: false,
  },
])

const filteredRecords = computed(() => {
  let list = [...mockRecords.value]
  if (statusFilter.value !== 'all') {
    list = list.filter((r) => r.status === statusFilter.value)
  }
  if (timeSort.value === 'earliest') {
    list.reverse()
  }
  return list
})

function handleRollback(version: string) {
  console.log('回退到版本:', version, 'appId:', props.appId)
}

function handleCancelPublish(version: string) {
  emit('cancelPublish', version)
}

function statusTag(status: PublishStatus) {
  return status === 'published'
    ? { text: '已发布', class: 'bg-green-50 text-green-600 border border-green-200' }
    : { text: '已取消', class: 'bg-gray-50 text-gray-500 border border-gray-200' }
}
</script>

<template>
  <div class="p-5">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <div class="relative">
          <select
            v-model="statusFilter"
            class="appearance-none px-3 py-2 pr-8 text-sm border border-[#e5e6eb] rounded-md bg-white text-[#1d2129] cursor-pointer outline-none focus:border-[#1677ff]"
          >
            <option value="all">全部状态</option>
            <option value="published">已发布</option>
            <option value="canceled">已取消</option>
          </select>
          <svg
            class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86909c] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div class="relative">
          <select
            v-model="timeSort"
            class="appearance-none px-3 py-2 pr-8 text-sm border border-[#e5e6eb] rounded-md bg-white text-[#1d2129] cursor-pointer outline-none focus:border-[#1677ff]"
          >
            <option value="latest">最新优先</option>
            <option value="earliest">最早优先</option>
          </select>
          <svg
            class="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86909c] pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      <div class="text-sm text-[#86909c]">
        共 {{ filteredRecords.length }} 条记录
      </div>
    </div>

    <div
      v-if="filteredRecords.length === 0"
      class="flex flex-col items-center justify-center py-20"
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="100" r="80" fill="#f7f8fa" />
        <rect x="60" y="70" width="80" height="70" rx="4" fill="white" stroke="#e5e6eb" stroke-width="2" />
        <line x1="75" y1="90" x2="125" y2="90" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
        <line x1="75" y1="105" x2="115" y2="105" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
        <line x1="75" y1="120" x2="120" y2="120" stroke="#e5e6eb" stroke-width="2" stroke-linecap="round" />
        <path
          d="M85 65 L100 50 L115 65"
          stroke="#86909c"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
        />
      </svg>
      <p class="mt-4 text-sm text-[#86909c]">暂无发布记录</p>
      <button
        class="mt-4 px-4 py-2 text-sm bg-[#1677ff] text-white rounded-md hover:bg-[#0e5cd6] transition-colors"
      >
        立即发布
      </button>
    </div>

    <div v-else class="border border-[#e5e6eb] rounded-lg overflow-hidden">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-[#fafafa]">
            <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-28">版本号</th>
            <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-44">发布时间</th>
            <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-24">发布人</th>
            <th class="text-left px-4 py-3 font-medium text-[#1d2129]">备注</th>
            <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-24">状态</th>
            <th class="text-left px-4 py-3 font-medium text-[#1d2129] w-32">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="record in filteredRecords"
            :key="record.version"
            class="border-t border-[#e5e6eb] hover:bg-[#fafbfc] transition-colors"
          >
            <td class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="text-[#1d2129] font-medium">{{ record.version }}</span>
                <span
                  v-if="record.isCurrent"
                  class="px-1.5 py-0.5 text-xs rounded bg-[#e8f3ff] text-[#1677ff]"
                >
                  当前版本
                </span>
              </div>
            </td>
            <td class="px-4 py-3 text-[#4e5969]">{{ record.publishTime }}</td>
            <td class="px-4 py-3 text-[#4e5969]">{{ record.publisher }}</td>
            <td class="px-4 py-3 text-[#4e5969]">{{ record.remark }}</td>
            <td class="px-4 py-3">
              <span
                class="inline-block px-2 py-0.5 text-xs rounded"
                :class="statusTag(record.status).class"
              >
                {{ statusTag(record.status).text }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center gap-3">
                <button
                  v-if="record.status === 'published' && !record.isCurrent"
                  class="text-[#1677ff] hover:text-[#4096ff] text-sm transition-colors"
                  @click="handleRollback(record.version)"
                >
                  回退
                </button>
                <button
                  v-if="record.status === 'published'"
                  class="text-[#f53f3f] hover:text-[#f76560] text-sm transition-colors"
                  @click="handleCancelPublish(record.version)"
                >
                  取消发布
                </button>
                <span v-if="record.status === 'canceled'" class="text-[#c9cdd4] text-sm">
                  -
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>