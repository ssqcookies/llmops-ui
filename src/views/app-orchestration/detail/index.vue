<script setup lang="ts">
import { ref, computed, markRaw, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import { ROUTE_NAME } from '@/constants'
import { getApp, getDraftAppConfig } from '@/services/app'
import { formatTime } from '@/utils/format'
import type { CollapseGroup, ChatMessageItem, PluginItem, PluginCategory } from './types'
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
import AddPluginDrawer from './components/AddPluginDrawer.vue'
import PluginSettingsDrawer from './components/PluginSettingsDrawer.vue'
import AssociateWorkflowDrawer from './components/AssociateWorkflowDrawer.vue'
import SelectKnowledgeDrawer from './components/SelectKnowledgeDrawer.vue'
import StatisticsPanel from './components/StatisticsPanel.vue'

const { state, openModelSettings, closeModelSettings, openLongTermMemory, closeLongTermMemory, openRetrieval, closeRetrieval, openVoice, closeVoice, openContentReview, closeContentReview, openCancelPublish, closeCancelPublish, openAddPlugin, closeAddPlugin, openPluginSettings, closePluginSettings, openAssociateWorkflow, closeAssociateWorkflow, openSelectKnowledge, closeSelectKnowledge } = useDialogs()
const router = useRouter()
const route = useRoute()
const activeTab = ref('edit')
const loading = ref(false)
const isSaving = ref(false)

/** 应用基础信息（从 GET /apps/:id 加载） */
const appId = computed(() => route.params.id as string)
const appName = ref('聊天机器人')
const savedTime = ref('--:--:--')

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

    // 1.更新应用名 + 保存时间
    appName.value = appResp.data.name || '聊天机器人'
    if (appResp.data.draft_updated_at) {
      updateSavedTime(appResp.data.draft_updated_at)
    }

    // 2.同步模型配置（草稿配置里的 model_config → state.modelConfig）
    const modelCfg = draftResp.data.model_config
    if (modelCfg) {
      state.modelConfig.model = modelCfg.model || state.modelConfig.model
      state.modelConfig.temperature = modelCfg.parameters?.temperature ?? state.modelConfig.temperature
      state.modelConfig.topP = modelCfg.parameters?.top_p ?? state.modelConfig.topP
      state.modelConfig.maxReplyLength = modelCfg.parameters?.max_tokens ?? state.modelConfig.maxReplyLength
    }

    // 3.同步开场白等其他草稿字段
    if (draftResp.data.preset_prompt) {
      personaPrompt.value = draftResp.data.preset_prompt
    }
    if (draftResp.data.opening_statement) {
      openingText.value = draftResp.data.opening_statement
    }
    if (draftResp.data.opening_questions?.length) {
      openingQuestions.value = draftResp.data.opening_questions
    }
    if (draftResp.data.speech_to_text?.enable !== undefined) {
      voiceInputEnabled.value = draftResp.data.speech_to_text.enable ? '开启' : '关闭'
    }
    if (draftResp.data.text_to_speech?.enable !== undefined) {
      voiceOutputEnabled.value = draftResp.data.text_to_speech.enable
    }
    if (draftResp.data.long_term_memory?.enable !== undefined) {
      longTermMemoryEnabled.value = draftResp.data.long_term_memory.enable
      state.longTermMemory.enabled = draftResp.data.long_term_memory.enable
    }
    if (draftResp.data.suggested_after_answer?.enable !== undefined) {
      showUserSuggestions.value = draftResp.data.suggested_after_answer.enable ? '开启' : '关闭'
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
const openingText = ref('你好，我是 ChatGPT，很高兴和你交流！');
const openingQuestions = ref(['你能做什么？', '帮我写一段代码', '介绍一下最新的科技动态']);
const showUserSuggestions = ref('开启');
const voiceInputEnabled = ref('开启');
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
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'workflows',
 title: '工作流组件',
 description: '工作流支持通过可视化的方式，对插件、大语言模型、代码块等功能进行组合，从而实现复杂、稳定的业务流程编排，例如旅行规划、报告分析等。',
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'knowledge',
 title: '知识库',
 description: '引用文本类型的数据，实现知识问答，最多支持关联 5 个知识库。',
 defaultExpand: true,
 showAdd: true,
 },
 {
 key: 'longTermMemory',
 title: '长期记忆',
 description: '总结聊天对话的内容，并用于更好的响应用户的消息。',
 defaultExpand: true,
 },
 {
 key: 'opening',
 title: '对话开场白',
 description: '设置对话开场白和推荐问题',
 defaultExpand: true,
 },
 {
 key: 'userSuggestions',
 title: '用户问题建议',
 defaultExpand: true,
 },
 {
 key: 'retrieval',
 title: '检索设置',
 defaultExpand: true,
 },
 {
 key: 'voiceInput',
 title: '语音输入',
 defaultExpand: true,
 },
 {
 key: 'voiceOutput',
 title: '语音输出',
 defaultExpand: true,
 },
 {
 key: 'contentReview',
 title: '内容审查',
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
const handleLongTermMemoryToggle = (value: unknown) => {
 const strValue = String(value);
 longTermMemoryEnabled.value = strValue === '开启';
 if (longTermMemoryEnabled.value) {
 state.longTermMemory.enabled = true;
 openLongTermMemory();
 }
 else {
 state.longTermMemory.enabled = false;
 }
};
const handleVoiceOutputToggle = (value: unknown) => {
 const strValue = String(value);
 voiceOutputEnabled.value = strValue === '开启';
 if (voiceOutputEnabled.value) {
 state.voiceConfig.autoPlay = true;
 openVoice();
 }
};
const handleContentReviewToggle = (value: unknown) => {
 const strValue = String(value);
 if (strValue === '开启') {
 state.contentReviewConfig.reviewInput = true;
 state.contentReviewConfig.reviewOutput = true;
 openContentReview();
 }
};
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
const handleCancelPublishConfirm = () => {
 closeCancelPublish();
 Message.success('已取消发布');
};
const handlePublish = () => {
 Message.success('发布成功');
};
/** 返回个人空间（AI 应用 Tab）；直接输入 URL 进入无历史记录时兜底显式跳转 */
const handleBack = () => {
  if (window.history.state?.back) {
    router.back();
  } else {
    router.push({ name: ROUTE_NAME.PERSONAL_SPACE, query: { tab: 'apps' } });
  }
};
const handleRefresh = () => {
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    // 刷新时重新拉取 app 数据，更新 savedTime 等
    loadAppData()
    Message.success('已刷新')
  }, 800)
}
const handleSendMessage = (query: string) => {
 const userMsg: ChatMessageItem = {
 id: `user-${Date.now()}`,
 role: 'user',
 content: query,
 };
 chatMessages.value.push(userMsg);
 isChatLoading.value = true;
 setTimeout(() => {
 const botMsg: ChatMessageItem = {
 id: `bot-${Date.now()}`,
 role: 'assistant',
 content: `你好，我是${state.modelConfig.model}，很高兴和你交流！`,
 tokens: Math.floor(Math.random() * 1000) + 500,
 latency: Math.floor(Math.random() * 2000) + 500,
 recommendations: ['你好吗？', '能帮我做什么？', '介绍一下你自己'],
 };
 chatMessages.value.push(botMsg);
 isChatLoading.value = false;
 }, 1200);
};
const handleDeleteMessage = (message: ChatMessageItem | null) => {
 if (message === null) {
 chatMessages.value = [];
 }
 else {
 const idx = chatMessages.value.findIndex(m => m.id === message.id);
 if (idx > -1)
 chatMessages.value.splice(idx, 1);
 }
};
const handleStopResponse = () => {
 isChatLoading.value = false;
};
const handleOpeningQuestionRemove = (index: number) => {
 openingQuestions.value.splice(index, 1);
};
const userSuggestionsOptions = [
 { label: '开启', value: '开启' },
 { label: '关闭', value: '关闭' },
];
const voiceInputOptions = [
 { label: '开启', value: '开启' },
 { label: '关闭', value: '关闭' },
];
const voiceOutputOptions = [
 { label: '开启', value: '开启' },
 { label: '关闭', value: '关闭' },
];
const longTermMemoryOptions = [
 { label: '开启', value: '开启' },
 { label: '关闭', value: '关闭' },
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

      <a-tabs v-model:active-key="activeTab" size="medium" type="line" class="flex-1 max-w-md justify-center">
        <a-tab-pane v-for="tab in tabOptions" :key="tab.key" :title="tab.title" />
      </a-tabs>

      <div class="flex items-center gap-2">
        <a-tooltip content="刷新">
          <a-button type="text" size="large" shape="circle" @click="handleRefresh">
            <template #icon><icon-refresh :size="18" /></template>
          </a-button>
        </a-tooltip>
        <a-button type="primary" size="large" class="ml-2" @click="handlePublish">
          <template #icon><icon-upload :size="16" /></template>
          更新发布
        </a-button>
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
                :auto-size="{ minRows: 20, maxRows: 40 }"
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

                <!-- 长期记忆 -->
                <template #longTermMemory>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      总结聊天对话的内容，并用于更好的响应用户的消息。
                    </div>
                    <a-select
                      :model-value="longTermMemoryEnabled ? '开启' : '关闭'"
                      class="w-24"
                      @change="handleLongTermMemoryToggle"
                    >
                      <a-option value="开启">开启</a-option>
                      <a-option value="关闭">关闭</a-option>
                    </a-select>
                  </div>
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
                            <template #icon><icon-close :size="14" /></template>
                          </a-button>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>

                <!-- 用户问题建议 -->
                <template #userSuggestions>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      在应用回答后，自动根据对话内容提供 3 条用户提问建议。
                    </div>
                    <a-select v-model="showUserSuggestions" class="w-24" :options="userSuggestionsOptions" />
                  </div>
                </template>

                <!-- 检索设置 -->
                <template #retrieval>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      引用文本类型的数据，实现知识问答，最多支持关联 5 个知识库。
                    </div>
                    <a-button type="text" size="small" @click="handleRetrievalOpen">
                      <template #icon><icon-settings :size="14" /></template>
                      设置
                    </a-button>
                  </div>
                </template>

                <!-- 语音输入 -->
                <template #voiceInput>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      启用后，您可以使用语音输入。
                    </div>
                    <a-select v-model="voiceInputEnabled" class="w-24" :options="voiceInputOptions" />
                  </div>
                </template>

                <!-- 语音输出 -->
                <template #voiceOutput>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      启用后，可以使用语音输出。
                    </div>
                    <a-select
                      :model-value="voiceOutputEnabled ? '开启' : '关闭'"
                      class="w-24"
                      @change="handleVoiceOutputToggle"
                    >
                      <a-option value="开启">开启</a-option>
                      <a-option value="关闭">关闭</a-option>
                    </a-select>
                  </div>
                </template>

                <!-- 内容审查 -->
                <template #contentReview>
                  <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-600">
                      审查输入和输出内容，保障应用安全合规。
                    </div>
                    <a-select
                      :model-value="state.contentReviewConfig.reviewInput ? '开启' : '关闭'"
                      class="w-24"
                      @change="handleContentReviewToggle"
                    >
                      <a-option value="开启">开启</a-option>
                      <a-option value="关闭">关闭</a-option>
                    </a-select>
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
            @send="handleSendMessage"
            @delete-message="handleDeleteMessage"
            @stop-response="handleStopResponse"
          />
        </div>
      </div>
    </div>
    </template>

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
