# 前端代码规范约定

> 每次生成代码时，必须严格遵守以下规范。不允许自行决定文件结构或代码风格。

## 技术栈

- Vue 3 + `<script setup lang="ts">`

- TypeScript（严格模式）

- Tailwind CSS v4（自定义主题 token）

- Arco Design Vue（UI 组件库）

- Vite（构建工具）

## 一、文件结构规范

### 1. 每个功能模块必须按以下结构组织

```
src/
├── views/
│   └── [module]/
│       ├── index.vue                    # 页面入口
│       ├── components/                  # 模块私有子组件
│       │   └── XxxPanel.vue
├── components/                           # 全局通用组件
├── stores/                               # 全局通用 hooks
│       ├── index.ts                
│       └── modules/                      # 模块私有逻辑
│           └── useXxx.ts
├── services/                             # API 请求层
│   └── [module].ts                      # 模块 API 封装
├── models/                               # 类型定义层
│   ├── [module].ts                      # 模块相关 TS 类型
│   └── common.ts                        # 通用类型（分页、响应等）
├── router/
│   └── modules/
│       └── [module].ts                  # 路由配置
├── assets/
│   └── styles/
└── utils/
```

### 2. 类型定义必须独立文件

- 所有 TypeScript 类型、接口、枚举必须放在 `src/models/` 下

- 页面和组件文件中**不允许内联定义 export 类型**（局部 interface 可以，但共享类型必须独立）

- 示例：

```typescript
// src/models/app.ts ✅ 类型独立文件
export interface AppItem {
  id: string
  name: string
  icon: string
  openapi_schema: string
  headers: Record<string, string>[]
}

export interface CreateAppReq {
  name: string
  icon: string
  openapi_schema: string
  headers: Record<string, string>[]
}

export enum AppStatus {
  Active = 'active',
  Inactive = 'inactive',
}
```

```vue
<!-- src/views/app/index.vue ✅ 页面引入类型 -->
<script setup lang="ts">
import type { AppItem, CreateAppReq } from '@/models/app'
</script>
```

### 3. 子组件必须独立文件

- 一个 `.vue` 文件只包含一个组件

- 不允许在页面文件内联定义子组件

- 子组件放在 `components/` 目录下

## 二、命名规范

| 类型         | 规则                         | 示例                               |
| ---------- | -------------------------- | -------------------------------- |
| 页面文件       | `index.vue`                | `views/app/index.vue`            |
| 组件文件       | `PascalCase.vue`           | `IconApp.vue`、`AppListPanel.vue` |
| Hook 文件    | `camelCase.ts`，`use` 前缀    | `useAppList.ts`                  |
| Service 文件 | `camelCase.ts`             | `appService.ts`                  |
| 类型文件       | `camelCase.ts`             | `models/app.ts`                  |
| 接口/类型      | `PascalCase`               | `AppItem`、`CreateAppReq`         |
| 枚举         | `PascalCase`               | `AppStatus`                      |
| 枚举值        | `camelCase` 或 `snake_case` | `Active = 'active'`              |
| CSS class  | `kebab-case`               | `app-list-panel`                 |
| 路由 name    | `kebab-case`               | `app-list`、`app-detail`          |

## 三、Vue 组件规范

### 1. SFC 顺序

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { AppItem } from '@/models/app'

// 2. Props & Emits
const props = defineProps<{
  app: AppItem
}>()

const emit = defineEmits<{
  refresh: []
}>()

// 3. 响应式状态
const loading = ref(false)
const appList = ref<AppItem[]>([])

// 4. 计算属性
const isEmpty = computed(() => appList.value.length === 0)

// 5. 方法
const handleDelete = async (id: string) => {
  // ...
}

// 6. 生命周期
onMounted(() => {
  fetchList()
})
</script>

<template>
  <!-- 模板 -->
</template>

<style scoped lang="css">
/* 仅用 @apply 封装重复样式，不写原生 CSS 属性 */
</style>
```

### 2. Props 必须用 TypeScript 泛型定义

```typescript
// ✅ 正确
const props = defineProps<{
  app: AppItem
  loading?: boolean
}>()

// ❌ 错误
const props = defineProps({
  app: { type: Object, required: true },
  loading: { type: Boolean, default: false },
})
```

## 四、API 请求规范

### 1. Service 层结构

```typescript
// src/services/appService.ts
import request from '@/utils/request'
import type { AppItem, CreateAppReq } from '@/models/app'

export const appService = {
  list: () => request.get<AppItem[]>('/api-tools'),
  create: (data: CreateAppReq) => request.post<AppItem>('/api-tools', data),
  delete: (id: string) => request.delete(`/api-tools/${id}`),
}
```

### 2. 统一响应类型

```typescript
// src/models/common.ts
export interface ApiResponse<T> {
  code: string
  data: T
  message: string
}
```

## 五、样式规范

- 使用 Tailwind CSS v4 自定义主题 token

- 不写内联 `style=""`

- 不写自定义 CSS class（除非用 `@apply` 封装重复样式）

- 间距、圆角、颜色等严格遵循项目主题配置

## 六、Prompt 使用方法

### 6.1 新模块开发

每次让 AI 生成新模块代码时，在 prompt 开头加上：

```
请严格遵守 @AGENTS.md 中的代码规范。本次需要开发的模块是：XXX。
```

或更具体：

```
请严格遵守 @AGENTS.md 中的代码规范。本次需要开发"应用管理"模块，包含列表页和详情页。类型定义放在 src/models/app.ts，API 放在 src/services/appService.ts。
```

### 6.2 旧模块迁移

对已有模块进行分层迁移时，使用以下提示词模板。

#### 迁移提示词模板

```
请严格遵守 @AGENTS.md 中的代码规范。
本次任务是对已有模块进行分层迁移，不是重写。

迁移模块：[模块名，如"应用管理"]
迁移目标文件：
- src/views/[module]/index.vue（已有，需要修改）

需要新增的文件：
1. src/models/[module].ts — 类型定义
2. src/services/[module]Service.ts — 接口调用层

迁移规则：
1. 类型抽取：把 index.vue 中内联的 interface/type/enum 移到 models 文件，
   index.vue 只保留 import type { ... }
2. 接口抽取：把 index.vue 中直接调用 fetch/axios 的地方，移到 service 文件，
   index.vue 只保留调用 appService.xxx()
3. 禁止改动范围：不修改 template、不修改 style、不修改 UI 逻辑、
   不修改子组件、不修改路由配置
4. 只输出修改的文件，不要重写未改动的文件

当前 index.vue 代码如下：
[粘贴完整代码]
```

#### 迁移边界规范

迁移时必须遵守以下红线，防止 AI 越界改动：

| 红线          | 说明                                 | 违反后果     |
| ----------- | ---------------------------------- | -------- |
| 不改 template | `<template>` 标签内的所有内容原封不动          | UI 结构被破坏 |
| 不改 style    | `<style>` 标签内的所有内容原封不动             | 样式丢失或错乱  |
| 不改 UI 逻辑    | 事件处理函数名、v-model 绑定、v-if/v-for 条件不动 | 交互行为变化   |
| 不改子组件       | 不修改 components/ 下的子组件文件            | 影响其他页面   |
| 不改路由        | 不修改 router/ 下的任何文件                 | 路由跳转失效   |
| 不重命名变量      | script 中已有的变量名、函数名不动               | 引用断裂     |
| 只输出改动文件     | 未改动的文件不要输出完整内容                     | 浪费上下文    |

#### 迁移后验证清单

每次迁移完成后，逐项检查：

```
□ index.vue 的 template 部分与迁移前完全一致
□ index.vue 的 style 部分与迁移前完全一致
□ index.vue 顶部有 import type { ... } from '@/models/xxx'
□ index.vue 中接口调用改为 appService.xxx()
□ models/xxx.ts 中类型定义完整，无遗漏
□ services/xxxService.ts 中函数签名与页面调用一致
□ 运行项目，页面显示和交互与迁移前一致
```

### 6.3 静态数据转 Mock Service

已有页面的数据是写死的静态数据（硬编码在 script 中），
需要将其抽离为 Mock Service，模拟异步接口调用。

#### 静态转 Mock 提示词模板

```
请严格遵守 @AGENTS.md 中的代码规范。
本次任务是将已有页面中的静态数据转换为 Mock Service，不是重写。

迁移模块：[模块名，如"应用管理"]
迁移目标文件：
- src/views/[module]/index.vue（已有，需要修改 script 部分）

需要新增的文件：
1. src/models/[module].ts — 类型定义
   根据页面中的静态数据结构，推断并定义 interface/type
2. src/services/[module]Service.ts — Mock 接口层
   把静态数据搬到 service 文件中，用 Promise + setTimeout 包装，
   模拟异步请求，返回类型必须标注

迁移规则：
1. 类型抽取：根据静态数据结构，在 models 文件中定义类型
2. 数据迁移：把 script 中写死的数组/对象移到 service 文件中，
   包装为 Promise + setTimeout(300ms) 返回
3. 页面改造：
   - 删除 script 中的静态数据定义
   - 添加 import { [module]Service } from '@/services/[module]Service'
   - 添加 import type { ... } from '@/models/[module]'
   - 用 ref 变量接收异步数据，onMounted 中调用 service
   - 添加 loading 状态（可选）
4. 禁止改动范围：不修改 template、不修改 style、
   不修改子组件、不修改路由配置
5. template 中已绑定的变量名必须保持不变
   （如果静态数据叫 appList，ref 也必须叫 appList）
6. 只输出修改的文件，不要重写未改动的文件

当前 index.vue 代码如下：
[粘贴完整代码]
```

#### 静态转 Mock 示例

迁移前（静态数据写死在页面）：

```vue
<script setup lang="ts">
import { ref } from 'vue'

// 静态数据写死在页面里
const appList = ref([
  { id: '1', name: '高德工具包', icon: 'https://cdn.imooc.com/icon.png' },
  { id: '2', name: '天气查询', icon: 'https://cdn.imooc.com/weather.png' },
])
</script>

<template>
  <div v-for="app in appList" :key="app.id">
    {{ app.name }}
  </div>
</template>
```

迁移后 — models 文件：

```typescript
// src/models/app.ts
export interface AppItem {
  id: string
  name: string
  icon: string
}
```

迁移后 — service 文件：

```typescript
// src/services/appService.ts
import type { AppItem } from '@/models/app'

// TODO: 后续替换为真实接口
const mockData: AppItem[] = [
  { id: '1', name: '高德工具包', icon: 'https://cdn.imooc.com/icon.png' },
  { id: '2', name: '天气查询', icon: 'https://cdn.imooc.com/weather.png' },
]

export const appService = {
  list: (): Promise<AppItem[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockData), 300)
    })
  },
}
```

迁移后 — 页面文件：

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { appService } from '@/services/appService'
import type { AppItem } from '@/models/app'

// 变量名不变，只是初始值改为空数组
const appList = ref<AppItem[]>([])

onMounted(async () => {
  appList.value = await appService.list()
})
</script>

<template>
  <!-- template 完全不变 -->
  <div v-for="app in appList" :key="app.id">
    {{ app.name }}
  </div>
</template>
```

#### 静态转 Mock 边界规范

| 红线             | 说明                               | 违反后果          |
| -------------- | -------------------------------- | ------------- |
| 不改 template    | template 中绑定的变量名、v-for、v-if 全部不动 | UI 结构被破坏      |
| 不改 style       | style 部分原封不动                     | 样式丢失          |
| 不改变量名          | script 中已有的 ref 变量名保持不变          | template 引用断裂 |
| 静态数据完整搬迁       | mock 数据中的值必须与原静态数据完全一致           | 数据丢失          |
| service 返回类型标注 | 必须标注 Promise<T>                  | 类型检查不通过       |
| 只输出改动文件        | 未改动的文件不要输出                       | 浪费上下文         |

#### 静态转 Mock 验证清单

```
□ template 部分与迁移前完全一致
□ style 部分与迁移前完全一致
□ script 中 ref 变量名与迁移前一致
□ mock 数据内容与原静态数据完全一致
□ service 方法返回 Promise，有 setTimeout 模拟延迟
□ service 方法有完整的返回类型标注
□ onMounted 中调用了 service 方法
□ 页面刷新后数据正常显示（延迟 300ms 后出现）
```

### 6.4 接口接入（mock → 真实接口）

后端接口就绪后，将 service 中的 mock 替换为真实调用：

```
请严格遵守 @AGENTS.md 中的代码规范。
后端接口已就绪，请将 [module]Service.ts 中的 mock 数据替换为真实接口调用。

接口信息：
- GET    /api-xxx          获取列表
- POST   /api-xxx          创建
- DELETE /api-xxx/:id      删除

要求：
1. 只修改 src/services/[module]Service.ts
2. 不修改任何其他文件（页面、组件、类型、路由）
3. 保持函数签名不变（参数类型、返回类型）
4. 使用项目统一的 request 工具发请求
```

