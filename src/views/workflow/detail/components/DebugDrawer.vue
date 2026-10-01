<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { IconCheckCircleFill } from '@arco-design/web-vue/es/icon'
import { useDebugWorkflow } from '@/hooks/use-workflow'

const props = withDefaults(
  defineProps<{
    visible: boolean
    workflowId: string
    nodes: Record<string, any>[]
    edges: Record<string, any>[]
  }>(),
  { visible: false, workflowId: '', nodes: () => [], edges: () => [] },
)

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'node-status', nodeId: string, status: string, data: Record<string, any>): void
  (e: 'finished'): void
}>()

const { handleDebugWorkflow } = useDebugWorkflow()

const activeTab = ref('input')
const debugInputs = ref<Record<string, any>>({})
const debugLoading = ref(false)

// 节点事件列表
const nodeEvents = ref<Record<string, any>[]>([])
// 各节点最新状态
const nodeStatusMap = ref<Record<string, { status: string; data: Record<string, any> }>>({})
// 最终输出
const finalOutputs = ref<Record<string, any>>({})
// 统计：总耗时 / 总消耗 tokens / 插件耗时（tool 节点累加）
const totalLatency = ref(0)
const totalTokens = ref(0)
const pluginLatency = ref(0)
// 当前正在执行的节点标题（用于顶部"xxx节点正在执行中"提示）
const currentRunningTitle = ref('')

/**
 * 从事件中提取 token 消耗：兼容后端可能的字段名
 * - event.tokens / event.token_count / event.total_token_count
 * - event.usage.total_tokens / event.usage.prompt_tokens + event.usage.completion_tokens
 */
const extractTokens = (event: Record<string, any>): number => {
  if (typeof event.tokens === 'number') return event.tokens
  if (typeof event.token_count === 'number') return event.token_count
  if (typeof event.total_token_count === 'number') return event.total_token_count
  const usage = event.usage
  if (usage && typeof usage === 'object') {
    if (typeof usage.total_tokens === 'number') return usage.total_tokens
    const prompt = typeof usage.prompt_tokens === 'number' ? usage.prompt_tokens : 0
    const completion = typeof usage.completion_tokens === 'number' ? usage.completion_tokens : 0
    if (prompt || completion) return prompt + completion
  }
  return 0
}

/**
 * 从后端 error 字段提取可读的错误信息：
 * - 字符串直接返回
 * - 对象兼容嵌套结构 {code, error:{code, message}} / {code, message} / {error: string}
 * - 兜底 JSON.stringify，避免 [object Object]
 */
const extractErrorMessage = (err: any): string => {
  if (!err) return '工作流执行失败'
  if (typeof err === 'string') return err
  if (typeof err === 'object') {
    if (typeof err.error?.message === 'string') return err.error.message
    if (typeof err.message === 'string') return err.message
    if (typeof err.error === 'string') return err.error
    try {
      return JSON.stringify(err)
    } catch {
      return '工作流执行失败'
    }
  }
  return '工作流执行失败'
}

/** 提取字段字面量：兼容后端嵌套 {type:'literal',content:xxx} 结构（含 content 包 content 的脏数据），避免输入框显示 [object Object] */
const normalizeVarValue = (val: any): string | number | boolean => {
  let cur = val
  for (let i = 0; i < 5; i++) {
    if (cur && typeof cur === 'object' && 'content' in cur) {
      cur = cur.content
      continue
    }
    break
  }
  if (cur === null || cur === undefined || typeof cur === 'object') return ''
  return cur
}

const startNodeInputs = computed(() => {
  const startNode = props.nodes.find((n) => n.type === 'start')
  if (!startNode?.data?.inputs) return []
  return startNode.data.inputs.map((f: Record<string, any>) => ({
    name: f.name,
    type: f.type,
    required: f.required ?? true,
    value: normalizeVarValue(f.value),
  }))
})

const formatVarType = (t: string) => {
  const map: Record<string, string> = {
    string: 'String',
    int: 'Number',
    float: 'Number',
    boolean: 'Boolean',
  }
  return map[t] ?? t
}

watch(
  () => props.visible,
  (val) => {
    if (!val) return
    activeTab.value = 'input'
    debugInputs.value = {}
    nodeEvents.value = []
    nodeStatusMap.value = {}
    finalOutputs.value = {}
    totalLatency.value = 0
    totalTokens.value = 0
    pluginLatency.value = 0
    currentRunningTitle.value = ''
    startNodeInputs.value.forEach((f: Record<string, any>) => {
      debugInputs.value[f.name] = f.value ?? ''
    })
  },
  { immediate: true },
)

const handleClose = () => {
  emit('update:visible', false)
}

const statusColor = (status: string) => {
  if (status === 'succeeded') return '#00b42a'
  if (status === 'failed') return '#f53f3f'
  if (status === 'running') return '#165dff'
  return '#86909c'
}

const statusText = (status: string) => {
  if (status === 'succeeded') return '成功'
  if (status === 'failed') return '失败'
  if (status === 'running') return '运行中'
  return status
}

const handleRun = async () => {
  // 校验边信息：无连线时后端无法确定执行顺序，直接拦截
  if (!props.edges.length) {
    Message.warning('请先连接工作流节点后再运行调试')
    return
  }

  const missing = startNodeInputs.value.filter(
    (f: Record<string, any>) => f.required && !debugInputs.value[f.name],
  )
  if (missing.length) {
    Message.warning(`请填写必填参数：${missing.map((f: Record<string, any>) => f.name).join('、')}`)
    return
  }

  debugLoading.value = true
  nodeEvents.value = []
  nodeStatusMap.value = {}
  finalOutputs.value = {}
  totalLatency.value = 0
  totalTokens.value = 0
  pluginLatency.value = 0
  currentRunningTitle.value = ''
  // 校验通过后立即切换到输出 tab，便于查看执行过程
  activeTab.value = 'output'

  try {
    await handleDebugWorkflow(props.workflowId, debugInputs.value, (raw: Record<string, any>) => {
      const event = raw.data ?? raw
      const status = event.status ?? 'running'

      // 顶层失败事件：可能无 node_data（工作流级错误），先处理错误提示再决定是否记录节点
      if (status === 'failed') {
        const errMsg = extractErrorMessage(event.error)
        Message.error(errMsg)
        currentRunningTitle.value = ''
      }

      // 顶层成功事件：后端调试已完成（工作流级事件无 node_data），通知父组件刷新工作流状态
      if (status === 'succeeded' && !event.node_data) {
        emit('finished')
        return
      }

      // 无 node_data 的事件（如纯工作流级失败）不再走节点记录逻辑
      if (!event.node_data) return

      const nodeId = event.node_data.id
      const nodeType = event.node_data.node_type
      const nodeTitle = event.node_data.title ?? nodeId
      const errMsg = status === 'failed' ? extractErrorMessage(event.error) : ''

      // 记录事件（失败时把提取后的错误文本存入，便于列表展示）
      nodeEvents.value.push({
        nodeId,
        nodeType,
        title: nodeTitle,
        status,
        inputs: event.inputs ?? {},
        outputs: event.outputs ?? {},
        latency: event.latency ?? 0,
        error: errMsg,
      })

      // 更新节点状态
      nodeStatusMap.value[nodeId] = { status, data: event }
      emit('node-status', nodeId, status, event)

      // 节点正在执行时，更新顶部"正在执行中"提示；节点已结束（成功/失败）则清空
      if (status === 'running') {
        currentRunningTitle.value = nodeTitle
      } else if (status === 'succeeded' || status === 'failed') {
        currentRunningTitle.value = ''
      }

      // 累加耗时
      const evtLatency = event.latency ?? 0
      totalLatency.value += evtLatency
      // 插件节点（后端 node_type 为 tool）耗时单独累加
      if (nodeType === 'tool' || nodeType === 'plugin') {
        pluginLatency.value += evtLatency
      }
      // 累加 token 消耗
      totalTokens.value += extractTokens(event)

      // 结束节点：取最终输出
      if (nodeType === 'end' && status === 'succeeded') {
        finalOutputs.value = event.outputs ?? {}
      }
    })
  } catch (e: any) {
    Message.error(e?.message ?? '调试失败')
  } finally {
    debugLoading.value = false
  }
}
</script>

<template>
  <a-drawer
    :visible="visible"
    title="工作流调试"
    :width="400"
    :footer="false"
    :mask="false"
    :wrap-style="{ position: 'absolute', top: 0, right: 0 }"
    :drawer-style="{
      borderLeft: '1px solid #e5e6eb',
      background: '#ffffff',
      boxShadow: '-2px 0 8px rgba(0,0,0,0.06)',
    }"
    @cancel="handleClose"
  >
    <a-tabs v-model:active-key="activeTab" class="mb-4">
      <a-tab-pane key="input" title="输入" />
      <a-tab-pane key="output" title="输出" />
    </a-tabs>

    <!-- 输入面板 -->
    <div v-if="activeTab === 'input'" class="space-y-3">
      <div v-for="field in startNodeInputs" :key="field.name" class="space-y-1.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[13px] font-medium text-[#1d2129]">{{ field.name }}</span>
          <span v-if="field.required" class="text-[#f53f3f]">*</span>
          <span class="rounded bg-[#f2f3f5] px-1.5 py-0.5 text-[11px] text-[#86909c]">
            {{ formatVarType(field.type) }}
          </span>
        </div>
        <a-input
          v-model="debugInputs[field.name]"
          placeholder="请填写输入参数值"
          size="small"
        />
      </div>
      <div v-if="!startNodeInputs.length" class="py-8 text-center text-[13px] text-[#86909c]">
        开始节点暂无输入参数
      </div>

      <div class="pt-4">
        <a-button
          type="primary"
          long
          size="large"
          :loading="debugLoading"
          class="!h-10 !rounded-md !bg-[#165dff] !text-[14px] !font-medium"
          @click="handleRun"
        >
          <template #icon>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 2.5L11 7L4 11.5V2.5Z" fill="currentColor"/>
            </svg>
          </template>
          开始运行
        </a-button>
      </div>
    </div>

    <!-- 输出面板 -->
    <div v-else-if="activeTab === 'output'" class="space-y-3">
      <!-- 正在执行中提示 -->
      <div
        v-if="currentRunningTitle"
        class="flex items-center gap-2 rounded-lg bg-[#e8f3ff] p-3 text-[13px] text-[#165dff]"
      >
        <icon-loading :size="14" spin />
        <span>{{ currentRunningTitle }}节点正在执行中</span>
      </div>

      <!-- 节点执行列表 -->
      <div v-if="nodeEvents.length" class="space-y-2">
        <div
          v-for="(evt, idx) in nodeEvents"
          :key="idx"
          class="rounded-lg border border-[#e5e6eb] p-3"
        >
          <div class="mb-2 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-[13px] font-medium text-[#1d2129]">{{ evt.title }}</span>
              <span class="rounded bg-[#f2f3f5] px-1.5 py-0.5 text-[11px] text-[#86909c]">
                {{ evt.nodeType }}
              </span>
            </div>
            <div class="flex items-center gap-1 text-[12px]" :style="{ color: statusColor(evt.status) }">
              <icon-check-circle-fill v-if="evt.status === 'succeeded'" :size="12" />
              <span>{{ statusText(evt.status) }}</span>
              <span v-if="evt.latency" class="text-[#86909c]">{{ evt.latency.toFixed(2) }}s</span>
            </div>
          </div>

          <!-- 输入输出 -->
          <div v-if="Object.keys(evt.inputs).length" class="mb-1 text-[12px]">
            <span class="text-[#86909c]">输入：</span>
            <span class="text-[#4e5969]">{{ JSON.stringify(evt.inputs) }}</span>
          </div>
          <div v-if="Object.keys(evt.outputs).length" class="text-[12px]">
            <span class="text-[#86909c]">输出：</span>
            <span class="text-[#4e5969]">{{ JSON.stringify(evt.outputs) }}</span>
          </div>
          <div v-if="evt.error" class="mt-1 text-[12px] text-[#f53f3f]">{{ evt.error }}</div>
        </div>
      </div>

      <!-- 最终输出 -->
      <div v-if="Object.keys(finalOutputs).length" class="space-y-2">
        <div class="rounded-lg bg-[#f0f9eb] p-3">
          <div class="mb-2 flex items-center gap-1 text-[13px] text-[#00b42a]">
            <icon-check-circle-fill :size="14" />
            <span>运行成功</span>
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div>
              <div class="text-[11px] text-[#86909c]">总消耗</div>
              <div class="text-[14px] font-medium text-[#1d2129]">{{ totalTokens }} Tokens</div>
            </div>
            <div>
              <div class="text-[11px] text-[#86909c]">总用时</div>
              <div class="text-[14px] font-medium text-[#1d2129]">{{ totalLatency.toFixed(2) }}s</div>
            </div>
            <div>
              <div class="text-[11px] text-[#86909c]">插件耗时</div>
              <div class="text-[14px] font-medium text-[#1d2129]">{{ pluginLatency.toFixed(2) }}s</div>
            </div>
          </div>
        </div>
        <div
          class="max-h-[300px] overflow-y-auto rounded-lg bg-[#1d2129] p-3 text-[13px] leading-relaxed text-[#e5e6eb]"
        >
          <div v-for="(val, key) in finalOutputs" :key="key">
            <span class="text-[#86909c]">{{ key }}：</span>{{ val }}
          </div>
        </div>
      </div>

      <div v-if="!nodeEvents.length && !Object.keys(finalOutputs).length" class="py-8 text-center text-[13px] text-[#86909c]">
        暂无输出内容
      </div>
    </div>
  </a-drawer>
</template>

<style scoped>
:deep(.arco-drawer-header) {
  border-bottom: 1px solid #e5e6eb;
  padding: 12px 16px;
}
:deep(.arco-drawer-body) {
  padding: 16px;
  overflow-y: auto;
}
:deep(.arco-tabs-nav-type-line .arco-tabs-tab) {
  padding: 6px 0;
  margin-right: 20px;
  font-size: 13px;
}
:deep(.arco-tabs-nav-type-line .arco-tabs-tab-active) {
  color: #165dff;
  font-weight: 500;
}
</style>
