import { createRouter, createWebHashHistory } from 'vue-router'
import { staticRoutes } from './routes/staticRoutes'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: staticRoutes
})
