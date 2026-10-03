<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ChartColumn, Loader2 } from '@lucide/vue'
import type { Bug, ProjectMember, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  SEVERITY_VALUES,
  STATUS_VALUES,
  optionLabel,
  severityOptions,
  statusOptions,
} from '@/entities/bug'
import { FALLBACK_COLOR, SEVERITY_CHART_COLOR, STATUS_CHART_COLOR } from './chart-colors'
import StatsRadialCard from './StatsRadialCard.vue'
import StatusBarCard from './StatusBarCard.vue'
import MembersCard from './MembersCard.vue'
import ReportsProgressCard from './ReportsProgressCard.vue'
import AreaDistributionCard from './AreaDistributionCard.vue'
import TimelineCard from './TimelineCard.vue'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()

const bugs = ref<Bug[]>([])
const members = ref<ProjectMember[]>([])
const reports = ref<Report[]>([])

const loading = ref(false)
const error = ref<string | null>(null)

const criticalCount = computed(() => bugs.value.filter((b) => b.severity === 'critical').length)
const openCount = computed(() => bugs.value.filter((b) => b.status !== 'fixed').length)
const fixedCount = computed(() => bugs.value.filter((b) => b.status === 'fixed').length)

const severityRows = computed(() =>
  SEVERITY_VALUES.map((value) => ({
    key: value,
    label: optionLabel(severityOptions, value),
    count: bugs.value.filter((b) => b.severity === value).length,
    fill: SEVERITY_CHART_COLOR[value] ?? FALLBACK_COLOR,
  })),
)

const statusRows = computed(() =>
  STATUS_VALUES.map((value) => ({
    key: value,
    label: optionLabel(statusOptions, value),
    count: bugs.value.filter((b) => b.status === value).length,
    fill: STATUS_CHART_COLOR[value] ?? FALLBACK_COLOR,
  })),
)

async function load() {
  loading.value = true
  error.value = null
  try {
    const [bugList, memberList, reportList] = await Promise.all([
      projectsStore.fetchProjectBugs(props.projectId),
      projectsStore.fetchProjectMembers(props.projectId),
      projectsStore.fetchReports(props.projectId),
    ])
    bugs.value = bugList
    members.value = memberList
    reports.value = reportList
  } catch (e) {
    error.value = toUserError(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.projectId,
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-lg font-medium">
        <ChartColumn class="h-5 w-5 text-muted-foreground" />
        Статистика
      </h3>
      <p v-if="!loading && !error" class="text-xs text-muted-foreground">
        Только для участников проекта
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4" role="status" aria-label="Загрузка статистики">
      <div class="grid gap-4 lg:grid-cols-2">
        <div class="animate-pulse rounded-xl border p-6">
          <div class="h-4 w-40 rounded bg-muted" />
          <div class="mt-4 h-56 rounded bg-muted" />
        </div>
        <div class="animate-pulse rounded-xl border p-6">
          <div class="h-4 w-32 rounded bg-muted" />
          <div class="mt-4 h-56 rounded bg-muted" />
        </div>
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <div class="animate-pulse rounded-xl border p-6">
          <div class="h-4 w-44 rounded bg-muted" />
          <div class="mt-4 h-48 rounded bg-muted" />
        </div>
        <div class="animate-pulse rounded-xl border p-6 lg:col-span-2">
          <div class="h-4 w-40 rounded bg-muted" />
          <div class="mt-4 h-48 rounded bg-muted" />
        </div>
      </div>
      <div class="animate-pulse rounded-xl border p-6">
        <div class="h-4 w-48 rounded bg-muted" />
        <div class="mt-4 h-56 rounded bg-muted" />
      </div>
      <span class="sr-only">Загрузка статистики…</span>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>{{ error }}</span>
        <Button variant="ghost" size="sm" class="ml-auto" @click="load">
          <Loader2 class="h-4 w-4" />
          Повторить
        </Button>
      </div>
    </div>

    <!-- Ready -->
    <div v-else class="space-y-4">
      <div class="grid gap-4 sm:grid-cols-2 lg:col-span-2">
        <MembersCard class="min-w-0" :count="members.length" :project-id="projectId" />
        <ReportsProgressCard class="min-w-0" :count="reports.length" :project-id="projectId" />
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <StatsRadialCard
          class="min-w-0"
          :total="bugs.length"
          :critical="criticalCount"
          :open="openCount"
          :fixed="fixedCount"
          :severity="severityRows"
        />
        <StatusBarCard class="min-w-0" :rows="statusRows" />
        <AreaDistributionCard v-if="bugs.length > 0" class="min-w-0" :bugs="bugs" />
      </div>

      <TimelineCard :bugs="bugs" :reports="reports" />
    </div>
  </div>
</template>
