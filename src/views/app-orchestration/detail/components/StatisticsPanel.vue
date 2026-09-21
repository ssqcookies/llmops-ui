<script setup lang="ts">
/**
 * 应用编排 - 统计分析面板
 *  - 5 个概览卡片（过去 7 天）
 *  - 4 个折线图（全部会话数 / 活跃用户数 / 平均会话互动数 / 费用消耗）
 *  - 对接 useGetAppAnalysis hook，EChart 按需引入
 */
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGetAppAnalysis } from '@/hooks/use-analysis'
import EChart from './EChart.vue'

const props = defineProps<{
  /** 应用 ID（从路由 params 取；也可外部传入） */
  appId?: string
}>()

const route = useRoute()
const resolvedAppId = computed(() => props.appId || (route.params.id as string))

const { loading, app_analysis, loadAppAnalysis } = useGetAppAnalysis()

onMounted(async () => {
  if (resolvedAppId.value) {
    try {
      await loadAppAnalysis(resolvedAppId.value)
    } catch {
      // 请求层已统一提示错误
    }
  }
})

watch(resolvedAppId, (id) => {
  if (id) loadAppAnalysis(id)
})

// ===== 概览卡片定义 =====
interface StatCard {
  key: 'total_messages' | 'active_accounts' | 'avg_of_conversation_messages' | 'token_output_rate' | 'cost_consumption'
  title: string
  icon: string          // Arco icon 名
  unit: string          // 单位后缀
  color: string         // icon 背景色 + 图表色
}

const statCards: StatCard[] = [
  { key: 'total_messages',                title: '全部会话数',     icon: 'icon-message',  unit: '次',  color: '#165dff' },
  { key: 'active_accounts',               title: '活跃用户数',     icon: 'icon-user',     unit: '人',  color: '#00b42a' },
  { key: 'avg_of_conversation_messages',   title: '平均会话互动数', icon: 'icon-swap',     unit: '次',  color: '#ff7d00' },
  { key: 'token_output_rate',              title: 'Token输出速度', icon: 'icon-code',     unit: '次',  color: '#722ed1' },
  { key: 'cost_consumption',               title: '费用消耗',       icon: 'icon-storage',  unit: '元',  color: '#f53f3f' },
]

/** 格式化 pop（环比）：正数→绿色 icon-up / 负数→红色 icon-down */
const formatPop = (pop: number) => {
  const sign = pop >= 0 ? '+' : ''
  return `${sign}${pop.toFixed(1)}%`
}

// ===== 图表定义 =====
interface ChartCard {
  key: 'total_messages_trend' | 'active_accounts_trend' | 'avg_of_conversation_messages_trend' | 'cost_consumption_trend'
  title: string
  icon: string
  color: string
}

const chartCards: ChartCard[] = [
  { key: 'total_messages_trend',                title: '全部会话数',     icon: 'icon-message',  color: '#165dff' },
  { key: 'active_accounts_trend',                title: '活跃用户数',     icon: 'icon-user',     color: '#00b42a' },
  { key: 'avg_of_conversation_messages_trend',   title: '平均会话互动数', icon: 'icon-swap',     color: '#ff7d00' },
  { key: 'cost_consumption_trend',               title: '费用消耗',       icon: 'icon-storage',  color: '#f53f3f' },
]
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 概览指标（过去7天） -->
    <section class="px-8 pt-6 pb-3">
      <div class="flex items-center gap-2 mb-4">
        <h3 class="text-[14px] font-medium text-[#1d2129]">概览指标</h3>
        <span class="text-[12px] text-[#86909c]">（过去7天）</span>
      </div>

      <div v-if="loading" class="grid grid-cols-5 gap-4">
        <div v-for="i in 5" :key="i" class="h-[120px] bg-[#f2f3f5] rounded-lg animate-pulse" />
      </div>

      <div v-else class="grid grid-cols-5 gap-4">
        <div
          v-for="card in statCards"
          :key="card.key"
          class="overview-card"
        >
          <!-- 头部：icon + title + tooltip -->
          <div class="flex items-center gap-2">
            <div
              class="w-7 h-7 rounded-md flex items-center justify-center"
              :style="{ backgroundColor: card.color + '14' }"
            >
              <component :is="card.icon" :size="14" :style="{ color: card.color }" />
            </div>
            <span class="text-[13px] text-[#4e5969]">{{ card.title }}</span>
            <a-tooltip content="该指标统计范围为过去7天">
              <icon-info-circle :size="12" class="text-[#c9cdd4]" />
            </a-tooltip>
          </div>

          <!-- 数值 + 环比 -->
          <div class="mt-3 flex items-end gap-2">
            <span class="text-[22px] font-semibold text-[#1d2129] leading-none">
              {{ app_analysis[card.key]?.data ?? 0 }}
            </span>
            <span class="text-[12px] text-[#86909c] mb-0.5">{{ card.unit }}</span>
            <span class="ml-auto flex items-center gap-0.5 text-[12px]"
              :class="(app_analysis[card.key]?.pop ?? 0) >= 0 ? 'text-[#00b42a]' : 'text-[#f53f3f]'"
            >
              <icon-arrow-up v-if="(app_analysis[card.key]?.pop ?? 0) >= 0" :size="12" />
              <icon-arrow-down v-else :size="12" />
              {{ formatPop(app_analysis[card.key]?.pop ?? 0) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 详细指标 -->
    <section class="px-8 pt-3 pb-6 flex-1 min-h-0 flex flex-col">
      <div class="flex items-center gap-2 mb-4">
        <h3 class="text-[14px] font-medium text-[#1d2129]">详细指标</h3>
      </div>

      <div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <div
          v-for="card in chartCards"
          :key="card.key"
          class="chart-card"
        >
          <!-- 卡片头 -->
          <div class="flex items-center gap-2 mb-3">
            <component :is="card.icon" :size="14" :style="{ color: card.color }" />
            <span class="text-[13px] font-medium text-[#1d2129]">{{ card.title }}</span>
            <a-tooltip content="该图表展示过去 7 天每日数据">
              <icon-info-circle :size="12" class="text-[#c9cdd4]" />
            </a-tooltip>
            <span class="text-[12px] text-[#c9cdd4] ml-1">过去7天</span>
          </div>

          <!-- 图表区 -->
          <div class="flex-1 min-h-0">
            <EChart
              v-if="!loading"
              :x-axis="app_analysis[card.key]?.x_axis ?? []"
              :y-axis="app_analysis[card.key]?.y_axis ?? []"
              :color="card.color"
            />
            <div v-else class="w-full h-full bg-[#f2f3f5] rounded animate-pulse" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="css">
@reference "tailwindcss";

.overview-card {
  @apply bg-white border border-[#eef0f3] rounded-lg p-4 flex flex-col justify-center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
.chart-card {
  @apply bg-white border border-[#eef0f3] rounded-lg p-4 flex flex-col overflow-hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
}
</style>
