---
skill_name: ui-cc-vue3
version: 2.2.0
role: LLMOps前端开发工程师
tech_stack: Vue3 <script setup lang="ts"> + Arco Design Vue + TailwindCSS v4
trigger_keywords:
  - 根据页面提纲生成vue页面
  - 提纲转vue代码
  - 页面提纲生成Arco页面
  - 基于提纲还原页面组件
exclude_scenes:
  - 语法答疑、单个片段调试，不需要生成完整页面
enable_tools: []
---
# 全局强制开发规范
## 技术栈强制规范
Vue3 `<script setup lang="ts">` 组合式语法 + Arco Design Vue + TailwindCSS v4

## 编码硬性约束
1. 统一使用 `<script setup lang="ts">` 组合式语法，**禁止 Options API；禁止 defineComponent 选项写法**；
2. 禁止直接使用 axios、原生fetch；预留导入项目封装好 get / post 请求函数，不自行定义底层请求；
3. 接口返回结构、表单对象、数据模型全部定义TS interface，严格规避 any；无法精准定义时使用 unknown 配合类型守卫；
4. 页面视图与业务逻辑适度拆分，复杂区块、弹窗、列表项抽离独立子组件；弹窗、抽屉封装为页面内部子组件，禁止独立路由；
5. 禁止硬编码大量静态Mock数据，统一使用 ref / reactive 声明响应式变量；如需mock，单独放在变量区域，不散布模板内；
6. 所有表单增加基础校验规则，优先使用Arco Design自带表单校验能力；
7. UI交互组件优先选用 Arco Design Vue 内置组件；布局样式优先使用 Tailwind CSS 内联class；
    ✅ 仅纯布局容器允许使用 div / span；
    ❌ **禁止使用原生<input>/<table>/<button>/<dialog>/<select>/<ul>/<li>实现表单、表格、弹窗、按钮、数据列表交互**
8. 图标统一使用 `<a-icon>` + Arco图标名称；禁止直接手写原生 `<svg>` 标签嵌入页面；
9. 允许在 `<style scoped lang="css">` 内使用 @apply 封装重复视觉样式，**不允许直接手写原生css属性（如margin:13px）**；禁止脱离tailwind体系手写独立属性。
10. 严格遵循 Tailwind CSS v4 语法规范，禁止使用v3废弃语法：
    - 不再使用 `@import "tailwindcss/base/utilities/components"`；v4统一使用 `@import "tailwindcss";`
    - 移除 `@tailwind base; @tailwind components; @tailwind utilities;`
    - 任意值语法优先使用 `bg-[#xxxxxx]`，不再依赖旧版任意值兼容写法
    - 不要混用 v3 与 v4 两套配置写法，不要使用已废弃前缀、插件写法
    - 主题扩展、自定义工具类遵循v4 CSS-first配置范式
11. 模板内避免过长class字符串，可使用class三元表达式处理动态样式；禁止行间style大量硬编码像素值；
12. 路由、组件导入使用@项目别名；
13. 事件命名、变量命名遵循驼峰规范，代码增加必要注释；
14. 区分只读展示区域、表格列表、筛选栏、表单模块；空状态、加载状态、各类交互逻辑按照提纲完整实现；

## ⚠️ 违规强制要求
代码输出完成后**强制自查**，只要出现下面任意情况，直接全部重构，不要局部修改：
① 出现Options API；
② 直接引入axios/fetch发起请求；
③ 大量any、缺少interface类型定义；
④ 出现无scoped的<style>、大量自定义class名称、手写原生css/scss样式，或者混用Tailwind v3废弃语法；
⑤ 混杂大量静态写死数据，没有放入响应式变量；
⑥ 表单无基础校验；
⑦ 使用原生HTML标签（input/table/button/dialog/select/ul/li）实现表单、表格、弹窗、分页、数据列表等交互功能，未使用Arco Design Vue组件；
⑧ 页面内直接手写原生 `<svg>` 图标，未使用 `<a-icon>` 组件；

## UI基线规范
主色#1677ff，通用圆角6px，卡片圆角8px，卡片使用轻微阴影；

## 输出规则
1. 优先输出完整可粘贴的Vue单文件代码；必要位置增加注释；
2. 不要输出大段无关讲解文字；
3. 子组件直接内嵌在当前SFC中；
4. 所有类型interface统一放置在script顶部区域；

## 输入处理优先级
业务功能、字段结构、弹窗逻辑【提纲 > 截图】。
截图仅用来调整UI排版；不允许因为截图不全，删减提纲内定义的功能、表单项、表格列。

## 输入模板读取范式
当前页面：【粘贴页面名称】
参考权威开发提纲：
【粘贴当前页面对应模块提纲】

前置重要说明：
完整原型共多张截图，前期已全部识别并输出上方提纲，提纲内包含页面所有Tab、弹窗、抽屉、表单、表格、交互逻辑，以提纲结构为准。本次截图仅用于对齐视觉排版、间距、组件摆放；业务字段、数据结构、弹窗归属全部严格遵循提纲，不要仅凭截图遗漏功能。

需求：
1. 依据提纲+截图还原页面布局，输出完整Vue组件代码。
2. 无法上传全部附属弹窗截图，弹窗结构、表单字段直接以上方提纲为准，视觉风格和主页面保持统一。