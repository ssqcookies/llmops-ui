import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/views/layouts/DefaultLayout.vue'
import BlankLayout from '@/views/layouts/BlankLayout.vue'
import { ROUTE_NAME } from '@/constants'
import isLogin from '@/utils/auth'
import { getCurrentUser } from '@/services/account'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
       {
          path: '',
          redirect: 'home',
        },
        {
          path: 'home',
         name: ROUTE_NAME.HOME,
        component: () => import('@/views/home/index.vue'),
        },
      // 个人空间（4个Tab：AI应用/插件/工作流/知识库），Tab 由路径参数驱动：/space/:tab
      {
        path: 'space',
        redirect: '/space/apps',
      },
      {
        path: 'space/:tab',
        name: ROUTE_NAME.PERSONAL_SPACE,
        component: () => import('@/views/space/index.vue'),
      },
      // 插件广场
      {
        path: 'plugin',
        name: ROUTE_NAME.PLUGIN,
        component: () => import('@/views/plugin/index.vue'),
      },
      // 应用广场（内置应用浏览，从模板添加到个人空间）
      {
        path: 'app-square',
        name: ROUTE_NAME.APP_SQUARE,
        component: () => import('@/views/app-square/index.vue'),
      },
      // 开放 API
      {
        path: 'openapi',
        name: ROUTE_NAME.OPEN_API,
        component: () => import('@/views/openapi/index.vue'),
      },
      // 知识库详情（知识库列表内嵌于个人空间第 4 个 Tab：/space/knowledge）
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
    ],
  },
  {
    path: '/',
    component: BlankLayout,
    children: [
      // 应用编排详情（独立全屏页面，不显示左侧侧边栏）
      {
        path: 'app-orchestration/:id',
        name: ROUTE_NAME.APP_ORCHESTRATION_DETAIL,
        component: () => import('@/views/app-orchestration/detail/index.vue'),
      },
      // WebApp 对外发布页（全屏，无需登录，通过 token 访问）
      {
        path: 'web-app/:token',
        name: ROUTE_NAME.WEB_APP,
        component: () => import('@/views/web-app/index.vue'),
      },
      {
        path: 'auth/login',
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
  // 403 无权限页（接口返回 HTTP 403 时跳转）
  {
    path: '/403',
    name: ROUTE_NAME.FORBIDDEN,
    component: () => import('@/views/ForbiddenView.vue'),
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

// 是否已在本次页面会话中完成服务端登录态校验
// 直接输入URL / 刷新后的首次导航都会重新校验，防止本地残留的失效凭证绕过路由拦截
let authVerified = false

router.beforeEach(async (to, _from) => {
  // 登录相关路由（/auth/*）直接放行，避免守卫重定向死循环
  if (to.path.startsWith('/auth')) return
  // WebApp 对外发布页（/web-app/*）通过 token 鉴权，跳过登录校验
  if (to.path.startsWith('/web-app')) return
  // 本地预检：无凭证或本地时间戳已过期 → 强制跳转登录页
  if (!isLogin()) {
    return { path: '/auth/login' }
  }
  // 首次导航时向服务端校验凭证有效性，凭证失效则拦截回登录页
  if (!authVerified) {
    authVerified = true
    try {
      await getCurrentUser()
    } catch {
      // 凭证无效（401 时请求层已清理本地缓存），强制回登录页
      return { path: '/auth/login' }
    }
  }
})

export default router
