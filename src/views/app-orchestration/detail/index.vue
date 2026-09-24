<script setup lang="ts">
import { ref, computed, markRaw, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import {
  getApp,
  getDraftAppConfig,
  debugChat,
  stopDebugChat,
  getDebugConversationMessagesWithPage,
  deleteDebugConversation,
  publish,
  cancelPublish,
  updateDraftAppConfig,
} from '@/services/app'
import type { UpdateDraftAppConfigRequest } from '@/models/app'
import { uploadImage } from '@/services/upload-file'
import { generateSuggestedQuestions } from '@/services/ai'
import { formatTime } from '@/utils/format'
import type {
  CollapseGroup,
  ChatMessageItem,
  ChatPendingImage,
  ChatKnowledgeItem,
  PluginItem,
  PluginCategory,
} from './types'
import { useDialogs } from './useDialogs'
import { getIcon } from './icons'
import ConfigCollapse from './components/ConfigCollapse.vue'
import ChatDialog from './components/ChatDialog.vue'
import ModelSettingsModal from './components/ModelSettingsModal.vue'
import LongTermMemoryModal from './components/LongTermMemoryModal.vue'
import RetrievalConfigModal from './components/RetrievalConfigModal.vue'
import VoiceOutputModal from './components/VoiceOutputModal.vue'
import ContentReviewModal from './components/ContentReviewModal.vue'
import CancelPublishModal from './components/CancelPublishModal.vue'
import PublishHistoryDrawer from './components/PublishHistoryDrawer.vue'
import AddPluginDrawer from './components/AddPluginDrawer.vue'
import PluginSettingsDrawer from './components/PluginSettingsDrawer.vue'
import AssociateWorkflowDrawer from './components/AssociateWorkflowDrawer.vue'
import SelectKnowledgeDrawer from './components/SelectKnowledgeDrawer.vue'
import StatisticsPanel from './components/StatisticsPanel.vue'
import PublishConfigPanel from './components/PublishConfigPanel.vue'

const { state, openModelSettings, closeModelSettings, openLongTermMemory, closeLongTermMemory, openRetrieval, closeRetrieval, openVoice, closeVoice, openContentReview, closeContentReview, openCancelPublish, closeCancelPublish, openAddPlugin, closeAddPlugin, openPluginSettings, closePluginSettings, openAssociateWorkflow, closeAssociateWorkflow, openSelectKnowledge, closeSelectKnowledge } = useDialogs()
const router = useRouter()
const route = useRoute()
const activeTab = ref('edit')
const loading = ref(false)
const isSaving = ref(false)

/** 应用基础信息（从 GET /apps/:id 加载） */
const appId = computed(() => route.params.id as string)
const appName = ref('聊天机器人')
const appIcon = ref('')
const appDescription = ref('')
const savedTime = ref('--:--:--')
/** 最近编辑完整时间戳（秒），用于发布历史抽屉展示 */
const appLastEditedAt = ref<number | null>(null)
/** 应用发布状态（published / draft），用于发布历史抽屉是否显示"当前版本" */
const appStatus = ref('draft')

/** 根据后端秒级时间戳更新保存时间 */
const updateSavedTime = (timestamp: number) => {
  // 后端返回秒级；new Date 需要毫秒
  savedTime.value = formatTime(timestamp * 1000, 'HH:mm:ss')
}

/** 加载应用详情 + 草稿配置 */
const loadAppData = async () => {
  if (!appId.value) return
  try {
    const [appResp, draftResp] = await Promise.all([
      getApp(appId.value),
      getDraftAppConfig(appId.value),
    ])

    // 1.更新应用名 + 图标 + 描述 + 保存时间 + 发布状态
    appName.value = appResp.data.name || '聊天机器人'
    appIcon.value = appResp.data.icon || ''
    appDescription.value = appResp.data.description || ''
    appStatus.value = appResp.data.status || 'draft'
    if (appResp.data.draft_updated_at) {
      updateSavedTime(appResp.data.draft_updated_at)
      appLastEditedAt.value = appResp.data.draft_updated_at
    }

    // 1.1 加载调试会话历史消息
    loadDebugMessages()

    // 2.同步模型配置（草稿配置里的 model_config → state.modelConfig）
    const modelCfg = draftResp.data.model_config
    if (modelCfg) {
      state.modelConfig.provider = modelCfg.provider || state.modelConfig.provider
      state.modelConfig.model = modelCfg.model || state.modelConfig.model
      state.modelConfig.temperature = modelCfg.parameters?.temperature ?? state.modelConfig.temperature
      state.modelConfig.topP = modelCfg.parameters?.top_p ?? state.modelConfig.topP
      state.modelConfig.presencePenalty = modelCfg.parameters?.presence_penalty ?? state.modelConfig.presencePenalty
      state.modelConfig.frequencyPenalty = modelCfg.parameters?.frequency_penalty ?? state.modelConfig.frequencyPenalty
      state.modelConfig.maxReplyLength = modelCfg.parameters?.max_tokens ?? state.modelConfig.maxReplyLength
    }

    // 3.同步开场白等其他草稿字段
    if (draftResp.data.preset_prompt) {
      personaPrompt.value = draftResp.data.preset_prompt
    }
    // 3.同步其他草稿字段（开场白、语音开关、审查配置等）
    if (draftResp.data.opening_statement !== undefined) {
      openingText.value = draftResp.data.opening_statement
    }
    if (draftResp.data.opening_questions) {
      // 接口返回空数组时也要保证至少一行空输入框
      openingQuestions.value = draftResp.data.opening_questions.length > 0
        ? draftResp.data.opening_questions
        : ['']
    } else {
      openingQuestions.value = ['']
    }
    if (draftResp.data.speech_to_text?.enable !== undefined) {
      voiceInputEnabled.value = !!draftResp.data.speech_to_text.enable
    }
    if (draftResp.data.text_to_speech?.enable !== undefined) {
      voiceOutputEnabled.value = !!draftResp.data.text_to_speech.enable
    }
    if (draftResp.data.long_term_memory?.enable !== undefined) {
      longTermMemoryEnabled.value = !!draftResp.data.long_term_memory.enable
      state.longTermMemory.enabled = longTermMemoryEnabled.value
    }
    if (draftResp.data.suggested_after_answer?.enable !== undefined) {
      showUserSuggestions.value = !!draftResp.data.suggested_after_answer.enable
    }
    if (draftResp.data.review_config) {
      state.contentReviewConfig.reviewInput = draftResp.data.review_config.inputs_config?.enable ?? false
      state.contentReviewConfig.reviewOutput = draftResp.data.review_config.outputs_config?.enable ?? false
    }
    // TODO: 同步 tools → activePlugins、datasets → activeKnowledges、workflows → activeWorkflows
  } catch {
    // 请求层已统一提示错误
  }
}

onMounted(loadAppData)
watch(appId, loadAppData)
const personaPrompt = ref(`# 角色
你是一个智能聊天机器人，能够与用户进行各种话题的交流，包括但不限于生活、工作、学习、娱乐等。

## 技能
### 技能 1: 日常交流
1. 当用户分享日常经历时，给予积极的回应和建议。
2. 对用户的心情表达，提供安慰和鼓励。

### 技能 2: 知识解答
1. 当用户提出问题，运用知识库和搜索工具提供准确、详细的答案。
2. 对于复杂问题，分步进行解释。

### 技能 3: 娱乐互动
1. 能与用户玩文字游戏，如猜谜语、成语接龙等。
2. 推荐有趣的娱乐活动和节目。

## 限制
- 回答内容应积极、友善、文明，不得包含不当言论。
- 所给出的信息必须按照指定的格式进行组织，不能偏离框架要求。
- 对于不确定的问题，应明确告知用户并尽力提供获取答案的途径。`);
const openingText = ref('');
const openingQuestions = ref<string[]>(['']);
const showUserSuggestions = ref(true);
const voiceInputEnabled = ref(true);
const voiceOutputEnabled = ref(false);
const longTermMemoryEnabled = ref(false);
const knowledgeSearchEnabled = ref(true);
const activePlugins = ref<PluginItem[]>([
 { id: 'img-understand', name: '图片理解', description: '回答用户关于图像的问题', icon: 'icon-file', category: '内置' },
 { id: 'bing-search', name: '必应搜索', description: '必应搜索引擎。当你需要搜索你不知道的信息，比如天气、汇率、时事等', icon: 'icon-search', category: '搜索' },
]);
const activeWorkflows = ref<string[]>([]);
const activeKnowledges = ref<string[]>([]);
const chatMessages = ref<ChatMessageItem[]>([]);
const isChatLoading = ref(false);
const tabOptions = [
 { key: 'edit', title: '编排' },
 { key: 'publish', title: '发布配置' },
 { key: 'analytics', title: '统计分析' },
];
const collapseGroups = computed<CollapseGroup[]>(() => [
 {
 key: 'plugins',
 title: '扩展插件',
 description: '添加外部插件来扩展 AI 的能力',
 icon: 'icon-puzzle',
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'workflows',
 title: '工作流组件',
 description: '工作流支持通过可视化的方式，对插件、大语言模型、代码块等功能进行组合，从而实现复杂、稳定的业务流程编排，例如旅行规划、报告分析等。',
 icon: 'icon-share',
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'knowledge',
 title: '知识库',
 description: '引用文本类型的数据，实现知识问答，最多支持关联 5 个知识库。',
 icon: 'icon-file',
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'longTermMemory',
 title: '长期记忆',
 description: '总结聊天对话的内容，并用于更好的响应用户的消息。',
 icon: 'icon-book',
 defaultExpand: true,
 },
 {
 key: 'opening',
 title: '对话开场白',
 description: '设置对话开场白和推荐问题',
 icon: 'icon-message',
 defaultExpand: true,
 },
 {
 key: 'userSuggestions',
 title: '用户问题建议',
 description: '在应用回答后，自动根据对话内容提供 3 条用户提问建议。',
 icon: 'icon-lightbulb',
 defaultExpand: true,
 },
 {
 key: 'retrieval',
 title: '检索设置',
 description: '配置知识库检索策略，提升问答准确性。',
 icon: 'icon-search',
 defaultExpand: true,
 },
 {
 key: 'voiceInput',
 title: '语音输入',
 description: '启用后，您可以使用语音输入。',
 icon: 'icon-microphone',
 defaultExpand: true,
 },
 {
 key: 'voiceOutput',
 title: '语音输出',
 description: '启用后，可以使用语音输出。',
 icon: 'icon-voice',
 defaultExpand: true,
 },
 {
 key: 'contentReview',
 title: '内容审查',
 description: '审查输入和输出内容，保障应用安全合规。',
 icon: 'icon-safe',
 defaultExpand: true,
 },
]);
const currentPluginCategory = computed<PluginCategory>(() => state.addPluginCategory);
const handleCollapseAdd = (key: string) => {
 switch (key) {
 case 'plugins':
 openAddPlugin();
 break;
 case 'workflows':
 openAssociateWorkflow();
 break;
 case 'knowledge':
 openSelectKnowledge();
 break;
 }
};
const handlePluginSettings = (plugin: PluginItem) => {
 openPluginSettings(plugin);
};
const handlePluginDelete = (plugin: PluginItem) => {
 const idx = activePlugins.value.findIndex(p => p.id === plugin.id);
 if (idx > -1) {
 activePlugins.value.splice(idx, 1);
 Message.success(`已删除插件「${plugin.name}」`);
 }
};
const handleAddPluginConfirm = (pluginId: string) => {
 Message.success('插件添加成功');
 closeAddPlugin();
};
const handleAddWorkflowConfirm = (ids: string[]) => {
 activeWorkflows.value = ids;
 Message.success(`已关联 ${ids.length} 个工作流`);
};
const handleAddKnowledgeConfirm = (ids: string[]) => {
 activeKnowledges.value = ids;
 Message.success(`已添加 ${ids.length} 个知识库`);
};
const handleLongTermMemoryToggle = (value: boolean) => {
  longTermMemoryEnabled.value = value;
  if (value) {
    state.longTermMemory.enabled = true;
    openLongTermMemory();
  } else {
    state.longTermMemory.enabled = false;
  }
};
const handleVoiceOutputToggle = (value: boolean) => {
  voiceOutputEnabled.value = value;
  if (value) {
    state.voiceConfig.autoPlay = true;
    openVoice();
  }
};
/** 内容审查合并开关：输入/输出任一开启即认为开启；整体关闭则两个都关 */
const contentReviewEnabled = computed<boolean>(
  () => state.contentReviewConfig.reviewInput || state.contentReviewConfig.reviewOutput,
)

const handleContentReviewToggle = (value: boolean) => {
  state.contentReviewConfig.reviewInput = value
  state.contentReviewConfig.reviewOutput = value
}
const handleRetrievalOpen = () => {
 openRetrieval();
};
const handleModelConfirm = () => {
 closeModelSettings();
};
const handleLongTermMemoryConfirm = () => {
 state.longTermMemory.enabled = longTermMemoryEnabled.value;
 closeLongTermMemory();
};
const handleRetrievalConfirm = () => {
 closeRetrieval();
};
const handleVoiceConfirm = () => {
 voiceOutputEnabled.value = true;
 closeVoice();
};
const handleContentReviewConfirm = () => {
 closeContentReview();
};
/** 发布历史抽屉显隐 */
const historyVisible = ref(false)

/** 发布配置面板 ref（用于刷新状态） */
const publishConfigPanelRef = ref<InstanceType<typeof PublishConfigPanel> | null>(null)

/** 正在发布 / 取消发布（防重复点击） */
const publishing = ref(false)
const cancellingPublish = ref(false)

/** 更新发布：调后端接口 */
const handlePublish = async () => {
  if (publishing.value || !appId.value) return
  publishing.value = true
  try {
    await publish(appId.value)
    Message.success('发布成功')
    // 刷新发布配置面板状态
    publishConfigPanelRef.value?.refresh()
  } catch {
    // service 已统一 Message.error
  } finally {
    publishing.value = false
  }
}

/** 下拉菜单项：取消发布（先弹二次确认 Modal） */
const handleTriggerCancelPublish = () => {
  openCancelPublish()
}

/** 取消发布 Modal 确认回调 */
const handleCancelPublishConfirm = async () => {
  if (cancellingPublish.value || !appId.value) return
  cancellingPublish.value = true
  try {
    await cancelPublish(appId.value)
    Message.success('已取消发布')
    closeCancelPublish()
    // 刷新发布配置面板状态
    publishConfigPanelRef.value?.refresh()
  } catch {
    // service 已统一 Message.error
  } finally {
    cancellingPublish.value = false
  }
}

/** —— 草稿保存相关 —— */

/** 构建 UpdateDraftAppConfigRequest payload（camelCase → snake_case） */
const buildDraftPayload = (): UpdateDraftAppConfigRequest => {
  const cfg = state.modelConfig
  const openingQs = openingQuestions.value
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 3) // 最多 3 条推荐问题

  // 内容审查：只要任意开关开着，就整体 enable=true，并带上 keywords
  const reviewInput = state.contentReviewConfig.reviewInput
  const reviewOutput = state.contentReviewConfig.reviewOutput
  const reviewEnabled = reviewInput || reviewOutput

  return {
    // 模型配置
    model_config: {
      provider: cfg.provider || '',
      model: cfg.model || '',
      parameters: {
        temperature: cfg.temperature,
        top_p: cfg.topP,
        presence_penalty: cfg.presencePenalty,
        frequency_penalty: cfg.frequencyPenalty,
        max_tokens: cfg.maxReplyLength,
      },
    },
    dialog_round: cfg.contextRounds,
    preset_prompt: personaPrompt.value,

    // 插件 tools —— 后端期望 { type, provider_id, tool_id, params }[]，
    // 前端 PluginItem 暂未携带 provider_id，先不传，等插件抽屉接完整契约后补
    // TODO: activePlugins → tools

    workflows: activeWorkflows.value,
    datasets: activeKnowledges.value,

    retrieval_config: {
      retrieval_strategy: state.retrievalConfig.strategy,
      k: state.retrievalConfig.maxRecall,
      score: state.retrievalConfig.minMatchScore,
    },

    long_term_memory: { enable: state.longTermMemory.enabled },

    opening_statement: openingText.value,
    opening_questions: openingQs,

    speech_to_text: { enable: voiceInputEnabled.value },

    text_to_speech: {
      enable: voiceOutputEnabled.value,
      voice: state.voiceConfig.voice,
      auto_play: state.voiceConfig.autoPlay,
    },

    suggested_after_answer: { enable: showUserSuggestions.value },

    review_config: {
      enable: reviewEnabled,
      keywords: state.contentReviewConfig.keywords,
      inputs_config: {
        enable: reviewInput,
        preset_response: state.contentReviewConfig.presetReply,
      },
      outputs_config: { enable: reviewOutput },
    },
  }
}

/** 保存前必要校验 —— 失败时直接 Message.error 并返回 false */
const validateDraft = (): boolean => {
  if (!personaPrompt.value.trim()) {
    Message.error('请填写人设与回复逻辑')
    return false
  }
  if (!state.modelConfig.provider || !state.modelConfig.model) {
    Message.error('请先选择模型')
    return false
  }
  const keywords = state.contentReviewConfig.keywords
  const anyReview =
    state.contentReviewConfig.reviewInput || state.contentReviewConfig.reviewOutput
  if (anyReview && (!keywords || keywords.length === 0)) {
    Message.error('已开启内容审查，请至少填写一个关键词')
    return false
  }
  if (activeKnowledges.value.length > 5) {
    Message.error('最多支持关联 5 个知识库')
    return false
  }
  return true
}

/** 保存草稿 */
const handleSaveDraft = async () => {
  if (!appId.value || isSaving.value) return
  if (!validateDraft()) return
  isSaving.value = true
  try {
    const payload = buildDraftPayload()
    const resp = await updateDraftAppConfig(appId.value, payload)
    // 用后端返回时间更新保存时间
    if (resp.data && typeof (resp.data as any).updated_at === 'number') {
      updateSavedTime((resp.data as any).updated_at)
    } else {
      // 兜底：用当前时间
      updateSavedTime(Math.floor(Date.now() / 1000))
    }
    Message.success('草稿已保存')
  } catch {
    // service 已统一 Message.error
  } finally {
    isSaving.value = false
  }
}
/** 返回个人空间（AI 应用 Tab）；直接输入 URL 进入无历史记录时兜底显式跳转 */
const handleBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push('/space/apps');
  }
};
/** 待发送图片（选择后立即上传，uploading 表示上传中） */
const pendingImages = ref<ChatPendingImage[]>([])
/** 当前流式任务 ID（SSE 事件携带 task_id），用于停止响应 */
const currentDebugTaskId = ref('')
/** 当前活跃请求的手动停止标记器 */
let activeMarkManualStop: (() => void) | null = null

/** 把 SSE 事件名统一为小写枚举名（后端 f-string 会输出 "QueueEvent.AGENT_END"） */
const normalizeSSEEvent = (raw: string) => {
  const PREFIX = 'QueueEvent.'
  const name = raw.startsWith(PREFIX) ? raw.slice(PREFIX.length) : raw
  return name.toLowerCase()
}

/** 历史消息 agent_thoughts 中的 dataset_retrieval → 知识库片段 */
interface RawAgentThought {
  event: string
  thought?: string
  observation?: string
  tool?: string
}
const buildKnowledgeItems = (thoughts?: RawAgentThought[]): ChatKnowledgeItem[] => {
  if (!thoughts?.length) return []
  return thoughts
    .filter((t) => t.event?.toLowerCase().includes('dataset_retrieval'))
    .map((t) => ({
      title: t.tool || '知识库片段',
      content: t.thought || t.observation || '',
    }))
    .filter((item) => item.content)
}

/** 加载调试会话历史消息（后端按 created_at 倒序返回，逐页拉取后 reverse 成正序映射；page_size 范围 1-50） */
const loadDebugMessages = async () => {
  try {
    const PAGE_SIZE = 50
    const rawList: Awaited<ReturnType<typeof getDebugConversationMessagesWithPage>>['data']['list'] = []
    let currentPage = 1
    let totalPage = 1
    do {
      const resp = await getDebugConversationMessagesWithPage(appId.value, {
        current_page: currentPage,
        page_size: PAGE_SIZE,
      })
      rawList.push(...resp.data.list)
      totalPage = resp.data.paginator.total_page
      currentPage += 1
    } while (currentPage <= totalPage)

    const items: ChatMessageItem[] = []
    rawList.slice().reverse().forEach((item) => {
      const pairId = `pair-${item.id}`
      items.push({
        id: `${item.id}-q`,
        pairId,
        role: 'user',
        content: item.query,
      })
      items.push({
        id: `${item.id}-a`,
        pairId,
        role: 'assistant',
        content: item.answer,
        serverMessageId: item.id,
        tokens: item.total_token_count || undefined,
        // 后端 latency 单位为秒，前端统一转毫秒
        latency: item.latency ? Math.round(item.latency * 1000) : undefined,
        status: 'completed',
        knowledgeItems: buildKnowledgeItems(item.agent_thoughts as RawAgentThought[]),
      })
    })
    chatMessages.value = items

    // 开启了用户问题建议时，为最后一条 AI 回复拉取建议问题
    if (showUserSuggestions.value) {
      const lastAssistant = [...items].reverse().find((m) => m.role === 'assistant')
      if (lastAssistant?.serverMessageId) {
        fetchSuggestedQuestions(lastAssistant)
      }
    }
  } catch {
    // 请求层已统一提示错误
  }
}

/** 拉取某条 AI 回复的建议问题（受「用户问题建议」开关控制） */
const fetchSuggestedQuestions = async (message: ChatMessageItem) => {
  if (!showUserSuggestions.value || !message.serverMessageId) return
  try {
    const resp = await generateSuggestedQuestions(message.serverMessageId)
    if (Array.isArray(resp.data) && resp.data.length) {
      // 历史消息场景传入的可能是响应式代理之外的原始对象，统一从列表中取回代理
      const target = chatMessages.value.find((m) => m.id === message.id) ?? message
      target.recommendations = resp.data.slice(0, 3)
    }
  } catch {
    // 建议问题拉取失败不影响主流程
  }
}

/** 发送调试消息（SSE 流式） */
const doSend = (query: string, imageUrls: string[]) => {
  if (isChatLoading.value) return null

  // 1.一问一答共享 pairId，追加用户消息（含图片）
  const pairId = `pair-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  chatMessages.value.push({
    id: `user-${Date.now()}`,
    pairId,
    role: 'user',
    content: query,
    ...(imageUrls.length ? { images: imageUrls } : {}),
  })
  isChatLoading.value = true
  currentDebugTaskId.value = ''

  // 2.本次请求的局部状态，避免多请求串流
  let localMsgId = ''
  let localDone = false
  /** 用户是否手动点击了“停止响应” */
  let localIsManualStop = false

  /** 确保流式 AI 消息已存在并返回 */
  const ensureStreamingMsg = (): ChatMessageItem | null => {
    if (localDone) return null
    if (!localMsgId) {
      const aiMsg: ChatMessageItem = {
        id: `ai-${Date.now()}`,
        pairId,
        role: 'assistant',
        content: '',
      }
      chatMessages.value.push(aiMsg)
      localMsgId = aiMsg.id
    }
    return chatMessages.value.find((m) => m.id === localMsgId) ?? null
  }

  /** 结束本次流式会话，按是否手动停止标记状态 */
  const finishStreaming = () => {
    if (localDone) return
    localDone = true
    const aiMsg = localMsgId ? chatMessages.value.find((m) => m.id === localMsgId) : null
    if (aiMsg) {
      aiMsg.status = localIsManualStop ? 'stopped' : 'completed'
      if (!aiMsg.knowledgeItems?.length) aiMsg.knowledgeItems = undefined
    }
    isChatLoading.value = false
    currentDebugTaskId.value = ''
  }

  // 3.SSE 事件处理
  const onSSEEvent = (eventResponse: Record<string, unknown>) => {
    if (localDone) return
    const { event: rawEvent, data } = eventResponse as {
      event: string
      data: Record<string, any>
    }
    if (data?.task_id) currentDebugTaskId.value = data.task_id
    const event = normalizeSSEEvent(rawEvent)

    switch (event) {
      case 'agent_message': {
        const aiMsg = ensureStreamingMsg()
        if (aiMsg && data.answer) {
          aiMsg.content += data.answer
          if (!aiMsg.serverMessageId) aiMsg.serverMessageId = data.message_id || data.id
          if (data.total_token_count) aiMsg.tokens = data.total_token_count
          if (data.latency) aiMsg.latency = Math.round(data.latency * 1000)
        }
        break
      }
      case 'dataset_retrieval': {
        // 知识库检索过程实时收集，用于“已搜索知识库”折叠面板
        const aiMsg = ensureStreamingMsg()
        if (aiMsg && (data.thought || data.observation)) {
          aiMsg.knowledgeItems = [
            ...(aiMsg.knowledgeItems ?? []),
            { title: data.tool || '知识库片段', content: data.thought || data.observation },
          ]
        }
        break
      }
      case 'agent_end': {
        // 正常回复完成：收尾后按开关为这条回复拉取建议问题
        const aiMsg = localMsgId ? chatMessages.value.find((m) => m.id === localMsgId) ?? null : null
        finishStreaming()
        if (aiMsg) fetchSuggestedQuestions(aiMsg)
        break
      }
      case 'stop':
        finishStreaming()
        break
      case 'error':
      case 'timeout': {
        const aiMsg = ensureStreamingMsg()
        if (aiMsg && !aiMsg.content) {
          aiMsg.content = data.thought || data.answer || '服务出现错误，请稍后重试'
        }
        finishStreaming()
        break
      }
      // ping / agent_thought / agent_action / long_term_memory_recall 暂不处理
      default:
        break
    }
  }

  // 4.发起调试对话 SSE 请求
  // TODO: 后端 debugChat 支持 image_urls 字段后，将 imageUrls 随 body 一并提交
  debugChat(appId.value, query, onSSEEvent).catch(() => finishStreaming())

  return {
    markManualStop: () => {
      localIsManualStop = true
    },
  }
}

const handleSendMessage = (query: string, imageUrls: string[] = []) => {
  if (!query.trim()) return
  const controller = doSend(query, imageUrls)
  activeMarkManualStop = controller?.markManualStop ?? null
  pendingImages.value = []
}

/** 删除单组问答；message 为 null 时清空整个调试会话 */
const handleDeleteMessage = async (message: ChatMessageItem | null) => {
  if (message === null) {
    try {
      await deleteDebugConversation(appId.value)
      chatMessages.value = []
    } catch {
      // 请求层已统一提示错误
    }
    return
  }
  chatMessages.value = chatMessages.value.filter((m) => m.pairId !== message.pairId)
}

/** 停止响应：标记手动停止 + 调停止接口 + 2s 兜底收尾 */
const handleStopResponse = () => {
  if (!isChatLoading.value) return
  activeMarkManualStop?.()
  if (currentDebugTaskId.value) {
    stopDebugChat(appId.value, currentDebugTaskId.value)
  }
  setTimeout(() => {
    if (isChatLoading.value) {
      const pendingAi = [...chatMessages.value]
        .reverse()
        .find((m) => m.role === 'assistant' && !m.status)
      if (pendingAi) {
        pendingAi.status = 'stopped'
        if (!pendingAi.knowledgeItems?.length) pendingAi.knowledgeItems = undefined
      }
      isChatLoading.value = false
      currentDebugTaskId.value = ''
    }
  }, 2000)
}

/** 语音播放：后端 TTS 接口暂未提供 */
const handlePlayVoice = (message: ChatMessageItem) => {
  // TODO: 接入语音播放接口（TTS），入参为 message.serverMessageId
  void message
  Message.info('语音播放功能即将上线')
}

/** 选择图片：本地预览 + 立即上传，成功后替换为服务端图片地址 */
const handleSelectImages = async (files: File[]) => {
  for (const file of files) {
    const localUrl = URL.createObjectURL(file)
    pendingImages.value.push({ url: localUrl, uploading: true })
    try {
      const resp = await uploadImage(file)
      const idx = pendingImages.value.findIndex((img) => img.url === localUrl)
      if (idx > -1) {
        URL.revokeObjectURL(localUrl)
        pendingImages.value[idx] = { url: resp.data.image_url, uploading: false }
      }
    } catch {
      pendingImages.value = pendingImages.value.filter((img) => img.url !== localUrl)
      URL.revokeObjectURL(localUrl)
    }
  }
}

/** 移除待发送图片 */
const handleRemoveImage = (url: string) => {
  pendingImages.value = pendingImages.value.filter((img) => img.url !== url)
  if (url.startsWith('blob:')) URL.revokeObjectURL(url)
}
const handleOpeningQuestionRemove = (index: number) => {
  if (openingQuestions.value.length <= 1) {
    // 删到只剩最后一行时不清空，重置为空字符串保留一个输入框
    openingQuestions.value = ['']
  } else {
    openingQuestions.value.splice(index, 1)
  }
};
const handleOpeningQuestionAdd = () => {
  openingQuestions.value.push('')
};
const userSuggestionsOptions = [
 { label: '开启', value: true },
 { label: '关闭', value: false },
];
const voiceInputOptions = [
 { label: '开启', value: true },
 { label: '关闭', value: false },
];
const voiceOutputOptions = [
 { label: '开启', value: true },
 { label: '关闭', value: false },
];
const longTermMemoryOptions = [
 { label: '开启', value: true },
 { label: '关闭', value: false },
];
const contentReviewOptions = [
 { label: '开启', value: true },
 { label: '关闭', value: false },
];
</script>

<template>
  <div class="app-page">
    <!-- 顶部导航操作栏 -->
    <header class="top-bar">
      <div class="flex items-center gap-4">
        <a-button type="text" size="large" shape="circle" @click="handleBack">
          <template #icon><icon-arrow-left :size="18" /></template>
        </a-button>
        <div class="flex items-center gap-2">
          <span class="text-base font-medium text-gray-800">{{ appName }}</span>
          <a-tag color="arcoblue" :bordered="false" size="small">个人空间</a-tag>
          <div class="flex items-center gap-1.5 text-xs text-gray-400">
            <icon-cloud :size="12" />
            <span>草稿・已自动保存 {{ savedTime }}</span>
          </div>
        </div>
      </div>

      <a-tabs v-model:active-key="activeTab" size="medium" type="text" class="flex-1 max-w-md justify-center">
        <a-tab-pane v-for="tab in tabOptions" :key="tab.key" :title="tab.title" />
      </a-tabs>

      <div class="flex items-center gap-2">
        <a-tooltip content="发布历史">
          <a-button type="text" size="large" shape="circle" @click="historyVisible = true">
            <template #icon><icon-history :size="18" /></template>
          </a-button>
        </a-tooltip>

        <a-button type="primary" size="large" class="ml-2" :loading="isSaving" @click="handleSaveDraft">保存</a-button>

        <!-- 更新发布 + 取消发布 组合按钮 -->
        <a-button-group size="large" class="ml-0">
          <a-button
            type="primary"
            :loading="publishing"
            @click="handlePublish"
          >
            <template #icon><icon-cloud-upload :size="16" /></template>
            更新发布
          </a-button>
          <a-dropdown>
            <a-button type="primary">
              <icon-down :size="14" />
            </a-button>
            <template #content>
              <a-doption @click="handleTriggerCancelPublish">
                取消发布
              </a-doption>
            </template>
          </a-dropdown>
        </a-button-group>
      </div>
    </header>

    <!-- 下方左右两大主栏 -->
    <template v-if="activeTab === 'edit'">
    <div class="main-content">
      <!-- 左侧主栏：应用编排 -->
      <div class="left-panel">
        <!-- 左侧主栏头部 -->
        <div class="panel-header">
          <div class="flex items-center gap-3">
            <span class="text-lg font-medium text-gray-900">应用编排</span>
            <a-button type="text" size="small" @click="openModelSettings">
              <template #icon><icon-apps :size="14" /></template>
              {{ state.modelConfig.model }}
            </a-button>
          </div>
        </div>

        <!-- 左侧主栏内容：左右双栏 -->
        <div class="panel-body">
          <!-- 左子栏：人设与回复逻辑 -->
          <div class="sub-panel w-[380px] flex-shrink-0">
            <div class="sub-panel-header">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900">人设与回复逻辑</span>
              </div>
              <a-tooltip content="优化人设">
                <a-button type="text" size="small" shape="circle">
                  <template #icon><icon-bulb :size="14" /></template>
                </a-button>
              </a-tooltip>
            </div>
            <div class="sub-panel-body">
              <a-textarea
                v-model="personaPrompt"
                placeholder="请输入人设与回复逻辑"
                :auto-size="{ minRows: 20 }"
                show-word-limit
                :max-length="20000"
              />
            </div>
          </div>

          <!-- 右子栏：应用能力配置面板 -->
          <div class="sub-panel flex-1 min-w-[320px]">
            <div class="sub-panel-header">
              <span class="font-medium text-gray-900">应用能力</span>
            </div>
            <div class="sub-panel-body space-y-3">
              <ConfigCollapse :groups="collapseGroups" @add="handleCollapseAdd">
                <!-- 扩展插件 -->
                <template #plugins>
                  <div class="flex flex-col gap-3">
                    <div
                      v-for="plugin in activePlugins"
                      :key="plugin.id"
                      class="plugin-card"
                    >
                      <div class="flex items-center gap-3 flex-1 min-w-0">
                        <div class="plugin-icon">
                          <component :is="getIcon(plugin.icon)" :size="20" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-gray-800 break-words">{{ plugin.name }}</div>
                          <div class="text-xs text-gray-500 break-words mt-0.5">{{ plugin.description }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        <a-tooltip content="设置">
                          <a-button type="text" size="mini" shape="circle" @click="handlePluginSettings(plugin)">
                            <template #icon><icon-settings :size="14" /></template>
                          </a-button>
                        </a-tooltip>
                        <a-tooltip content="删除">
                          <a-button type="text" size="mini" shape="circle" status="danger" @click="handlePluginDelete(plugin)">
                            <template #icon><icon-delete :size="14" /></template>
                          </a-button>
                        </a-tooltip>
                      </div>
                    </div>
                    <a-empty v-if="activePlugins.length === 0" description="暂无插件，点击右上角 + 添加" />
                  </div>
                </template>

                <!-- 工作流组件 -->
                <template #workflows>
                  <div class="flex flex-col gap-2">
                    <div v-if="activeWorkflows.length > 0" class="flex flex-wrap gap-2">
                      <a-tag v-for="wf in activeWorkflows" :key="wf" color="arcoblue" :bordered="false" closable>
                        {{ wf }}
                      </a-tag>
                    </div>
                    <a-empty v-else description="暂无关联工作流" />
                  </div>
                </template>

                <!-- 知识库 -->
                <template #knowledge>
                  <div class="flex flex-col gap-2">
                    <div v-if="activeKnowledges.length > 0" class="flex flex-wrap gap-2">
                      <a-tag v-for="kb in activeKnowledges" :key="kb" color="arcoblue" :bordered="false" closable>
                        {{ kb }}
                      </a-tag>
                    </div>
                    <a-empty v-else description="暂无关联知识库" />
                  </div>
                </template>

                <!-- 长期记忆：头部开关，内容区空 -->
                <template #header-right-longTermMemory>
                  <a-select v-model="longTermMemoryEnabled" class="w-24" :options="longTermMemoryOptions" @change="handleLongTermMemoryToggle" />
                </template>
                <template #longTermMemory>
                  <!-- 无额外内容，开关已在头部 -->
                </template>

                <!-- 对话开场白 -->
                <template #opening>
                  <div class="flex flex-col gap-4">
                    <div>
                      <div class="text-sm text-gray-700 mb-1.5">开场白文案</div>
                      <a-textarea
                        v-model="openingText"
                        placeholder="在此处填写 AI 应用的开场白"
                        :auto-size="{ minRows: 2, maxRows: 4 }"
                      />
                    </div>
                    <div>
                      <div class="text-sm text-gray-700 mb-1.5">开场白预设问题</div>
                      <div class="flex flex-col gap-2">
                        <div
                          v-for="(question, idx) in openingQuestions"
                          :key="idx"
                          class="flex items-center gap-2"
                        >
                          <a-input v-model="openingQuestions[idx]" placeholder="输入开场白引导问题" class="flex-1" />
                          <a-button type="text" shape="circle" size="small" @click="handleOpeningQuestionRemove(idx)">
                            <template #icon><icon-minus :size="14" /></template>
                          </a-button>
                        </div>
                        <a-button
                          type="text"
                          size="small"
                          class="justify-start !text-[#165dff]"
                          @click="handleOpeningQuestionAdd"
                        >
                          <template #icon><icon-plus :size="14" /></template>
                          添加预设问题
                        </a-button>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 用户问题建议：头部开关，内容区显示提示语 -->
                <template #header-right-userSuggestions>
                  <a-select v-model="showUserSuggestions" class="w-24" :options="userSuggestionsOptions" />
                </template>
                <template #userSuggestions>
                  <div class="flex flex-col gap-2">
                    <div class="text-xs text-[#86909c]">
                      在应用回复后，自动根据对话内容提供 3 条用户提问建议。
                    </div>
                  </div>
                </template>

                <!-- 检索设置 -->
                <template #header-right-retrieval>
                  <a-button type="text" size="small" @click="handleRetrievalOpen">
                    <template #icon><icon-settings :size="14" /></template>
                    设置
                  </a-button>
                </template>
                <template #retrieval></template>

                <!-- 语音输入：头部开关，内容区显示提示语 -->
                <template #header-right-voiceInput>
                  <a-select v-model="voiceInputEnabled" class="w-24" :options="voiceInputOptions" />
                </template>
                <template #voiceInput>
                  <div class="flex flex-col gap-2">
                    <div class="text-xs text-[#86909c]">
                      启用后，可以使用语音输入。
                    </div>
                  </div>
                </template>

                <!-- 语音输出：头部开关，内容区显示提示语 -->
                <template #header-right-voiceOutput>
                  <a-select v-model="voiceOutputEnabled" class="w-24" :options="voiceOutputOptions" @change="handleVoiceOutputToggle" />
                </template>
                <template #voiceOutput>
                  <div class="flex flex-col gap-2">
                    <div class="text-xs text-[#86909c]">
                      在 Bot 回复后，自动根据对话内容提供 3 条用户提问建议。
                    </div>
                  </div>
                </template>

                <!-- 内容审查：头部开关（合并两个开关），开启后内容区显示设置按钮 -->
                <template #header-right-contentReview>
                  <a-select
                    :model-value="contentReviewEnabled"
                    class="w-24"
                    :options="contentReviewOptions"
                    @change="(v) => handleContentReviewToggle(v)"
                  />
                </template>
                <template #contentReview>
                  <div class="flex flex-col gap-3">
                    <div class="text-xs text-[#86909c]">
                      审查输入和输出内容，保障应用安全合规。
                    </div>
                    <button
                      v-if="contentReviewEnabled"
                      type="button"
                      class="w-full h-9 rounded-[6px] bg-[#f2f3f5] hover:bg-[#e5e6eb] text-sm text-[#4e5969] flex items-center justify-center gap-1.5 transition-colors"
                      @click="openContentReview"
                    >
                      <icon-settings :size="14" />
                      设置
                    </button>
                  </div>
                </template>
              </ConfigCollapse>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧主栏：预览与调试 -->
      <div class="right-panel">
        <div class="panel-header">
          <div class="flex items-center justify-between w-full">
            <span class="text-lg font-medium text-gray-900">预览与调试</span>
            <a-button type="text" size="small" @click="openLongTermMemory">
              <template #icon><icon-book :size="14" /></template>
              长期记忆
            </a-button>
          </div>
        </div>
        <div class="panel-body p-0">
          <ChatDialog
            :message-list="chatMessages"
            :is-loading="isChatLoading"
            :app-name="appName"
            :app-icon="appIcon"
            :voice-input-enabled="voiceInputEnabled"
            :voice-output-enabled="voiceOutputEnabled"
            :pending-images="pendingImages"
            @send="handleSendMessage"
            @delete-message="handleDeleteMessage"
            @stop-response="handleStopResponse"
            @select-images="handleSelectImages"
            @remove-image="handleRemoveImage"
            @play-voice="handlePlayVoice"
          />
        </div>
      </div>
    </div>
    </template>

    <!-- 发布配置面板 -->
    <PublishConfigPanel v-if="activeTab === 'publish'" ref="publishConfigPanelRef" class="flex-1 min-h-0 overflow-hidden" />

    <!-- 统计分析面板 -->
    <StatisticsPanel v-if="activeTab === 'analytics'" class="flex-1 min-h-0 overflow-hidden" />

    <!-- 模型设置弹窗 -->
    <ModelSettingsModal
      :visible="state.modelSettingsVisible"
      :model-config="state.modelConfig"
      @update:model-config="(val) => { Object.assign(state.modelConfig, val); handleModelConfirm(); }"
      @cancel="closeModelSettings"
    />

    <!-- 长期记忆弹窗 -->
    <LongTermMemoryModal
      :visible="state.longTermMemoryVisible"
      :config="state.longTermMemory"
      @update:config="(val) => { Object.assign(state.longTermMemory, val); handleLongTermMemoryConfirm(); }"
      @cancel="closeLongTermMemory"
    />

    <!-- 检索设置弹窗 -->
    <RetrievalConfigModal
      :visible="state.retrievalVisible"
      :config="state.retrievalConfig"
      @update:config="(val) => { Object.assign(state.retrievalConfig, val); handleRetrievalConfirm(); }"
      @cancel="closeRetrieval"
    />

    <!-- 语音输出弹窗 -->
    <VoiceOutputModal
      :visible="state.voiceVisible"
      :config="state.voiceConfig"
      @update:config="(val) => { Object.assign(state.voiceConfig, val); handleVoiceConfirm(); }"
      @cancel="closeVoice"
    />

    <!-- 内容审查弹窗 -->
    <ContentReviewModal
      :visible="state.contentReviewVisible"
      :config="state.contentReviewConfig"
      @update:config="(val) => { Object.assign(state.contentReviewConfig, val); handleContentReviewConfirm(); }"
      @cancel="closeContentReview"
    />

    <!-- 取消发布确认弹窗 -->
    <CancelPublishModal
      :visible="state.cancelPublishVisible"
      :loading="cancellingPublish"
      @confirm="handleCancelPublishConfirm"
      @cancel="closeCancelPublish"
    />

    <!-- 添加插件抽屉 -->
    <AddPluginDrawer
      :visible="state.addPluginVisible"
      :category="currentPluginCategory"
      @update:visible="(val) => state.addPluginVisible = val"
      @update:category="(val) => state.addPluginCategory = val"
      @add="handleAddPluginConfirm"
    />

    <!-- 插件设置抽屉 -->
    <PluginSettingsDrawer
      :visible="state.pluginSettingsVisible"
      :plugin="state.currentPlugin"
      @update:visible="(val) => state.pluginSettingsVisible = val"
      @save="closePluginSettings"
    />

    <!-- 关联工作流抽屉 -->
    <AssociateWorkflowDrawer
      :visible="state.associateWorkflowVisible"
      :selected-ids="activeWorkflows"
      @update:visible="(val) => state.associateWorkflowVisible = val"
      @confirm="handleAddWorkflowConfirm"
    />

    <!-- 选择知识库抽屉 -->
    <SelectKnowledgeDrawer
      :visible="state.selectKnowledgeVisible"
      :selected-ids="activeKnowledges"
      @update:visible="(val) => state.selectKnowledgeVisible = val"
      @confirm="handleAddKnowledgeConfirm"
    />

    <!-- 发布历史抽屉 -->
    <PublishHistoryDrawer
      v-model:visible="historyVisible"
      :app-id="appId"
      :app-name="appName"
      :app-icon="appIcon"
      :app-description="appDescription"
      :app-last-edited-at="appLastEditedAt"
      :app-status="appStatus"
      @rollback="loadAppData"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";

.app-page {
  @apply flex flex-col h-screen bg-gray-50;
}

.top-bar {
  @apply flex items-center justify-between h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0;
}

.main-content {
  @apply flex flex-1 min-h-0 gap-0;
}

.left-panel {
  @apply flex flex-col flex-1 min-w-0 bg-white border-r border-gray-200;
}

.right-panel {
  @apply flex flex-col w-[400px] flex-shrink-0 bg-white;
}

.panel-header {
  @apply flex items-center h-12 px-4 border-b border-gray-200 flex-shrink-0 bg-white;
}

.panel-body {
  @apply flex flex-1 min-h-0 overflow-hidden gap-0;
}

.sub-panel {
  @apply flex flex-col min-w-0;
}

.sub-panel-header {
  @apply flex items-center justify-between h-10 px-4 border-b border-gray-100 flex-shrink-0 bg-gray-50/50;
}

.sub-panel-body {
  @apply flex-1 min-h-0 p-4 overflow-y-auto;
}

.plugin-card {
  @apply flex items-center gap-2.5 p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors;
}

.plugin-icon {
  @apply w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0;
}

.model-select-trigger {
  @apply flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 transition-colors bg-white;
}

.model-option {
  @apply px-3 py-2 cursor-pointer hover:bg-gray-50 rounded text-sm text-gray-800 flex items-center gap-2;
}
</style>
