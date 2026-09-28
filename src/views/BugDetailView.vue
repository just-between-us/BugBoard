<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft,
  ShieldAlert,
  SearchX,
  Lock,
  AlertTriangle,
  Check,
  Loader2,
  MessageSquare,
  Send,
  MoreHorizontal,
  Trash2,
  ChevronsUpDown,
  Pencil,
  Undo2,
  UserRound,
  Database,
  Monitor,
  Shield,
  Server,
  Activity,
  HelpCircle,
  Eye,
  Pin,
  CheckCircle,
} from '@lucide/vue'
import { useProjectsStore, type Bug, type BugComment, type ProfileSummary } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CopyButton } from '@/components/copy-button'

type PageState = 'loading' | 'ready' | 'no-project' | 'no-bug' | 'no-access' | 'error'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const projectId = computed<string>(() => route.params.projectId as string)
const bugId = computed<string>(() => route.params.bugId as string)

const state = ref<PageState>('loading')
const pageError = ref<string | null>(null)
const bug = ref<Bug | null>(null)
const profiles = ref<Record<string, ProfileSummary>>({})

const commentsError = ref<string | null>(null)
const commentText = ref('')
const commentSubmitting = ref(false)
const commentError = ref<string | null>(null)
const commentSaving = ref(false)
const commentActionError = ref<string | null>(null)
const editingCommentId = ref<string | null>(null)
const commentDraft = ref('')
const commentTextareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null)
const deleteTarget = ref<BugComment | null>(null)
const deleteSaving = ref(false)

const attrSaving = ref(false)
const attrError = ref<string | null>(null)
const errorContext = ref<'title' | 'description' | 'attributes' | null>(null)
const savedFlash = ref(false)

const original = ref<{ title: string; description: string | null; created_by: string } | null>(null)
const editingTitle = ref(false)
const editingDescription = ref(false)
const titleDraft = ref('')
const descriptionDraft = ref('')
const titleDraftLength = computed(() => titleDraft.value.replace(/\s+/g, ' ').trim().length)
const titleInputRef = ref<{ $el: HTMLTextAreaElement } | null>(null)
const descriptionInputRef = ref<{ $el: HTMLTextAreaElement } | null>(null)
const members = ref<{ user_id: string; name: string; role: string }[]>([])

const project = computed(() => projectsStore.currentProject)
const comments = computed(() => projectsStore.comments)

const isDirty = computed(() => {
  if (!bug.value || !original.value) return false
  return (
    bug.value.title !== original.value.title ||
    (bug.value.description ?? null) !== original.value.description ||
    bug.value.created_by !== original.value.created_by
  )
})

const canRevert = computed(() => isDirty.value || editingTitle.value || editingDescription.value)

const STATUS_VALUES = ['discovered', 'confirmed', 'in_progress', 'fixed'] as const
const SEVERITY_VALUES = ['critical', 'major', 'minor'] as const
const AREA_VALUES = ['database', 'ui', 'auth', 'api', 'performance', 'other'] as const

const statusOptions = [
  { value: 'discovered', label: 'Обнаружен' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'fixed', label: 'Исправлен' },
] as const

const severityOptions = [
  { value: 'critical', label: 'Критический' },
  { value: 'major', label: 'Мажорный' },
  { value: 'minor', label: 'Минорный' },
] as const

const areaOptions = [
  { value: 'database', label: 'База данных' },
  { value: 'ui', label: 'UI/Фронтенд' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'api', label: 'API/Бэкенд' },
  { value: 'performance', label: 'Производительность' },
  { value: 'other', label: 'Другое' },
] as const

function optionLabel(options: readonly { value: string; label: string }[], value: string): string {
  return options.find((opt) => opt.value === value)?.label ?? value
}

const STATUS_BADGE: Record<string, string> = {
  discovered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  fixed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-severity-critical/15 text-severity-critical',
  major: 'bg-severity-major/15 text-severity-major',
  minor: 'bg-severity-minor/15 text-severity-minor',
}

const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-severity-critical',
  major: 'bg-severity-major',
  minor: 'bg-severity-minor',
}

function statusIcon(status: string): Component {
  const icons: Record<string, Component> = {
    discovered: Eye,
    confirmed: Pin,
    in_progress: Loader2,
    fixed: CheckCircle,
  }
  return icons[status] ?? HelpCircle
}

function areaIcon(area: string): Component {
  const icons: Record<string, Component> = {
    database: Database,
    ui: Monitor,
    auth: Shield,
    api: Server,
    performance: Activity,
    other: HelpCircle,
  }
  return icons[area] ?? HelpCircle
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isNewBug(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 1000 * 60 * 60 * 24
}

function authorName(id: string): string {
  return profiles.value[id]?.display_name ?? 'Участник'
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const result = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return result || '?'
}

function toUserError(e: unknown): string {
  const code =
    typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: unknown }).code : undefined
  const message = e instanceof Error ? e.message : ''
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Недостаточно прав: вы не участник проекта.'
  }
  return message || 'Произошла ошибка. Попробуйте ещё раз.'
}

async function loadProfiles() {
  const ids = [bug.value?.created_by, ...projectsStore.comments.map((c) => c.author_id)].filter(
    (id): id is string => !!id,
  )
  const fetched = await projectsStore.fetchProfiles(ids)
  profiles.value = { ...profiles.value, ...fetched }
}

async function loadMembers() {
  members.value = []
  try {
    const list = await projectsStore.fetchProjectMembers(projectId.value)
    const fetched = await projectsStore.fetchProfiles(list.map((m) => m.user_id))
    profiles.value = { ...profiles.value, ...fetched }
    members.value = list.map((m) => ({
      user_id: m.user_id,
      name: fetched[m.user_id]?.display_name ?? 'Участник',
      role: m.role,
    }))
  } catch {
    members.value = []
  }
}

async function loadComments() {
  commentsError.value = null
  try {
    await projectsStore.fetchComments(bugId.value)
    await loadProfiles()
  } catch (e) {
    commentsError.value = toUserError(e)
  }
}

async function load() {
  state.value = 'loading'
  pageError.value = null
  bug.value = null
  profiles.value = {}
  commentText.value = ''
  commentError.value = null
  commentsError.value = null
  commentActionError.value = null
  editingCommentId.value = null
  commentDraft.value = ''
  deleteTarget.value = null
  attrError.value = null
  errorContext.value = null
  original.value = null
  members.value = []
  editingTitle.value = false
  editingDescription.value = false
  projectsStore.clearError()

  try {
    const visibleProject = await projectsStore.fetchProjectIfVisible(projectId.value)

    if (!visibleProject) {
      state.value = 'no-project'
      return
    }

    const [isMember, visibleBug] = await Promise.all([
      projectsStore.isProjectMember(projectId.value),
      projectsStore.fetchBugInProject(projectId.value, bugId.value),
    ])

    if (!visibleBug) {
      state.value = isMember ? 'no-bug' : 'no-access'
      return
    }

    bug.value = visibleBug
    original.value = {
      title: visibleBug.title,
      description: visibleBug.description ?? null,
      created_by: visibleBug.created_by,
    }
    state.value = 'ready'
    await loadComments()
    await loadMembers()
  } catch (e) {
    pageError.value = toUserError(e)
    state.value = 'error'
  }
}

async function patchBug(
  updates: Partial<Bug>,
  context: 'title' | 'description' | 'attributes' = 'attributes',
): Promise<boolean> {
  if (!bug.value) return false
  const previous = bug.value

  bug.value = { ...bug.value, ...updates }
  attrSaving.value = true
  attrError.value = null
  errorContext.value = null

  try {
    bug.value = await projectsStore.updateBug(previous.id, updates)
    flashSaved()
    return true
  } catch (e) {
    bug.value = previous
    attrError.value = toUserError(e)
    errorContext.value = context
    projectsStore.clearError()
    return false
  } finally {
    attrSaving.value = false
  }
}

function onStatusChange(value: unknown) {
  if (isOneOf(value, STATUS_VALUES)) patchBug({ status: value })
}

function onSeverityChange(value: unknown) {
  if (isOneOf(value, SEVERITY_VALUES)) patchBug({ severity: value })
}

function onAreaChange(value: unknown) {
  if (isOneOf(value, AREA_VALUES)) patchBug({ area: value })
}

function autoGrowTitle() {
  const el = titleInputRef.value?.$el
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function startEditTitle() {
  if (!bug.value || attrSaving.value) return
  titleDraft.value = bug.value.title
  editingTitle.value = true
  void nextTick(() => {
    const el = titleInputRef.value?.$el
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    autoGrowTitle()
  })
}

function cancelEditTitle() {
  editingTitle.value = false
  titleDraft.value = ''
}

async function confirmEditTitle() {
  const value = titleDraft.value.replace(/\s+/g, ' ').trim()
  if (!value || !bug.value || value === bug.value.title) {
    cancelEditTitle()
    return
  }
  if (await patchBug({ title: value }, 'title')) cancelEditTitle()
}

function startEditDescription() {
  if (!bug.value || attrSaving.value) return
  descriptionDraft.value = bug.value.description ?? ''
  editingDescription.value = true
  void nextTick(() => descriptionInputRef.value?.$el.focus())
}

function cancelEditDescription() {
  editingDescription.value = false
  descriptionDraft.value = ''
}

async function confirmEditDescription() {
  if (!bug.value) {
    cancelEditDescription()
    return
  }
  const raw = descriptionDraft.value
  const normalized = raw.trim() === '' ? null : raw
  if (normalized === (bug.value.description ?? null)) {
    cancelEditDescription()
    return
  }
  if (await patchBug({ description: normalized }, 'description')) cancelEditDescription()
}

async function changeAuthor(userId: string) {
  if (!bug.value || userId === bug.value.created_by || attrSaving.value) return
  await patchBug({ created_by: userId })
}

async function revertChanges() {
  if (!bug.value || !original.value || attrSaving.value) return
  editingTitle.value = false
  editingDescription.value = false
  if (isDirty.value) {
    await patchBug({
      title: original.value.title,
      description: original.value.description,
      created_by: original.value.created_by,
    })
  }
}

let savedTimer: ReturnType<typeof setTimeout> | undefined

function flashSaved() {
  savedFlash.value = true
  if (savedTimer) clearTimeout(savedTimer)
  savedTimer = setTimeout(() => {
    savedFlash.value = false
  }, 1500)
}

async function submitComment() {
  const content = commentText.value.trim()
  if (!content || !bug.value || commentSubmitting.value) return

  commentSubmitting.value = true
  commentError.value = null

  try {
    await projectsStore.createComment({
      bug_id: bug.value.id,
      project_id: bug.value.project_id,
      content,
    })
    if (authStore.user && authStore.profile) {
      profiles.value[authStore.user.id] = authStore.profile
    }
    commentText.value = ''
  } catch (e) {
    commentError.value = toUserError(e)
  } finally {
    commentSubmitting.value = false
  }
}

function isCommentAuthor(comment: BugComment): boolean {
  return !!authStore.user && comment.author_id === authStore.user.id
}

function isEditedComment(comment: BugComment): boolean {
  return comment.updated_at !== comment.created_at
}

function startEditComment(comment: BugComment) {
  if (commentSaving.value) return
  commentActionError.value = null
  commentDraft.value = comment.content
  editingCommentId.value = comment.id
  void nextTick(() => commentTextareaRef.value?.$el.focus())
}

function cancelEditComment() {
  if (commentSaving.value) return
  editingCommentId.value = null
  commentDraft.value = ''
  commentActionError.value = null
}

async function confirmEditComment() {
  const id = editingCommentId.value
  const comment = comments.value.find((c) => c.id === id)
  if (!id || !comment) return

  const content = commentDraft.value.trim()
  if (!content || content === comment.content) {
    cancelEditComment()
    return
  }

  commentSaving.value = true
  commentActionError.value = null
  try {
    await projectsStore.updateComment(id, content)
    editingCommentId.value = null
    commentDraft.value = ''
  } catch (e) {
    commentActionError.value = toUserError(e)
  } finally {
    commentSaving.value = false
  }
}

function askDeleteComment(comment: BugComment) {
  commentActionError.value = null
  deleteTarget.value = comment
}

function closeDeleteDialog() {
  deleteTarget.value = null
  commentActionError.value = null
}

async function confirmDeleteComment() {
  if (!deleteTarget.value || deleteSaving.value) return

  deleteSaving.value = true
  commentActionError.value = null
  try {
    await projectsStore.deleteComment(deleteTarget.value.id)
    closeDeleteDialog()
  } catch (e) {
    commentActionError.value = toUserError(e)
  } finally {
    deleteSaving.value = false
  }
}

const backLabel = computed(() => {
  return state.value === 'no-project' || state.value === 'no-access'
    ? 'К проектам'
    : 'Назад к проекту'
})

function goBack() {
  if (state.value === 'no-project' || state.value === 'no-access') {
    router.push({ name: 'projects' })
    return
  }
  router.push({ name: 'project', params: { id: projectId.value } })
}

watch(
  [projectId, bugId],
  () => {
    projectsStore.clearCurrentBug()
    load()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (savedTimer) clearTimeout(savedTimer)
  projectsStore.clearCurrentBug()
})
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-6">
    <!-- Back Button -->
    <Button variant="ghost" size="sm" class="mb-4 gap-1" @click="goBack">
      <ChevronLeft class="h-4 w-4" />
      {{ backLabel }}
    </Button>

    <!-- Loading Skeleton -->
    <div v-if="state === 'loading'" class="space-y-6" role="status" aria-label="Загрузка бага">
      <div class="flex animate-pulse items-start gap-4">
        <div class="h-12 w-12 shrink-0 rounded-xl bg-muted" />
        <div class="min-w-0 flex-1 space-y-3">
          <div class="h-7 w-2/3 rounded bg-muted" />
          <div class="flex gap-2">
            <div class="h-5 w-24 rounded-full bg-muted" />
            <div class="h-5 w-20 rounded-full bg-muted" />
            <div class="h-5 w-28 rounded-full bg-muted" />
          </div>
          <div class="h-3 w-44 rounded bg-muted" />
        </div>
      </div>

      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <Card class="gap-3">
            <CardContent class="space-y-3">
              <div class="h-4 w-24 rounded bg-muted" />
              <div class="h-4 w-full rounded bg-muted" />
              <div class="h-4 w-5/6 rounded bg-muted" />
              <div class="h-4 w-2/3 rounded bg-muted" />
            </CardContent>
          </Card>

          <Card class="gap-3">
            <CardContent class="space-y-4">
              <div class="h-4 w-32 rounded bg-muted" />
              <div v-for="i in 2" :key="i" class="flex gap-3">
                <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
                <div class="flex-1 space-y-2">
                  <div class="h-3 w-40 rounded bg-muted" />
                  <div class="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div class="space-y-6">
          <Card class="gap-4">
            <CardContent class="space-y-4">
              <div class="h-4 w-24 rounded bg-muted" />
              <div class="h-9 w-full rounded-md bg-muted" />
              <div class="h-9 w-full rounded-md bg-muted" />
              <div class="h-9 w-full rounded-md bg-muted" />
            </CardContent>
          </Card>

          <Card class="gap-4">
            <CardContent class="space-y-3">
              <div class="h-4 w-20 rounded bg-muted" />
              <div class="h-3 w-full rounded bg-muted" />
              <div class="h-3 w-3/4 rounded bg-muted" />
              <div class="h-3 w-1/2 rounded bg-muted" />
            </CardContent>
          </Card>
        </div>
      </div>

      <span class="sr-only">Загрузка бага…</span>
    </div>

    <!-- RLS: project hidden or missing -->
    <div v-else-if="state === 'no-project'" class="rounded-lg border py-14 text-center">
      <ShieldAlert class="mx-auto h-12 w-12 text-severity-critical/70" />
      <h1 class="mt-4 text-lg font-medium">Нет доступа к проекту</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Проект не существует, удалён или вы не являетесь его участником.
      </p>
      <Button class="mt-6" @click="router.push({ name: 'projects' })"> К проектам </Button>
    </div>

    <!-- RLS: member, but bug missing or deleted -->
    <div v-else-if="state === 'no-bug'" class="rounded-lg border py-14 text-center">
      <SearchX class="mx-auto h-12 w-12 text-muted-foreground/60" />
      <h1 class="mt-4 text-lg font-medium">Баг не найден</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Возможно, он был удалён или ссылка устарела.
      </p>
      <Button class="mt-6" @click="router.push({ name: 'project', params: { id: projectId } })">
        Назад к проекту
      </Button>
    </div>

    <!-- RLS: public project, but viewer is not a team member -->
    <div v-else-if="state === 'no-access'" class="rounded-lg border py-14 text-center">
      <Lock class="mx-auto h-12 w-12 text-muted-foreground/60" />
      <h1 class="mt-4 text-lg font-medium">Нет доступа к багу</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Баги и обсуждение доступны только участникам команды проекта.
      </p>
      <Button class="mt-6" @click="router.push({ name: 'projects' })"> К проектам </Button>
    </div>

    <!-- Load error -->
    <div
      v-else-if="state === 'error'"
      class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>{{ pageError }}</span>
        <div class="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" @click="goBack">К проекту</Button>
          <Button variant="outline" size="sm" @click="load">Повторить</Button>
        </div>
      </div>
    </div>

    <!-- Ready -->
    <template v-else-if="bug">
      <!-- Header -->
      <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <div class="flex min-w-0 flex-1 items-start gap-4">
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            :class="SEVERITY_BG[bug.severity] ?? 'bg-muted'"
          >
            <component :is="areaIcon(bug.area)" class="h-6 w-6" />
          </div>

          <div class="min-w-0 w-full">
            <div class="flex w-full flex-wrap gap-2">
              <template v-if="editingTitle">
                <div class="flex w-full flex-wrap gap-2">
                  <Textarea
                    ref="titleInputRef"
                    v-model="titleDraft"
                    :rows="1"
                    class="min-h-0 min-w-55 flex-1 basis-full resize-none overflow-hidden text-lg font-semibold leading-snug"
                    maxlength="200"
                    :disabled="attrSaving"
                    aria-label="Название бага"
                    @input="autoGrowTitle"
                    @keydown.enter.exact.prevent="confirmEditTitle"
                    @keydown.esc="cancelEditTitle"
                  />
                  <div class="flex flex-wrap basis-full items-center gap-1.5 h-min">
                    <span class="ml-auto text-xs text-muted-foreground">
                      {{ titleDraftLength }}/200
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      class="h-9"
                      :disabled="attrSaving"
                      @click="cancelEditTitle"
                    >
                      Отмена
                    </Button>
                    <Button
                      size="sm"
                      class="h-9"
                      :disabled="attrSaving || !titleDraft.trim()"
                      @click="confirmEditTitle"
                    >
                      <Loader2 v-if="attrSaving" class="h-4 w-4 animate-spin" />
                      <Check v-else class="h-4 w-4" />
                      {{ attrSaving ? 'Сохраняем…' : 'Сохранить' }}
                    </Button>
                  </div>
                  <p
                    v-if="attrError && errorContext === 'title'"
                    class="w-full text-xs text-severity-critical"
                  >
                    {{ attrError }}
                  </p>
                </div>
              </template>

              <template v-else>
                <div class="relative inline-block pr-9">
                  <h1 class="text-2xl font-semibold tracking-tight wrap-break-word">
                    {{ bug.title }}
                  </h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    class="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 text-muted-foreground"
                    title="Редактировать название"
                    aria-label="Редактировать название"
                    @click="startEditTitle"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </Button>
                </div>
              </template>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2">
              <Badge :class="STATUS_BADGE[bug.status]" class="flex items-center gap-1 text-xs">
                <component
                  :is="statusIcon(bug.status)"
                  class="h-3 w-3"
                  :class="{
                    'animate-spin': bug.status === 'in_progress',
                    'animate-eye-look': bug.status === 'discovered',
                  }"
                />
                {{ optionLabel(statusOptions, bug.status) }}
              </Badge>
              <Badge :class="SEVERITY_BADGE[bug.severity]" class="text-xs">
                {{ optionLabel(severityOptions, bug.severity) }}
              </Badge>
              <Badge
                v-if="isNewBug(bug.created_at)"
                class="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Новый
              </Badge>
              <Badge variant="outline" class="flex items-center gap-1 text-xs">
                <component :is="areaIcon(bug.area)" class="h-3 w-3" />
                {{ optionLabel(areaOptions, bug.area) }}
              </Badge>
            </div>

            <p class="mt-3 text-sm text-muted-foreground">
              Проект:
              <RouterLink
                :to="{ name: 'project', params: { id: projectId } }"
                class="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                {{ project?.name }}
              </RouterLink>
            </p>

            <p class="mt-2 text-sm text-muted-foreground">
              Автор:
              <RouterLink
                :to="{ name: 'profile', params: { id: bug.created_by } }"
                class="font-medium text-foreground underline underline-offset-4 hover:text-primary"
              >
                {{ authorName(bug.created_by) }}
              </RouterLink>
            </p>
            <!-- TODO: Сделать рабочую ссылку на автора, когда будет страница профиля -->
            <span
              class="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
            >
              {{ bug.id }}
              <CopyButton :text="bug.id" label="Копировать ID" />
            </span>
          </div>
        </div>

        <div class="space-y-1 text-xs text-muted-foreground sm:text-right">
          <Button
            v-if="canRevert"
            variant="outline"
            size="sm"
            class="mb-2 gap-1.5"
            :disabled="attrSaving"
            title="Вернуть название, описание и автора, которые были при открытии страницы"
            @click="revertChanges"
          >
            <Loader2 v-if="attrSaving" class="h-3.5 w-3.5 animate-spin" />
            <Undo2 v-else class="h-3.5 w-3.5" />
            Вернуть изменения
          </Button>
        </div>
      </div>

      <!-- Content -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <!-- Description -->
          <Card class="gap-3">
            <CardContent>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-medium text-muted-foreground">Описание</h2>
                <Button
                  v-if="!editingDescription"
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-muted-foreground"
                  title="Редактировать описание"
                  aria-label="Редактировать описание"
                  @click="startEditDescription"
                >
                  <Pencil class="h-3.5 w-3.5" />
                </Button>
              </div>

              <template v-if="editingDescription">
                <Textarea
                  ref="descriptionInputRef"
                  v-model="descriptionDraft"
                  :rows="6"
                  class="mt-3"
                  maxlength="10000"
                  :disabled="attrSaving"
                  aria-label="Описание бага"
                  @keydown.ctrl.enter.prevent="confirmEditDescription"
                  @keydown.esc="cancelEditDescription"
                />
                <div class="mt-3 flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    class="h-9"
                    :disabled="attrSaving"
                    @click="confirmEditDescription"
                  >
                    <Loader2 v-if="attrSaving" class="h-4 w-4 animate-spin" />
                    <Check v-else class="h-4 w-4" />
                    {{ attrSaving ? 'Сохраняем…' : 'Сохранить' }}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    class="h-9"
                    :disabled="attrSaving"
                    @click="cancelEditDescription"
                  >
                    Отмена
                  </Button>
                  <span class="ml-auto text-xs text-muted-foreground">
                    {{ descriptionDraft.length }}/10000
                  </span>
                </div>
                <p
                  v-if="attrError && errorContext === 'description'"
                  class="text-xs text-severity-critical"
                >
                  {{ attrError }}
                </p>
              </template>

              <p
                v-else-if="bug.description"
                class="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
              >
                {{ bug.description }}
              </p>
              <p v-else class="mt-3 text-sm italic text-muted-foreground">Описание не заполнено</p>
            </CardContent>
          </Card>

          <!-- Comments -->
          <Card class="gap-3">
            <CardContent>
              <div class="flex items-center justify-between gap-3">
                <h2 class="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare class="h-4 w-4 text-muted-foreground" />
                  Комментарии
                </h2>
                <Badge variant="secondary">{{ comments.length }}</Badge>
              </div>

              <div
                v-if="commentsError"
                class="mt-4 rounded-md border border-severity-critical/20 bg-severity-critical/5 p-3"
              >
                <div class="flex items-center gap-3 text-sm text-severity-critical">
                  <AlertTriangle class="h-4 w-4 shrink-0" />
                  <span>{{ commentsError }}</span>
                  <Button variant="ghost" size="sm" class="ml-auto" @click="loadComments">
                    Повторить
                  </Button>
                </div>
              </div>

              <div
                v-else-if="projectsStore.commentsLoading"
                class="mt-4 space-y-4"
                role="status"
                aria-label="Загрузка комментариев"
              >
                <div v-for="i in 2" :key="i" class="flex animate-pulse gap-3">
                  <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
                  <div class="flex-1 space-y-2">
                    <div class="h-3 w-40 rounded bg-muted" />
                    <div class="h-3 w-full rounded bg-muted" />
                  </div>
                </div>
                <span class="sr-only">Загрузка комментариев…</span>
              </div>

              <div v-else-if="comments.length" class="mt-4 space-y-4">
                <article v-for="comment in comments" :key="comment.id" class="flex gap-3">
                  <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
                  >
                    {{ initials(authorName(comment.author_id)) }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-baseline gap-2">
                      <span class="truncate text-sm font-medium">
                        {{ authorName(comment.author_id) }}
                      </span>
                      <span class="text-xs text-muted-foreground">
                        {{ formatDate(comment.created_at) }}
                      </span>
                      <span v-if="isEditedComment(comment)" class="text-xs text-muted-foreground">
                        (изменён)
                      </span>

                      <DropdownMenu v-if="isCommentAuthor(comment)">
                        <DropdownMenuTrigger
                          :class="
                            cn(
                              buttonVariants({ variant: 'ghost' }),
                              'ml-auto h-6 w-6 self-center rounded-md p-1 text-muted-foreground hover:text-foreground',
                            )
                          "
                          title="Действия с комментарием"
                          aria-label="Действия с комментарием"
                        >
                          <MoreHorizontal class="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" class="w-44">
                          <DropdownMenuItem
                            :disabled="commentSaving"
                            @click="startEditComment(comment)"
                          >
                            <Pencil class="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            class="text-severity-critical"
                            :disabled="deleteSaving"
                            @click="askDeleteComment(comment)"
                          >
                            <Trash2 class="mr-2 h-4 w-4" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div
                      v-if="deleteTarget?.id === comment.id"
                      class="mt-2 rounded-md border border-severity-critical/40 bg-severity-critical/5 p-3"
                      role="alertdialog"
                      aria-label="Подтверждение удаления комментария"
                    >
                      <p class="text-sm font-medium">Удалить комментарий?</p>
                      <p class="mt-1 text-xs text-muted-foreground">
                        Комментарий будет скрыт у всех участников. Отменить действие нельзя.
                      </p>
                      <p v-if="commentActionError" class="mt-1 text-xs text-severity-critical">
                        {{ commentActionError }}
                      </p>
                      <div class="mt-2 flex flex-wrap gap-1.5">
                        <Button
                          size="sm"
                          variant="destructive"
                          class="h-8"
                          :disabled="deleteSaving"
                          @click="confirmDeleteComment"
                        >
                          <Loader2 v-if="deleteSaving" class="h-4 w-4 animate-spin" />
                          <Trash2 v-else class="h-4 w-4" />
                          {{ deleteSaving ? 'Удаляем…' : 'Удалить' }}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          class="h-8"
                          :disabled="deleteSaving"
                          @click="closeDeleteDialog"
                        >
                          Отмена
                        </Button>
                      </div>
                    </div>

                    <template v-if="editingCommentId === comment.id">
                      <Textarea
                        ref="commentTextareaRef"
                        v-model="commentDraft"
                        :rows="3"
                        class="mt-2"
                        maxlength="2000"
                        :disabled="commentSaving"
                        aria-label="Текст комментария"
                        @keydown.ctrl.enter.prevent="confirmEditComment"
                        @keydown.esc="cancelEditComment"
                      />
                      <div class="mt-2 flex flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          class="h-8"
                          :disabled="commentSaving || !commentDraft.trim()"
                          @click="confirmEditComment"
                        >
                          <Loader2 v-if="commentSaving" class="h-4 w-4 animate-spin" />
                          <Check v-else class="h-4 w-4" />
                          {{ commentSaving ? 'Сохраняем…' : 'Сохранить' }}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="h-8"
                          :disabled="commentSaving"
                          @click="cancelEditComment"
                        >
                          Отмена
                        </Button>
                        <span class="ml-auto text-xs text-muted-foreground">
                          {{ commentDraft.length }}/2000
                        </span>
                      </div>
                      <p v-if="commentActionError" class="mt-1 text-xs text-severity-critical">
                        {{ commentActionError }}
                      </p>
                    </template>

                    <p v-else class="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                      {{ comment.content }}
                    </p>
                  </div>
                </article>
              </div>

              <div v-else class="mt-4 rounded-lg border border-dashed px-6 py-8 text-center">
                <MessageSquare class="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p class="mt-2 text-sm font-medium">Пока нет комментариев</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  Обсудите баг с командой — первый комментарий за вами.
                </p>
              </div>

              <form class="mt-5 space-y-2" @submit.prevent="submitComment">
                <Textarea
                  v-model="commentText"
                  :rows="3"
                  maxlength="2000"
                  placeholder="Добавить комментарий… (Ctrl + Enter — отправить)"
                  :disabled="commentSubmitting"
                  @keydown.ctrl.enter.prevent="submitComment"
                />
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <p v-if="commentError" class="text-xs text-severity-critical">
                    {{ commentError }}
                  </p>
                  <span v-else class="text-xs text-muted-foreground">
                    {{ commentText.length }}/2000
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    :disabled="commentSubmitting || !commentText.trim()"
                  >
                    <Loader2 v-if="commentSubmitting" class="mr-2 h-4 w-4 animate-spin" />
                    <Send v-else class="mr-2 h-4 w-4" />
                    {{ commentSubmitting ? 'Отправляем…' : 'Отправить' }}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <Card class="gap-4">
            <CardContent>
              <div class="flex items-center justify-between gap-2">
                <h2 class="text-sm font-medium">Атрибуты</h2>
                <span
                  v-if="attrSaving"
                  class="inline-flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <Loader2 class="h-3 w-3 animate-spin" />
                  Сохраняем…
                </span>
                <span v-else-if="savedFlash" class="text-xs text-emerald-600 dark:text-emerald-400">
                  Сохранено
                </span>
              </div>

              <div class="mt-4 space-y-4">
                <div class="space-y-1.5">
                  <Label>Статус</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                      :disabled="attrSaving"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <component :is="statusIcon(bug.status)" class="h-3.5 w-3.5 shrink-0" />
                        <span class="truncate">
                          {{ optionLabel(statusOptions, bug.status) }}
                        </span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" class="w-full">
                      <DropdownMenuItem
                        v-for="opt in statusOptions"
                        :key="opt.value"
                        :disabled="attrSaving"
                        @click="onStatusChange(opt.value)"
                      >
                        <Check v-if="bug.status === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                        <span v-else class="mr-2 h-4 w-4 shrink-0" />
                        <span class="truncate">{{ opt.label }}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div class="space-y-1.5">
                  <Label>Важность</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                      :disabled="attrSaving"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <span
                          class="h-2.5 w-2.5 shrink-0 rounded-full"
                          :class="SEVERITY_BG[bug.severity] ?? 'bg-muted'"
                        />
                        <span class="truncate">
                          {{ optionLabel(severityOptions, bug.severity) }}
                        </span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" class="w-56">
                      <DropdownMenuItem
                        v-for="opt in severityOptions"
                        :key="opt.value"
                        :disabled="attrSaving"
                        @click="onSeverityChange(opt.value)"
                      >
                        <Check v-if="bug.severity === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                        <span v-else class="mr-2 h-4 w-4 shrink-0" />
                        <span class="truncate">{{ opt.label }}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div class="space-y-1.5">
                  <Label>Область</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                      :disabled="attrSaving"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <component :is="areaIcon(bug.area)" class="h-3.5 w-3.5 shrink-0" />
                        <span class="truncate">
                          {{ optionLabel(areaOptions, bug.area) }}
                        </span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" class="w-56">
                      <DropdownMenuItem
                        v-for="opt in areaOptions"
                        :key="opt.value"
                        :disabled="attrSaving"
                        @click="onAreaChange(opt.value)"
                      >
                        <Check v-if="bug.area === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                        <span v-else class="mr-2 h-4 w-4 shrink-0" />
                        <span class="truncate">{{ opt.label }}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div class="space-y-1.5">
                  <Label>Автор</Label>
                  <DropdownMenu v-if="members.length > 0">
                    <DropdownMenuTrigger
                      :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                      :disabled="attrSaving"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <UserRound class="h-3.5 w-3.5 shrink-0" />
                        <span class="truncate">{{ authorName(bug.created_by) }}</span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" class="max-h-72 w-64 overflow-y-auto">
                      <DropdownMenuItem
                        v-for="member in members"
                        :key="member.user_id"
                        :disabled="attrSaving"
                        @click="changeAuthor(member.user_id)"
                      >
                        <Check
                          v-if="bug.created_by === member.user_id"
                          class="mr-2 h-4 w-4 shrink-0"
                        />
                        <span v-else class="mr-2 h-4 w-4 shrink-0" />
                        <span class="truncate">{{ member.name }}</span>
                        <span
                          v-if="member.user_id === authStore.user?.id"
                          class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground"
                        >
                          вы
                        </span>
                        <span
                          v-else-if="member.role === 'owner'"
                          class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground"
                        >
                          владелец
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div
                    v-else
                    class="flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
                  >
                    <UserRound class="h-3.5 w-3.5 shrink-0" />
                    <span class="truncate">{{ authorName(bug.created_by) }}</span>
                  </div>
                </div>
              </div>

              <p
                v-if="attrError && errorContext === 'attributes'"
                class="mt-3 text-xs text-severity-critical"
              >
                {{ attrError }}
              </p>
            </CardContent>
          </Card>

          <Card class="gap-4">
            <CardContent>
              <h2 class="text-sm font-medium">Детали</h2>
              <dl class="mt-4 space-y-3 text-sm">
                <div class="flex items-start justify-between gap-3">
                  <dt class="text-muted-foreground">Создан</dt>
                  <dd class="text-right">{{ formatDate(bug.created_at) }}</dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt class="text-muted-foreground">Обновлён</dt>
                  <dd class="text-right">{{ formatDate(bug.updated_at) }}</dd>
                </div>
                <div class="flex items-start justify-between gap-3">
                  <dt class="text-muted-foreground">ID</dt>
                  <dd class="break-all text-right font-mono text-xs">{{ bug.id }}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes eye-look {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

.animate-eye-look {
  animation: eye-look 3s ease-in-out infinite;
  transform-origin: center;
}
</style>
