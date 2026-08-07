<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import type { CapabilityConfig, PluginItem } from '../types'

const props = defineProps<{
  config: CapabilityConfig
}>()

const emit = defineEmits<{
  openPluginDetail: [pluginId: string]
  openAddPlugin: []
  openWorkflow: []
  openKnowledge: []
  openLongMemory: []
  openRetrieval: []
  openModeration: []
  openVoice: []
}>()

const expanded = reactive<Record<string, boolean>>({
  plugins: true,
  workflows: true,
  knowledge: true,
  longMemory: true,
  openingMessage: true,
  userSuggestions: true,
  voiceInput: true,
  voiceOutput: true,
  moderation: true,
})

const newOpeningQuestion = ref('')

function toggleCard(key: string) {
  expanded[key] = !expanded[key]
}

function addOpeningQuestion() {
  const q = newOpeningQuestion.value.trim()
  if (q) {
    props.config.openingQuestions.push(q)
    newOpeningQuestion.value = ''
  }
}

function removeOpeningQuestion(index: number) {
  props.config.openingQuestions.splice(index, 1)
}

function togglePluginEnabled(plugin: PluginItem) {
  plugin.enabled = !plugin.enabled
}

const pluginCount = computed(() => props.config.plugins.length)
</script>

<template>
  <div class="w-full">
    <!-- 1. 扩展插件 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('plugins')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">扩展插件</span>
          <span v-if="pluginCount > 0" class="text-[12px] text-[#86909c]">({{ pluginCount }})</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
            title="添加插件"
            @click.stop="emit('openAddPlugin')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.plugins }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.plugins" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div v-if="config.plugins.length === 0" class="text-[13px] text-[#86909c] py-2">
          暂无插件，点击右上角 + 添加插件
        </div>
        <div v-else class="grid grid-cols-1 gap-3">
          <div
            v-for="plugin in config.plugins"
            :key="plugin.pluginId"
            class="flex items-center gap-3 p-3 rounded-lg border border-[#e5e6eb] bg-[#fafbfc] hover:bg-white hover:border-[#c9cdd4] transition-colors"
          >
            <div class="w-9 h-9 rounded-lg bg-[#e8f3ff] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"/>
                <rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-[13px] font-medium text-[#1d2129] truncate">{{ plugin.name }}</div>
              <div class="text-[12px] text-[#86909c] truncate">{{ plugin.description }}</div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <label class="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  class="sr-only peer"
                  :checked="plugin.enabled"
                  @change="togglePluginEnabled(plugin)"
                >
                <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
                  <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
                </div>
              </label>
              <button
                class="flex items-center justify-center w-7 h-7 rounded hover:bg-[#e5e6eb] text-[#4e5969] transition-colors"
                title="插件设置"
                @click="emit('openPluginDetail', plugin.pluginId)"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 工作流组件 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('workflows')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="6" cy="6" r="3"/>
            <circle cx="18" cy="6" r="3"/>
            <circle cx="12" cy="18" r="3"/>
            <line x1="6" y1="9" x2="12" y2="15"/>
            <line x1="18" y1="9" x2="12" y2="15"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">工作流组件</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
            title="添加工作流"
            @click.stop="emit('openWorkflow')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.workflows }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.workflows" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <p class="text-[13px] text-[#86909c] leading-6">
          通过可视化工作流编排，将多个组件串联起来实现复杂业务逻辑。支持条件分支、循环执行等。
        </p>
        <button
          class="mt-3 flex items-center gap-1 text-[13px] text-[#1677ff] hover:text-[#4096ff] transition-colors"
          @click="emit('openWorkflow')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>添加工作流</span>
        </button>
      </div>
    </div>

    <!-- 3. 知识库 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('knowledge')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">知识库</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="flex items-center justify-center w-6 h-6 rounded hover:bg-[#f2f3f5] text-[#4e5969] transition-colors"
            title="添加知识库"
            @click.stop="emit('openKnowledge')"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.knowledge }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.knowledge" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <p class="text-[13px] text-[#86909c] leading-6">
          关联知识库以增强应用对专有领域知识的回答能力，支持文档检索和引用。
        </p>
        <button
          class="mt-3 flex items-center gap-1 text-[13px] text-[#1677ff] hover:text-[#4096ff] transition-colors"
          @click="emit('openKnowledge')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>添加知识库</span>
        </button>
      </div>
    </div>

    <!-- 4. 长期记忆 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('longMemory')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.1-.9 2-2 2h-4c-1.1 0-2-.9-2-2a4 4 0 0 1 4-4z"/>
            <path d="M8 8v2a4 4 0 0 0 8 0V8"/>
            <path d="M12 14v8"/>
            <path d="M8 18h8"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">长期记忆</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.longMemory }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.longMemory" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-[#4e5969]">
            开启后应用可记住用户的偏好、历史交互等信息，提供更个性化的体验。
          </p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input
              type="checkbox"
              class="sr-only peer"
              v-model="config.longTermMemoryEnabled"
            >
            <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
              <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
        <button
          v-if="config.longTermMemoryEnabled"
          class="mt-3 flex items-center gap-1 text-[13px] text-[#1677ff] hover:text-[#4096ff] transition-colors"
          @click="emit('openLongMemory')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span>调试长期记忆</span>
        </button>
      </div>
    </div>

    <!-- 5. 对话开场白 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('openingMessage')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">对话开场白</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.openingMessage }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.openingMessage" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="mb-4">
          <label class="block text-[13px] text-[#4e5969] mb-1.5">开场白内容</label>
          <textarea
            v-model="config.openingMessage"
            rows="3"
            placeholder="请输入应用首次对话的开场白内容..."
            class="w-full px-3 py-2 text-[13px] border border-[#e5e6eb] rounded-lg resize-none outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors"
          />
        </div>
        <div>
          <label class="block text-[13px] text-[#4e5969] mb-1.5">预设问题（可选）</label>
          <div class="flex gap-2">
            <input
              v-model="newOpeningQuestion"
              type="text"
              placeholder="输入预设问题后点击添加"
              class="flex-1 px-3 py-2 text-[13px] border border-[#e5e6eb] rounded-lg outline-none focus:border-[#1677ff] placeholder:text-[#c9cdd4] transition-colors"
              @keyup.enter="addOpeningQuestion"
            >
            <button
              class="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1677ff] text-white hover:bg-[#4096ff] transition-colors flex-shrink-0"
              title="添加预设问题"
              @click="addOpeningQuestion"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>
          <div v-if="config.openingQuestions.length > 0" class="flex flex-wrap gap-2 mt-2">
            <span
              v-for="(q, idx) in config.openingQuestions"
              :key="idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#f2f3f5] text-[12px] text-[#4e5969] group"
            >
              {{ q }}
              <button
                class="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#e5e6eb] text-[#86909c] hover:text-[#4e5969] transition-colors"
                @click="removeOpeningQuestion(idx)"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 6. 用户问题建议 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('userSuggestions')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">用户问题建议</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.userSuggestions }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.userSuggestions" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-[#4e5969]">
            根据对话上下文，为用户提供智能的问题建议，引导更深入的交互。
          </p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input
              type="checkbox"
              class="sr-only peer"
              v-model="config.userSuggestionsEnabled"
            >
            <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
              <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- 7. 语音输入 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('voiceInput')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">语音输入</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.voiceInput }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.voiceInput" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-[#4e5969]">
            开启后用户可通过语音进行输入，支持实时语音转文字，提升移动端体验。
          </p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input
              type="checkbox"
              class="sr-only peer"
              v-model="config.voiceInputEnabled"
            >
            <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
              <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
      </div>
    </div>

    <!-- 8. 语音输出 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('voiceOutput')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">语音输出</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.voiceOutput }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.voiceOutput" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-[#4e5969]">
            将应用回复内容以语音形式播放，支持多种音色和语速调节。
          </p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input
              type="checkbox"
              class="sr-only peer"
              v-model="config.voiceOutputEnabled"
            >
            <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
              <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
        <button
          v-if="config.voiceOutputEnabled"
          class="mt-3 flex items-center gap-1 text-[13px] text-[#1677ff] hover:text-[#4096ff] transition-colors"
          @click="emit('openVoice')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>输出设置</span>
        </button>
      </div>
    </div>

    <!-- 9. 内容审查 -->
    <div class="rounded-lg bg-white border border-[#e5e6eb] mb-3">
      <div
        class="flex justify-between items-center py-3 px-4 cursor-pointer select-none"
        @click="toggleCard('moderation')"
      >
        <div class="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4e5969" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          <span class="text-[14px] font-medium text-[#1d2129]">内容审查</span>
        </div>
        <div class="flex items-center gap-2">
          <svg
            class="w-4 h-4 text-[#86909c] transition-transform duration-200"
            :class="{ 'rotate-180': expanded.moderation }"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div v-show="expanded.moderation" class="px-4 pb-4 border-t border-[#e5e6eb] pt-3">
        <div class="flex items-center justify-between">
          <p class="text-[13px] text-[#4e5969]">
            对用户输入和应用输出内容进行合规性审查，过滤敏感词和不当内容。
          </p>
          <label class="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
            <input
              type="checkbox"
              class="sr-only peer"
              v-model="config.contentModerationEnabled"
            >
            <div class="w-9 h-5 bg-[#d9d9d9] rounded-full relative transition-colors peer-checked:bg-[#1677ff]">
              <div class="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm transition-transform peer-checked:translate-x-4"></div>
            </div>
          </label>
        </div>
        <button
          v-if="config.contentModerationEnabled"
          class="mt-3 flex items-center gap-1 text-[13px] text-[#1677ff] hover:text-[#4096ff] transition-colors"
          @click="emit('openModeration')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>审查设置</span>
        </button>
      </div>
    </div>
  </div>
</template>