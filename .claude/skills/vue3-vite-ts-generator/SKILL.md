---
skill_name: vue3-vite-ts-generator
version: 1.6.0
tech_stack: Vue3 + Vite + TypeScript
trigger_keywords:
  - 创建vue3项目
  - 生成vue3 vite ts项目
  - 初始化vue3工程目录
  - 按照规范生成vue3目录结构
  - 补齐vue项目src目录规范
exclude_scenes:
  - 仅讨论vue语法、组件编写，不涉及目录初始化/目录补齐
  - 只修改单个文件，不需要整体规整目录结构
enable_tools:
  - 文件创建
  - 目录生成
forbid_actions:
  - 擅自调整约定目录层级与文件名
  - 新增规范以外的顶层文件夹
  - 私自修改预设文件名称
  - 使用JavaScript，所有源码统一采用TypeScript
  - 跳过预览确认步骤，直接生成/修改文件
  - 在已有Vue脚手架项目中，覆盖根目录已存在的配置文件
  - 直接重写项目内已存在的业务文件
  - 骨架初始化阶段写入未安装依赖模块的import语句，引发TS模块报错
  - 骨架初始化阶段在组件内写入导入api/stores/utils等内部模块的跨文件引用代码
  - 骨架初始化阶段生成带有点击事件、状态读取、接口调用等完整业务示例代码
  - 骨架初始化阶段自动生成request.ts网络请求封装文件；网络库选型（axios/fetch）未确定前不创建该文件
---
# 技能说明
本技能唯一职责：**搭建标准目录骨架 + 生成极简占位文件**
⚠️ 重要边界说明
1. 只构建文件夹结构，所有生成文件仅保留基础语法壳；
2. **不编写任何可运行业务代码、不产生跨文件导入、不提供Demo示例**；
3. vue-router、pinia、axios/fetch相关逻辑全部注释预留，不启用；
4. 解决依赖未安装、路径别名未配置前VSCode大面积TS红色报错问题；
5. 网络请求封装文件 request.ts **延后生成**，放到后续模块完善流程，等待确定使用 axios 或原生 fetch。

两种工作模式：
1. 全新模式：空目录从零初始化整套 Vue3 + Vite + TypeScript 前端目录骨架
2. 补齐模式：当前目录已存在create-vue脚手架，仅校验、补齐src内部规范目录，**绝不改动根目录已有配置文件**

项目目录拥有固定标准约束，文件夹层级、预设文件命名不可随意增删、扁平化、改名。

## 目录约束规则（执行时以此作为校验标准）
### 顶层目录约束
标准顶层包含：`public`、`src`；配套 vite+ts+代码规范相关配置文件。

### src 内部强制分层标准
1. assets：拆分 images / styles 子目录，存放静态资源
2. components：公共组件目录，内置 __tests__ 测试目录
3. config：项目全局配置，入口 index.ts
4. constants：全局常量、枚举目录
   - index.ts：常量统一导出入口
   - enum.ts：业务枚举占位文件
5. hooks：组合式函数存放目录
6. router：路由模块，入口 index.ts
7. api：接口请求层
   - modules：各个业务模块接口文件目录
   - index.ts：接口统一导出入口（骨架阶段仅占位）
   - ⚠️ request.ts 【骨架阶段不自动创建】
8. stores：状态管理模块，预设 account.ts、auth.ts
9. utils：通用工具函数，内置 auth.ts、storage.ts
10. views：页面视图层
    - layouts：布局容器：DefaultLayout.vue
    - pages：业务页面：HomeView.vue、LoginView.vue
src根目录必须存在 App.vue、main.ts

### 根目录标准配套文件清单
env.d.ts、index.html、package.json、README.md
eslint.config.ts、.gitignore、.editorconfig、.prettierrc.json
tsconfig.json、tsconfig.app.json、tsconfig.node.json、vite.config.ts
> 补齐模式规则：根目录已有文件一律保留，不覆盖、不重写。

## 强制执行流程（不可省略任何步骤）
### 第1步：环境探测
扫描当前工作目录，自动区分场景：
- 场景A【全新空目录】：不存在 package.json / src / vite.config.ts
- 场景B【存量脚手架】：存在 package.json + vite.config.ts + src（create-vue 初始化产物）

### 第2步：预览输出（禁止写入任何文件）
- 场景A：输出完整目标目录树清单
- 场景B：输出目录对比清单，区分：✅已存在 / ⚠缺失 / ❌规范外多余目录

### 第3步：等待用户确认
明确告知即将执行的模式，询问确认：
> 是否确认执行【全新初始化 / 存量目录补齐】操作？

### 第4步：分支执行
1. **全新模式**
逐级创建全部目录，生成极简占位模板代码；所有外部依赖、跨模块引用统一注释占位，不启用。

2. **存量补齐模式（重点约束）**
① 根目录所有配置文件只读，绝不覆盖；
② 仅创建src下缺失文件夹与缺失规范文件；
③ 已存在文件保持原样，不覆写业务代码；
④ 现有目录与规范冲突时，仅列出改造建议，不自动修改。

## 占位文件统一编码强制规范
1. Vue SFC 统一使用 `<script setup lang="ts">`
2. 页面组件命名规范：XxxView.vue（大驼峰）
3. TS文件仅保留基础空导出结构，不编写业务逻辑
```typescript
/**
 * 模块占位文件
 * 依赖安装、路径别名配置完成后，再完善代码
 */
export default {}