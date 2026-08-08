import type { RouteRecordRaw } from 'vue-router'

export const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/email-viewer'
  },
  {
    path: '/email-viewer',
    name: 'EmailViewer',
    component: () => import('@views/email-viewer/index.vue'),
    meta: { title: '邮件查看器' }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]
