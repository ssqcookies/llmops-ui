<script setup lang="ts">
/**
 * WebApp 左栏 - 会话列表
 *  - 应用 header（icon + 名称）
 *  - 蓝色主按钮「新建对话」
 *  - 已置顶对话分组（始终显示标题，无内容时显示空态）
 *  - 对话列表分组（始终显示标题，无内容时显示空态）
 *  - 每条会话 hover 显示 ... 菜单：置顶/取消置顶 · 重命名 · 删除
 */
import type { WebAppConversationSummary, GetWebAppResponse } from '@/models/web-app'

defineProps<{
  appInfo: GetWebAppResponse['data'] | null
  loading: boolean
  pinnedConversations: WebAppConversationSummary[]
  conversations: WebAppConversationSummary[]
  currentId: string
  conversationsLoading: boolean
  aiLoading: boolean
}>()

const emit = defineEmits<{
  (e: 'select', conv: WebAppConversationSummary): void
  (e: 'new'): void
  (e: 'pin', conv: WebAppConversationSummary): void
  (e: 'rename', conv: WebAppConversationSummary): void
  (e: 'delete', conv: WebAppConversationSummary): void
}>()

const handleMenuClick = (
  action: string,
  conv: WebAppConversationSummary,
) => {
  if (action === 'pin') emit('pin', conv)
  else if (action === 'rename') emit('rename', conv)
  else if (action === 'delete') emit('delete', conv)
}
</script>

<template>
  <aside class="w-[220px] flex-shrink-0 flex flex-col bg-white border-r border-[#e5e6eb]">
    <!-- 应用 Header -->
    <div class="px-4 py-4 flex items-center gap-2.5 flex-shrink-0">
      <img
        v-if="appInfo?.icon"
        :src="appInfo.icon"
        alt="app-icon"
        class="w-9 h-9 rounded-lg object-cover flex-shrink-0"
      />
      <div
        v-else
        class="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3370ff] to-[#165dff] flex items-center justify-center text-white text-sm font-medium flex-shrink-0"
      >
        <icon-apps :size="18" />
      </div>
      <div class="min-w-0">
        <div class="text-[14px] font-medium text-[#1d2129] truncate">
          {{ appInfo?.name || '加载中...' }}
        </div>
      </div>
    </div>

    <!-- 新建对话按钮 -->
    <div class="px-3 pb-3 flex-shrink-0">
      <a-button
        type="primary"
        class="w-full justify-start"
        :loading="aiLoading"
        @click="emit('new')"
      >
        <template #icon><icon-plus :size="14" /></template>
        新建对话
      </a-button>
    </div>

    <!-- 会话列表区 -->
    <div class="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
      <!-- 骨架 -->
      <div v-if="conversationsLoading" class="space-y-2 px-2 py-1">
        <div v-for="i in 4" :key="i" class="h-7 bg-[#f2f3f5] rounded animate-pulse" />
      </div>

      <template v-else>
        <!-- 已置顶对话分组 -->
        <div class="px-2 pt-3 pb-1 text-[12px] text-[#86909c]">已置顶对话</div>
        <template v-if="pinnedConversations.length > 0">
          <div
            v-for="conv in pinnedConversations"
            :key="conv.id"
            class="relative group"
          >
            <button
              class="sidebar-item"
              :class="{ 'sidebar-item-active': conv.id === currentId }"
              @click="emit('select', conv)"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <icon-pushpin :size="13" class="text-[#86909c] flex-shrink-0" />
                <span class="truncate">{{ conv.name }}</span>
              </div>
            </button>
            <a-dropdown
              trigger="click"
              position="bl"
              @select="(val) => handleMenuClick(String(val), conv)"
            >
              <div class="sidebar-action-btn opacity-0 group-hover:opacity-100" @click.stop>
                <icon-more :size="14" />
              </div>
              <template #content>
                <a-doption value="pin">取消置顶</a-doption>
                <a-doption value="rename">重命名</a-doption>
                <a-doption value="delete" class="!text-[#f53f3f]">删除</a-doption>
              </template>
            </a-dropdown>
          </div>
        </template>
        <div
          v-else
          class="px-3 py-2 text-[12px] text-[#c9cdd4]"
        >
          暂无置顶对话
        </div>

        <!-- 对话列表分组 -->
        <div class="px-2 pt-3 pb-1 text-[12px] text-[#86909c]">对话列表</div>
        <template v-if="conversations.length > 0">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="relative group"
          >
            <button
              class="sidebar-item"
              :class="{ 'sidebar-item-active': conv.id === currentId }"
              @click="emit('select', conv)"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <icon-message :size="13" class="text-[#86909c] flex-shrink-0" />
                <span class="truncate">{{ conv.name }}</span>
              </div>
            </button>
            <a-dropdown
              trigger="click"
              position="bl"
              @select="(val) => handleMenuClick(String(val), conv)"
            >
              <div class="sidebar-action-btn opacity-0 group-hover:opacity-100" @click.stop>
                <icon-more :size="14" />
              </div>
              <template #content>
                <a-doption value="pin">置顶对话</a-doption>
                <a-doption value="rename">重命名</a-doption>
                <a-doption value="delete" class="!text-[#f53f3f]">删除</a-doption>
              </template>
            </a-dropdown>
          </div>
        </template>
        <div
          v-else
          class="px-3 py-2 text-[12px] text-[#c9cdd4]"
        >
          暂无对话
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
@reference "tailwindcss";

.sidebar-item {
  @apply w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-[13px] text-[#4e5969] hover:bg-[#f2f3f5] transition-colors text-left cursor-pointer;
}
.sidebar-item-active {
  @apply bg-[#e8f3ff] text-[#165dff] hover:bg-[#e8f3ff];
}
.sidebar-action-btn {
  @apply absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center hover:bg-[#e5e6eb] transition-opacity cursor-pointer;
}
</style>
