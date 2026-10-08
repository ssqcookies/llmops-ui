# LLM Ops UI

> 一个基于 Vue 3 + TypeScript 的 LLM 应用开发与管理平台前端。支持工作流可视化编排、Agent 对话、知识库 RAG、应用发布、插件市场等完整能力。

## ✨ 核心特性

### 🎨 可视化工作流编排
- 基于 **Vue Flow** 的拖拽式画布，支持节点连线、自动布局（Dagre）
- 内置 8+ 节点类型：LLM、知识库检索、HTTP 请求、Python 代码、模板、插件、开始/结束
- 节点属性右侧抽屉配置、草稿历史、调试运行（Debug Drawer）
- 节点库左侧面板，支持拖拽添加

### 💬 流式对话 & Agent 解析
- **SSE 流式输出**，逐字渲染，打字机效果
- Agent 流式智能解析：自动分离 `<think>` 思考过程、`<tool_call>` 工具调用与正文回复
- Markdown 富文本渲染，代码块带语言标签与一键复制
- 语音输入 / 语音输出支持

### 📚 知识库 RAG
- 文件上传与分段处理（Chunking），支持多格式文档
- 文档列表管理、分段详情查看与编辑
- **检索测试**：支持语义检索、全文检索、混合检索三种模式
- 可配置检索参数：Top K、相似度阈值、Rerank 等

### 🚀 应用编排与发布
- 应用创建向导（从空白 / 从工作流 / 从模板）
- 发布配置：模型设置、检索配置、长期记忆、插件管理
- 发布历史版本回溯、一键发布/下线
- 统计面板（调用次数、用户数、Token 消耗）ECharts 可视化
- 多渠道接入：Web App、飞书、微信、API

### 🔌 插件 & API 管理
- 插件市场：浏览、安装、自定义插件
- Open API Key 管理：生成、撤销、权限控制
- 快速上手指南与代码示例

### 🏠 个人空间
- 应用、工作流、知识库、插件统一管理
- 卡片式布局，快速创建与搜索

## 🛠 技术栈

| 分类 | 技术 |
|---|---|
| 框架 | Vue 3.5 + Composition API + TypeScript |
| 构建工具 | Vite 8 + Rolldown |
| 状态管理 | Pinia 4 |
| 路由 | Vue Router 5 |
| UI 组件库 | Arco Design Vue |
| 样式 | Tailwind CSS 4 + Less |
| 工作流可视化 | Vue Flow + Dagre（自动布局） |
| 图表 | ECharts 6 |
| Markdown | markdown-it + github-markdown-css |
| 音频 | js-audio-recorder |
| 代码规范 | ESLint + Prettier + oxlint |
| 部署 | Docker + Nginx |

## 🏗 项目结构

```
src/
├── api/                  # 请求层封装（Axios 实例 + 拦截器）
├── assets/               # 静态资源（图片、图标、样式）
├── components/           # 公共组件
│   ├── icons/            # 自定义 SVG 图标组件
│   └── MarkdownRenderer.vue  # Markdown 渲染（代码复制、防注入）
├── config/               # 全局配置
├── constants/            # 常量、枚举
├── directives/           # 自定义指令（权限指令等）
├── hooks/                # 组合式函数（use-xxx 模式，统一封装 API 调用与状态）
├── models/               # TypeScript 类型定义（数据模型）
├── plugins/              # 第三方插件注册
├── router/               # 路由配置
├── services/             # API 服务层（按模块组织）
├── stores/               # Pinia 状态管理
├── types/                # 通用类型定义
├── utils/                # 工具函数
└── views/                # 页面视图
    ├── app-orchestration/  # 应用编排详情
    ├── app-square/         # 应用广场
    ├── auth/               # 登录/授权
    ├── components/         # 通用业务组件
    ├── home/               # 首页
    ├── knowledge/          # 知识库（列表/详情/添加）
    ├── layouts/            # 布局组件
    ├── openapi/            # API 密钥管理
    ├── plugin/             # 插件市场
    ├── space/              # 个人空间
    ├── web-app/            # Web 应用聊天
    └── workflow/           # 工作流编排
```

## 🚀 快速开始

### 环境要求

- Node.js >= 22.18.0
- npm 或 yarn

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 开发模式

```bash
npm run dev
```

默认启动在 `http://localhost:5173`，API 请求通过 Vite 代理转发到 `http://localhost:5000`。

### 生产构建

```bash
npm run build
```

### 类型检查

```bash
npm run type-check
```

### 代码规范检查

```bash
npm run lint
```

### 格式化

```bash
npm run format
```

## 🔧 配置说明

### 环境变量

- `.env.development` — 开发环境配置
- `.env.production` — 生产环境配置

### Vite 代理

开发环境下，所有 `/api` 开头的请求会被代理到后端服务：

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
    },
  },
}
```

### Docker 部署

项目内置了 Dockerfile 和 Nginx 配置，支持容器化部署：

```bash
docker build -t llmops-ui .
docker run -p 80:80 llmops-ui
```

## 💡 设计亮点

### 1. Hooks 驱动的架构
所有业务逻辑封装为 `use-xxx` 组合式函数，统一管理数据获取、loading 状态、错误处理，组件层只负责渲染，逻辑复用性强。

### 2. Agent 流式解析器
自研 `parseAgentStream` 解析器，逐字符处理流式输出，智能分离思考过程、工具调用与正文，支持标签不完整时的边界处理，避免流式输出中出现"半拉标签"。

### 3. 安全的 Markdown 渲染
默认关闭 HTML 注入（防 XSS），通过事件委托实现代码块复制按钮，既保证安全又不损失交互体验。

### 4. 可视化工作流
基于 Vue Flow 的自定义节点体系，配合 Dagre 自动布局算法，支持一键整理画布。节点配置通过右侧抽屉统一管理，交互流畅。

### 5. 权限指令
自定义 `v-permission` 指令，支持细粒度的按钮级权限控制。

## 📄 License

MIT
