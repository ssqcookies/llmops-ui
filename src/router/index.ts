import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import DefaultLayout from '@/views/layouts/DefaultLayout.vue'
import BlankLayout from '@/views/layouts/BlankLayout.vue'
import { ROUTE_NAME } from '@/constants'
import {isLogin} from '@/utils/auth'
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      {
        path: 'space/app',
        name: ROUTE_NAME.SPACEAPPSLIST,
        component: () => import('@/views/space/apps/ListView.vue'),
      },
    ],
  },
  {
    path: '/',
    component: BlankLayout,
    children: [
      {
        path: 'auth/login',
        name: ROUTE_NAME.LOGIN,
        component: () => import('@/views/auth/LoginView.vue'),
      },
      {
        path: 'space/apps/:app_id',
        name: "space-apps-detail",
        component: () => import('@/views/space/apps/DetailView.vue'),
      }
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
router.beforeEach(async (to, from) => {
  // 检查账号是否登录
  if (!isLogin() && !['auth-login', 'auth-authorize'].includes(to.name as string)) {
    return { path: '/auth/login' }
  }
})
export default router
