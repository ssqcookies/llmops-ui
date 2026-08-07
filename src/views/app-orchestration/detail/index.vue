<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { useDialogs } from './useDialogs'
import type { TabKey, ModelConfig, PersonaConfig, CapabilityConfig, ChatMessage, AutoSaveStatus } from './types'

import TopBar from './components/TopBar.vue'
import PersonaPanel from './components/PersonaPanel.vue'
import CapabilityPanel from './components/CapabilityPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import PublishTab from './components/PublishTab.vue'
import ConfigTab from './components/ConfigTab.vue'
import StatisticsTab from './components/StatisticsTab.vue'

import ModelSettingsDialog from './components/ModelSettingsDialog.vue'
import PluginDetailDialog from './components/PluginDetailDialog.vue'
import AddPluginDrawer from './components/AddPluginDrawer.vue'
import WorkflowDrawer from './components/WorkflowDrawer.vue'
import KnowledgeDrawer from './components/KnowledgeDrawer.vue'
import RetrievalDialog from './components/RetrievalDialog.vue'
import LongTermMemoryDialog from './components/LongTermMemoryDialog.vue'
import VoiceOutputDialog from './components/VoiceOutputDialog.vue'
import ModerationDialog from './components/ModerationDialog.vue'
import PublishHistoryDrawer from './components/PublishHistoryDrawer.vue'
import CancelPublishConfirmDialog from './components/CancelPublishConfirmDialog.vue'
import UpdatePublishConfirmDialog from './components/UpdatePublishConfirmDialog.vue'

const route = useRoute()
const appId = String(route.params.id ?? '')
const { dialogs, open, close } = useDialogs()

const activeTab = ref<TabKey>('orchestrate')

const autoSaveStatus = reactive<AutoSaveStatus>({
  autoSaveStatus: 'saved',
  lastSavedTime: '23:18:15',
})

const modelConfig = reactive<ModelConfig>({
  modelId: 'gpt-4o',
  temperature: 0.7,
  topP: 0.9,
  presencePenalty: 0,
  frequencyPenalty: 0,
  contextRounds: 10,
  maxResponseTokens: 8192,
})

const personaConfig = reactive<PersonaConfig>({
  role: '你是一个智能聊天机器人，能够与用户进行各种话题的交流，包括但不限于生活、学习、娱乐等。',
  skills:
    '## 技能 1: 日常交流\n1. 当用户分享日常生活经历时，给予积极的回应和建议。\n2. 对于用户的心情表达，提供安慰和鼓励。\n\n## 技能 2: 知识解答\n1. 当用户提出问题时，运用知识库和搜索工具提供准确、详细的答案。\n2. 对于复杂问题，分步骤进行解释。\n\n## 技能 3: 娱乐互动\n1. 能与用户玩文字游戏，如猜谜语、成语接龙等。\n2. 推荐有趣的娱乐活动和节目。',
  limitations:
    '## 限制\n- 回答内容应积极、友善、文明，不得包含不当言论。\n- 所输出的内容必须按照给定的格式进行组织，不能偏离框架要求。\n- 对于不确定的问题，应明确告知用户并尽力提供获取信息的途径。',
})

const capabilityConfig = reactive<CapabilityConfig>({
  plugins: [
    { pluginId: 'p1', name: '图片理解 / imgUnderstand', description: '回答用户关于图像的问题', enabled: true, category: 'builtin' },
    { pluginId: 'p2', name: '必应搜索 / bingWebSearch', description: '必应搜索引擎，搜索天气、汇率等信息', enabled: true, category: 'builtin' },
  ],
  workflows: [],
  knowledgeBases: [],
  longTermMemoryEnabled: false,
  longTermMemoryContent: '',
  openingMessage: '',
  openingQuestions: [],
  userSuggestionsEnabled: true,
  voiceInputEnabled: false,
  voiceOutputEnabled: false,
  contentModerationEnabled: false,
})

const chatMessages = ref<ChatMessage[]>([
  {
    messageId: 'm1',
    role: 'user',
    content: '你好，你是做什么的？',
    timestamp: '10:00',
    tokenCount: 0,
    steps: [],
    images: [],
  },
  {
    messageId: 'm2',
    role: 'assistant',
    content: '你好，我是聊天机器人，很高兴和你交流！',
    timestamp: '10:00',
    tokenCount: 72,
    steps: [],
    images: [],
  },
  {
    messageId: 'm3',
    role: 'user',
    content: '能详细解释一下 LLM 是什么吗？',
    timestamp: '10:01',
    tokenCount: 0,
    steps: [],
    images: [],
  },
  {
    messageId: 'm4',
    role: 'assistant',
    content:
      'LLM 即 Large Language Model，大语言模型，是一种基于深度学习的自然语言处理模型，具有很强的语言理解和生成能力。它通过在大量文本数据上进行训练，学习到语言的模式和语义知识。',
    timestamp: '10:01',
    tokenCount: 1085,
    steps: [{ label: '已检索知识库', detail: '1' }],
    images: [],
  },
])

const currentPluginDetail = ref<string>('')

function handleSave() {
  autoSaveStatus.autoSaveStatus = 'saving'
  // TODO: 调用保存接口
  setTimeout(() => {
    autoSaveStatus.autoSaveStatus = 'saved'
    autoSaveStatus.lastSavedTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, 600)
}

function handleOpenPluginDetail(pluginId: string) {
  currentPluginDetail.value = pluginId
  open('pluginDetailDialog')
}
</script>

<template>
  <div class="flex flex-col h-screen bg-[#f7f8fa]">
    <!-- 顶部导航栏 -->
    <TopBar
      :active-tab="activeTab"
      :auto-save-status="autoSaveStatus"
      :model-name="modelConfig.modelId"
      @update:active-tab="activeTab = $event"
      @save="handleSave"
      @open-publish-history="open('publishHistoryDrawer')"
      @open-model-settings="open('modelSettingsDialog')"
      @update-publish="open('updatePublishConfirmDialog')"
    />

    <!-- Tab 内容 -->
    <div class="flex-1 overflow-hidden">
      <!-- 编排 Tab：三栏布局 -->
      <div v-show="activeTab === 'orchestrate'" class="flex h-full">
        <!-- 左栏：人设与回复逻辑 -->
        <aside class="w-[340px] flex-shrink-0 border-r border-[#e5e6eb] bg-white overflow-y-auto">
          <PersonaPanel :config="personaConfig" :model-name="modelConfig.modelId" @open-model-settings="open('modelSettingsDialog')" />
        </aside>

        <!-- 中栏：应用能力 -->
        <section class="flex-1 overflow-y-auto min-w-0 p-[16px]">
          <CapabilityPanel
            :config="capabilityConfig"
            @open-workflow="open('workflowDrawer')"
            @open-knowledge="open('knowledgeDrawer')"
            @open-plugin-detail="handleOpenPluginDetail"
            @open-add-plugin="open('addPluginDrawer')"
            @open-long-memory="open('longTermMemoryDialog')"
            @open-retrieval="open('retrievalDialog')"
            @open-moderation="open('moderationDialog')"
            @open-voice="open('voiceOutputDialog')"
          />
        </section>

        <!-- 右栏：预览与调试 -->
        <aside class="w-[400px] flex-shrink-0 border-l border-[#e5e6eb] bg-white overflow-hidden flex flex-col">
          <PreviewPanel :messages="chatMessages" />
        </aside>
      </div>

      <!-- 发布 Tab -->
      <div v-show="activeTab === 'publish'" class="h-full overflow-y-auto bg-white p-[24px]">
        <PublishTab app-id="appId" @cancel-publish="open('cancelPublishConfirmDialog')" />
      </div>

      <!-- 配置 Tab -->
      <div v-show="activeTab === 'config'" class="h-full overflow-y-auto bg-white p-[24px]">
        <ConfigTab />
      </div>

      <!-- 统计分析 Tab -->
      <div v-show="activeTab === 'statistics'" class="h-full overflow-y-auto bg-white p-[24px]">
        <StatisticsTab />
      </div>
    </div>

    <!-- M1 模型设置 -->
    <ModelSettingsDialog
      :visible="dialogs.modelSettingsDialog"
      :model-config="modelConfig"
      @cancel="close('modelSettingsDialog')"
      @save="close('modelSettingsDialog')"
    />

    <!-- M2 工具信息（插件详情） -->
    <PluginDetailDialog
      :visible="dialogs.pluginDetailDialog"
      @cancel="close('pluginDetailDialog')"
      @save="close('pluginDetailDialog')"
    />

    <!-- M3 添加插件 -->
    <AddPluginDrawer :visible="dialogs.addPluginDrawer" @close="close('addPluginDrawer')" />

    <!-- M4 关联工作流 -->
    <WorkflowDrawer
      :visible="dialogs.workflowDrawer"
      @cancel="close('workflowDrawer')"
      @confirm="close('workflowDrawer')"
    />

    <!-- M5 添加知识库 -->
    <KnowledgeDrawer
      :visible="dialogs.knowledgeDrawer"
      @cancel="close('knowledgeDrawer')"
      @confirm="close('knowledgeDrawer')"
    />

    <!-- M6 检索设置 -->
    <RetrievalDialog
      :visible="dialogs.retrievalDialog"
      @cancel="close('retrievalDialog')"
      @save="close('retrievalDialog')"
    />

    <!-- M7 长期记忆 -->
    <LongTermMemoryDialog
      :visible="dialogs.longTermMemoryDialog"
      @cancel="close('longTermMemoryDialog')"
      @save="close('longTermMemoryDialog')"
    />

    <!-- M8 语音输出设置 -->
    <VoiceOutputDialog
      :visible="dialogs.voiceOutputDialog"
      @cancel="close('voiceOutputDialog')"
      @save="close('voiceOutputDialog')"
    />

    <!-- M9 内容审查设置 -->
    <ModerationDialog
      :visible="dialogs.moderationDialog"
      @cancel="close('moderationDialog')"
      @save="close('moderationDialog')"
    />

    <!-- M10 发布历史 -->
    <PublishHistoryDrawer :visible="dialogs.publishHistoryDrawer" @close="close('publishHistoryDrawer')" />

    <!-- M11 取消发布确认 -->
    <CancelPublishConfirmDialog
      :visible="dialogs.cancelPublishConfirmDialog"
      @cancel="close('cancelPublishConfirmDialog')"
      @confirm="close('cancelPublishConfirmDialog')"
    />

    <!-- M12 更新发布确认 -->
    <UpdatePublishConfirmDialog
      :visible="dialogs.updatePublishConfirmDialog"
      @cancel="close('updatePublishConfirmDialog')"
      @confirm="close('updatePublishConfirmDialog')"
    />
  </div>
</template>
