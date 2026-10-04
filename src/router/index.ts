import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppLayout from '@/layouts/AppLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('@/views/LandingView.vue'),
    },
    {
      path: '/auth',
      name: 'auth',
      component: () => import('@/views/AuthView.vue'),
    },
    {
      path: '/auth/callback',
      name: 'auth-callback',
      component: () => import('@/views/AuthCallbackView.vue'),
    },
    {
      path: '/auth/reset-password',
      name: 'auth-reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
    },
    {
      path: '/report/:projectId',
      name: 'report',
      component: () => import('@/views/ReportView.vue'),
    },
    {
      path: '/reports/:reportId',
      name: 'report-view',
      component: () => import('@/views/ReportDetailView.vue'),
    },
    {
      path: '/app',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'projects', component: () => import('@/views/ProjectsView.vue') },
        {
          path: 'projects/:id',
          name: 'project',
          component: () => import('@/views/ProjectView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'projects/:projectId/bugs/:bugId',
          name: 'bug-detail',
          component: () => import('@/views/BugDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'users/:userId',
          name: 'user-profile',
          component: () => import('@/views/UserProfileView.vue'),
          meta: { requiresAuth: true },
        },
        { path: 'settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
      ],
    },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }

  if (to.name === 'auth' && auth.isAuthenticated) {
    return { name: 'projects' }
  }
})

export default router
