<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { NavMenuItem, CurrentUser, LayoutDialogs } from './types'
import { useAccountStore } from '@/stores'
import { getCurrentUser } from '@/services/account'
import CreateAppFlow from '@/views/components/CreateAppFlow.vue'
import AccountSettingsModal from '@/views/components/AccountSettingsModal.vue'
import LogoutConfirmModal from '@/views/components/LogoutConfirmModal.vue'
import IconHome from '@/components/icons/IconHome.vue'
import IconHomeFull from '@/components/icons/IconHomeFull.vue'
import IconSpace from '@/components/icons/IconSpace.vue'
import IconSpaceFull from '@/components/icons/IconSpaceFull.vue'
import IconApp from '@/components/icons/IconApp.vue'
import IconAppFull from '@/components/icons/IconAppFull.vue'
import IconTool from '@/components/icons/IconTool.vue'
import IconToolFull from '@/components/icons/IconToolFull.vue'
import IconOpenApi from '@/components/icons/IconOpenApi.vue'
import IconOpenApiFull from '@/components/icons/IconOpenApiFull.vue'

// ============================================================
// 基础 hooks
// ============================================================

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()

// ============================================================
// 布局级状态
// ============================================================

const pageLoading = ref(true)

/** 当前用户信息（从 account store 读取，保持响应式） */
const currentUser = reactive<CurrentUser>({
  id: accountStore.account.id,
  name: accountStore.account.name,
  email: accountStore.account.email,
  avatar: accountStore.account.avatar,
})

const dialogs = reactive<LayoutDialogs>({
  createApp: false,
  accountSettings: false,
  logoutConfirm: false,
})

/** 从 account store 同步到本地 reactive */
const syncUserFromStore = () => {
  currentUser.id = accountStore.account.id || ''
  currentUser.name = accountStore.account.name || ''
  currentUser.email = accountStore.account.email || ''
  currentUser.avatar = accountStore.account.avatar || ''
}

/** 拉取当前登录用户信息并写入 account store */
const fetchCurrentUser = async () => {
  try {
    const res = await getCurrentUser()
    if (res?.data) {
      accountStore.update(res.data)
      syncUserFromStore()
    }
  } catch {
    // 拉取失败不阻塞页面渲染，保持 store 中已有数据
  }
}

// ============================================================
// 导航菜单
// ============================================================

const navMenuList = ref<NavMenuItem[]>([
  {
    key: 'home',
    label: '主页',
    path: '/',
    icon: IconHome,
    iconActive: IconHomeFull,
  },
  {
    key: 'space',
    label: '个人空间',
    path: '/space',
    icon: IconSpace,
    iconActive: IconSpaceFull,
  },
  {
    key: 'app-square',
    label: '应用广场',
    path: '/app-square',
    icon: IconApp,
    iconActive: IconAppFull,
    group: '探索',
  },
  {
    key: 'plugin',
    label: '插件广场',
    path: '/plugin',
    icon: IconTool,
    iconActive: IconToolFull,
    group: '探索',
  },
  {
    key: 'openapi',
    label: '开放 API',
    path: '/openapi',
    icon: IconOpenApi,
    iconActive: IconOpenApiFull,
    group: '探索',
  },
])

/** 按分组整理导航项 */
const groupedNavItems = computed(() => {
  const ungrouped: NavMenuItem[] = []
  const groupedMap = new Map<string, NavMenuItem[]>()
  for (const item of navMenuList.value) {
    if (item.group) {
      if (!groupedMap.has(item.group)) groupedMap.set(item.group, [])
      groupedMap.get(item.group)!.push(item)
    } else {
      ungrouped.push(item)
    }
  }
  return { ungrouped, groups: Array.from(groupedMap.entries()) }
})

/** 当前激活的导航 key（基于路由前缀匹配） */
const activeNavKey = computed(() => {
  if (route.path === '/' || route.path === '') return 'home'
  const matched = navMenuList.value.find((item) => {
    if (item.path === '/') return route.path === '/'
    return route.path.startsWith(item.path)
  })
  return matched?.key ?? 'home'
})

// ============================================================
// 导航跳转 & 全局操作入口
// ============================================================

const handleNavClick = (key: string) => {
  const item = navMenuList.value.find((i) => i.key === key)
  if (!item || item.path === route.path) return
  router.push(item.path)
}

const openCreateApp = () => {
  dialogs.createApp = true
}

const openAccountSettings = () => {
  dialogs.accountSettings = true
}

const openLogoutConfirm = () => {
  dialogs.logoutConfirm = true
}

// ============================================================
// 生命周期：拉取登录态用户信息
// ============================================================

onMounted(async () => {
  // 若 store 中已有用户信息（如刚登录），先立即渲染，再后台拉取最新
  if (accountStore.account.id) {
    syncUserFromStore()
    pageLoading.value = false
  }
  await fetchCurrentUser()
  pageLoading.value = false
})

/** 账号设置保存后刷新侧栏用户信息 */
const handleAccountSaved = () => {
  syncUserFromStore()
}
</script>

<template>
  <div class="w-full min-h-screen bg-[#f7f8fa]">
    <!-- 全局 loading 遮罩 -->
    <a-spin
      v-if="pageLoading"
      :loading="pageLoading"
      class="flex items-center justify-center w-full h-screen"
      tip="加载中..."
    />

    <template v-else>
      <!-- ========= 左侧：侧边导航栏（浅色白底 / 固定定位） ========= -->
      <aside
        class="sidebar-base fixed left-0 top-0 h-screen w-[220px] bg-white
               border-r border-[#e5e6eb] flex flex-col z-20"
      >
        <!-- 1. Logo 占位 + 创建 AI 应用按钮 -->
        <div class="shrink-0 px-4 pt-4 pb-3">
          <div class="logo-placeholder mb-4 rounded-[8px] h-[28px] w-[80px]" />

          <a-button
            type="primary"
            long
            :rounded="false"
            :style="{ borderRadius: '6px', height: '32px', fontSize: '13px', fontWeight: 500 }"
            @click="openCreateApp"
          >
            <template #icon><icon-plus :size="12" /></template>
            创建 AI 应用
          </a-button>
        </div>

        <!-- 2. 导航菜单 -->
        <nav class="flex-1 min-h-0 overflow-y-auto px-3 py-1">
          <!-- 未分组：主页 / 个人空间 -->
          <div class="flex flex-col mb-3">
            <div
              v-for="item in groupedNavItems.ungrouped"
              :key="item.key"
              class="nav-item"
              :class="{ 'nav-item-active': activeNavKey === item.key }"
              @click="handleNavClick(item.key)"
            >
              <span v-if="activeNavKey === item.key" class="nav-item-accent" />
              <component
                :is="activeNavKey === item.key && item.iconActive ? item.iconActive : item.icon"
                class="w-[14px] h-[14px] shrink-0"
              />
              <span class="nav-item-label">{{ item.label }}</span>
            </div>
          </div>

          <!-- 分组：探索 -->
          <template v-for="[groupName, items] in groupedNavItems.groups" :key="groupName">
            <div class="nav-group-title">{{ groupName }}</div>
            <div class="flex flex-col mb-3">
              <div
                v-for="item in items"
                :key="item.key"
                class="nav-item"
                :class="{ 'nav-item-active': activeNavKey === item.key }"
                @click="handleNavClick(item.key)"
              >
                <span v-if="activeNavKey === item.key" class="nav-item-accent" />
                <component
                  :is="activeNavKey === item.key && item.iconActive ? item.iconActive : item.icon"
                  class="w-[14px] h-[14px] shrink-0"
                />
                <span class="nav-item-label">{{ item.label }}</span>
              </div>
            </div>
          </template>
        </nav>

        <!-- 3. 底部用户信息 + 下拉菜单 -->
        <div class="shrink-0 border-t border-[#f2f3f5] px-3 py-2.5">
          <a-dropdown
            trigger="click"
            :popup-style="{ padding: '4px 0', borderRadius: '8px', minWidth: '120px' }"
            @select="() => {}"
          >
            <div class="user-card">
              <a-avatar
                :size="22"
                :style="{
                  backgroundColor: '#165dff',
                  flexShrink: 0,
                  fontSize: '11px',
                  fontWeight: 600,
                  overflow: 'hidden',
                }"
              >
                <template v-if="currentUser.avatar">
                  <img
                    :src="currentUser.avatar"
                    alt="avatar"
                    class="w-full h-full object-cover"
                  />
                </template>
                <template v-else>
                  {{ currentUser.name ? currentUser.name.charAt(0) : '罐' }}
                </template>
              </a-avatar>
              <div class="flex flex-col min-w-0 ml-2 flex-1">
                <span class="user-card-name">
                  {{ currentUser.name || '未登录用户' }}
                </span>
                <span class="user-card-email">
                  {{ currentUser.email || '—' }}
                </span>
              </div>
            </div>

            <template #content>
              <a-doption value="settings">
                <div
                  class="user-menu-item user-menu-item-normal"
                  @click="openAccountSettings"
                >
                  账号设置
                </div>
              </a-doption>
              <a-doption value="logout">
                <div
                  class="user-menu-item user-menu-item-danger"
                  @click="openLogoutConfirm"
                >
                  退出登录
                </div>
              </a-doption>
            </template>
          </a-dropdown>
        </div>
      </aside>

      <!-- ========= 右侧：主内容区（仅渲染 router-view，页面内容由子路由承载） ========= -->
      <main class="ml-[220px] min-h-screen w-[calc(100%-220px)]">
        <router-view v-slot="{ Component }">
          <transition name="layout-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- ========= 全局弹窗挂载点位（从 views/components 引入） ========= -->
      <CreateAppFlow v-model:visible="dialogs.createApp" />
      <AccountSettingsModal
        v-model:visible="dialogs.accountSettings"
        @saved="handleAccountSaved"
      />
      <LogoutConfirmModal v-model:visible="dialogs.logoutConfirm" />
    </template>
  </div>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .nav-item {
    @apply relative flex items-center h-[32px] gap-2 rounded-[6px] cursor-pointer
           transition-all text-[#4e5969]
           hover:bg-[#f2f3f5] hover:text-[#1d2129];
    padding-left: 12px;
    padding-right: 12px;
  }
  .nav-item-active {
    @apply bg-[#e8f3ff] text-[#165dff]
           hover:bg-[#e8f3ff] hover:text-[#165dff] font-medium;
  }
  .nav-item-accent {
    @apply absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[14px] rounded-r-[3px] bg-[#165dff];
  }
  .nav-item-label {
    @apply text-[13px] leading-none select-none;
  }
  .nav-group-title {
    @apply pl-3 pr-3 py-1.5 text-[11px] text-[#86909c];
  }
  .logo-placeholder {
    background: linear-gradient(90deg, #e5e6eb 0%, #f2f3f5 100%);
  }
  .user-card {
    @apply flex items-center px-2 py-1.5 rounded-[6px] cursor-pointer
           transition-colors hover:bg-[#f7f8fa];
  }
  .user-card-name {
    @apply text-[12px] text-[#1d2129] font-medium truncate leading-4;
  }
  .user-card-email {
    @apply text-[10px] text-[#86909c] truncate leading-4 mt-0.5;
  }
  .user-menu-item {
    @apply text-[12px] leading-5 px-3 py-1.5 w-full cursor-pointer transition-colors;
  }
  .user-menu-item-normal {
    @apply text-[#1d2129] hover:bg-[#f7f8fa];
  }
  .user-menu-item-danger {
    @apply text-[#f53f3f] hover:bg-[#fff1f0];
  }
}

/* 子页面淡入淡出过渡 */
.layout-fade-enter-active,
.layout-fade-leave-active {
  transition: opacity 0.2s ease;
}
.layout-fade-enter-from,
.layout-fade-leave-to {
  opacity: 0;
}
</style>
