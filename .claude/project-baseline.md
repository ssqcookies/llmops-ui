# 项目公共基线 & 公共组件规范
## 1. 基础技术约束
1. 技术栈：Vue3 <script setup lang="ts"> + Arco Design Vue + TailwindCSS v4
2. 全局视觉基线
- 主色调：#1677ff
- 通用组件圆角：6px
- 卡片容器圆角：8px
- 卡片样式：白色底色、轻微阴影、统一内边距
3. UI组件强制规则（与ui-cc-vue3/SKILL.md保持一致）
- 所有交互控件必须使用Arco Design Vue组件；禁止原生 input / button / select / ul / li 实现交互列表
- 图标统一使用 `<a-icon name="图标名称"/>`；禁止手写原生SVG标签
- 仅 div、span 允许作为纯布局容器

## 2. 通用弹窗统一行为（所有弹窗默认遵守，提纲无需重复描述）
### 2.1 新增/编辑弹窗 <a-modal>
- 弹窗打开时自动重置表单、清除校验报错
- 提交按钮绑定loading状态，防止重复点击
- 点击取消/关闭弹窗，清空表单数据与校验信息
### 2.2 删除确认弹窗 a-modal.confirm
- 标准文案：确认删除该条数据？删除后数据不可恢复
### 2.3 侧边抽屉 <a-drawer>
- 默认从页面右侧滑出，宽度根据业务适配
- 抽屉关闭后销毁内部状态

## 3. 全局公共业务组件清单
> 页面提纲中仅需引用组件名称，**禁止重复描述组件内部结构**
### 3.1 ChatDialog 聊天对话组件
用途：用户与机器人双向聊天气泡展示
入参：
- messageList: ChatMessageItem[]
事件：
- deleteMessage(message: ChatMessageItem)
内置能力：区分用户/机器人气泡样式、消息复制、单条删除、展示耗时与Token、滚动自适应

### 3.2 ConfigCollapse 配置折叠面板
用途：配置页分组折叠容器，支持分组标题、底部新增按钮、组内卡片展示
入参：分组配置数组

### 3.3 PageFilter 通用顶部筛选栏
用途：列表页面顶部筛选区域，内置查询、重置按钮

### 3.4 PageTable 通用分页表格
用途：a-table + a-pagination 封装，自带loading、空状态、行勾选能力

## 4. 全局通用TS类型（所有页面统一import导入，禁止重复定义）
```typescript
// 通用分页查询参数
interface PageQuery {
  pageNum: number
  pageSize: number
}

// 通用分页返回结构
/**
 * 分页器对象
 */
interface Paginator {
  currentPage: number
  pageSize: number
  totalPage: number
  totalRecord: number
}

/**
 * 标准分页返回外层包装
 */
interface PaginationResult<T> {
  list: T[]
  paginator: Paginator
}

// 聊天消息通用类型
/**
 * 发送对话消息 请求参数
 */
interface ChatSendRequest {
  query: string
}

/**
 * 消息接口返回实体（后端蛇形，前端驼峰映射模型）
 */
interface ChatMessageResponse {
  id: string // uuid
  conversationId: string // uuid，会话ID
  query: string // 用户提问文本
  answer: string // AI回复内容
  answerTokens: number // AI回复消耗token
  responseLatency: number // 响应耗时，单位ms
  updatedAt: number // 更新时间戳
  createdAt: number // 创建时间戳
}
