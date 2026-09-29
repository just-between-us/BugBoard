<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AlertTriangle,
  Bug as BugIcon,
  Inbox,
  Link2,
  Loader2,
  Search,
  Unlink,
  X,
} from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { formatDate, toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { REPORT_STATUS_BADGE, reportStatusLabel, reportStatusOptions } from '@/entities/report'

interface Props {
  bug: Bug
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()

const loading = ref(false)
const loadError = ref<string | null>(null)
const linked = ref<Report[]>([])
const unlinked = ref<Report[]>([])
const actionError = ref<string | null>(null)
const savingId = ref<string | null>(null)

const searchQuery = ref('')
const statusFilter = ref<'all' | Report['status']>('all')

const hasActiveFilters = computed(
  () => searchQuery.value.trim() !== '' || statusFilter.value !== 'all',
)

function matches(report: Report): boolean {
  const query = searchQuery.value.trim().toLowerCase()
  const okQuery =
    !query ||
    report.title.toLowerCase().includes(query) ||
    report.description.toLowerCase().includes(query)
  const okStatus = statusFilter.value === 'all' || report.status === statusFilter.value
  return okQuery && okStatus
}

const filteredLinked = computed(() => linked.value.filter(matches))
const filteredUnlinked = computed(() => unlinked.value.filter(matches))

async function load() {
  loading.value = true
  loadError.value = null
  actionError.value = null
  try {
    const [linkedList, projectReports] = await Promise.all([
      projectsStore.fetchReportsByBug(props.bug.id),
      projectsStore.fetchReports(props.bug.project_id),
    ])
    linked.value = linkedList
    unlinked.value = projectReports.filter((r) => !r.bug_id)
  } catch (e) {
    linked.value = []
    unlinked.value = []
    loadError.value = toUserError(e)
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
}

async function attach(report: Report) {
  if (savingId.value) return
  savingId.value = report.id
  actionError.value = null
  try {
    const updated = await projectsStore.updateReport(report.id, { bug_id: props.bug.id })
    linked.value = [updated, ...linked.value]
    unlinked.value = unlinked.value.filter((r) => r.id !== updated.id)
  } catch (e) {
    actionError.value = toUserError(e)
  } finally {
    savingId.value = null
  }
}

async function detach(report: Report) {
  if (savingId.value) return
  savingId.value = report.id
  actionError.value = null
  try {
    const updated = await projectsStore.updateReport(report.id, { bug_id: null })
    linked.value = linked.value.filter((r) => r.id !== updated.id)
    unlinked.value = [updated, ...unlinked.value]
  } catch (e) {
    actionError.value = toUserError(e)
  } finally {
    savingId.value = null
  }
}

watch(
  () => props.bug.id,
  () => {
    clearFilters()
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <Card class="gap-3">
    <CardContent class="space-y-4">
      <div class="flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 text-sm font-medium">
          <BugIcon class="h-4 w-4 text-muted-foreground" />
          Репорты
        </h2>
        <Badge variant="secondary">{{ linked.length }}</Badge>
      </div>

      <!-- Filters -->
      <div
        v-if="!loading && !loadError && (linked.length > 0 || unlinked.length > 0)"
        class="flex flex-wrap items-center gap-2"
      >
        <div class="relative w-full sm:w-64">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            v-model="searchQuery"
            type="search"
            placeholder="Поиск по репортам..."
            class="pl-10 pr-9"
            aria-label="Поиск по репортам"
          />
          <Button
            v-if="searchQuery"
            variant="ghost"
            size="icon"
            class="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            aria-label="Очистить поиск"
            @click="searchQuery = ''"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>

        <Select v-model="statusFilter">
          <SelectTrigger class="h-8 w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem v-for="opt in reportStatusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          class="h-8 gap-1 px-2 text-xs"
          @click="clearFilters"
        >
          <X class="h-3.5 w-3.5" />
          Сбросить
        </Button>
      </div>

      <p v-if="actionError" class="text-sm text-severity-critical">{{ actionError }}</p>

      <!-- Loading -->
      <div v-if="loading" class="space-y-2" role="status" aria-label="Загрузка репортов">
        <div v-for="i in 2" :key="i" class="h-10 animate-pulse rounded-md border bg-muted/40" />
        <span class="sr-only">Загрузка репортов…</span>
      </div>

      <!-- Error -->
      <div
        v-else-if="loadError"
        class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-3"
      >
        <div class="flex items-center gap-3 text-sm text-severity-critical">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          <span>{{ loadError }}</span>
          <Button variant="ghost" size="sm" class="ml-auto" @click="load">Повторить</Button>
        </div>
      </div>

      <template v-else>
        <!-- Nothing to show -->
        <div
          v-if="linked.length === 0 && unlinked.length === 0"
          class="rounded-md border border-dashed px-6 py-8 text-center"
        >
          <Inbox class="mx-auto h-7 w-7 text-muted-foreground/50" />
          <p class="mt-2 text-sm font-medium">Нет репортов для привязки</p>
          <p class="mt-1 text-xs text-muted-foreground">
            В проекте пока нет свободных репортов — они либо ещё не приходили, либо уже привязаны к
            другим багам.
          </p>
        </div>

        <template v-else>
          <!-- Linked to this bug -->
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Привязано
            </p>

            <div
              v-if="linked.length === 0"
              class="rounded-md border border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
            >
              К багу пока не привязано ни одного репорта
            </div>
            <div
              v-else-if="filteredLinked.length === 0"
              class="rounded-md border border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
            >
              По фильтру ничего не найдено
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="report in filteredLinked"
                :key="report.id"
                class="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                <RouterLink
                  :to="{ name: 'report-view', params: { reportId: report.id } }"
                  class="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {{ report.title }}
                </RouterLink>
                <Badge
                  :class="REPORT_STATUS_BADGE[report.status]"
                  class="shrink-0 text-xs font-medium"
                >
                  {{ reportStatusLabel(report.status) }}
                </Badge>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ formatDate(report.created_at) }}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 shrink-0 gap-1 px-2 text-xs"
                  :disabled="savingId === report.id"
                  @click="detach(report)"
                >
                  <Loader2 v-if="savingId === report.id" class="h-3.5 w-3.5 animate-spin" />
                  <Unlink v-else class="h-3.5 w-3.5" />
                  Отвязать
                </Button>
              </li>
            </ul>
          </div>

          <!-- Free reports -->
          <div class="space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Можно привязать
            </p>

            <div
              v-if="unlinked.length === 0"
              class="rounded-md border border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
            >
              Все свободные репорты уже привязаны к багам
            </div>
            <div
              v-else-if="filteredUnlinked.length === 0"
              class="rounded-md border border-dashed px-4 py-5 text-center text-xs text-muted-foreground"
            >
              По фильтру ничего не найдено
            </div>

            <ul v-else class="space-y-2">
              <li
                v-for="report in filteredUnlinked"
                :key="report.id"
                class="flex flex-wrap items-center gap-2 rounded-md border p-2"
              >
                <RouterLink
                  :to="{ name: 'report-view', params: { reportId: report.id } }"
                  class="min-w-0 flex-1 truncate text-sm font-medium underline-offset-4 hover:underline"
                >
                  {{ report.title }}
                </RouterLink>
                <Badge
                  :class="REPORT_STATUS_BADGE[report.status]"
                  class="shrink-0 text-xs font-medium"
                >
                  {{ reportStatusLabel(report.status) }}
                </Badge>
                <span class="shrink-0 text-xs text-muted-foreground">
                  {{ formatDate(report.created_at) }}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  class="h-7 shrink-0 gap-1 px-2 text-xs"
                  :disabled="savingId === report.id"
                  @click="attach(report)"
                >
                  <Loader2 v-if="savingId === report.id" class="h-3.5 w-3.5 animate-spin" />
                  <Link2 v-else class="h-3.5 w-3.5" />
                  Привязать
                </Button>
              </li>
            </ul>
          </div>
        </template>
      </template>
    </CardContent>
  </Card>
</template>
