import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/views/layouts/DefaultLayout.vue'
import BlankLayout from '@/views/layouts/BlankLayout.vue'
import { ROUTE_NAME } from '@/constants'
import isLogin from '@/utils/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      // 首页
      {
        path: '',
        name: ROUTE_NAME.HOME,
        component: () => import('@/views/home/index.vue'),
      },
      // 个人空间（4个Tab：AI应用/插件/工作流/知识库）
      {
        path: 'space',
        name: ROUTE_NAME.PERSONAL_SPACE,
        component: () => import('@/views/space/index.vue'),
      },
      // 插件广场
      {
        path: 'plugin',
        name: ROUTE_NAME.PLUGIN,
        component: () => import('@/views/plugin/index.vue'),
      },
      // 知识库详情（知识库列表内嵌于个人空间第 4 个 Tab：/space?tab=knowledge）
      {
        path: 'knowledge/:datasetId',
        name: ROUTE_NAME.KNOWLEDGE_DETAIL,
        component: () => import('@/views/knowledge/detail/index.vue'),
      },
      // 添加文件（全页面三步流程：上传 → 分段设置 → 数据处理）
      {
        path: 'knowledge/:datasetId/add-file',
        name: ROUTE_NAME.KNOWLEDGE_ADD_FILE,
        component: () => import('@/views/knowledge/add-file/index.vue'),
      },
      // 文档详情（属于知识库模块）
      {
        path: 'knowledge/:datasetId/document/:documentId',
        name: ROUTE_NAME.KNOWLEDGE_DOCUMENT_DETAIL,
        component: () => import('@/views/knowledge/document/index.vue'),
      },
      // 应用编排详情
      {
        path: 'app-orchestration/:id',
        name: ROUTE_NAME.APP_ORCHESTRATION_DETAIL,
        component: () => import('@/views/app-orchestration/detail/index.vue'),
      },
    ],
  },
  {
    path: '/',
    component: BlankLayout,
    children: [
      {
        path: 'login',
        name: ROUTE_NAME.LOGIN,
        component: () => import('@/views/auth/LoginView.vue'),
      },
       {
          path: 'auth/authorize/:provider_name',
          name: 'auth-authorize',
          component: () => import('@/views/auth/AuthorizeView.vue'),
        },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAME.NOT_FOUND,
    component: () => import('@/views/NotFoundView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to, _from) => {
  // 未登录 → 强制跳转登录页（放行登录相关路由）
  if (!isLogin && !['auth-login', 'auth-authorize'].includes(to.name as string)) {
    return { path: '/auth/login' }
  }
})

export default router
