<script setup lang="ts">
import { ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import {
  getPublishHistoriesWithPage,
  fallbackHistoryToDraft,
} from '@/services/app'
import { formatTime } from '@/utils/format'

const props = defineProps<{
  visible: boolean
  appId: string
  appName: string
  appIcon: string
  appDescription: string
  /** 最近编辑时间戳（秒） */
  appLastEditedAt: number | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  /** 回退草稿成功后通知父组件刷新草稿配置 */
  (e: 'rollback'): void
}>()

interface HistoryItem {
  id: string
  version: number
  created_at: number
}

const list = ref<HistoryItem[]>([])
const loading = ref(false)
const rollingBackId = ref<string>('')
const pageNo = ref(1)
const pageSize = 10
const total = ref(0)

const close = () => emit('update:visible', false)

const load = async () => {
  if (!props.appId) return
  loading.value = true
  try {
    const res = await getPublishHistoriesWithPage(props.appId, {
      current_page: pageNo.value,
      page_size: pageSize,
    })
    list.value = res.data.list ?? []
    total.value = res.data.paginator?.total_record ?? 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      pageNo.value = 1
      load()
    }
  },
)

const rollback = async (item: HistoryItem) => {
  if (rollingBackId.value) return
  rollingBackId.value = item.id
  try {
    await fallbackHistoryToDraft(props.appId, item.id)
    Message.success(`已回退到版本 #${item.version}`)
    emit('rollback')
    load()
  } catch {
    // service 已统一 Message.error
  } finally {
    rollingBackId.value = ''
  }
}

/** 版本号格式化为三位补零 */
const formatVersion = (v: number) => String(v).padStart(3, '0')

/** 最大版本号（当前最新版本） */
const latestVersion = () => {
  if (list.value.length === 0) return 0
  return list.value.reduce((max, it) => Math.max(max, it.version), 0)
}
</script>

<template>
  <a-drawer
    :visible="visible"
    title="发布历史"
    :width="360"
    :footer="false"
    unmount-on-close
    @cancel="close"
  >
    <div class="flex flex-col h-full">
      <!-- 顶部应用信息卡片 -->
      <div class="pb-4">
        <div class="flex items-start gap-3">
          <div
            class="shrink-0 w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center bg-[#f7f8fa]"
          >
            <img
              v-if="appIcon"
              :src="appIcon"
              :alt="appName"
              class="w-full h-full object-cover"
            />
            <icon-robot v-else :size="24" class="text-gray-400" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-base font-medium text-gray-800 truncate">
              {{ appName }}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              <template v-if="appLastEditedAt">
                最近编辑 ·
                {{ formatTime(appLastEditedAt * 1000, 'YYYY-MM-DD HH:mm') }}
              </template>
              <template v-else>最近编辑 · --</template>
            </div>
            <p
              v-if="appDescription"
              class="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-3"
            >
              {{ appDescription }}
            </p>
          </div>
        </div>
      </div>

      <a-divider class="!my-0" />

      <!-- 统计条数 -->
      <div class="text-xs text-gray-400 py-3">
        共计 {{ total }} 条发布记录
      </div>

      <a-spin :loading="loading" class="flex-1">
        <template v-if="list.length === 0 && !loading">
          <div class="flex flex-col items-center justify-center py-16 text-gray-400">
            <icon-history :size="36" class="mb-3 text-gray-300" />
            <span class="text-sm">暂无发布记录</span>
          </div>
        </template>

        <div v-else class="flex flex-col gap-2">
          <div
            v-for="item in list"
            :key="item.id"
            class="flex items-center justify-between px-3 py-3 rounded-md border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-800">版本</span>
                <span
                  class="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium leading-none"
                >
                  #{{ formatVersion(item.version) }}
                </span>
                <a-tag
                  v-if="item.version === latestVersion()"
                  size="small"
                  color="arcoblue"
                  class="!rounded !text-[11px] !leading-none !px-1.5 !py-0"
                >
                  当前版本
                </a-tag>
              </div>
              <span class="text-xs text-gray-400">
                发布时间：{{ formatTime(item.created_at * 1000, 'YYYY-MM-DD HH:mm:ss') }}
              </span>
            </div>
            <a-button
              type="text"
              size="small"
              :loading="rollingBackId === item.id"
              @click="rollback(item)"
            >
              回退
            </a-button>
          </div>
        </div>
      </a-spin>

      <a-pagination
        v-if="total > pageSize"
        :current="pageNo"
        :total="total"
        :page-size="pageSize"
        :size-can-change="false"
        show-total
        class="mt-4 justify-center"
        @change="(p) => { pageNo = p; load() }"
      />
    </div>
  </a-drawer>
</template>
