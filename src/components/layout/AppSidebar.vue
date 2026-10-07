<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore } from '@/stores/projects'
import { useActiveProjectStore } from '@/stores/activeProject'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FolderKanban,
  Settings,
  PanelLeft,
  LogOut,
  ChevronsUpDown,
  Check,
  Plus,
  Loader2,
  Bug,
  AlertTriangle,
  Users,
  ChartColumn,
} from '@lucide/vue'
import { Avatar } from '@/components/avatar'

interface Props {
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), { open: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const collapsed = ref(false)
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectsStore = useProjectsStore()
const activeProjectStore = useActiveProjectStore()

const isDesktop = ref(true)
let mediaQuery: MediaQueryList | null = null

const navItems = [
  { label: 'Проекты', to: '/app', icon: FolderKanban },
  { label: 'Настройки', to: '/app/settings', icon: Settings },
]

const sectionItems = [
  { section: 'bugs', label: 'Баги', icon: Bug },
  { section: 'reports', label: 'Репорты', icon: AlertTriangle },
  { section: 'members', label: 'Участники', icon: Users },
  { section: 'stats', label: 'Статистика', icon: ChartColumn },
  { section: 'settings', label: 'Настройки', icon: Settings },
] as const

type Section = (typeof sectionItems)[number]['section']

const sectionRoutes: Record<Section, string> = {
  bugs: 'project-bugs',
  reports: 'project-reports',
  members: 'project-members',
  stats: 'project-stats',
  settings: 'project-settings',
}

const myProjects = computed(() => projectsStore.myProjects)
const myProjectsLoading = computed(() => projectsStore.myProjects === null)

const activeProject = computed(
  () => projectsStore.myProjects?.find((p) => p.id === activeProjectStore.activeProjectId) ?? null,
)

const switcherLabel = computed(() => {
  if (activeProject.value) return activeProject.value.name
  if (myProjectsLoading.value) return 'Загрузка…'
  if (myProjects.value && myProjects.value.length === 0) return 'Нет проектов'
  return 'Проект не выбран'
})

const projectContentKey = computed(() => activeProject.value?.id ?? switcherLabel.value)

function cycleNextProject() {
  const list = projectsStore.myProjects
  if (!list || list.length < 2) return
  const index = list.findIndex((project) => project.id === activeProjectStore.activeProjectId)
  const next = list[(index + 1) % list.length]
  if (next) activeProjectStore.setActiveProject(next.id)
}

const sectionLinks = computed(() => {
  const project = activeProject.value
  if (!project) return []
  return sectionItems.map((item) => ({
    ...item,
    to: { name: sectionRoutes[item.section], params: { id: project.id } },
  }))
})

function routeProjectId(): string | null {
  const raw = route.params.id ?? route.params.projectId
  return typeof raw === 'string' ? raw : null
}

function projectPageSection(): Section {
  const raw = route.query.tab
  const value = Array.isArray(raw) ? raw[0] : raw
  const known = sectionItems.find((item) => item.section === value)
  return known ? known.section : 'bugs'
}

function isSectionActive(section: Section): boolean {
  const project = activeProject.value
  if (!project || routeProjectId() !== project.id) return false
  if (route.name === sectionRoutes[section]) return true
  if (route.name === 'bug-detail') return section === 'bugs'
  if (route.name === 'project') return projectPageSection() === section
  return false
}

function selectProject(id: string) {
  activeProjectStore.setActiveProject(id)
}

function goToCreateProject() {
  router.push({ name: 'projects' })
  handleNavigate()
}

const userName = computed(() => auth.profile?.display_name ?? auth.user?.email ?? '?')

const profileLink = computed(() => (auth.user ? `/app/users/${auth.user.id}` : '/app/settings'))

function syncViewport() {
  isDesktop.value = mediaQuery?.matches ?? true
  if (isDesktop.value && props.open) emit('update:open', false)
}

function handleToggle() {
  if (isDesktop.value) {
    collapsed.value = !collapsed.value
  } else {
    emit('update:open', false)
  }
}

function handleNavigate() {
  if (!isDesktop.value) emit('update:open', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !isDesktop.value && props.open) {
    emit('update:open', false)
  }
}

async function handleSignOut() {
  await auth.signOut()
  router.push('/')
}

watch(
  [routeProjectId, () => projectsStore.myProjects],
  () => {
    const list = projectsStore.myProjects
    if (!list) return

    const fromRoute = routeProjectId()
    if (fromRoute && list.some((project) => project.id === fromRoute)) {
      if (activeProjectStore.activeProjectId !== fromRoute) {
        activeProjectStore.setActiveProject(fromRoute)
      }
      return
    }

    const active = activeProjectStore.activeProjectId
    if (active && list.some((project) => project.id === active)) return
    activeProjectStore.setActiveProject(list[0]?.id ?? null)
  },
  { immediate: true },
)

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 768px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
  window.addEventListener('keydown', handleKeydown)
  void projectsStore.fetchMyProjects()
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Backdrop: mobile / tablet overlay only -->
  <div
    v-if="props.open"
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    aria-hidden="true"
    @click="emit('update:open', false)"
  />

  <!-- Sidebar: in-flow sticky on desktop, absolute overlay below md -->
  <aside
    class="sticky top-0 flex h-screen w-56 flex-col justify-between border-r border-border bg-background transition-all duration-200 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50"
    :class="[
      props.open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
      collapsed && 'md:w-16',
    ]"
  >
    <div>
      <div
        class="flex items-center px-3 py-4"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <RouterLink
          v-if="!collapsed"
          to="/app"
          class="font-mono text-sm font-semibold"
          @click="handleNavigate"
        >
          BugBoard
        </RouterLink>
        <Button
          :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
          variant="ghost"
          size="icon"
          @click="handleToggle"
        >
          <PanelLeft class="h-4 w-4" />
        </Button>
      </div>

      <nav class="mt-4 space-y-1 px-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          active-class="bg-card text-foreground"
          @click="handleNavigate"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="mt-4 space-y-1 border-t border-border px-2 pt-4">
        <DropdownMenu>
          <div
            class="group relative w-full rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          >
            <DropdownMenuTrigger
              class="relative flex w-full items-center overflow-hidden rounded-md py-2 text-sm"
              :class="collapsed && 'justify-center'"
              aria-label="Выбор проекта"
            >
              <Transition name="project-slide">
                <div
                  :key="projectContentKey"
                  class="flex min-w-0 items-center gap-3"
                  :class="!collapsed && 'flex-1 px-3'"
                >
                  <Avatar
                    class="h-5 w-5 shrink-0 text-[10px]"
                    :name="activeProject?.name ?? '?'"
                    :src="activeProject?.avatar_url"
                  />
                  <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">
                    {{ switcherLabel }}
                  </span>
                  <span v-if="!collapsed" class="h-4 w-4 shrink-0" aria-hidden="true"></span>
                </div>
              </Transition>
            </DropdownMenuTrigger>

            <button
              v-if="!collapsed"
              type="button"
              class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-60 transition group-hover:text-foreground group-hover:opacity-100"
              title="Следующий проект"
              aria-label="Следующий проект"
              @click="cycleNextProject"
            >
              <ChevronsUpDown class="h-4 w-4" />
            </button>
          </div>

          <DropdownMenuContent align="start" class="w-56" :match-trigger="!collapsed">
            <div
              v-if="myProjectsLoading"
              class="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
            >
              <Loader2 class="h-4 w-4 animate-spin" />
              Загрузка проектов…
            </div>

            <template v-else-if="myProjects && myProjects.length > 0">
              <DropdownMenuItem
                v-for="project in myProjects"
                :key="project.id"
                @click="selectProject(project.id)"
              >
                <Avatar
                  class="mr-2 h-5 w-5 shrink-0 text-[10px]"
                  :name="project.name"
                  :src="project.avatar_url"
                />
                <span class="min-w-0 flex-1 truncate text-left">{{ project.name }}</span>
                <Check
                  v-if="project.id === activeProject?.id"
                  class="ml-2 h-4 w-4 shrink-0 text-primary"
                />
              </DropdownMenuItem>
            </template>

            <template v-else>
              <div class="px-2 py-1.5 text-sm text-muted-foreground">
                Вы пока не состоите в проектах
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem @click="goToCreateProject">
                <Plus class="mr-2 h-4 w-4 shrink-0" />
                Создать проект
              </DropdownMenuItem>
            </template>
          </DropdownMenuContent>
        </DropdownMenu>

        <nav v-if="sectionLinks.length > 0" class="space-y-1">
          <RouterLink
            v-for="link in sectionLinks"
            :key="link.section"
            :to="link.to"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            :class="
              isSectionActive(link.section)
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground'
            "
            @click="handleNavigate"
          >
            <component :is="link.icon" class="h-4 w-4 shrink-0" />
            <span v-if="!collapsed">{{ link.label }}</span>
          </RouterLink>
        </nav>
      </div>
    </div>

    <div class="border-t border-border p-2">
      <div class="flex items-center gap-2" :class="collapsed && 'justify-center'">
        <RouterLink
          :to="profileLink"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-card"
          @click="handleNavigate"
        >
          <Avatar
            class="h-7 w-7 text-xs font-mono"
            :name="userName"
            :src="auth.profile?.avatar_url"
          />
          <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left text-sm">
            {{ userName }}
          </span>
        </RouterLink>
        <Button v-if="!collapsed" variant="ghost" size="icon" @click="handleSignOut">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.project-slide-enter-active,
.project-slide-leave-active {
  transition: transform 0.25s ease;
}

.project-slide-leave-active {
  position: absolute;
  inset: 0;
}

.project-slide-enter-from {
  transform: translateY(100%);
}

.project-slide-leave-to {
  transform: translateY(-100%);
}
</style>
