<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Message } from '@arco-design/web-vue'
import type { RequestOption, UploadRequest } from '@arco-design/web-vue'
import { useAccountStore } from '@/stores'
import { getCurrentUser, updateName, updateAvatar } from '@/services/account'
import { uploadImage } from '@/services/upload-file'
import ChangePasswordModal from './ChangePasswordModal.vue'

/** 账号设置弹窗 - 左侧 Tab 项 */
interface SettingsTab {
  key: string
  label: string
}

/** 账号信息（对齐 GetCurrentUserResponse data） */
interface AccountInfo {
  id: string
  name: string
  email: string
  avatar: string
  /** 是否已设置登录密码 */
  password_set: boolean
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'saved'): void
  (e: 'close'): void
}>()

const accountStore = useAccountStore()

const TABS: SettingsTab[] = [
  { key: 'account', label: '账号设置' },
]

const activeTab = ref('account')
const nicknameEditing = ref(false)
const submitLoading = ref(false)
const avatarUploading = ref(false)
const infoLoading = ref(false)

const accountInfo = reactive<AccountInfo>({
  id: '',
  name: '',
  email: '',
  avatar: '',
  password_set: false,
})

const nicknameDraft = ref('')
const changePasswordVisible = ref(false)

const activeTabLabel = computed(() => {
  return TABS.find((t) => t.key === activeTab.value)?.label ?? ''
})

/** 拉取当前账号信息并同步到 store */
const fetchAccountInfo = async () => {
  infoLoading.value = true
  try {
    const res = await getCurrentUser()
    if (res?.data) {
      accountInfo.id = res.data.id
      accountInfo.name = res.data.name
      accountInfo.email = res.data.email
      accountInfo.avatar = res.data.avatar
      accountInfo.password_set = !!res.data.password_set
      accountStore.update(res.data)
    }
  } catch {
    // 失败时回退到 store 已有数据
    accountInfo.id = accountStore.account.id || ''
    accountInfo.name = accountStore.account.name || ''
    accountInfo.email = accountStore.account.email || ''
    accountInfo.avatar = accountStore.account.avatar || ''
    accountInfo.password_set = !!accountStore.account.password_set
  } finally {
    infoLoading.value = false
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      submitLoading.value = false
      nicknameEditing.value = false
      nicknameDraft.value = ''
      fetchAccountInfo()
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
  nicknameDraft.value = accountInfo.name
  nicknameEditing.value = true
}

const cancelNicknameEdit = () => {
  nicknameDraft.value = ''
  nicknameEditing.value = false
}

const saveNickname = async () => {
  const name = nicknameDraft.value.trim()
  if (!name) {
    Message.warning('昵称不能为空')
    return
  }
  submitLoading.value = true
  try {
    await updateName(name)
    accountInfo.name = name
    accountStore.update({ ...accountStore.account, name })
    Message.success('昵称修改成功')
    nicknameEditing.value = false
    nicknameDraft.value = ''
    emit('saved')
  } catch {
    // 错误已由 request 层统一提示
  } finally {
    submitLoading.value = false
  }
}

/** 头像上传前校验 */
const beforeAvatarUpload = (file: File): boolean => {
  if (!file.type.startsWith('image/')) {
    Message.error('仅支持图片格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    Message.error('头像大小不超过 5MB')
    return false
  }
  return true
}

/** 头像自定义上传：先 uploadImage 拿到 url，再 updateAvatar */
const handleAvatarUpload = (option: RequestOption): UploadRequest => {
  const file = option.fileItem?.file
  if (!file) return {}
  avatarUploading.value = true
  uploadImage(file)
    .then(async (res) => {
      if (res?.data?.image_url) {
        const avatarUrl = res.data.image_url
        try {
          await updateAvatar(avatarUrl)
          accountInfo.avatar = avatarUrl
          accountStore.update({ ...accountStore.account, avatar: avatarUrl })
          Message.success('头像修改成功')
          emit('saved')
          option.onProgress?.(100)
          option.onSuccess?.(res as unknown as XMLHttpRequest)
        } catch {
          option.onError?.(new Error('更新头像失败'))
        }
      } else {
        option.onError?.(new Error('上传失败'))
        Message.error('上传失败')
      }
    })
    .catch((err) => {
      option.onError?.(err)
      Message.error('上传失败')
    })
    .finally(() => {
      avatarUploading.value = false
    })
  return {}
}

const handleChangePassword = () => {
  changePasswordVisible.value = true
}

const handlePasswordSaved = () => {
  // 密码设置/修改成功后，标记为已设置
  accountInfo.password_set = true
  accountStore.update({ ...accountStore.account, password_set: true })
}
</script>

<template>
  <a-modal
    :visible="visible"
    :footer="false"
    :mask-closable="false"
    :closable="false"
    width="720px"
    :body-style="{ padding: 0 }"
    @before-close="handleClose"
  >
    <div class="flex w-full">
      <!-- 左侧：Tab 导航栏 -->
      <aside class="settings-side shrink-0 w-[140px] py-5 border-r border-[#f2f3f5]">
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

        <a-spin :loading="infoLoading" class="w-full">
          <template v-if="activeTab === 'account'">
            <div class="flex flex-col gap-6">
              <!-- 账号头像 -->
              <div class="settings-row">
                <div class="settings-row-label">
                  <span>账号头像</span>
                  <span class="required-mark">*</span>
                </div>
                <div class="settings-row-content">
                  <a-upload
                    :show-file-list="false"
                    accept="image/*"
                    :before-upload="beforeAvatarUpload"
                    :custom-request="handleAvatarUpload"
                  >
                    <template #upload-button>
                      <div class="avatar-uploader">
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
                        <div v-if="avatarUploading" class="avatar-uploading-mask">
                          <icon-loading :size="18" class="text-white" />
                        </div>
                      </div>
                    </template>
                  </a-upload>
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
                        {{ accountInfo.name || '未设置昵称，点击编辑' }}
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
                    <span :class="['settings-display-text', !accountInfo.password_set ? 'text-[#f53f3f]' : '']">
                      {{ accountInfo.password_set ? '已设置' : '未设置' }}
                    </span>
                    <a-button
                      type="text"
                      size="mini"
                      :style="{ color: '#165dff', padding: '0 4px' }"
                      @click="handleChangePassword"
                    >
                      {{ accountInfo.password_set ? '修改' : '设置' }}
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
        </a-spin>
      </section>
    </div>

    <!-- 修改密码子弹窗 -->
    <ChangePasswordModal
      v-model:visible="changePasswordVisible"
      :has-password="accountInfo.password_set"
      @saved="handlePasswordSaved"
    />
  </a-modal>
</template>

<style scoped lang="css">
@import 'tailwindcss';

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

  /* 头像上传 */
  .avatar-uploader {
    @apply relative w-16 h-16 cursor-pointer rounded-full overflow-hidden
           hover:opacity-90 transition-opacity;
  }
  .avatar-uploading-mask {
    @apply absolute inset-0 bg-black/40 flex items-center justify-center;
  }
}
</style>
