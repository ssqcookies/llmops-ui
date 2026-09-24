<script setup lang="ts">
/**
 * 应用编排 - 发布配置面板
 *  - 顶部安全警告条
 *  - 3 个发布渠道（网页版 WebApp / 微信公众号 / 飞书）
 *  - WebApp 对接真实接口：getPublishedConfig / regenerateWebAppToken / publish / cancelPublish
 *  - 微信 / 飞书 弹窗预留（接口 TODO 标记）
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import {
  getPublishedConfig,
  regenerateWebAppToken,
  publish as publishApp,
  cancelPublish as cancelPublishApp,
} from '@/services/app'
import WeChatConfigModal from './WeChatConfigModal.vue'
import FeishuConfigModal from './FeishuConfigModal.vue'

const props = defineProps<{ appId?: string }>()
const route = useRoute()
const router = useRouter()
const resolvedAppId = computed(() => props.appId || (route.params.id as string))

// ===== 1.WebApp 渠道状态（真实接口）=====
const webAppLoading = ref(false)
const webAppToken = ref('')
const webAppStatus = ref<string>('unpublished') // 'published' | 'unpublished'

/** 完整可访问 URL */
const webAppUrl = computed(() => {
  if (!webAppToken.value) return ''
  // TODO: 替换为真实生产域名
  return `https://www.llmops-imocc.com/web-app/${webAppToken.value}`
})

// ===== 2.微信公众号渠道 =====
const wechatModalVisible = ref(false)

// ===== 3.飞书渠道 =====
const feishuModalVisible = ref(false)

// ===== 渠道定义 =====
interface Channel {
  key: 'web_app' | 'wechat' | 'feishu'
  name: string
  description: string
  iconBg: string       // icon 背景色
  iconColor: string    // icon 颜色
  icon: string         // Arco icon 名
}

const channels: Channel[] = [
  {
    key: 'web_app',
    name: '网页版',
    description: '可通过访问 PC 网页立即开始对话。',
    iconBg: '#e8f3ff',
    iconColor: '#165dff',
    icon: 'icon-link',
  },
  {
    key: 'wechat',
    name: '微信公众号（订阅号、服务号）',
    description: '接入微信公众号，自动回复用户消息，助力高效私域运营',
    iconBg: '#e8ffea',
    iconColor: '#00b42a',
    icon: 'icon-message',
  },
  {
    key: 'feishu',
    name: '飞书（Bot群聊机器人）',
    description: '在飞书中直接 @Bot 对话，提高工作生产力',
    iconBg: '#e8f3ff',
    iconColor: '#165dff',
    icon: 'icon-swap',
  },
]

// ===== WebApp 操作 =====
const loadWebAppConfig = async () => {
  if (!resolvedAppId.value) return
  try {
    webAppLoading.value = true
    const resp = await getPublishedConfig(resolvedAppId.value)
    webAppToken.value = resp.data.web_app?.token || ''
    webAppStatus.value = resp.data.web_app?.status || 'unpublished'
  } catch {
    // 未发布时后端可能返回 404，按未发布处理
    webAppToken.value = ''
    webAppStatus.value = 'unpublished'
  } finally {
    webAppLoading.value = false
  }
}

const handlePublishWebApp = async () => {
  if (!resolvedAppId.value) return
  try {
    await publishApp(resolvedAppId.value)
    Message.success('发布成功')
    await loadWebAppConfig()
  } catch {
    // 请求层统一提示
  }
}

const handleCancelPublishWebApp = () => {
  Modal.warning({
    title: '确定停止发布吗？',
    content: '停止发布后，已生成的访问链接将失效，用户无法继续使用该 WebApp。',
    hideCancel: false,
    onOk: async () => {
      try {
        await cancelPublishApp(resolvedAppId.value)
        Message.success('已停止发布')
        await loadWebAppConfig()
      } catch {
        // 请求层统一提示
      }
    },
  })
}

const handleRegenerateWebAppToken = () => {
  Modal.warning({
    title: '重新生成访问链接？',
    content: '原链接将立即失效，请及时更新分享渠道中的链接，避免用户无法访问。',
    hideCancel: false,
    onOk: async () => {
      try {
        const resp = await regenerateWebAppToken(resolvedAppId.value)
        webAppToken.value = resp.data.token
        Message.success('已重新生成')
      } catch {
        // 请求层统一提示
      }
    },
  })
}

const handleVisitWebApp = () => {
  if (webAppToken.value) {
    router.push({ name: 'WebApp', params: { token: webAppToken.value } })
  }
}

const handleCopyWebAppUrl = async () => {
  if (!webAppUrl.value) return
  try {
    await navigator.clipboard.writeText(webAppUrl.value)
    Message.success('链接已复制')
  } catch {
    Message.error('复制失败')
  }
}

// ===== 微信 / 飞书 操作 =====
const handleOpenWeChat = () => { wechatModalVisible.value = true }
const handleOpenFeishu = () => { feishuModalVisible.value = true }

// ===== 暴露刷新方法给父组件 =====
defineExpose({ refresh: loadWebAppConfig })

// ===== 生命周期 =====
onMounted(loadWebAppConfig)
watch(resolvedAppId, loadWebAppConfig)
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 安全警告条 -->
    <div class="mx-6 mt-5 mb-3 px-4 py-2.5 rounded-md bg-[#fff7e8] border border-[#ffd591] flex items-center gap-2 text-[#d46b08] text-[13px]">
      <icon-exclamation-circle :size="16" class="flex-shrink-0" />
      <span>如应用访问链接或二维码意外泄露，请及时重新生成或进行停止分发，避免资源出现异常消耗</span>
    </div>

    <!-- 发布渠道表格 -->
    <div class="mx-6 flex-1 min-h-0 bg-white rounded-lg border border-[#e5e6eb] overflow-hidden flex flex-col">
      <!-- 表头：渠道自适应，状态/操作按内容收缩，操作钉最右 -->
      <div class="flex items-center border-b border-[#e5e6eb] text-[13px] text-[#86909c] bg-[#fafbfc]">
        <div class="flex-1 min-w-0 px-5 py-3 font-medium">发布渠道</div>
        <div class="flex-shrink-0 px-5 py-3 font-medium">状态</div>
        <div class="flex-shrink-0 w-[460px] px-5 py-3 font-medium text-right">操作</div>
      </div>

      <!-- 渠道行 -->
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="ch in channels"
          :key="ch.key"
          class="flex items-center border-b border-[#f2f3f5] last:border-b-0 hover:bg-[#fafbfc]/50 transition-colors"
        >
          <!-- 左：渠道信息（自适应占满剩余空间） -->
          <div class="flex-1 min-w-0 px-5 py-4 flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              :style="{ backgroundColor: ch.iconBg }"
            >
              <component :is="ch.icon" :size="18" :style="{ color: ch.iconColor }" />
            </div>
            <div class="min-w-0">
              <div class="text-[14px] font-medium text-[#1d2129] truncate">{{ ch.name }}</div>
              <div class="text-[12px] text-[#86909c] truncate mt-0.5">{{ ch.description }}</div>
            </div>
          </div>

          <!-- 中：状态（按内容收缩） -->
          <div class="flex-shrink-0 px-5 py-4">
            <!-- WebApp 状态 -->
            <template v-if="ch.key === 'web_app'">
              <template v-if="webAppStatus === 'published'">
                <span class="inline-flex items-center gap-1 text-[13px] text-[#00b42a]">
                  <icon-check-circle-fill :size="14" />
                  已发布
                </span>
              </template>
              <template v-else>
                <span class="inline-flex items-center gap-1 text-[13px] text-[#86909c]">
                  <icon-close-circle-fill :size="14" />
                  未发布
                </span>
              </template>
            </template>
            <!-- 微信 / 飞书：当前都为未配置（接口 TODO 时写死） -->
            <template v-else>
              <span class="inline-flex items-center gap-1 text-[13px] text-[#86909c]">
                <icon-close-circle-fill :size="14" />
                未配置
              </span>
            </template>
          </div>

          <!-- 右：操作（钉在最右，不换行） -->
          <div class="flex-shrink-0 w-[460px] px-5 py-4 flex items-center justify-end gap-2 whitespace-nowrap">
            <!-- WebApp 行 -->
            <template v-if="ch.key === 'web_app'">
              <template v-if="webAppStatus === 'published' && webAppUrl">
                <!-- 链接（可复制，超长截断） -->
                <div
                  class="flex items-center gap-2 px-3 h-8 rounded-md bg-[#f2f3f5] text-[#4e5969] text-[13px] cursor-pointer hover:bg-[#e5e6eb] transition-colors flex-1 min-w-0"
                  @click="handleCopyWebAppUrl"
                  :title="'点击复制 ' + webAppUrl"
                >
                  <span class="truncate">{{ webAppUrl }}</span>
                  <icon-copy :size="13" class="flex-shrink-0 text-[#86909c]" />
                </div>
                <!-- 重新生成 -->
                <a-button type="primary" size="medium" @click="handleRegenerateWebAppToken">
                  重新生成
                </a-button>
                <!-- 立即访问 -->
                <a-button size="medium" @click="handleVisitWebApp">
                  立即访问
                </a-button>
                <!-- 停止发布 -->
                <a-tooltip content="停止发布">
                  <a-button type="text" size="medium" status="danger" @click="handleCancelPublishWebApp">
                    <template #icon><icon-close :size="14" /></template>
                  </a-button>
                </a-tooltip>
              </template>
              <template v-else>
                <a-button type="primary" size="medium" @click="handlePublishWebApp">
                  <template #icon><icon-upload :size="14" /></template>
                  立即发布
                </a-button>
              </template>
            </template>

            <!-- 微信公众号行 -->
            <template v-else-if="ch.key === 'wechat'">
              <a-button type="primary" size="medium" @click="handleOpenWeChat">
                <template #icon><icon-settings :size="14" /></template>
                立即配置
              </a-button>
            </template>

            <!-- 飞书行 -->
            <template v-else-if="ch.key === 'feishu'">
              <a-button type="primary" size="medium" @click="handleOpenFeishu">
                <template #icon><icon-settings :size="14" /></template>
                立即配置
              </a-button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 微信公众号配置弹窗 -->
    <WeChatConfigModal
      :visible="wechatModalVisible"
      @update:visible="(v) => wechatModalVisible = v"
    />

    <!-- 飞书配置弹窗 -->
    <FeishuConfigModal
      :visible="feishuModalVisible"
      @update:visible="(v) => feishuModalVisible = v"
    />
  </div>
</template>

<style scoped>
@reference "tailwindcss";
</style>
