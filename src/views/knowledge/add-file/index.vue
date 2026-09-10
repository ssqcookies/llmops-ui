<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { createDocuments, getDocumentsStatus } from '@/services/dataset'
import type { CreateDocumentsRequest } from '@/models/dataset'
import { ROUTE_NAME } from '@/constants'
import UploadStep from './components/UploadStep.vue'
import SegmentStep from './components/SegmentStep.vue'
import ProcessingStep from './components/ProcessingStep.vue'
import type {
  AddFileStep,
  SegmentMode,
  UploadedFile,
  ProcessingDoc,
  CustomSegmentForm,
} from './types'

// ============================================================
// 常量（系统默认分段参数）
// ============================================================

/** 自动分段默认标识符 */
const AUTO_SEPARATORS = ['\n\n']
/** 自动分段默认分块长度 */
const AUTO_CHUNK_SIZE = 500
/** 分段重叠长度（设计稿不采集，沿用系统默认值） */
const DEFAULT_CHUNK_OVERLAP = 50
/** 处理进度轮询间隔 */
const POLL_INTERVAL = 2000

// ============================================================
// 路由
// ============================================================

const route = useRoute()
const router = useRouter()

const datasetId = computed(() => String(route.params.datasetId || ''))

// ============================================================
// 状态
// ============================================================

/** 当前步骤 */
const currentStep = ref<AddFileStep>(1)

/** 已上传文件 */
const uploadedFiles = ref<UploadedFile[]>([])

/** 分段模式：默认自动分段与清洗 */
const segmentMode = ref<SegmentMode>('automatic')

/** 自定义分段表单 */
const customForm = reactive<CustomSegmentForm>({
  separatorsText: '',
  chunkSize: undefined,
  removeExtraSpaces: false,
  removeUrlsEmails: false,
})

/** 步骤 2 组件引用（用于触发表单校验） */
const segmentStepRef = ref<InstanceType<typeof SegmentStep> | null>(null)

/** 提交 Loading */
const submitting = ref(false)

/** 处理中文档列表 */
const processingDocs = ref<ProcessingDoc[]>([])
/** 是否全部处理完成 */
const processingDone = ref(false)
/** 批处理标识 */
const batchId = ref('')
/** 轮询定时器 */
let pollTimer: ReturnType<typeof setInterval> | null = null

// ============================================================
// 计算属性
// ============================================================

/** 步骤条配置 */
const stepList = computed(() => [
  { index: 1 as AddFileStep, title: '上传' },
  { index: 2 as AddFileStep, title: '分段设置' },
  { index: 3 as AddFileStep, title: '数据处理' },
])

/** 步骤 1 是否允许进入下一步 */
const canNextStep1 = computed(() => uploadedFiles.value.length > 0)

// ============================================================
// 方法 —— 步骤 1
// ============================================================

/** 上传成功追加（按 id 去重） */
const handleUploaded = (file: UploadedFile) => {
  if (!uploadedFiles.value.some((f) => f.id === file.id)) {
    uploadedFiles.value.push(file)
  }
}

/** 移除已上传文件 */
const handleRemoveFile = (id: string) => {
  uploadedFiles.value = uploadedFiles.value.filter((f) => f.id !== id)
}

// ============================================================
// 方法 —— 步骤流转
// ============================================================

/** 返回知识库详情 */
const goBack = () => {
  stopPolling()
  router.push({
    name: ROUTE_NAME.KNOWLEDGE_DETAIL,
    params: { datasetId: datasetId.value },
  } as RouteLocationRaw)
}

/** 上一步 */
const handlePrev = () => {
  if (currentStep.value === 2) currentStep.value = 1
}

/** 步骤 1 → 2 */
const handleStep1Next = () => {
  if (!canNextStep1.value) {
    Message.warning('请先上传文件')
    return
  }
  currentStep.value = 2
}

/**
 * 步骤 2 → 3：
 * 1. 自定义模式先校验表单
 * 2. 组装 CreateDocumentsRequest 调接口
 * 3. 进入数据处理步骤并轮询
 */
const handleStep2Next = async () => {
  if (segmentMode.value === 'custom') {
    const valid = await segmentStepRef.value?.validate()
    if (!valid) return
  }
  if (!datasetId.value || uploadedFiles.value.length === 0) return

  submitting.value = true
  try {
    const req = buildCreateRequest()
    const res = await createDocuments(datasetId.value, req)
    if (res?.data?.batch) {
      batchId.value = res.data.batch
      currentStep.value = 3
      await fetchProcessingStatus()
      startPolling()
    } else {
      Message.error('提交失败，请稍后重试')
    }
  } catch {
    Message.error('提交失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

/** 步骤 3 确定：返回详情页（处理在服务端继续进行） */
const handleConfirm = () => {
  goBack()
}

// ============================================================
// 请求组装
// ============================================================

/** 分段标识符文本 → 数组（兼容中英文逗号） */
const parseSeparators = (text: string): string[] =>
  text
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean)

/** 按当前模式组装创建文档请求 */
const buildCreateRequest = (): CreateDocumentsRequest => {
  const isAuto = segmentMode.value === 'automatic'
  return {
    upload_file_ids: uploadedFiles.value.map((f) => f.id),
    process_type: segmentMode.value,
    rule: {
      pre_process_rules: isAuto
        ? [
            { id: 'remove_extra_space', enabled: true },
            { id: 'remove_url_and_email', enabled: false },
          ]
        : [
            { id: 'remove_extra_space', enabled: customForm.removeExtraSpaces },
            { id: 'remove_url_and_email', enabled: customForm.removeUrlsEmails },
          ],
      segment: isAuto
        ? {
            separators: AUTO_SEPARATORS,
            chunk_size: AUTO_CHUNK_SIZE,
            chunk_overlap: DEFAULT_CHUNK_OVERLAP,
          }
        : {
            separators: parseSeparators(customForm.separatorsText),
            chunk_size: Number(customForm.chunkSize),
            chunk_overlap: DEFAULT_CHUNK_OVERLAP,
          },
    },
  }
}

// ============================================================
// 处理进度轮询
// ============================================================

const startPolling = () => {
  stopPolling()
  pollTimer = setInterval(() => {
    fetchProcessingStatus()
  }, POLL_INTERVAL)
}

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

const fetchProcessingStatus = async () => {
  if (!datasetId.value || !batchId.value) return
  try {
    const res = await getDocumentsStatus(datasetId.value, batchId.value)
    if (res?.data) {
      processingDocs.value = res.data as ProcessingDoc[]
      // 状态归一化：全部进入 COMPLETED 或 ERROR 即视为服务端流程结束
      const allDone = processingDocs.value.every((d) =>
        ['completed', 'error'].includes(String(d.status || '').toLowerCase()),
      )
      if (allDone) {
        processingDone.value = true
        stopPolling()
      }
    }
  } catch {
    // 静默失败，下次轮询继续
  }
}

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="page-root w-full min-h-screen bg-[#fafbfc] flex flex-col">
    <div class="max-w-page w-full mx-auto px-8 py-6 flex-1 flex flex-col">
      <!-- ============== 头部：‹ 添加文件 ============== -->
      <header class="page-head">
        <div class="back-trigger" @click="goBack">
          <icon-left :size="16" />
          <span class="page-title">添加文件</span>
        </div>
      </header>

      <!-- ============== 步骤条 ============== -->
      <div class="step-bar">
        <template v-for="(step, idx) in stepList" :key="step.index">
          <div class="step-node">
            <!-- 已完成：浅蓝底 + 对勾 -->
            <div v-if="currentStep > step.index" class="step-circle step-circle-done">
              <icon-check :size="14" />
            </div>
            <!-- 当前：蓝色实心圆 + 数字 -->
            <div v-else-if="currentStep === step.index" class="step-circle step-circle-current">
              {{ step.index }}
            </div>
            <!-- 未到达：灰色圆 + 数字 -->
            <div v-else class="step-circle step-circle-todo">
              {{ step.index }}
            </div>
            <span
              :class="[
                'step-label',
                currentStep >= step.index ? 'step-label-active' : 'step-label-todo',
              ]"
            >
              {{ step.title }}
            </span>
          </div>
          <div v-if="idx < stepList.length - 1" class="step-line" />
        </template>
      </div>

      <!-- ============== 步骤内容 ============== -->
      <main class="step-content">
        <!-- 步骤 1：上传 -->
        <UploadStep
          v-if="currentStep === 1"
          :files="uploadedFiles"
          @uploaded="handleUploaded"
          @remove="handleRemoveFile"
        />

        <!-- 步骤 2：分段设置 -->
        <SegmentStep
          v-else-if="currentStep === 2"
          ref="segmentStepRef"
          :mode="segmentMode"
          :form="customForm"
          @update:mode="segmentMode = $event"
        />

        <!-- 步骤 3：数据处理 -->
        <ProcessingStep
          v-else
          :docs="processingDocs"
          :done="processingDone"
        />
      </main>

      <!-- ============== 底部操作区 ============== -->
      <footer class="page-footer">
        <!-- 步骤 1：仅下一步 -->
        <template v-if="currentStep === 1">
          <a-button
            type="primary"
            class="btn-next"
            :disabled="!canNextStep1"
            @click="handleStep1Next"
          >
            下一步
          </a-button>
        </template>

        <!-- 步骤 2：上一步 / 下一步（提交处理） -->
        <template v-else-if="currentStep === 2">
          <a-button class="btn-prev" @click="handlePrev">上一步</a-button>
          <a-button
            type="primary"
            class="btn-next"
            :loading="submitting"
            @click="handleStep2Next"
          >
            下一步
          </a-button>
        </template>

        <!-- 步骤 3：提示语 / 确定 -->
        <template v-else>
          <span class="footer-hint">点击确认不影响数据处理，处理完毕后可进行引用</span>
          <a-button type="primary" class="btn-next" @click="handleConfirm">确定</a-button>
        </template>
      </footer>
    </div>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .max-w-page {
    max-width: 1440px;
  }

  /* ===== 头部 ===== */
  .page-head {
    @apply h-10 flex items-center;
  }
  .back-trigger {
    @apply flex items-center gap-2 cursor-pointer text-[#1d2129]
           transition-colors hover:text-[#165dff];
  }
  .page-title {
    @apply text-[20px] font-semibold leading-7;
  }

  /* ===== 步骤条 ===== */
  .step-bar {
    @apply flex items-center justify-center mt-6 mb-8 px-4;
  }
  .step-node {
    @apply flex items-center gap-2.5 shrink-0;
  }
  .step-circle {
    @apply w-8 h-8 rounded-full flex items-center justify-center text-[14px]
           font-semibold shrink-0;
  }
  .step-circle-done {
    @apply bg-[#e8f3ff] text-[#165dff];
  }
  .step-circle-current {
    @apply bg-[#165dff] text-white;
  }
  .step-circle-todo {
    @apply bg-[#f2f3f5] text-[#86909c];
  }
  .step-label {
    @apply text-[15px];
  }
  .step-label-active {
    @apply text-[#1d2129] font-medium;
  }
  .step-label-todo {
    @apply text-[#86909c];
  }
  .step-line {
    @apply h-px w-40 bg-[#e5e6eb] mx-5 shrink-0;
  }

  /* ===== 内容区 ===== */
  .step-content {
    @apply flex-1 w-full;
  }

  /* ===== 底部操作区 ===== */
  .page-footer {
    @apply flex items-center justify-end gap-3 pt-6 pb-2 mt-4;
  }
  .footer-hint {
    @apply text-[13px] text-[#86909c] mr-2;
  }
  .btn-prev {
    @apply rounded-[6px] h-9 px-6;
  }
  .btn-next {
    @apply rounded-[6px] h-9 px-6;
  }
  .btn-next:deep(.arco-btn) {
    @apply rounded-[6px] h-9 px-6;
  }
}
</style>
