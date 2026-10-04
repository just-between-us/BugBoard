<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CircleCheck, Inbox, Loader2, Send } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore, type Project } from '@/stores/projects'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/avatar'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectsStore = useProjectsStore()

const projectId = computed(() => route.params.projectId as string)

const loadState = ref<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
const project = ref<Project | null>(null)

const step = ref<'form' | 'otp'>('form')
const submitted = ref(false)
const otpUsed = ref(false)
const submittedReportId = ref('')

const title = ref('')
const description = ref('')
const email = ref('')
const otpCode = ref('')

const loading = ref(false)
const error = ref('')

const reporterEmail = computed(() => auth.user?.email ?? '')

async function loadProject() {
  loadState.value = 'loading'
  error.value = ''
  try {
    const data = await projectsStore.fetchPublicProject(projectId.value)
    project.value = data
    loadState.value = data && data.is_public ? 'ready' : 'unavailable'
  } catch {
    loadState.value = 'error'
  }
}

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

async function handleSubmit() {
  error.value = ''

  if (!title.value.trim()) {
    error.value = 'Укажите заголовок'
    return
  }
  if (!description.value.trim()) {
    error.value = 'Опишите, что произошло'
    return
  }

  if (!auth.isAuthenticated && !isEmailValid(email.value)) {
    error.value = 'Укажите корректную почту'
    return
  }

  loading.value = true
  try {
    if (auth.isAuthenticated) {
      await submitReport()
      return
    }

    await auth.sendOtp(email.value.trim(), route.fullPath)
    otpUsed.value = true
    step.value = 'otp'
  } catch (e) {
    error.value = toUserError(e)
  } finally {
    loading.value = false
  }
}

async function handleVerify() {
  error.value = ''

  if (!otpCode.value.trim()) {
    error.value = 'Введите код из письма'
    return
  }

  loading.value = true

  try {
    await auth.verifyEmailOtp(email.value.trim(), otpCode.value.trim())
  } catch {
    error.value = 'Неверный код или он истёк'
    loading.value = false
    return
  }

  try {
    await submitReport()
  } catch (e) {
    error.value = toUserError(e)
    step.value = 'form'
  } finally {
    loading.value = false
  }
}

async function submitReport() {
  const created = await projectsStore.createReport({
    project_id: projectId.value,
    title: title.value.trim(),
    description: description.value.trim(),
  })
  submittedReportId.value = created.id
  submitted.value = true
}

async function resendCode() {
  error.value = ''
  try {
    await auth.sendOtp(email.value.trim(), route.fullPath)
  } catch (e) {
    error.value = toUserError(e)
  }
}

function backToForm() {
  step.value = 'form'
  otpCode.value = ''
  error.value = ''
}

function resetForm() {
  submitted.value = false
  step.value = 'form'
  otpUsed.value = false
  submittedReportId.value = ''
  title.value = ''
  description.value = ''
  otpCode.value = ''
  error.value = ''
}

onMounted(loadProject)
</script>

<template>
  <main class="min-h-screen bg-background text-foreground">
    <div class="mx-auto max-w-2xl px-6 py-8">
      <button
        type="button"
        class="mb-8 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        @click="router.push({ name: 'landing' })"
      >
        <ArrowLeft class="h-4 w-4" />
        На главную
      </button>

      <!-- Loading -->
      <div v-if="loadState === 'loading'" class="animate-pulse space-y-4">
        <div class="h-6 w-1/3 bg-muted rounded" />
        <div class="h-48 bg-muted rounded-lg" />
      </div>

      <!-- Load error -->
      <Card v-else-if="loadState === 'error'">
        <CardHeader>
          <CardTitle class="font-mono text-base">Не удалось загрузить проект</CardTitle>
          <CardDescription>Проверьте соединение и попробуйте ещё раз.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" @click="loadProject">Повторить</Button>
        </CardContent>
      </Card>

      <!-- Private or missing project -->
      <Card v-else-if="loadState === 'unavailable'">
        <CardHeader>
          <Inbox class="h-10 w-10 text-muted-foreground/50" />
          <CardTitle class="font-mono text-base">Проект недоступен</CardTitle>
          <CardDescription>
            Проект приватный или ссылка указывает на несуществующий проект — отправить репорт
            нельзя.
          </CardDescription>
        </CardHeader>
      </Card>

      <!-- Success -->
      <Card v-else-if="submitted">
        <CardHeader>
          <CircleCheck class="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          <CardTitle class="font-mono text-base">Репорт отправлен</CardTitle>
          <CardDescription>
            Команда проекта «{{ project?.name }}» увидит репорт во вкладке «Репорты» и ответит, как
            только его разберёт.
            <template v-if="otpUsed && email">
              Почта {{ email }} подтверждена — это ваш аккаунт на BugBoard, вход по коду из письма,
              без пароля.
            </template>
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap gap-2">
          <Button
            v-if="submittedReportId"
            @click="
              router.push({
                name: 'report-view',
                params: { reportId: submittedReportId },
              })
            "
          >
            Открыть репорт
          </Button>
          <Button variant="outline" @click="resetForm">Отправить ещё один</Button>
          <Button variant="ghost" @click="router.push({ name: 'landing' })">На главную</Button>
        </CardContent>
      </Card>

      <!-- Form -->
      <Card v-else-if="project">
        <CardHeader>
          <div class="flex items-center gap-3">
            <Avatar
              class="h-10 w-10 rounded-xl text-sm"
              :name="project.name"
              :src="project.avatar_url"
            />
            <div class="min-w-0">
              <CardTitle class="truncate text-base">{{ project.name }}</CardTitle>
              <CardDescription v-if="project.description" class="line-clamp-2">
                {{ project.description }}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form v-if="step === 'form'" class="space-y-4" @submit.prevent="handleSubmit">
            <div class="space-y-1.5">
              <Label for="report-title">Заголовок *</Label>
              <Input
                id="report-title"
                v-model="title"
                placeholder="Коротко о проблеме"
                maxlength="200"
                :disabled="loading"
                autocomplete="off"
              />
            </div>

            <div class="space-y-1.5">
              <Label for="report-description">Что произошло *</Label>
              <Textarea
                id="report-description"
                v-model="description"
                placeholder="Шаги воспроизведения, что ожидалось, что получилось..."
                maxlength="4000"
                :rows="6"
                :disabled="loading"
              />
            </div>

            <div v-if="!auth.isAuthenticated" class="space-y-1.5">
              <Label for="report-email">Почта *</Label>
              <Input
                id="report-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                :disabled="loading"
                autocomplete="email"
              />
              <p class="text-xs text-muted-foreground">
                Пришлём код подтверждения — без пароля. Почта останется вашим аккаунтом на BugBoard.
              </p>
            </div>

            <p v-else class="text-sm text-muted-foreground">Отправляете как {{ reporterEmail }}</p>

            <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>

            <Button type="submit" class="w-full gap-2" :disabled="loading || !title.trim()">
              <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              {{ loading ? 'Отправляем…' : 'Отправить репорт' }}
            </Button>
          </form>

          <form v-else class="space-y-4" @submit.prevent="handleVerify">
            <div class="space-y-1.5">
              <Label for="report-otp">Код из письма</Label>
              <p class="text-sm text-muted-foreground">
                Мы отправили код на {{ email }}. Вставьте его, чтобы отправить репорт — черновик
                сохранён.
              </p>
              <Input
                id="report-otp"
                v-model="otpCode"
                type="text"
                inputmode="numeric"
                placeholder="123456"
                :disabled="loading"
                autocomplete="one-time-code"
                autofocus
              />
            </div>

            <div class="rounded-md border border-border bg-muted/40 p-3">
              <p class="truncate text-sm font-medium">{{ title }}</p>
              <p class="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted-foreground">
                {{ description }}
              </p>
            </div>

            <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>

            <Button type="submit" class="w-full gap-2" :disabled="loading">
              <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
              {{ loading ? 'Отправляем…' : 'Подтвердить и отправить' }}
            </Button>

            <div class="flex items-center justify-between text-sm">
              <button
                type="button"
                class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                :disabled="loading"
                @click="backToForm"
              >
                Изменить репорт
              </button>
              <button
                type="button"
                class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
                :disabled="loading"
                @click="resendCode"
              >
                Отправить код ещё раз
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  </main>
</template>
