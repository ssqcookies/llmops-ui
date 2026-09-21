/** 应用编排详情页 - 弹窗/抽屉状态管理 */
import { reactive } from 'vue'
import type { PluginItem, WorkflowItem, KnowledgeItem, ModelConfig, RetrievalConfig, VoiceConfig, ContentReviewConfig, LongTermMemoryConfig, PluginCategory } from './types'

/** 弹窗与抽屉的集中状态 */
export interface DialogState {
  /** 模型设置弹窗 */
  modelSettingsVisible: boolean
  modelConfig: ModelConfig

  /** 长期记忆弹窗 */
  longTermMemoryVisible: boolean
  longTermMemory: LongTermMemoryConfig

  /** 检索设置弹窗 */
  retrievalVisible: boolean
  retrievalConfig: RetrievalConfig

  /** 语音输出弹窗 */
  voiceVisible: boolean
  voiceConfig: VoiceConfig

  /** 内容审查弹窗 */
  contentReviewVisible: boolean
  contentReviewConfig: ContentReviewConfig

  /** 取消发布确认弹窗 */
  cancelPublishVisible: boolean

  /** 添加插件抽屉 */
  addPluginVisible: boolean
  addPluginCategory: PluginCategory

  /** 插件信息&设置抽屉 */
  pluginSettingsVisible: boolean
  currentPlugin: PluginItem | null

  /** 关联工作流抽屉 */
  associateWorkflowVisible: boolean
  selectedWorkflows: WorkflowItem[]

  /** 选择知识库抽屉 */
  selectKnowledgeVisible: boolean
  selectedKnowledges: KnowledgeItem[]
}

/** 默认模型配置 */
const defaultModelConfig: ModelConfig = {
  model: 'GPT-4o',
  temperature: 1.0,
  topP: 0.48,
  presencePenalty: 0.1,
  frequencyPenalty: 0.1,
  contextRounds: 10,
  maxReplyLength: 8192,
}

const defaultLongTermMemory: LongTermMemoryConfig = {
  enabled: false,
  content: '',
}

const defaultRetrievalConfig: RetrievalConfig = {
  strategy: 'hybrid',
  maxRecall: 10,
  minMatchScore: 0.5,
}

const defaultVoiceConfig: VoiceConfig = {
  voice: '晓晓',
  autoPlay: true,
}

const defaultContentReviewConfig: ContentReviewConfig = {
  keywords: [],
  reviewInput: false,
  presetReply: '该内容无法提供服务',
  reviewOutput: false,
}

/** 创建弹窗状态 */
function createDialogState(): DialogState {
  return reactive<DialogState>({
    modelSettingsVisible: false,
    modelConfig: { ...defaultModelConfig },

    longTermMemoryVisible: false,
    longTermMemory: { ...defaultLongTermMemory },

    retrievalVisible: false,
    retrievalConfig: { ...defaultRetrievalConfig },

    voiceVisible: false,
    voiceConfig: { ...defaultVoiceConfig },

    contentReviewVisible: false,
    contentReviewConfig: { ...defaultContentReviewConfig },

    cancelPublishVisible: false,

    addPluginVisible: false,
    addPluginCategory: '全部',

    pluginSettingsVisible: false,
    currentPlugin: null,

    associateWorkflowVisible: false,
    selectedWorkflows: [],

    selectKnowledgeVisible: false,
    selectedKnowledges: [],
  })
}

/** 打开/关闭方法集合 */
export function useDialogs() {
  const state = createDialogState()

  /** 打开模型设置弹窗（保留 state.modelConfig 当前值，不重置） */
  const openModelSettings = () => {
    state.modelSettingsVisible = true
  }
  const closeModelSettings = () => {
    state.modelSettingsVisible = false
  }

  /** 打开/关闭长期记忆弹窗（保留当前值） */
  const openLongTermMemory = () => {
    state.longTermMemoryVisible = true
  }
  const closeLongTermMemory = () => {
    state.longTermMemoryVisible = false
  }

  /** 打开/关闭检索设置弹窗（保留当前值） */
  const openRetrieval = () => {
    state.retrievalVisible = true
  }
  const closeRetrieval = () => {
    state.retrievalVisible = false
  }

  /** 打开/关闭语音输出弹窗（保留当前值） */
  const openVoice = () => {
    state.voiceVisible = true
  }
  const closeVoice = () => {
    state.voiceVisible = false
  }

  /** 打开/关闭内容审查弹窗（保留当前值） */
  const openContentReview = () => {
    state.contentReviewVisible = true
  }
  const closeContentReview = () => {
    state.contentReviewVisible = false
  }

  /** 打开/关闭取消发布确认弹窗 */
  const openCancelPublish = () => {
    state.cancelPublishVisible = true
  }
  const closeCancelPublish = () => {
    state.cancelPublishVisible = false
  }

  /** 打开/关闭添加插件抽屉 */
  const openAddPlugin = () => {
    state.addPluginCategory = '全部'
    state.addPluginVisible = true
  }
  const closeAddPlugin = () => {
    state.addPluginVisible = false
  }

  /** 打开/关闭插件信息&设置抽屉 */
  const openPluginSettings = (plugin: PluginItem) => {
    state.currentPlugin = plugin
    state.pluginSettingsVisible = true
  }
  const closePluginSettings = () => {
    state.pluginSettingsVisible = false
    state.currentPlugin = null
  }

  /** 打开/关闭关联工作流抽屉 */
  const openAssociateWorkflow = () => {
    state.selectedWorkflows = []
    state.associateWorkflowVisible = true
  }
  const closeAssociateWorkflow = () => {
    state.associateWorkflowVisible = false
  }

  /** 打开/关闭选择知识库抽屉 */
  const openSelectKnowledge = () => {
    state.selectedKnowledges = []
    state.selectKnowledgeVisible = true
  }
  const closeSelectKnowledge = () => {
    state.selectKnowledgeVisible = false
  }

  return {
    state,
    openModelSettings,
    closeModelSettings,
    openLongTermMemory,
    closeLongTermMemory,
    openRetrieval,
    closeRetrieval,
    openVoice,
    closeVoice,
    openContentReview,
    closeContentReview,
    openCancelPublish,
    closeCancelPublish,
    openAddPlugin,
    closeAddPlugin,
    openPluginSettings,
    closePluginSettings,
    openAssociateWorkflow,
    closeAssociateWorkflow,
    openSelectKnowledge,
    closeSelectKnowledge,
  }
}
