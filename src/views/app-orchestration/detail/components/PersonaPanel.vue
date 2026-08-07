<script setup lang="ts">
import { computed } from 'vue'
import type { PersonaConfig } from '../types'

const props = defineProps<{
  config: PersonaConfig
  modelName: string
}>()

const emit = defineEmits<{
  (e: 'openModelSettings'): void
}>()

interface SkillSection {
  title: string
  items: string[]
}

const skillSections = computed<SkillSection[]>(() => {
  const text = props.config.skills.trim()
  if (!text) return []

  const sections = text.split(/^##\s+/m).filter(Boolean)
  return sections.map((section) => {
    const lines = section.split('\n').filter((l) => l.trim())
    const title = lines[0]?.trim() ?? ''
    const items: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const rawLine = lines[i]
      if (!rawLine) continue
      const line = rawLine.trim()
      const match = line.match(/^\d+\.\s*(.+)/)
      if (match && match[1]) {
        items.push(match[1])
      } else if (line) {
        items.push(line)
      }
    }
    return { title, items }
  })
})

interface LimitItem {
  text: string
}

const limitItems = computed<LimitItem[]>(() => {
  const text = props.config.limitations.trim()
  if (!text) return []

  const withoutHeader = text.replace(/^##\s+.+\n?/m, '').trim()
  const lines = withoutHeader.split('\n').filter((l) => l.trim())
  return lines.map((line) => {
    const trimmed = line.trim()
    const match = trimmed.match(/^[-*]\s+(.+)/)
    return { text: match && match[1] ? match[1] : trimmed }
  })
})
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between px-4 py-3 border-b border-[#e5e6eb]">
      <h2 class="text-base font-medium text-gray-900">人设与回复逻辑</h2>
      <button
        class="flex items-center gap-1 px-3 py-1 rounded-md border border-[#e5e6eb] text-sm text-gray-600 hover:border-[#1677ff] hover:text-[#1677ff] transition cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span>优化</span>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto px-4 py-4 space-y-5">
      <div
        class="flex items-center gap-2 px-3 py-2 rounded-md bg-[#f7f8fa] cursor-pointer hover:bg-[#eef0f3] transition"
        @click="emit('openModelSettings')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-500">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 10v6m4.22-13.78l4.24-4.24M3.54 20.46l4.24-4.24m0-8.48L3.54 3.54m16.92 16.92l-4.24-4.24" />
        </svg>
        <span class="text-sm text-gray-700">{{ modelName }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto text-gray-400">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>

      <section>
        <div class="flex items-center gap-2 mb-2">
          <span class="w-0.5 h-4 bg-[#1677ff] rounded-full"></span>
          <h3 class="text-sm font-medium text-gray-900">角色</h3>
        </div>
        <div class="pl-2">
          <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{{ config.role }}</p>
        </div>
      </section>

      <section>
        <div class="flex items-center gap-2 mb-2">
          <span class="w-0.5 h-4 bg-[#1677ff] rounded-full"></span>
          <h3 class="text-sm font-medium text-gray-900">技能</h3>
        </div>
        <div class="pl-2 space-y-3">
          <div v-for="(section, idx) in skillSections" :key="idx" class="space-y-1.5">
            <h4 class="text-sm font-medium text-[#1677ff]">{{ section.title }}</h4>
            <ol v-if="section.items.length" class="space-y-1">
              <li
                v-for="(item, i) in section.items"
                :key="i"
                class="flex gap-2 text-sm text-gray-700 leading-relaxed"
              >
                <span class="flex-shrink-0 text-gray-400">{{ i + 1 }}.</span>
                <span>{{ item }}</span>
              </li>
            </ol>
          </div>
          <p v-if="skillSections.length === 0" class="text-sm text-gray-400">暂无技能描述</p>
        </div>
      </section>

      <section>
        <div class="flex items-center gap-2 mb-2">
          <span class="w-0.5 h-4 bg-[#1677ff] rounded-full"></span>
          <h3 class="text-sm font-medium text-gray-900">限制</h3>
        </div>
        <div class="pl-2">
          <ul v-if="limitItems.length" class="space-y-1.5">
            <li
              v-for="(item, idx) in limitItems"
              :key="idx"
              class="flex gap-2 text-sm text-gray-700 leading-relaxed"
            >
              <span class="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-gray-400"></span>
              <span>{{ item.text }}</span>
            </li>
          </ul>
          <p v-else class="text-sm text-gray-400">暂无限制描述</p>
        </div>
      </section>
    </div>
  </div>
</template>