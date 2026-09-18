<script setup lang="ts">
import { ref } from 'vue'
import CodeBlock from './CodeBlock.vue'

/** 子 Tab：非流式 / 流式 */
const chatTab = ref<'non-stream' | 'stream'>('non-stream')

// 请求 curl 示例（非流式）
const nonStreamCurl = `curl -X POST 'https://api.llmops.com/v1/chat/completions' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "agent_id": "agent-xxxx-xxxx",
    "query": "你好，请介绍一下你自己"
  }'`

// 返回结果示例（非流式）
const nonStreamResp = `{
  "code": "success",
  "data": {
    "conversation_id": "conv-xxxx-xxxx",
    "message_id": "msg-xxxx-xxxx",
    "answer": "你好！我是慕课LLMOps智能助手……",
    "answer_tokens": 128,
    "response_latency": 1200
  }
}`

// 请求 curl 示例（流式）
const streamCurl = `curl -X POST 'https://api.llmops.com/v1/chat/completions' \\
  -H 'Authorization: Bearer YOUR_API_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "agent_id": "agent-xxxx-xxxx",
    "query": "你好，请介绍一下你自己",
    "stream": true
  }'`

// 返回结果示例（流式）
const streamResp = `event: message
data: {"delta": "你好"}

event: message
data: {"delta": "！我是慕课"}

event: message
data: {"delta": "LLMOps智能助手"}

event: done
data: {"message_id": "msg-xxxx-xxxx", "answer_tokens": 128}`
</script>

<template>
  <div class="quick-start-panel">
    <!-- 概览 -->
    <section class="qs-section">
      <h3 class="qs-section-title">概览</h3>
      <p class="qs-text">
        LLMops API 提供了一组 RESTful 接口，帮助开发者将 AI 能力快速集成到企业现有业务系统中。
        通过开放 API，外部系统可以使用已发布的 Agent 进行智能对话，实现业务流程的智能化升级。
      </p>
    </section>

    <!-- 准备工作 -->
    <section class="qs-section">
      <h3 class="qs-section-title">准备工作</h3>
      <div class="qs-step">
        <span class="qs-step-num">1</span>
        <div class="qs-step-body">
          <span class="qs-step-title">创建个人访问令牌</span>
          <p class="qs-text">
            在「秘钥」页面创建一个新的 API 秘钥，确保状态为可用。秘钥是访问开放 API 的唯一凭证，请妥善保管。
          </p>
        </div>
      </div>
      <div class="qs-step">
        <span class="qs-step-num">2</span>
        <div class="qs-step-body">
          <span class="qs-step-title">Agent 的创建与发布</span>
          <p class="qs-text">
            在「应用编排」页面创建并配置你的 Agent，完成编排后点击「发布」使其对外提供服务。只有已发布的 Agent 才能通过 API 调用。
          </p>
        </div>
      </div>
    </section>

    <!-- 基础使用 -->
    <section class="qs-section">
      <h3 class="qs-section-title">基础使用</h3>

      <!-- 子 Tab 切换 -->
      <div class="qs-sub-tabs">
        <div
          class="qs-sub-tab"
          :class="{ 'qs-sub-tab-active': chatTab === 'non-stream' }"
          @click="chatTab = 'non-stream'"
        >
          非流式 Chat
        </div>
        <div
          class="qs-sub-tab"
          :class="{ 'qs-sub-tab-active': chatTab === 'stream' }"
          @click="chatTab = 'stream'"
        >
          流式 Chat
        </div>
      </div>

      <!-- 非流式 -->
      <template v-if="chatTab === 'non-stream'">
        <div class="qs-block">
          <span class="qs-block-label">请求 curl</span>
          <CodeBlock :code="nonStreamCurl" lang="shell" />
        </div>
        <div class="qs-block">
          <span class="qs-block-label">返回结果示例</span>
          <CodeBlock :code="nonStreamResp" lang="json" />
        </div>
      </template>

      <!-- 流式 -->
      <template v-else>
        <div class="qs-block">
          <span class="qs-block-label">请求 curl</span>
          <CodeBlock :code="streamCurl" lang="shell" />
        </div>
        <div class="qs-block">
          <span class="qs-block-label">返回结果示例</span>
          <CodeBlock :code="streamResp" lang="event-stream" />
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped lang="css">
@import 'tailwindcss';

@layer components {
  .quick-start-panel {
    @apply flex flex-col gap-6;
  }
  .qs-section {
    @apply flex flex-col gap-3;
  }
  .qs-section-title {
    @apply text-[16px] font-semibold text-[#1d2129] leading-6
           pl-3 border-l-[3px] border-[#165dff];
  }
  .qs-text {
    @apply text-[14px] text-[#4e5969] leading-6;
  }
  .qs-step {
    @apply flex items-start gap-3;
  }
  .qs-step-num {
    @apply shrink-0 w-6 h-6 rounded-full bg-[#165dff] text-white
           text-[12px] font-medium flex items-center justify-center leading-none;
  }
  .qs-step-body {
    @apply flex flex-col gap-1;
  }
  .qs-step-title {
    @apply text-[14px] font-medium text-[#1d2129] leading-5;
  }
  .qs-sub-tabs {
    @apply flex items-center gap-1;
  }
  .qs-sub-tab {
    @apply px-3 py-1 rounded-[6px] text-[13px] text-[#4e5969]
           cursor-pointer transition-colors
           hover:text-[#165dff] hover:bg-[#f2f3f5];
  }
  .qs-sub-tab-active {
    @apply bg-[#e8f3ff] text-[#165dff] font-medium
           hover:bg-[#e8f3ff] hover:text-[#165dff];
  }
  .qs-block {
    @apply flex flex-col gap-2;
  }
  .qs-block-label {
    @apply text-[13px] font-medium text-[#1d2129];
  }
}
</style>
