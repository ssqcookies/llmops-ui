<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'

/** 账号设置弹窗 - 左侧 Tab 项 */
interface SettingsTab {
  key: string
  label: string
}

/** 账号设置信息 */
interface AccountInfo {
  avatar: string
  nickname: string
  passwordSet: boolean
  email: string
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

const TABS: SettingsTab[] = [
  { key: 'account', label: '账号设置' },
]

const activeTab = ref('account')
const nicknameEditing = ref(false)
const submitLoading = ref(false)

const accountInfo = reactive<AccountInfo>({
  avatar: '',
  nickname: '',
  passwordSet: true,
  email: '',
})

const nicknameDraft = ref('')

const activeTabLabel = computed(() => {
  return TABS.find((t) => t.key === activeTab.value)?.label ?? ''
})

watch(
  () => props.visible,
  (val) => {
    if (val) {
      submitLoading.value = false
      nicknameEditing.value = false
      // TODO: 预留接口调用位置 - 获取当前账号信息
      accountInfo.avatar =
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=160&q=80'
      accountInfo.nickname = ''
      accountInfo.passwordSet = true
      accountInfo.email = 'zehuiya@163.com'
      nicknameDraft.value = ''
    }
  },
)

const handleClose = () => {
  emit('update:visible', false)
  emit('close')
}

const handleTabClick = (tab: SettingsTab) => {
  activeTab.value = tab.key
}

const enterNicknameEdit = () => {
  nicknameDraft.value = accountInfo.nickname
  nicknameEditing.value = true
}

const cancelNicknameEdit = () => {
  nicknameDraft.value = ''
  nicknameEditing.value = false
}

const saveNickname = () => {
  if (!nicknameDraft.value.trim()) return
  submitLoading.value = true
  // TODO: 预留接口调用位置 - 更新昵称
  setTimeout(() => {
    accountInfo.nickname = nicknameDraft.value.trim()
    nicknameEditing.value = false
    nicknameDraft.value = ''
    submitLoading.value = false
  }, 600)
}

const handleChangePassword = () => {
  // TODO: 预留修改密码弹窗 / 页面跳转
}
</script>

<template>
  <a-modal
    :visible="visible"
    :footer="false"
    :mask-closable="false"
    width="720px"
    :body-style="{ padding: 0 }"
    @before-close="handleClose"
  >
    <div class="flex w-full">
      <!-- 左侧：Tab 导航栏 -->
      <aside
        class="settings-side shrink-0 w-[140px] py-5 border-r border-[#f2f3f5]"
      >
        <div class="settings-side-title mb-3">设置</div>
        <div class="flex flex-col">
          <div
            v-for="tab in TABS"
            :key="tab.key"
            class="settings-tab-item"
            :class="{ 'settings-tab-active': activeTab === tab.key }"
            @click="handleTabClick(tab)"
          >
            {{ tab.label }}
          </div>
        </div>
      </aside>

      <!-- 右侧：内容区 -->
      <section class="flex-1 min-w-0 px-8 py-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="settings-content-title">{{ activeTabLabel }}</h3>
          <a-button
            type="text"
            shape="circle"
            size="small"
            :style="{ width: '28px', height: '28px', color: '#86909c' }"
            @click="handleClose"
          >
            <template #icon><icon-close :size="14" /></template>
          </a-button>
        </div>

        <template v-if="activeTab === 'account'">
          <div class="flex flex-col gap-6">
            <!-- 账号头像 -->
            <div class="settings-row">
              <div class="settings-row-label">
                <span>账号头像</span>
                <span class="required-mark">*</span>
              </div>
              <div class="settings-row-content">
                <a-avatar
                  :size="64"
                  :style="{
                    backgroundColor: accountInfo.avatar ? 'transparent' : '#e8f3ff',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }"
                >
                  <template v-if="accountInfo.avatar">
                    <img
                      :src="accountInfo.avatar"
                      alt="avatar"
                      class="w-full h-full object-cover"
                    />
                  </template>
                  <template v-else>
                    <icon-user :style="{ fontSize: '24px', color: '#165dff' }" />
                  </template>
                </a-avatar>
              </div>
            </div>

            <!-- 账号昵称 -->
            <div class="settings-row">
              <div class="settings-row-label">
                <span>账号昵称</span>
                <span class="required-mark">*</span>
              </div>
              <div class="settings-row-content">
                <template v-if="!nicknameEditing">
                  <div class="flex items-center gap-2">
                    <span class="settings-display-text">
                      {{ accountInfo.nickname || '未设置昵称，点击编辑' }}
                    </span>
                    <a-button
                      type="text"
                      size="mini"
                      :style="{ color: '#165dff', padding: '0 4px' }"
                      @click="enterNicknameEdit"
                    >
                      <template #icon><icon-edit :size="12" /></template>
                      编辑
                    </a-button>
                  </div>
                </template>
                <template v-else>
                  <div class="flex items-center gap-2">
                    <a-input
                      v-model="nicknameDraft"
                      placeholder="请输入账号昵称"
                      :style="{ width: '320px' }"
                      size="small"
                      allow-clear
                      :max-length="20"
                    />
                    <a-button size="small" @click="cancelNicknameEdit">取消</a-button>
                    <a-button
                      type="primary"
                      size="small"
                      :loading="submitLoading"
                      :style="{ borderRadius: '6px', paddingLeft: '16px', paddingRight: '16px' }"
                      @click="saveNickname"
                    >
                      保存
                    </a-button>
                  </div>
                </template>
              </div>
            </div>

            <!-- 账号密码 -->
            <div class="settings-row">
              <div class="settings-row-label">
                <span>账号密码</span>
                <span class="required-mark">*</span>
              </div>
              <div class="settings-row-content">
                <div class="flex items-center gap-2">
                  <icon-lock :size="14" class="text-[#86909c]" />
                  <span class="settings-display-text">
                    {{ accountInfo.passwordSet ? '已设置' : '未设置' }}
                  </span>
                  <a-button
                    type="text"
                    size="mini"
                    :style="{ color: '#165dff', padding: '0 4px' }"
                    @click="handleChangePassword"
                  >
                    修改
                  </a-button>
                </div>
              </div>
            </div>

            <!-- 绑定邮箱 -->
            <div class="settings-row">
              <div class="settings-row-label">绑定邮箱</div>
              <div class="settings-row-content">
                <span class="settings-display-text">{{ accountInfo.email }}</span>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <a-empty description="通用设置功能开发中…" />
        </template>
      </section>
    </div>
  </a-modal>
</template>

<style scoped lang="css">
@import "tailwindcss";

@layer components {
  .settings-side-title {
    @apply pl-5 pr-5 text-[15px] font-semibold text-[#1d2129];
  }
  .settings-tab-item {
    @apply flex items-center h-[34px] pl-5 pr-5 text-[13px] cursor-pointer
           transition-colors text-[#4e5969] hover:bg-[#f7f8fa] hover:text-[#1d2129];
  }
  .settings-tab-active {
    @apply bg-[#f2f3f5] text-[#1d2129] font-medium;
  }
  .settings-content-title {
    @apply text-[15px] font-semibold text-[#1d2129] leading-5 m-0;
  }
  .settings-row {
    @apply flex items-start gap-4 w-full;
  }
  .settings-row-label {
    @apply shrink-0 w-[84px] pt-1.5 text-[12px] text-[#1d2129] flex items-center gap-0.5 leading-5;
  }
  .settings-row-content {
    @apply flex-1 min-w-0;
  }
  .required-mark {
    @apply text-[#f53f3f] text-[12px];
  }
  .settings-display-text {
    @apply text-[13px] text-[#1d2129] leading-5;
  }
}
</style>
