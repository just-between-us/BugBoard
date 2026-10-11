<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronsUpDown,
  ExternalLink,
  Loader2,
  ShieldAlert,
  UserRound,
} from '@lucide/vue'
import type { Bug, Project, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { toUserError } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar } from '@/components/avatar'
import { cn } from '@/lib/utils'
import {
  SEVERITY_BG,
  areaIcon,
  areaOptions,
  optionLabel,
  severityOptions,
  statusIcon,
  statusOptions,
} from '@/entities/bug'

type PageState = 'loading' | 'ready' | 'no-project' | 'no-access' | 'error'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const projectId = computed<string>(() => route.params.projectId as string)

const sourceReportId = computed<string | null>(() => {
  const raw = route.query.report
  return typeof raw === 'string' && raw.length > 0 ? raw : null
})

const state = ref<PageState>('loading')
const pageError = ref<string | null>(null)
const project = ref<Project | null>(null)
const sourceReport = ref<Report | null>(null)

const form = ref({
  title: '',
  description: '',
  status: 'discovered' as Bug['status'],
  area: 'other' as Bug['area'],
  severity: 'minor' as Bug['severity'],
})

const formError = ref<string | null>(null)
const submitting = ref(false)

const canSubmit = computed(() => !submitting.value && form.value.title.trim().length > 0)

const authorName = computed(() => authStore.profile?.display_name ?? 'Вы')

let loadSeq = 0

async function load() {
  const id = projectId.value
  if (!id) return
  const seq = ++loadSeq

  state.value = 'loading'
  pageError.value = null
  project.value = null
  sourceReport.value = null
  formError.value = null
  form.value = {
    title: '',
    description: '',
    status: 'discovered',
    area: 'other',
    severity: 'minor',
  }

  try {
    const visibleProject = await projectsStore.fetchProjectIfVisible(id)
    if (seq !== loadSeq) return
    if (!visibleProject) {
      state.value = 'no-project'
      return
    }

    const isMember = await projectsStore.isProjectMember(id)
    if (seq !== loadSeq) return
    if (!isMember) {
      state.value = 'no-access'
      return
    }

    project.value = visibleProject
    state.value = 'ready'

    if (sourceReportId.value) {
      const report = await projectsStore.fetchReport(sourceReportId.value).catch(() => null)
      if (seq !== loadSeq || state.value !== 'ready') return
      if (report && report.project_id === id) {
        sourceReport.value = report
        form.value.title = report.title
        form.value.description = report.description
      }
    }
  } catch (e) {
    if (seq !== loadSeq) return
    pageError.value = toUserError(e)
    state.value = 'error'
  }
}

async function handleSubmit() {
  if (!canSubmit.value || !project.value) return

  submitting.value = true
  formError.value = null

  try {
    const bug = await projectsStore.createBug({
      project_id: project.value.id,
      title: form.value.title.trim(),
      description: form.value.description.trim() || undefined,
      status: form.value.status,
      area: form.value.area,
      severity: form.value.severity,
    })

    if (sourceReport.value) {
      await projectsStore
        .updateReport(sourceReport.value.id, { bug_id: bug.id })
        .catch(() => void 0)
    }

    router.replace({
      name: 'bug-detail',
      params: { projectId: project.value.id, bugId: bug.id },
    })
  } catch (e) {
    formError.value = toUserError(e)
  } finally {
    submitting.value = false
  }
}

function goBack() {
  router.push({ name: 'project-bugs', params: { id: projectId.value } })
}

watch(
  projectId,
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 py-6 sm:px-6">
    <Button variant="ghost" size="sm" class="mb-4 gap-1" @click="goBack">
      <ChevronLeft class="h-4 w-4" />
      К багам проекта
    </Button>

    <div
      v-if="state === 'loading'"
      class="animate-pulse space-y-4"
      role="status"
      aria-label="Загрузка страницы создания бага"
    >
      <div class="h-6 w-56 rounded bg-muted" />
      <div class="h-72 rounded-lg bg-muted" />
    </div>

    <div v-else-if="state === 'no-project'" class="rounded-lg border py-14 text-center">
      <ShieldAlert class="mx-auto h-12 w-12 text-severity-critical/70" />
      <h1 class="mt-4 text-lg font-medium">Нет доступа к проекту</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Проект не существует, удалён или вы не являетесь его участником.
      </p>
      <Button class="mt-6" @click="router.push({ name: 'projects' })">К проектам</Button>
    </div>

    <div v-else-if="state === 'no-access'" class="rounded-lg border py-14 text-center">
      <ShieldAlert class="mx-auto h-12 w-12 text-muted-foreground/60" />
      <h1 class="mt-4 text-lg font-medium">Нет доступа</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Создавать баги могут только участники команды проекта.
      </p>
      <Button class="mt-6" @click="router.push({ name: 'projects' })">К проектам</Button>
    </div>

    <div
      v-else-if="state === 'error'"
      class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>{{ pageError }}</span>
        <Button variant="outline" size="sm" class="ml-auto" @click="load">Повторить</Button>
      </div>
    </div>

    <template v-else-if="project">
      <div class="mb-5">
        <h1 class="text-lg font-semibold tracking-tight">Новый баг</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Заполните информацию о баге. Обязательные поля отмечены *
        </p>
      </div>

      <div class="mb-4 flex items-center gap-3 rounded-md border bg-muted/40 p-3">
        <Avatar
          class="h-9 w-9 shrink-0 rounded-lg text-sm"
          :name="project.name"
          :src="project.avatar_url"
        />
        <div class="min-w-0 flex-1">
          <p class="text-xs text-muted-foreground">Проект</p>
          <RouterLink
            :to="{ name: 'project-bugs', params: { id: project.id } }"
            class="block truncate text-sm font-medium underline-offset-4 hover:underline"
          >
            {{ project.name }}
          </RouterLink>
        </div>
      </div>

      <div v-if="sourceReport" class="mb-4 rounded-md border border-primary/30 bg-primary/5 p-3">
        <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Создаётся из репорта — после создания бага репорт автоматически привяжется к нему
        </p>
        <RouterLink
          :to="{ name: 'report-view', params: { reportId: sourceReport.id } }"
          class="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <span class="min-w-0 truncate">{{ sourceReport.title }}</span>
          <ExternalLink class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </RouterLink>
      </div>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <Card class="gap-4">
          <CardContent>
            <h2 class="text-sm font-medium">Основное</h2>

            <div class="mt-4 space-y-4">
              <div class="space-y-1.5">
                <Label for="bug-title">Название *</Label>
                <Input
                  id="bug-title"
                  v-model="form.title"
                  placeholder="Например: Ошибка авторизации при неверном пароле"
                  maxlength="200"
                  :disabled="submitting"
                  autocomplete="off"
                />
              </div>

              <div class="space-y-1.5">
                <Label for="bug-description">Описание</Label>
                <Textarea
                  id="bug-description"
                  v-model="form.description"
                  placeholder="Подробное описание бага, шаги воспроизведения, ожидаемое поведение..."
                  maxlength="2000"
                  :rows="5"
                  :disabled="submitting"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card class="gap-4">
          <CardContent>
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-sm font-medium">Атрибуты</h2>
              <span
                v-if="submitting"
                class="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                <Loader2 class="h-3 w-3 animate-spin" />
                Создаём…
              </span>
            </div>

            <div class="mt-4 space-y-4">
              <div class="space-y-1.5">
                <Label>Статус</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                    :disabled="submitting"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <component :is="statusIcon(form.status)" class="h-3.5 w-3.5 shrink-0" />
                      <span class="truncate">
                        {{ optionLabel(statusOptions, form.status) }}
                      </span>
                    </span>
                    <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="w-full" match-trigger>
                    <DropdownMenuItem
                      v-for="opt in statusOptions"
                      :key="opt.value"
                      :disabled="submitting"
                      @click="form.status = opt.value"
                    >
                      <Check v-if="form.status === opt.value" class="mr-2 h-4 w-4 shrink-0" />
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
                    :disabled="submitting"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <span
                        class="h-2.5 w-2.5 shrink-0 rounded-full"
                        :class="SEVERITY_BG[form.severity] ?? 'bg-muted'"
                      />
                      <span class="truncate">
                        {{ optionLabel(severityOptions, form.severity) }}
                      </span>
                    </span>
                    <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="w-56" match-trigger>
                    <DropdownMenuItem
                      v-for="opt in severityOptions"
                      :key="opt.value"
                      :disabled="submitting"
                      @click="form.severity = opt.value"
                    >
                      <Check v-if="form.severity === opt.value" class="mr-2 h-4 w-4 shrink-0" />
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
                    :disabled="submitting"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <component :is="areaIcon(form.area)" class="h-3.5 w-3.5 shrink-0" />
                      <span class="truncate">
                        {{ optionLabel(areaOptions, form.area) }}
                      </span>
                    </span>
                    <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="w-56" match-trigger>
                    <DropdownMenuItem
                      v-for="opt in areaOptions"
                      :key="opt.value"
                      :disabled="submitting"
                      @click="form.area = opt.value"
                    >
                      <Check v-if="form.area === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                      <span v-else class="mr-2 h-4 w-4 shrink-0" />
                      <span class="truncate">{{ opt.label }}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <!-- RLS bugs_insert_team_only требует created_by = auth.uid() — при создании автор не выбирается -->
              <div class="space-y-1.5">
                <Label>Автор</Label>
                <div
                  class="flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
                >
                  <UserRound class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">{{ authorName }}</span>
                  <span class="ml-auto shrink-0 pl-2 text-xs">вы</span>
                </div>
              </div>
            </div>

            <p v-if="formError" class="mt-3 text-xs text-severity-critical">
              {{ formError }}
            </p>
          </CardContent>
        </Card>

        <div class="flex flex-wrap gap-2">
          <Button type="submit" :disabled="!canSubmit">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            {{ submitting ? 'Создаём…' : 'Создать баг' }}
          </Button>
          <Button type="button" variant="ghost" :disabled="submitting" @click="goBack">
            Отмена
          </Button>
        </div>
      </form>
    </template>
  </div>
</template>
