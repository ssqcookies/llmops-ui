<script setup lang="ts">
/** 模型设置弹窗（应用编排详情页）—— 模型列表与参数范围来自 language-models 接口 */
import { ref, watch, computed } from 'vue'
import type { GetLanguageModelsResponse } from '@/models/language-model'
import { useGetLanguageModels } from '@/hooks/use-language-model'
import type { ModelConfig } from '../types'

/** 后端参数名 → ModelConfig 字段映射（参数区，order 控制渲染顺序） */
const PARAM_KEY_MAP: Record<string, { key: NumericModelKey; order: number }> = {
  temperature: { key: 'temperature', order: 0 },
  top_p: { key: 'topP', order: 1 },
  presence_penalty: { key: 'presencePenalty', order: 2 },
  frequency_penalty: { key: 'frequencyPenalty', order: 3 },
}

/** 后端“最大回复长度”参数名（不同模型可能是 max_completion_tokens / max_tokens） */
const MAX_TOKENS_NAMES = ['max_completion_tokens', 'max_tokens']

type ProviderGroup = GetLanguageModelsResponse['data'][number]
type ModelItem = ProviderGroup['models'][number]
type ModelParam = ModelItem['parameters'][number]
type FlatEntry = { provider: ProviderGroup; model: ModelItem }

/** ModelConfig 中的数值字段（排除 model / provider 字符串字段） */
type NumericModelKey = Exclude<keyof ModelConfig, 'model' | 'provider'>

/** 参数行渲染结构 */
interface ParamRow {
  key: NumericModelKey
  label: string
  help: string
  min: number
  max: number
  step: number
  precision: number
}

/** 接口未返回参数时的兜底行（与原型一致） */
const FALLBACK_ROWS: ParamRow[] = [
  { key: 'temperature', label: '温度', help: '控制生成结果的随机性，值越大越发散', min: 0, max: 2, step: 0.1, precision: 1 },
  { key: 'topP', label: 'Top P', help: '核采样阈值，只保留累计概率达到 P 的 token', min: 0, max: 1, step: 0.01, precision: 2 },
  { key: 'presencePenalty', label: '存在惩罚', help: '对已出现的 token 施加惩罚，减少重复内容', min: -2, max: 2, step: 0.1, precision: 1 },
  { key: 'frequencyPenalty', label: '频率惩罚', help: '对高频出现的 token 施加更大惩罚', min: -2, max: 2, step: 0.1, precision: 1 },
]

const props = defineProps<{
  visible: boolean
  modelConfig: ModelConfig
}>()

const emit = defineEmits<{
  (e: 'update:modelConfig', value: ModelConfig): void
  (e: 'cancel'): void
}>()

const { loading, language_models, loadLanguageModels } = useGetLanguageModels()

/** 下拉面板展开状态（驱动箭头旋转） */
const popupVisible = ref(false)

const localConfig = ref<ModelConfig>({ ...props.modelConfig })

watch(
  () => props.visible,
  async (val) => {
    if (!val) return
    localConfig.value = { ...props.modelConfig }
    if (language_models.value.length === 0) await loadLanguageModels()
    const matched = findEntry(localConfig.value.model)
    if (matched) {
      // 传入配置命中真实模型：保留已有值，仅把最大回复长度收敛到该模型参数上限
      localConfig.value.maxReplyLength = Math.min(
        localConfig.value.maxReplyLength,
        getMaxUpper(matched.model),
      )
    } else {
      // 历史默认值（如 GPT-4o）或空值匹配不上：自动选中第一个模型并应用接口默认值
      const first = flatModels()[0]
      if (first) applyModelDefaults(first)
    }
  },
)

watch(
  () => props.modelConfig,
  (val) => {
    localConfig.value = { ...val }
  },
  { deep: true },
)

/** 平铺所有模型（附带 provider） */
function flatModels(): FlatEntry[] {
  const list: FlatEntry[] = []
  language_models.value.forEach((p: ProviderGroup) => {
    p.models.forEach((m: ModelItem) => list.push({ provider: p, model: m }))
  })
  return list
}

/** 按模型 name（选中值）匹配，兼容历史草稿里存的 label */
function findEntry(name: string): FlatEntry | undefined {
  if (!name) return undefined
  return flatModels().find((it) => it.model.name === name || it.model.label === name)
}

/** 当前选中模型条目 */
const currentModel = computed(() => findEntry(localConfig.value.model))

/** 取模型“最大回复长度”参数（max_completion_tokens 优先，兼容 max_tokens） */
const getMaxTokensParam = (model: ModelItem): ModelParam | undefined =>
  model.parameters?.find((p) => MAX_TOKENS_NAMES.includes(p.name))

/** 最大回复长度上限：取参数自身 max（use_template=max_output_tokens 模板值），回退模型字段 */
const getMaxUpper = (model: ModelItem): number => {
  const fromParam = Number(getMaxTokensParam(model)?.max)
  if (fromParam > 0) return fromParam
  return Number(model.max_output_tokens) || 128000
}

/** 当前模型的最大回复长度上限（驱动滑杆） */
const maxOutputMax = computed(() =>
  currentModel.value ? getMaxUpper(currentModel.value.model) : 128000,
)

/** 应用某个模型的接口默认值（4 个采样参数 + 最大回复长度） */
const applyModelDefaults = (entry: FlatEntry) => {
  // 选中值用模型 name（如 deepseek-v3），显示由 label 负责
  localConfig.value.model = entry.model.name
  entry.model.parameters?.forEach((p: ModelParam) => {
    const mapped = PARAM_KEY_MAP[p.name]
    if (mapped && p.default !== undefined && p.default !== null) {
      localConfig.value[mapped.key] = Number(p.default)
    }
  })
  const maxParam = getMaxTokensParam(entry.model)
  const upper = getMaxUpper(entry.model)
  const def = maxParam?.default
  localConfig.value.maxReplyLength = Math.min(
    def !== undefined && def !== null ? Number(def) : upper,
    upper,
  )
}

/** 切换模型：全部参数重置为新模型的接口默认值 */
const handleModelChange = () => {
  const entry = findEntry(localConfig.value.model)
  if (entry) applyModelDefaults(entry)
}

/** token 数格式化：8192 → 8K，16384 → 16K，1000000 → 1M */
const fmtTokens = (n: number): string => {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}K`
  return `${n}`
}

/** 参数区行：优先取当前模型 parameters（min/max/step/精度/help 全由接口驱动），异常时兜底 */
const paramRows = computed<ParamRow[]>(() => {
  const params = currentModel.value?.model.parameters
  if (!params || params.length === 0) return FALLBACK_ROWS
  const rows: (ParamRow & { order: number })[] = []
  params.forEach((p: ModelParam) => {
    const mapped = PARAM_KEY_MAP[p.name]
    if (!mapped) return
    const precision = p.precision ?? 1
    rows.push({
      key: mapped.key,
      order: mapped.order,
      label: p.label,
      help: p.help,
      min: Number(p.min ?? 0),
      max: Number(p.max ?? 1),
      step: 1 / 10 ** precision,
      precision,
    })
  })
  return rows.sort((a, b) => a.order - b.order)
})

/** 步进 +/−（对齐 step 与精度，且不越界） */
const stepValue = (row: ParamRow, delta: number) => {
  const cur = localConfig.value[row.key] as number
  const next = Math.min(row.max, Math.max(row.min, cur + delta))
  const aligned = Math.round(next / row.step) * row.step
  localConfig.value[row.key] = +aligned.toFixed(row.precision)
}

/** 固定行展示值（整数控） */
const displayInt = (key: NumericModelKey): string => `${localConfig.value[key]}`

/** 参数行展示值（按接口精度格式化） */
const displayFixed = (row: ParamRow): string => (localConfig.value[row.key] as number).toFixed(row.precision)

const handleOk = () => {
  // 带上当前 provider 唯一标识（如 deepseek、qwenlm）
  if (currentModel.value) {
    localConfig.value.provider = currentModel.value.provider.name
  }
  emit('update:modelConfig', { ...localConfig.value })
}

const handleCancel = () => {
  emit('cancel')
}
</script>

<template>
  <a-modal
    :visible="visible"
    title="模型设置"
    :footer="false"
    :mask-closable="false"
    width="480px"
    @cancel="handleCancel"
  >
    <div class="py-2">
      <!-- ========== 模型选择（provider 分组，接口驱动） ========== -->
      <div class="mb-5">
        <div class="text-[13px] text-[#1d2129] mb-2">模型</div>
        <a-select
          v-model="localConfig.model"
          placeholder="请选择模型"
          :loading="loading"
          class="w-full"
          @change="handleModelChange"
          @popup-visible-change="popupVisible = $event"
        >
          <!-- 选中态：通用图标 + 厂商 · 模型 + token 标签 + 下拉箭头 -->
          <template #trigger>
            <div class="flex items-center gap-2 w-full h-8">
              <template v-if="currentModel">
                <span class="w-6 h-6 rounded-[6px] bg-[#f2f3f5] flex items-center justify-center shrink-0">
                  <icon-robot class="text-[#86909c] text-[14px]" />
                </span>
                <span class="text-[14px] text-[#1d2129] truncate">
                  {{ currentModel.provider.label || currentModel.provider.name }} · {{ currentModel.model.label }}
                </span>
                <span class="shrink-0 px-2 py-0.5 rounded-[6px] bg-[#f2f3f5] text-[12px] text-[#4e5969]">
                  {{ fmtTokens(currentModel.model.max_output_tokens) }}
                </span>
              </template>
              <span v-else class="text-[14px] text-[#c9cdd4]">请选择模型</span>
              <icon-down
                class="ml-auto shrink-0 text-[#86909c] text-[12px] transition-transform duration-200"
                :class="popupVisible ? 'rotate-180' : ''"
              />
            </div>
          </template>
          <a-optgroup
            v-for="provider in language_models"
            :key="provider.name"
            :label="provider.label || provider.name"
          >
            <a-option
              v-for="model in provider.models"
              :key="`${provider.name}-${model.name}`"
              :value="model.name"
            >
              <div class="flex items-center gap-2">
                <span class="w-5 h-5 rounded-[4px] bg-[#f2f3f5] flex items-center justify-center shrink-0">
                  <icon-robot class="text-[#86909c] text-[12px]" />
                </span>
                <span class="text-[13px] text-[#1d2129]">{{ model.label }}</span>
                <span class="ml-auto shrink-0 text-[12px] text-[#86909c]">
                  {{ fmtTokens(model.max_output_tokens) }}
                </span>
              </div>
            </a-option>
          </a-optgroup>
        </a-select>
      </div>

      <!-- ========== 分区：参数（min/max/step/help 由所选模型接口驱动） ========== -->
      <div class="text-[13px] text-[#1d2129] font-medium mb-3">参数</div>

      <div
        v-for="row in paramRows"
        :key="row.key"
        class="flex items-center gap-3 mb-3"
      >
        <div class="flex items-center gap-1 w-[72px] shrink-0">
          <span class="text-[13px] text-[#4e5969]">{{ row.label }}</span>
          <a-tooltip :content="row.help">
            <icon-info-circle class="text-[#c9cdd4] text-[12px]" />
          </a-tooltip>
        </div>
        <a-slider
          v-model="localConfig[row.key]"
          :min="row.min"
          :max="row.max"
          :step="row.step"
          class="flex-1"
        />
        <div class="flex items-center gap-1 shrink-0">
          <span class="w-10 text-right text-[13px] text-[#1d2129]">{{ displayFixed(row) }}</span>
          <a-button size="mini" @click="stepValue(row, -row.step)">-</a-button>
          <a-button size="mini" @click="stepValue(row, row.step)">+</a-button>
        </div>
      </div>

      <!-- ========== 分区：输入及输出设置 ========== -->
      <div class="text-[13px] text-[#1d2129] font-medium mb-3">输入及输出设置</div>

      <!-- 携带上下文轮数 -->
      <div class="flex items-center gap-3 mb-3">
        <div class="flex items-center gap-1 w-[96px] shrink-0">
          <span class="text-[13px] text-[#4e5969]">携带上下文轮数</span>
          <a-tooltip content="对话历史携带轮数">
            <icon-info-circle class="text-[#c9cdd4] text-[12px]" />
          </a-tooltip>
        </div>
        <a-slider
          v-model="localConfig.contextRounds"
          :min="0"
          :max="50"
          :step="1"
          class="flex-1"
        />
        <div class="flex items-center gap-1 shrink-0">
          <span class="w-10 text-right text-[13px] text-[#1d2129]">{{ displayInt('contextRounds') }}</span>
          <a-button size="mini" @click="localConfig.contextRounds = Math.max(0, localConfig.contextRounds - 1)">-</a-button>
          <a-button size="mini" @click="localConfig.contextRounds = Math.min(50, localConfig.contextRounds + 1)">+</a-button>
        </div>
      </div>

      <!-- 最大回复长度（上限跟随模型 max_completion_tokens 参数的 max） -->
      <div class="flex items-center gap-3 mb-5">
        <div class="flex items-center gap-1 w-[96px] shrink-0">
          <span class="text-[13px] text-[#4e5969]">最大回复长度</span>
          <a-tooltip content="单次回复的最大 token 数">
            <icon-info-circle class="text-[#c9cdd4] text-[12px]" />
          </a-tooltip>
        </div>
        <a-slider
          v-model="localConfig.maxReplyLength"
          :min="1"
          :max="maxOutputMax"
          :step="1"
          class="flex-1"
        />
        <div class="flex items-center gap-1 shrink-0">
          <span class="w-14 text-right text-[13px] text-[#1d2129]">{{ displayInt('maxReplyLength') }}</span>
          <a-button size="mini" @click="localConfig.maxReplyLength = Math.max(1, localConfig.maxReplyLength - 1)">-</a-button>
          <a-button size="mini" @click="localConfig.maxReplyLength = Math.min(maxOutputMax, localConfig.maxReplyLength + 1)">+</a-button>
        </div>
      </div>

      <!-- ========== 底部按钮 ========== -->
      <div class="flex justify-end gap-2 pt-3 border-t border-[#f2f3f5]">
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" @click="handleOk">确定</a-button>
      </div>
    </div>
  </a-modal>
</template>
