<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  ArrowUpDown,
  Bug as BugIcon,
  Check,
  ChevronsUpDown,
  Eye,
  Inbox,
  Loader2,
  MessageSquare,
  Reply,
  Search,
  Trash2,
  Undo2,
  X,
} from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { formatDate, toUserError } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/avatar'
import { CopyButton } from '@/components/copy-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  REPORT_FLAG_ICON,
  REPORT_STATUS_BADGE,
  REPORT_STATUS_DOT,
  reportFlagOptions,
  reportStatusLabel,
  reportStatusOptions,
} from '@/entities/report'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
  isMember: boolean
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()
const authStore = useAuthStore()
const router = useRouter()

const reports = ref<Report[]>([])
const bugs = ref<Bug[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const actionError = ref<string | null>(null)
const savingId = ref<string | null>(null)

const searchQuery = ref('')
const statusFilter = ref<'all' | Report['status']>('all')
const bugFilter = ref<'all' | 'linked' | 'unlinked'>('all')
const sortBy = ref<'created_at' | 'updated_at'>('created_at')
const sortOrder = ref<'asc' | 'desc'>('desc')

const sortOptions = [
  { value: 'created_at', label: 'Дата создания' },
  { value: 'updated_at', label: 'Дата обновления' },
] as const

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

  const key = sortBy.value
  const dir = sortOrder.value === 'asc' ? 1 : -1
  list.sort((a, b) => dir * a[key].localeCompare(b[key]))

  return list
})

const hasActiveFilters = computed(
  () => searchQuery.value !== '' || statusFilter.value !== 'all' || bugFilter.value !== 'all',
)

const bugFilterLabel = computed(() =>
  bugFilter.value === 'linked' ? 'Привязаны к багу' : 'Без привязки',
)

function toggleSortOrder() {
  sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
}

function reporterName(id: string): string {
  return projectsStore.profiles[id]?.display_name ?? 'Репортёр'
}

function reporterAvatar(id: string): string | null {
  return projectsStore.profiles[id]?.avatar_url ?? null
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

const bugsById = computed(() => {
  const map = new Map<string, Bug>()
  for (const bug of bugs.value) map.set(bug.id, bug)
  return map
})

function bugTitleFor(report: Report): string | null {
  if (!report.bug_id) return null
  return bugsById.value.get(report.bug_id)?.title ?? null
}

function openBug(report: Report) {
  if (!report.bug_id) return
  void router.push({
    name: 'bug-detail',
    params: { projectId: report.project_id, bugId: report.bug_id },
  })
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

function deleteSecondsLeft(id: string): number {
  const deleteAt = pendingDeletes.value[id]
  if (deleteAt === undefined) return 0
  return Math.max(0, Math.ceil((deleteAt - nowTick.value) / 1000))
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
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-lg font-medium">
        <MessageSquare class="h-5 w-5 text-muted-foreground" />
        Репорты
        <Badge v-if="!loading && !error" variant="secondary">{{ reports.length }}</Badge>
      </h3>

      <div v-if="reports.length > 0" class="relative w-full sm:w-64">
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
    </div>

    <!-- Не участник команды видит только свои репорты -->
    <p v-if="!isMember && reports.length > 0" class="text-xs text-muted-foreground">
      Показаны только ваши репорты — баги и остальные репорты видит команда проекта.
    </p>

    <!-- Filters & sorting -->
    <div v-if="reports.length > 0" class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <div
          v-if="statusFilter !== 'all'"
          class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
        >
          <span class="text-sm font-medium">{{ reportStatusLabel(statusFilter) }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="statusFilter = 'all'"
            aria-label="Сбросить фильтр статуса"
          >
            <X class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div v-else>
          <Select v-model="statusFilter">
            <SelectTrigger>
              <SelectValue placeholder="Статус" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem v-for="opt in reportStatusOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          v-if="isMember && bugFilter !== 'all'"
          class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
        >
          <span class="text-sm font-medium">{{ bugFilterLabel }}</span>
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6"
            @click="bugFilter = 'all'"
            aria-label="Сбросить фильтр привязки"
          >
            <X class="h-3.5 w-3.5" />
          </Button>
        </div>
        <div v-else-if="isMember">
          <Select v-model="bugFilter">
            <SelectTrigger>
              <SelectValue placeholder="Привязка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все репорты</SelectItem>
              <SelectItem value="linked">Привязаны к багу</SelectItem>
              <SelectItem value="unlinked">Без привязки</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center gap-1">
          <Select v-model="sortBy">
            <SelectTrigger>
              <SelectValue placeholder="Сортировка" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            class="h-8 w-8"
            @click="toggleSortOrder"
            :aria-label="sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'"
          >
            <ArrowUpDown class="h-4 w-4" />
            <span class="sr-only">
              {{ sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию' }}
            </span>
          </Button>
        </div>
      </div>

      <Button v-if="hasActiveFilters" variant="destructive" size="sm" @click="clearFilters">
        <X class="h-4 w-4 mr-1" />
        Сбросить всё
      </Button>
    </div>

    <p v-if="actionError" class="text-sm text-severity-critical">{{ actionError }}</p>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3" role="status" aria-label="Загрузка репортов">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-lg border p-4">
        <div class="flex items-center gap-3">
          <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 rounded bg-muted" />
            <div class="h-3 w-64 rounded bg-muted" />
          </div>
        </div>
        <div class="mt-3 h-3 w-full rounded bg-muted" />
      </div>
      <span class="sr-only">Загрузка репортов…</span>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>{{ error }}</span>
        <Button variant="ghost" size="sm" class="ml-auto" @click="load">Повторить</Button>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="reports.length === 0"
      class="rounded-lg border border-dashed px-6 py-10 text-center"
    >
      <Inbox class="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p class="mt-2 text-sm font-medium">Репортов пока нет</p>
      <p class="mt-1 text-xs text-muted-foreground">
        {{
          isMember
            ? 'Отправьте репортёрам ссылку из шапки проекта — репорты появятся здесь.'
            : 'Здесь появятся ваши репорты — баг можно отправить по ссылке из шапки проекта.'
        }}
      </p>
    </div>

    <!-- Filtered empty -->
    <div
      v-else-if="filteredReports.length === 0"
      class="rounded-lg border border-dashed px-6 py-10 text-center"
    >
      <Search class="mx-auto h-8 w-8 text-muted-foreground/50" />
      <p class="mt-2 text-sm font-medium">Ничего не найдено</p>
      <Button variant="outline" size="sm" class="mt-3" @click="clearFilters">
        Сбросить фильтры
      </Button>
    </div>

    <!-- Reports list -->
    <div v-else class="space-y-3">
      <div v-for="report in filteredReports" :key="report.id" class="relative rounded-lg">
        <div
          class="block rounded-lg border p-4 transition hover:border-primary/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
        >
          <article>
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <Avatar
                  class="h-8 w-8 text-xs"
                  :name="reporterName(report.reporter_id)"
                  :src="reporterAvatar(report.reporter_id)"
                  :to="{ name: 'user-profile', params: { userId: report.reporter_id } }"
                />
                <div class="min-w-0">
                  <RouterLink
                    :to="{ name: 'user-profile', params: { userId: report.reporter_id } }"
                    class="block truncate text-sm font-medium hover:underline underline-offset-4"
                  >
                    {{ reporterName(report.reporter_id) }}
                  </RouterLink>
                  <p class="text-xs text-muted-foreground">{{ formatDate(report.created_at) }}</p>
                  <span v-if="isMember" class="mt-0.5 flex min-w-0 items-center gap-0.5">
                    <span class="truncate font-mono text-xs text-muted-foreground">
                      ID: {{ report.id }}
                    </span>
                    <CopyButton
                      @click.stop
                      :text="report.id"
                      label="Копировать ID репорта"
                      feedback="ID скопирован"
                      icon-class="h-3 w-3"
                    />
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-1.5" @click.stop>
                <template v-if="isMember">
                  <!-- Status -->
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      :class="
                        cn(buttonVariants({ variant: 'outline' }), 'h-7 gap-1.5 px-2 text-xs')
                      "
                      :disabled="savingId === report.id"
                    >
                      <span
                        class="h-2 w-2 shrink-0 rounded-full"
                        :class="REPORT_STATUS_DOT[report.status]"
                      />
                      {{ reportStatusLabel(report.status) }}
                      <ChevronsUpDown class="h-3 w-3 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem
                        v-for="opt in reportStatusOptions"
                        :key="opt.value"
                        :disabled="savingId === report.id"
                        @click="setStatus(report, opt.value as Report['status'])"
                      >
                        <span
                          class="h-2 mr-2 w-2 shrink-0 rounded-full"
                          :class="REPORT_STATUS_DOT[opt.value]"
                        />
                        {{ opt.label }}
                        <Check v-if="report.status === opt.value" class="ml-auto h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <!-- Flag -->
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      :class="
                        cn(buttonVariants({ variant: 'outline' }), 'h-7 gap-1.5 px-2 text-xs')
                      "
                      :disabled="savingId === report.id"
                      :title="reportStatusLabel(report.flag)"
                      :aria-label="`Флаг: ${reportStatusLabel(report.flag)}`"
                    >
                      <component :is="REPORT_FLAG_ICON[report.flag]" class="h-3.5 w-3.5" />
                      {{ reportStatusLabel(report.flag) }}
                      <ChevronsUpDown class="h-3 w-3 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="w-44">
                      <DropdownMenuItem
                        v-for="opt in reportFlagOptions"
                        :key="opt.value"
                        :disabled="savingId === report.id"
                        @click="setFlag(report, opt.value as Report['flag'])"
                      >
                        <component
                          :is="REPORT_FLAG_ICON[opt.value]"
                          class="mr-2 h-4 w-4 shrink-0"
                        />
                        {{ opt.label }}
                        <Check v-if="report.flag === opt.value" class="ml-auto h-4 w-4" />
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Loader2
                    v-if="savingId === report.id"
                    class="h-4 w-4 animate-spin text-muted-foreground"
                  />
                </template>

                <Badge
                  v-else
                  :class="REPORT_STATUS_BADGE[report.status]"
                  class="text-xs font-medium"
                >
                  {{ reportStatusLabel(report.status) }}
                </Badge>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
              <RouterLink
                :to="{ name: 'report-view', params: { reportId: report.id } }"
                class="pt-3 pb-1 w-full font-medium hover:underline underline-offset-4"
              >
                <div class="w-full font-medium hover:underline underline-offset-4">
                  {{ report.title }}
                </div>
                <div
                  class="mt-1 w-full block text-sm whitespace-pre-line text-muted-foreground hover:underline underline-offset-4"
                >
                  {{ report.description }}
                </div>
              </RouterLink>
              <div
                v-if="isMember && report.bug_id && bugTitleFor(report)"
                class="flex items-center gap-1.5"
              >
                <button
                  type="button"
                  class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:border-ring focus-visible:outline-none"
                  title="Открыть баг"
                  @click.stop="openBug(report)"
                >
                  <BugIcon class="h-3 w-3 shrink-0" />
                  <span class="truncate"> Привязан к: {{ bugTitleFor(report) }}</span>
                </button>
              </div>
              <span
                v-else-if="isMember && report.bug_id"
                class="inline-flex items-center gap-1 rounded-md border border-dashed bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
                title="Баг удалён"
              >
                <BugIcon class="h-3 w-3 shrink-0" />
                Баг удалён
              </span>
            </div>

            <!-- Reply -->
            <div
              v-if="replyTargetId === report.id"
              class="mt-3 space-y-2 rounded-md border p-3"
              role="group"
              aria-label="Ответ репортёру"
              @click.stop
            >
              <p class="text-xs font-medium text-muted-foreground">
                Ответ репортёру — его увидит только автор репорта
              </p>
              <Textarea
                v-model="replyText"
                :rows="3"
                maxlength="2000"
                placeholder="Что ответить репортёру?"
                class="text-sm"
                :disabled="savingId === report.id"
              />
              <p v-if="replyError" class="text-xs text-severity-critical">{{ replyError }}</p>
              <div class="flex flex-wrap gap-1.5">
                <Button
                  size="xs"
                  :disabled="savingId === report.id || !replyText.trim()"
                  @click="saveReply(report)"
                >
                  <Loader2 v-if="savingId === report.id" class="h-3 w-3 animate-spin" />
                  {{ savingId === report.id ? 'Сохраняем…' : 'Отправить ответ' }}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  :disabled="savingId === report.id"
                  @click="cancelReply"
                >
                  Отмена
                </Button>
              </div>
            </div>

            <div
              v-else-if="report.reply"
              class="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3"
              @click.stop
            >
              <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <Reply class="h-3 w-3" />
                Ответ
                {{
                  report.reply_author_id ? projectsStore.profileName(report.reply_author_id) : ''
                }}
                <span v-if="report.replied_at">· {{ formatDate(report.replied_at) }}</span>
              </p>
              <p class="mt-1.5 text-sm whitespace-pre-line">{{ report.reply }}</p>
              <div v-if="isMember" class="mt-2 flex flex-wrap gap-1">
                <Button
                  size="xs"
                  variant="ghost"
                  :disabled="savingId === report.id"
                  @click="openReply(report)"
                >
                  Изменить
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  class="text-severity-critical"
                  :disabled="savingId === report.id"
                  @click="removeReply(report)"
                >
                  Удалить ответ
                </Button>
              </div>
            </div>

            <!-- Bottom actions -->
            <div
              v-if="isMember"
              class="mt-3 flex flex-wrap items-center justify-between gap-2"
              @click.stop
            >
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  v-if="replyTargetId !== report.id && !report.reply"
                  variant="outline"
                  size="sm"
                  class="h-8 gap-1.5"
                  :disabled="savingId === report.id"
                  @click="openReply(report)"
                >
                  <Reply class="h-3.5 w-3.5" />
                  Ответить репортёру
                </Button>
                <RouterLink
                  :to="{ name: 'report-view', params: { reportId: report.id } }"
                  :class="
                    cn(
                      buttonVariants({ variant: 'ghost' }),
                      'h-8 gap-1.5 text-muted-foreground hover:text-foreground',
                    )
                  "
                >
                  <Eye class="h-3.5 w-3.5" />
                  Детали
                </RouterLink>
              </div>
              <Button
                v-if="!(report.id in pendingDeletes) && !finalizingDeletes[report.id]"
                type="button"
                size="sm"
                variant="destructive"
                class="h-8 gap-1.5"
                :disabled="savingId === report.id"
                @click="startSoftDelete(report)"
              >
                <Trash2 class="h-3.5 w-3.5" />
                Удалить
              </Button>
            </div>
          </article>
        </div>

        <!-- Skeleton overlay while the report is pending deletion -->
        <div
          v-if="report.id in pendingDeletes || finalizingDeletes[report.id]"
          aria-hidden="true"
          class="absolute inset-0 z-10 animate-pulse rounded-lg border bg-muted/70 backdrop-blur-[1px]"
        />

        <!-- Actions above the overlay -->
        <div
          v-if="report.id in pendingDeletes || finalizingDeletes[report.id]"
          class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
        >
          <Button
            v-if="report.id in pendingDeletes"
            type="button"
            size="sm"
            class="pointer-events-auto gap-1.5 bg-green-600 text-white shadow-md hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
            @click.stop="cancelSoftDelete(report.id)"
          >
            <Undo2 class="h-4 w-4" />
            Восстановить ({{ deleteSecondsLeft(report.id) }})
          </Button>
          <Button
            v-else
            type="button"
            size="sm"
            variant="destructive"
            class="pointer-events-auto gap-1.5 shadow-md"
            disabled
          >
            <Loader2 class="h-4 w-4 animate-spin" />
            Удаляем…
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
