<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { isInRange } from '@/lib/dateRange'
import { useProjectsStore } from '@/stores/projects'
import BugsFilters from '@/widgets/bugs-filters/BugsFilters.vue'
import BugList from '@/widgets/bug-list/BugList.vue'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const router = useRouter()
const projectsStore = useProjectsStore()

const searchQuery = ref('')
const statusFilter = ref<string>('all')
const severityFilter = ref<string>('all')
const areaFilter = ref<string>('all')
const dateFrom = ref<string | null>(null)
const dateTo = ref<string | null>(null)
const sortBy = ref<'created_at' | 'severity' | 'status' | 'title'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const loading = computed(
  () => projectsStore.bugsLoading && projectsStore.bugsProjectId === props.projectId,
)

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

  if (dateFrom.value || dateTo.value) {
    const range = { from: dateFrom.value, to: dateTo.value }
    bugs = bugs.filter((b) => isInRange(b.created_at, range))
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

function openCreateBug() {
  void router.push({ name: 'bug-create', params: { projectId: props.projectId } })
}

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function clearAllFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  severityFilter.value = 'all'
  areaFilter.value = 'all'
  dateFrom.value = null
  dateTo.value = null
  sortBy.value = 'created_at'
  sortOrder.value = 'desc'
}

function hasActiveFilters(): boolean {
  return (
    searchQuery.value !== '' ||
    statusFilter.value !== 'all' ||
    severityFilter.value !== 'all' ||
    areaFilter.value !== 'all' ||
    dateFrom.value !== null ||
    dateTo.value !== null
  )
}

function ensureBugsLoaded() {
  if (projectsStore.bugsProjectId !== props.projectId) {
    void projectsStore.fetchBugs(props.projectId)
  }
}

watch(() => props.projectId, ensureBugsLoaded, { immediate: true })
</script>

<template>
  <div class="sticky top-14 z-20 bg-background/90 backdrop-blur-sm md:top-0">
    <BugsFilters
      :searchQuery="searchQuery"
      :statusFilter="statusFilter"
      :severityFilter="severityFilter"
      :areaFilter="areaFilter"
      :dateFrom="dateFrom"
      :dateTo="dateTo"
      :sortBy="sortBy"
      :sortOrder="sortOrder"
      :hasActiveFilters="hasActiveFilters()"
      @update:searchQuery="searchQuery = $event"
      @update:statusFilter="statusFilter = $event"
      @update:severityFilter="severityFilter = $event"
      @update:areaFilter="areaFilter = $event"
      @update:dateFrom="dateFrom = $event"
      @update:dateTo="dateTo = $event"
      @update:sortBy="sortBy = $event"
      @toggleSortOrder="toggleSortOrder"
      @clearAllFilters="clearAllFilters"
      @open-create-bug="openCreateBug"
    />
  </div>

  <BugList
    :filteredBugs="filteredBugs"
    :loading="loading"
    :error="projectsStore.error"
    :searchQuery="searchQuery"
    :statusFilter="statusFilter"
    :severityFilter="severityFilter"
    :areaFilter="areaFilter"
    @retry="projectsStore.fetchBugs(projectId)"
    @clearFilters="clearAllFilters"
  />
</template>
