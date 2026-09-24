<script setup lang="ts">
/**
 * 公共 Markdown 渲染组件
 *  - markdown-it 渲染（html 默认关闭，AI 输出中的 HTML 会被转义，防注入）
 *  - github-markdown-css 提供排版样式（代码块自带灰色代码框、圆角、横向滚动）
 *  - 代码块右上角内置「复制代码」按钮（v-html 内容用根节点事件委托实现点击）
 *  - 用于 AI 助手消息的富文本展示（正文 / 代码块 / 列表 / 表格等）
 */
import { computed, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import MarkdownIt from 'markdown-it'
import 'github-markdown-css/github-markdown.css'

const props = defineProps<{
  content: string
}>()

const md = new MarkdownIt({
  breaks: true,
  linkify: true,
})

/** 自定义 fence 渲染：包一层代码块容器，头部带语言标签 + 复制按钮 */
const defaultFence = md.renderer.rules.fence
if (defaultFence) {
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const lang = token.info.trim()
    const inner = defaultFence(tokens, idx, options, env, self)
    return (
      '<div class="md-code-block">' +
      '<div class="md-code-head">' +
      `<span class="md-code-lang">${lang || '代码'}</span>` +
      '<button type="button" class="md-code-copy">复制代码</button>' +
      '</div>' +
      inner +
      '</div>'
    )
  }
}

const html = computed(() => md.render(props.content || ''))

const rootRef = ref<HTMLElement | null>(null)

/** 事件委托：代码块复制按钮点击（v-html 内容无法直接绑定 Vue 事件） */
const handleRootClick = async (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target?.classList.contains('md-code-copy')) return
  const code = target.closest('.md-code-block')?.querySelector('pre')?.textContent || ''
  try {
    await navigator.clipboard.writeText(code)
    target.textContent = '已复制'
    Message.success('代码已复制到剪贴板')
    setTimeout(() => {
      target.textContent = '复制代码'
    }, 2000)
  } catch {
    Message.error('复制失败，请手动选择复制')
  }
}
</script>

<template>
  <!-- markdown-body 类名由 github-markdown-css 提供，不可省略 -->
  <div
    ref="rootRef"
    class="markdown-body markdown-renderer"
    v-html="html"
    @click="handleRootClick"
  />
</template>

<style scoped>
.markdown-renderer {
  font-size: 14px;
}
/* 代码块容器：头部（语言 + 复制按钮）悬浮右上角 */
.markdown-renderer :deep(.md-code-block) {
  position: relative;
}
.markdown-renderer :deep(.md-code-head) {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.markdown-renderer :deep(.md-code-lang) {
  font-size: 12px;
  color: #86909c;
}
.markdown-renderer :deep(.md-code-copy) {
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  color: #4e5969;
  background-color: #ffffff;
  border: 1px solid #e5e6eb;
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.2s, border-color 0.2s;
}
.markdown-renderer :deep(.md-code-copy:hover) {
  color: #165dff;
  border-color: #165dff;
}
</style>
