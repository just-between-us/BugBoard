<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  AlertTriangle,
  ArrowLeft,
  Bug as BugIcon,
  Check,
  ChevronsUpDown,
  Inbox,
  Link2,
  Loader2,
  MessageSquare,
  Send,
  Unlink,
} from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore, type Bug, type Project, type Report } from '@/stores/projects'
import { formatDate, toUserError } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  REPORT_FLAG_BADGE,
  REPORT_FLAG_ICON,
  REPORT_STATUS_BADGE,
  REPORT_STATUS_DOT,
  reportFlagOptions,
  reportStatusLabel,
  reportStatusOptions,
} from '@/entities/report'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectsStore = useProjectsStore()

const reportId = computed(() => route.params.reportId as string)

const email = ref('')
const otpCode = ref('')
const authStep = ref<'email' | 'code'>('email')
const authLoading = ref(false)
const authError = ref('')

const loading = ref(false)
const loadError = ref('')
const accessDenied = ref(false)
const report = ref<Report | null>(null)
const project = ref<Project | null>(null)
const canManage = ref(false)

const replyDraft = ref('')
const saving = ref(false)
const saveError = ref('')

const projectBugs = ref<Bug[]>([])
const bugsLoading = ref(false)
const bugsError = ref('')
let bugsLoadSeq = 0

const reporterName = computed(() =>
  report.value ? projectsStore.profileName(report.value.reporter_id) : '',
)
const reporterAvatar = computed(() =>
  report.value ? projectsStore.profileAvatar(report.value.reporter_id) : '',
)

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

async function sendCode() {
  authError.value = ''

  if (!isEmailValid(email.value)) {
    authError.value = 'Укажите корректную почту'
    return
  }

  authLoading.value = true
  try {
    await auth.sendOtp(email.value.trim())
    authStep.value = 'code'
  } catch (e) {
    authError.value = toUserError(e)
  } finally {
    authLoading.value = false
  }
}

async function verifyCode() {
  authError.value = ''

  if (!otpCode.value.trim()) {
    authError.value = 'Введите код из письма'
    return
  }

  authLoading.value = true
  try {
    await auth.verifyEmailOtp(email.value.trim(), otpCode.value.trim())
  } catch {
    authError.value = 'Неверный код или он истёк'
  } finally {
    authLoading.value = false
  }
}

async function resendCode() {
  authError.value = ''
  try {
    await auth.sendOtp(email.value.trim())
  } catch (e) {
    authError.value = toUserError(e)
  }
}

function backToEmail() {
  authStep.value = 'email'
  otpCode.value = ''
  authError.value = ''
}

async function loadReport() {
  loading.value = true
  loadError.value = ''
  accessDenied.value = false
  report.value = null
  project.value = null
  canManage.value = false
  saveError.value = ''
  projectBugs.value = []
  bugsError.value = ''

  try {
    const data = await projectsStore.fetchReport(reportId.value)
    if (!data) {
      accessDenied.value = true
      return
    }

    report.value = data
    replyDraft.value = data.reply ?? ''
    canManage.value = await projectsStore.isProjectMember(data.project_id)
    if (canManage.value) void loadProjectBugs(data.project_id)

    await projectsStore.loadProfiles([data.reporter_id, data.reply_author_id])

    project.value = await projectsStore.fetchPublicProject(data.project_id).catch(() => null)
  } catch (e) {
    loadError.value = toUserError(e)
  } finally {
    loading.value = false
  }
}

async function persist(updates: Partial<Report>): Promise<boolean> {
  if (!report.value || saving.value) return false

  saving.value = true
  saveError.value = ''
  try {
    const updated = await projectsStore.updateReport(report.value.id, updates)
    report.value = updated
    if (updated.reply_author_id) {
      await projectsStore.loadProfiles([updated.reply_author_id])
    }
    return true
  } catch (e) {
    saveError.value = toUserError(e)
    return false
  } finally {
    saving.value = false
  }
}

async function changeStatus(value: Report['status']) {
  await persist({ status: value })
}

async function changeFlag(value: Report['flag']) {
  await persist({ flag: value })
}

async function loadProjectBugs(projectId: string) {
  const seq = ++bugsLoadSeq
  bugsLoading.value = true
  bugsError.value = ''
  try {
    const list = await projectsStore.fetchProjectBugs(projectId)
    if (seq !== bugsLoadSeq) return
    projectBugs.value = list
  } catch (e) {
    if (seq !== bugsLoadSeq) return
    projectBugs.value = []
    bugsError.value = toUserError(e)
  } finally {
    if (seq === bugsLoadSeq) bugsLoading.value = false
  }
}

const linkedBug = computed(() => {
  const bugId = report.value?.bug_id
  if (!bugId) return null
  return projectBugs.value.find((b) => b.id === bugId) ?? null
})

async function linkBug(bugId: string) {
  if (saving.value) return
  await persist({ bug_id: bugId })
}

async function unlinkBug() {
  if (saving.value) return
  await persist({ bug_id: null })
}

const replyDirty = computed(() => replyDraft.value.trim() !== (report.value?.reply ?? ''))
const canSaveReply = computed(
  () =>
    !saving.value && replyDirty.value && (replyDraft.value.trim() !== '' || !!report.value?.reply),
)

async function saveReply() {
  const text = replyDraft.value.trim()

  const saved = await persist(
    text
      ? {
          reply: text,
          reply_author_id: auth.user?.id ?? null,
          replied_at: new Date().toISOString(),
        }
      : { reply: null, reply_author_id: null, replied_at: null },
  )

  if (saved) replyDraft.value = report.value?.reply ?? ''
}

watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) void loadReport()
  },
  { immediate: true },
)
</script>

<template>
  <main class="min-h-screen bg-background text-foreground">
    <div class="mx-auto max-w-2xl px-6 py-8">
      <div class="flex gap-2">
        <button
          type="button"
          class="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          @click="router.push({ name: 'landing' })"
        >
          <ArrowLeft class="h-4 w-4" />
          На главную
        </button>
        <button
          type="button"
          class="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          @click="router.back()"
        >
          / назад
        </button>
      </div>

      <!-- Auth gate -->
      <Card v-if="!auth.isAuthenticated">
        <CardHeader>
          <CardTitle class="font-mono text-base">Войдите, чтобы посмотреть репорт</CardTitle>
          <CardDescription v-if="authStep === 'email'">
            Одна почта и код из письма — вход и для команды, и для репортёра, без пароля. До входа
            данные репорта не видны.
          </CardDescription>
          <CardDescription v-else>Мы отправили код на {{ email }}</CardDescription>
        </CardHeader>

        <CardContent>
          <form v-if="authStep === 'email'" class="space-y-4" @submit.prevent="sendCode">
            <div class="space-y-1.5">
              <Label for="report-view-email">Почта</Label>
              <Input
                id="report-view-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                :disabled="authLoading"
                autocomplete="email"
                autofocus
              />
            </div>

            <p v-if="authError" class="text-sm text-severity-critical">{{ authError }}</p>

            <Button type="submit" class="w-full gap-2" :disabled="authLoading">
              <Loader2 v-if="authLoading" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              {{ authLoading ? 'Отправляем…' : 'Получить код' }}
            </Button>
          </form>

          <form v-else class="space-y-4" @submit.prevent="verifyCode">
            <div class="space-y-1.5">
              <Label for="report-view-otp">Код из письма</Label>
              <Input
                id="report-view-otp"
                v-model="otpCode"
                type="text"
                inputmode="numeric"
                placeholder="123456"
                :disabled="authLoading"
                autocomplete="one-time-code"
                autofocus
              />
            </div>

            <p v-if="authError" class="text-sm text-severity-critical">{{ authError }}</p>

            <Button type="submit" class="w-full" :disabled="authLoading">
              <Loader2 v-if="authLoading" class="h-4 w-4 animate-spin mr-2" />
              {{ authLoading ? 'Входим…' : 'Войти' }}
            </Button>

            <div class="flex items-center justify-between text-sm">
              <button
                type="button"
                class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                :disabled="authLoading"
                @click="backToEmail"
              >
                Изменить почту
              </button>
              <button
                type="button"
                class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                :disabled="authLoading"
                @click="resendCode"
              >
                Отправить код ещё раз
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <!-- Loading -->
      <div
        v-else-if="loading"
        class="animate-pulse space-y-4"
        role="status"
        aria-label="Загрузка репорта"
      >
        <div class="h-6 w-2/3 bg-muted rounded" />
        <div class="h-4 w-1/3 bg-muted rounded" />
        <div class="h-24 bg-muted rounded-lg" />
        <span class="sr-only">Загрузка репорта…</span>
      </div>

      <!-- Load error -->
      <Card v-else-if="loadError">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 font-mono text-base">
            <AlertTriangle class="h-5 w-5 text-severity-critical" />
            Не удалось загрузить репорт
          </CardTitle>
          <CardDescription>{{ loadError }}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" @click="loadReport">Повторить</Button>
        </CardContent>
      </Card>

      <!-- No access -->
      <Card v-else-if="accessDenied">
        <CardHeader>
          <Inbox class="h-10 w-10 text-muted-foreground/50" />
          <CardTitle class="font-mono text-base">Репорт недоступен</CardTitle>
          <CardDescription>
            Такого репорта нет, либо он вам не принадлежит — посмотреть его может автор репорта или
            команда проекта.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" @click="router.push({ name: 'landing' })">На главную</Button>
        </CardContent>
      </Card>

      <!-- Report -->
      <Card v-else-if="report">
        <CardHeader class="space-y-3">
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <template v-if="project">
              <RouterLink
                v-if="canManage"
                :to="{ name: 'project', params: { id: project.id } }"
                class="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {{ project.name }}
              </RouterLink>
              <span v-else class="font-medium text-foreground">{{ project.name }}</span>
              <span>·</span>
            </template>
            <span>{{ formatDate(report.created_at) }}</span>
          </div>

          <CardTitle class="text-xl">{{ report.title }}</CardTitle>

          <div class="flex flex-wrap items-center gap-2">
            <Badge :class="REPORT_STATUS_BADGE[report.status]" class="text-xs font-medium">
              {{ reportStatusLabel(report.status) }}
            </Badge>
            <Badge
              v-if="report.flag !== 'none'"
              :class="REPORT_FLAG_BADGE[report.flag]"
              class="text-xs font-medium"
            >
              {{ reportStatusLabel(report.flag) }}
            </Badge>
            <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Avatar class="h-5 w-5 text-[10px]" :name="reporterName" :src="reporterAvatar" />
              {{ reporterName }}
            </span>
          </div>
        </CardHeader>

        <CardContent class="space-y-5">
          <p class="text-sm whitespace-pre-line">{{ report.description }}</p>

          <!-- Reply from the team -->
          <div v-if="report.reply" class="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare class="h-3 w-3" />
              Ответ команды
              <span v-if="report.replied_at">· {{ formatDate(report.replied_at) }}</span>
            </p>
            <p class="mt-1.5 text-sm whitespace-pre-line">{{ report.reply }}</p>
          </div>

          <!-- Manage (team only) -->
          <div v-if="canManage" class="space-y-4 rounded-md border p-4">
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Управление репортом
            </p>

            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <Label for="report-status">Статус</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="report-status"
                    :class="
                      cn(
                        buttonVariants({ variant: 'outline' }),
                        'min-w-full flex justify-between h-8 gap-1.5 px-2 text-xs',
                      )
                    "
                    :disabled="saving"
                  >
                    <span
                      class="h-2 w-2 shrink-0 rounded-full"
                      :class="REPORT_STATUS_DOT[report.status]"
                    />
                    {{ reportStatusLabel(report.status) }}
                    <ChevronsUpDown class="h-3 w-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="w-44">
                    <DropdownMenuItem
                      v-for="opt in reportStatusOptions"
                      :key="opt.value"
                      :disabled="saving"
                      @click="changeStatus(opt.value as Report['status'])"
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
              </div>

              <div class="space-y-1.5">
                <Label for="report-flag">Флаг</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    id="report-flag"
                    :class="
                      cn(
                        buttonVariants({ variant: 'outline' }),
                        'flex justify-between min-w-full h-8 gap-1.5 px-2 text-xs',
                      )
                    "
                    :disabled="saving"
                    :title="reportStatusLabel(report.flag)"
                    :aria-label="`Флаг: ${reportStatusLabel(report.flag)}`"
                  >
                    <component :is="REPORT_FLAG_ICON[report.flag]" class="h-3.5 w-3.5" />
                    {{ reportStatusLabel(report.flag) }}
                    <ChevronsUpDown class="h-3 w-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="w-44">
                    <DropdownMenuItem
                      v-for="opt in reportFlagOptions"
                      :key="opt.value"
                      :disabled="saving"
                      @click="changeFlag(opt.value as Report['flag'])"
                    >
                      <component :is="REPORT_FLAG_ICON[opt.value]" class="mr-2 h-4 w-4 shrink-0" />
                      {{ opt.label }}
                      <Check v-if="report.flag === opt.value" class="ml-auto h-4 w-4" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <!-- Link to a bug (team only) -->
            <div class="space-y-1.5">
              <Label>Привязка к багу</Label>

              <div
                v-if="report.bug_id"
                class="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2"
              >
                <RouterLink
                  v-if="linkedBug"
                  :to="{
                    name: 'bug-detail',
                    params: { projectId: report.project_id, bugId: linkedBug.id },
                  }"
                  class="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <BugIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span class="truncate">{{ linkedBug.title }}</span>
                </RouterLink>
                <span v-else class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <BugIcon class="h-3.5 w-3.5 shrink-0" />
                  Баг удалён
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  class="ml-auto h-7 gap-1 px-2 text-xs"
                  :disabled="saving"
                  @click="unlinkBug"
                >
                  <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
                  <Unlink v-else class="h-3.5 w-3.5" />
                  Отвязать
                </Button>
              </div>

              <template v-else>
                <p v-if="bugsLoading" class="text-xs text-muted-foreground">
                  Загружаем баги проекта…
                </p>
                <p v-else-if="bugsError" class="text-sm text-severity-critical">{{ bugsError }}</p>

                <DropdownMenu v-else-if="projectBugs.length">
                  <DropdownMenuTrigger
                    :class="
                      cn(
                        buttonVariants({ variant: 'outline' }),
                        'min-w-full flex justify-between h-8 gap-1.5 px-2 text-xs',
                      )
                    "
                    :disabled="saving"
                  >
                    <Link2 class="h-3.5 w-3.5 text-muted-foreground" />
                    Привязать к багу
                    <ChevronsUpDown class="h-3 w-3 opacity-50" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="max-h-72 w-72 overflow-y-auto">
                    <DropdownMenuItem
                      v-for="bug in projectBugs"
                      :key="bug.id"
                      :disabled="saving"
                      @click="linkBug(bug.id)"
                    >
                      <BugIcon class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span class="min-w-0 truncate">{{ bug.title }}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <p v-else class="text-xs text-muted-foreground">
                  В проекте пока нет багов для привязки
                </p>
              </template>
            </div>

            <div class="space-y-1.5">
              <Label for="report-reply">Ответ репортёру</Label>
              <Textarea
                id="report-reply"
                v-model="replyDraft"
                :rows="4"
                maxlength="2000"
                placeholder="Что ответить репортёру — пустое поле удалит ответ"
                :disabled="saving"
              />
            </div>

            <p v-if="saveError" class="text-sm text-severity-critical">{{ saveError }}</p>

            <div class="flex items-center gap-2">
              <Button size="sm" :disabled="!canSaveReply" @click="saveReply">
                <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                {{ saving ? 'Сохраняем…' : 'Сохранить' }}
              </Button>
              <Button
                v-if="replyDirty"
                size="sm"
                variant="ghost"
                :disabled="saving"
                @click="replyDraft = report.reply ?? ''"
              >
                Отмена
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </main>
</template>
