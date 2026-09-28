import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import LandingView from '@/views/LandingView.vue'
import AuthView from '@/views/AuthView.vue'
import AppLayout from '@/layouts/AppLayout.vue'
import ProjectsView from '@/views/ProjectsView.vue'
import ProjectView from '@/views/ProjectView.vue'
import BugDetailView from '@/views/BugDetailView.vue'
import ProfileView from '@/views/ProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView,
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
    {
      path: '/app',
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'projects', component: ProjectsView },
        { path: 'projects/:id', name: 'project', component: ProjectView, meta: { requiresAuth: true } },
        { path: 'projects/:projectId/bugs/:bugId', name: 'bug-detail', component: BugDetailView, meta: { requiresAuth: true } },
        { path: 'profile', name: 'profile', component: ProfileView },
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
