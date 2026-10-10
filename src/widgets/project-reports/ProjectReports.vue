<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { MessageSquare, Search, X, ChevronDown, ChevronUp } from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { toUserError } from '@/lib/format'
import { applyIdOrder, loadIdOrder, moveId, saveIdOrder } from '@/lib/localOrder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import ReportFilters from '@/widgets/report-filters/ReportFilters.vue'
import ReportList from '@/widgets/report-list/ReportList.vue'

interface Props {
  projectId: string
  isMember: boolean
  /** true — контекст (вкладка/раздел) уже назван снаружи, заголовок не нужен */
  embedded?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  embedded: false,
})

const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const reports = ref<Report[]>([])
const bugs = ref<Bug[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actionError = ref<string | null>(null)
const savingId = ref<string | null>(null)

const searchQuery = ref('')
const statusFilter = ref<'all' | Report['status']>('all')
const bugFilter = ref<'all' | 'linked' | 'unlinked'>('all')
const sortBy = ref<'created_at' | 'updated_at' | 'manual'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')
// Панель фильтров/сортировки на мобиле скрыта по умолчанию и переключается
// кнопкой-стрелкой в строке поиска; на десктопе всегда видна
const panelOpen = ref(false)
const reportOrder = ref<string[] | null>(null)

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function reportsOrderKey() {
  return `bugboard-reports-order-${props.projectId}`
}

const SOFT_DELETE_MS = 10_000
const pendingDeletes = ref<Record<string, number>>({})
const finalizingDeletes = ref<Record<string, boolean>>({})
const deleteTimers = new Map<string, ReturnType<typeof setTimeout>>()
const inFlightDeletes = new Map<string, Promise<void>>()
let deleteTicker: ReturnType<typeof setInterval> | null = null
const nowTick = ref(Date.now())

const replyTargetId = ref<string | null>(null)
const replyText = ref('')
const replyError = ref<string | null>(null)

const filteredReports = computed(() => {
  let list = [...reports.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    list = list.filter(
      (r) => r.title.toLowerCase().includes(query) || r.description.toLowerCase().includes(query),
    )
  }

  if (statusFilter.value !== 'all') {
    list = list.filter((r) => r.status === statusFilter.value)
  }

  if (bugFilter.value === 'linked') {
    list = list.filter((r) => !!r.bug_id)
  } else if (bugFilter.value === 'unlinked') {
    list = list.filter((r) => !r.bug_id)
  }

  if (sortBy.value === 'manual') {
    return applyIdOrder(list, reportOrder.value, (r) => r.id)
  }

  const key = sortBy.value
  const dir = sortOrder.value === 'asc' ? 1 : -1
  list.sort((a, b) => dir * a[key].localeCompare(b[key]))

  return list
})

const hasActiveFilters = computed(
  () => searchQuery.value !== '' || statusFilter.value !== 'all' || bugFilter.value !== 'all',
)

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function reorderReports(draggedId: string, beforeId: string | null) {
  if (sortBy.value !== 'manual') sortBy.value = 'manual'
  // База — текущий отображаемый порядок: иначе первый drag в режиме дат
  // склеил бы старый сохранённый порядок с новым жестом
  const next = moveId(
    filteredReports.value.map((r) => r.id),
    draggedId,
    beforeId,
  )
  reportOrder.value = next
  saveIdOrder(reportsOrderKey(), next)
}

async function load() {
  actionError.value = null
  await flushPendingDeletes()
  loading.value = true
  error.value = null
  replyTargetId.value = null
  replyError.value = null
  try {
    const [list, bugList] = await Promise.all([
      projectsStore.fetchReports(props.projectId),
      // Баги нужны только для бейджа привязки — он показывается только участникам
      props.isMember ? projectsStore.fetchProjectBugs(props.projectId) : Promise.resolve<Bug[]>([]),
    ])
    reports.value = list
    bugs.value = bugList
    await projectsStore.loadProfiles([
      ...list.map((r) => r.reporter_id),
      ...list.map((r) => r.reply_author_id),
    ])
  } catch (e) {
    error.value = toUserError(e)
    reports.value = []
    bugs.value = []
  } finally {
    loading.value = false
  }
}

async function applyUpdate(report: Report, updates: Partial<Report>): Promise<boolean> {
  if (savingId.value) return false
  if (!authStore.user) {
    actionError.value = 'Требуется вход в аккаунт'
    return false
  }

  savingId.value = report.id
  actionError.value = null
  try {
    const updated = await projectsStore.updateReport(report.id, updates)
    const index = reports.value.findIndex((r) => r.id === report.id)
    if (index !== -1) reports.value[index] = updated
    return true
  } catch (e) {
    actionError.value = toUserError(e)
    return false
  } finally {
    savingId.value = null
  }
}

function setStatus(report: Report, status: Report['status']) {
  if (report.status === status) return
  void applyUpdate(report, { status })
}

function setFlag(report: Report, flag: Report['flag']) {
  if (report.flag === flag) return
  void applyUpdate(report, { flag })
}

function openReply(report: Report) {
  actionError.value = null
  replyError.value = null
  replyTargetId.value = report.id
  replyText.value = report.reply ?? ''
}

function cancelReply() {
  replyTargetId.value = null
  replyText.value = ''
  replyError.value = null
  actionError.value = null
}

async function saveReply(report: Report) {
  const text = replyText.value.trim()
  if (!text) {
    replyError.value = 'Ответ не может быть пустым'
    return
  }
  replyError.value = null

  const saved = await applyUpdate(report, {
    reply: text,
    reply_author_id: authStore.user?.id ?? null,
    replied_at: new Date().toISOString(),
  })
  if (saved) cancelReply()
}

async function removeReply(report: Report) {
  const removed = await applyUpdate(report, {
    reply: null,
    reply_author_id: null,
    replied_at: null,
  })
  if (removed) cancelReply()
}

function clearFilters() {
  searchQuery.value = ''
  statusFilter.value = 'all'
  bugFilter.value = 'all'
  sortBy.value = 'created_at'
  sortOrder.value = 'desc'
}

function omitKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
  const copy = { ...obj }
  delete copy[key]
  return copy
}

function ensureTicker() {
  if (deleteTicker) return
  deleteTicker = setInterval(() => {
    nowTick.value = Date.now()
  }, 500)
}

function stopTickerIfIdle() {
  if (deleteTicker && Object.keys(pendingDeletes.value).length === 0) {
    clearInterval(deleteTicker)
    deleteTicker = null
  }
}

function startSoftDelete(report: Report) {
  if (pendingDeletes.value[report.id] !== undefined || finalizingDeletes.value[report.id]) return
  if (replyTargetId.value === report.id) cancelReply()
  pendingDeletes.value = {
    ...pendingDeletes.value,
    [report.id]: Date.now() + SOFT_DELETE_MS,
  }
  const timer = setTimeout(() => void finalizeDelete(report.id), SOFT_DELETE_MS)
  deleteTimers.set(report.id, timer)
  ensureTicker()
}

function cancelSoftDelete(id: string) {
  const timer = deleteTimers.get(id)
  if (timer) clearTimeout(timer)
  deleteTimers.delete(id)
  pendingDeletes.value = omitKey(pendingDeletes.value, id)
  stopTickerIfIdle()
}

function finalizeDelete(id: string): Promise<void> {
  const existing = inFlightDeletes.get(id)
  if (existing) return existing

  const timer = deleteTimers.get(id)
  if (timer) clearTimeout(timer)
  deleteTimers.delete(id)
  pendingDeletes.value = omitKey(pendingDeletes.value, id)
  finalizingDeletes.value = { ...finalizingDeletes.value, [id]: true }

  const run = (async () => {
    try {
      await projectsStore.updateReport(id, { is_deleted: true })
      reports.value = reports.value.filter((r) => r.id !== id)
      void projectsStore.fetchTabsCounts(props.projectId)
    } catch (e) {
      actionError.value = toUserError(e)
    } finally {
      finalizingDeletes.value = omitKey(finalizingDeletes.value, id)
      stopTickerIfIdle()
    }
  })()

  inFlightDeletes.set(id, run)
  void run.finally(() => inFlightDeletes.delete(id))
  return run
}

async function flushPendingDeletes() {
  const ids = new Set([...Object.keys(pendingDeletes.value), ...inFlightDeletes.keys()])
  if (ids.size === 0) return
  await Promise.all([...ids].map((id) => finalizeDelete(id)))
}

watch(
  () => props.projectId,
  () => {
    reportOrder.value = loadIdOrder(reportsOrderKey())
    // Сохранённый порядок существует — по умолчанию показываем его
    if (reportOrder.value) sortBy.value = 'manual'
    void load()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  for (const timer of deleteTimers.values()) clearTimeout(timer)
  deleteTimers.clear()
  if (deleteTicker) {
    clearInterval(deleteTicker)
    deleteTicker = null
  }
  const ids = new Set([...Object.keys(pendingDeletes.value), ...inFlightDeletes.keys()])
  for (const id of ids) void finalizeDelete(id)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Header: во вкладках/разделах заголовок дублирует контекст — остаётся только поиск -->
    <div
      v-if="!embedded || reports.length > 0"
      class="flex flex-wrap items-center gap-3"
      :class="embedded ? 'justify-end' : 'justify-between'"
    >
      <h3 v-if="!embedded" class="flex items-center gap-2 text-lg font-medium">
        <MessageSquare class="h-5 w-5 text-muted-foreground" />
        Репорты
        <Badge v-if="!loading && !error" variant="secondary">{{ reports.length }}</Badge>
      </h3>

      <div v-if="reports.length > 0" class="flex w-full items-center gap-2">
        <div class="relative min-w-0 flex-1">
          <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Поиск по репортам..."
            v-model="searchQuery"
            class="pl-10 pr-9"
            aria-label="Поиск по репортам"
          />
          <Button
            v-if="searchQuery"
            variant="ghost"
            size="icon"
            class="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
            @click="searchQuery = ''"
            aria-label="Очистить поиск"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
        <!-- Мобиле: кнопка-стрелка открывает/закрывает панель фильтров и сортировки -->
        <Button
          variant="outline"
          size="icon-sm"
          class="shrink-0 sm:hidden"
          @click="togglePanel"
          :aria-expanded="panelOpen"
          aria-label="Фильтры и сортировка"
        >
          <ChevronUp v-if="panelOpen" class="h-4 w-4" />
          <ChevronDown v-else class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Не участник команды видит только свои репорты -->
    <p v-if="!isMember && reports.length > 0" class="text-xs text-muted-foreground">
      Показаны только ваши репорты — баги и остальные репорты видит команда проекта.
    </p>

    <!-- Filters & sorting -->
    <ReportFilters
      v-if="reports.length > 0"
      :statusFilter="statusFilter"
      :bugFilter="bugFilter"
      :sortBy="sortBy"
      :sortOrder="sortOrder"
      :isMember="isMember"
      :hasActiveFilters="hasActiveFilters"
      :panelOpen="panelOpen"
      @update:statusFilter="statusFilter = $event"
      @update:bugFilter="bugFilter = $event"
      @update:sortBy="sortBy = $event"
      @toggleSortOrder="toggleSortOrder"
      @clearAllFilters="clearFilters"
    />

    <p v-if="actionError" class="text-sm text-severity-critical">{{ actionError }}</p>

    <!-- List: loading / error / empty / reports -->
    <ReportList
      :reports="filteredReports"
      :total-reports="reports.length"
      :loading="loading"
      :error="error"
      :is-member="isMember"
      :bugs="bugs"
      :now="nowTick"
      :saving-id="savingId"
      :reply-target-id="replyTargetId"
      :reply-text="replyText"
      :reply-error="replyError"
      :pending-deletes="pendingDeletes"
      :finalizing-deletes="finalizingDeletes"
      :reorderable="isMember && !hasActiveFilters"
      @retry="load"
      @clearFilters="clearFilters"
      @set-status="setStatus"
      @set-flag="setFlag"
      @open-reply="openReply"
      @update:replyText="replyText = $event"
      @cancel-reply="cancelReply"
      @save-reply="saveReply"
      @remove-reply="removeReply"
      @start-delete="startSoftDelete"
      @cancel-delete="cancelSoftDelete"
      @reorder="reorderReports"
    />
  </div>
</template>
