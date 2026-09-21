<script setup lang="ts">
/**
 * 通用 ECharts 折线图组件
 * - echarts 按需引入（仅用到 LineChart + GridComponent + TooltipComponent）
 * - 自动 resize（ResizeObserver）
 */
import { ref, onMounted, onBeforeUnmount, watch, shallowRef } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, TitleComponent, CanvasRenderer])

const props = defineProps<{
  /** x 轴数据（秒级时间戳 or 字符串） */
  xAxis: number[] | string[]
  /** y 轴数据 */
  yAxis: number[]
  /** 图表主题色 */
  color?: string
}>()

const chartRef = ref<HTMLElement | null>(null)
const chart = shallowRef<echarts.ECharts | null>(null)
let ro: ResizeObserver | null = null

/** 秒级时间戳 → MM-DD */
const formatTs = (v: number) => {
  const d = new Date(v * 1000)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${m}-${day}`
}

/** 构建 option */
const buildOption = () => {
  const xAxisIsTs = props.xAxis.length > 0 && typeof props.xAxis[0] === 'number'
  const xData = props.xAxis.map((v) =>
    xAxisIsTs ? formatTs(v as number) : String(v),
  )
  return {
    grid: { left: 36, right: 16, top: 12, bottom: 28, containLabel: true },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#e5e6eb',
      borderWidth: 1,
      textStyle: { color: '#1d2129', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#c9cdd4' } },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#86909c', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f2f3f5', type: 'dashed' } },
      axisLabel: { color: '#86909c', fontSize: 11 },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: props.color || '#165dff' },
        itemStyle: { color: props.color || '#165dff' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: (props.color || '#165dff') + '33' },
            { offset: 1, color: (props.color || '#165dff') + '00' },
          ]),
        },
        data: props.yAxis,
      },
    ],
  }
}

const render = () => {
  if (!chart.value) return
  chart.value.setOption(buildOption())
}

onMounted(() => {
  if (!chartRef.value) return
  chart.value = echarts.init(chartRef.value)
  render()
  ro = new ResizeObserver(() => chart.value?.resize())
  ro.observe(chartRef.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  chart.value?.dispose()
  chart.value = null
})

watch(() => [props.xAxis, props.yAxis, props.color], render, { deep: true })
</script>

<template>
  <div ref="chartRef" class="w-full h-full" />
</template>
