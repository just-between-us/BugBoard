<script setup lang="ts">
import { onMounted, watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Settings } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import ProjectHeader from '@/widgets/project-header/ProjectHeader.vue'
import ProjectTabs from '@/widgets/project-tabs/ProjectTabs.vue'
import BugsFilters from '@/widgets/bugs-filters/BugsFilters.vue'
import BugList from '@/widgets/bug-list/BugList.vue'
import ProjectMembers from '@/widgets/project-members/ProjectMembers.vue'
import ProjectReports from '@/widgets/project-reports/ProjectReports.vue'
import CreateBugDialog from '@/widgets/create-bug-dialog/CreateBugDialog.vue'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed<string>(() => route.params.id as string)

const activeTab = ref<'bugs' | 'reports' | 'members' | 'settings'>('bugs')
const isCreateBugOpen = ref(false)

const searchQuery = ref('')
const statusFilter = ref<string>('all')
const severityFilter = ref<string>('all')
const areaFilter = ref<string>('all')
const sortBy = ref<'created_at' | 'severity' | 'status' | 'title'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const filteredBugs = computed(() => {
  let bugs = [...projectsStore.bugs]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    bugs = bugs.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query),
    )
  }

  if (statusFilter.value !== 'all') {
    bugs = bugs.filter((b) => b.status === statusFilter.value)
  }

  if (severityFilter.value !== 'all') {
    bugs = bugs.filter((b) => b.severity === severityFilter.value)
  }

  if (areaFilter.value !== 'all') {
    bugs = bugs.filter((b) => b.area === areaFilter.value)
  }

  bugs.sort((a, b) => {
    let aVal: string | number = a[sortBy.value]
    let bVal: string | number = b[sortBy.value]

    if (sortBy.value === 'severity') {
      const severityOrder = { critical: 3, major: 2, minor: 1 }
      aVal = severityOrder[a.severity as keyof typeof severityOrder] ?? 0
      bVal = severityOrder[b.severity as keyof typeof severityOrder] ?? 0
    } else if (sortBy.value === 'status') {
      const statusOrder = { discovered: 1, confirmed: 2, in_progress: 3, fixed: 4 }
      aVal = statusOrder[a.status as keyof typeof statusOrder] ?? 0
      bVal = statusOrder[b.status as keyof typeof statusOrder] ?? 0
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      aVal = aVal.toLowerCase()
      bVal = bVal.toLowerCase()
    }

    const result = aVal > bVal ? 1 : aVal < bVal ? -1 : 0
    return sortOrder.value === 'asc' ? result : -result
  })

  return bugs
})

async function loadProject() {
  const id = projectId.value
  if (!id) return
  try {
    await projectsStore.fetchProject(id)
    await projectsStore.fetchBugs(id)
  } catch {
    router.push({ name: 'projects' })
  }
}

async function handleCreateBug(input: CreateBugInput) {
  await projectsStore.createBug(input)
}

interface CreateBugInput {
  project_id: string
  title: string
  description?: string
  status: 'discovered' | 'confirmed' | 'in_progress' | 'fixed'
  area: 'database' | 'ui' | 'auth' | 'api' | 'performance' | 'other'
  severity: 'critical' | 'major' | 'minor'
}

function openCreateBug() {
  isCreateBugOpen.value = true
}

function closeCreateBug() {
  isCreateBugOpen.value = false
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function clearAllFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  severityFilter.value = 'all'
  areaFilter.value = 'all'
  sortBy.value = 'created_at'
  sortOrder.value = 'desc'
}

function hasActiveFilters(): boolean {
  return (
    searchQuery.value !== '' ||
    statusFilter.value !== 'all' ||
    severityFilter.value !== 'all' ||
    areaFilter.value !== 'all'
  )
}

onMounted(() => {
  loadProject()
})

watch(
  projectId,
  () => {
    projectsStore.clearCurrentProject()
    loadProject()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-6">
    <!-- Back Button -->
    <Button variant="ghost" size="sm" class="mb-4 gap-1" @click="router.push({ name: 'projects' })">
      <ChevronLeft class="h-4 w-4" />
      Назад к проектам
    </Button>

    <!-- Project Header -->
    <ProjectHeader />

    <!-- Loading Project (when no current project yet) -->
    <div
      v-if="!projectsStore.currentProject && projectsStore.loading"
      class="animate-pulse space-y-4"
    >
      <div class="h-12 w-3/4 bg-muted rounded-lg" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

    <!-- Main Content (when project loaded) -->
    <div v-else-if="projectsStore.currentProject">
      <!-- Tabs Navigation -->
      <ProjectTabs class="mb-3" :activeTab="activeTab" @updateTab="activeTab = $event" />

      <!-- Sticky Header: Bugs Filters (only for bugs tab) -->
      <div v-if="activeTab === 'bugs'" class="sticky top-0 z-20 bg-background/90 backdrop-blur-sm">
        <BugsFilters
          :searchQuery="searchQuery"
          :statusFilter="statusFilter"
          :severityFilter="severityFilter"
          :areaFilter="areaFilter"
          :sortBy="sortBy"
          :sortOrder="sortOrder"
          :hasActiveFilters="hasActiveFilters()"
          @update:searchQuery="searchQuery = $event"
          @update:statusFilter="statusFilter = $event"
          @update:severityFilter="severityFilter = $event"
          @update:areaFilter="areaFilter = $event"
          @update:sortBy="sortBy = $event"
          @toggleSortOrder="toggleSortOrder"
          @clearAllFilters="clearAllFilters"
          @open-create-bug="openCreateBug"
        />
      </div>

      <!-- Bug List (scrollable) -->
      <BugList
        v-if="activeTab === 'bugs'"
        :filteredBugs="filteredBugs"
        :loading="projectsStore.loading"
        :error="projectsStore.error"
        :searchQuery="searchQuery"
        :statusFilter="statusFilter"
        :severityFilter="severityFilter"
        :areaFilter="areaFilter"
        @retry="projectsStore.fetchBugs(projectId)"
        @clearFilters="clearAllFilters"
      />

      <!-- Other Tabs Placeholders -->
      <!-- Members -->
      <ProjectMembers v-else-if="activeTab === 'members'" :project-id="projectId" />

      <ProjectReports v-else-if="activeTab === 'reports'" :project-id="projectId" />

      <div v-else-if="activeTab === 'settings'" class="text-center py-12">
        <Settings class="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 class="mt-4 text-lg font-medium">Настройки</h3>
        <p class="mt-1 text-sm text-muted-foreground">Настройки проекта</p>
      </div>
    </div>

    <!-- Create Bug Dialog -->
    <CreateBugDialog
      :isOpen="isCreateBugOpen"
      :submitting="projectsStore.loading"
      :projectId="projectId"
      @close="closeCreateBug"
      @submit="handleCreateBug"
    />
  </div>
</template>
