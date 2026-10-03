<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle, Activity, Bug, ChevronLeft, Info, SearchX } from '@lucide/vue'
import type {
  BugComment,
  BugWithProject,
  PublicProfile,
  Report,
  SharedProject,
} from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { formatDateOnly, toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/avatar'
import BugCard from '@/entities/bug-card/BugCard.vue'
import ActivityHeatmap from '@/entities/activity-heatmap/ActivityHeatmap.vue'
import ActivityFeed from '@/entities/activity-feed/ActivityFeed.vue'

type PageState = 'loading' | 'ready' | 'not-found' | 'error'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const userId = computed(() => route.params.userId as string)

const state = ref<PageState>('loading')
const pageError = ref<string | null>(null)
const profile = ref<PublicProfile | null>(null)

const bugs = ref<BugWithProject[]>([])
const bugsLoading = ref(false)
const bugsError = ref<string | null>(null)

const comments = ref<BugComment[]>([])
const reports = ref<Report[]>([])
const activityLoading = ref(false)
const activityError = ref<string | null>(null)
const sharedProjects = ref<SharedProject[] | null>(null)

const heatmapDates = computed(() => [
  ...bugs.value.map((b) => b.created_at),
  ...comments.value.map((c) => c.created_at),
  ...reports.value.map((r) => r.created_at),
])

const isOwnProfile = computed(() => !!authStore.user && authStore.user.id === userId.value)

async function load() {
  state.value = 'loading'
  pageError.value = null
  profile.value = null
  bugs.value = []
  bugsError.value = null
  comments.value = []
  reports.value = []
  activityError.value = null
  sharedProjects.value = null

  try {
    const visibleProfile = await projectsStore.fetchProfileById(userId.value)
    if (!visibleProfile) {
      state.value = 'not-found'
      return
    }
    profile.value = visibleProfile
    state.value = 'ready'
    void loadBugs()
    if (isOwnProfile.value) void loadActivity()
    if (!isOwnProfile.value) void loadSharedProjects()
  } catch (e) {
    pageError.value = toUserError(e)
    state.value = 'error'
  }
}

async function loadBugs() {
  bugsLoading.value = true
  bugsError.value = null
  try {
    bugs.value = await projectsStore.fetchBugsByAuthor(userId.value)
  } catch (e) {
    bugsError.value = toUserError(e)
  } finally {
    bugsLoading.value = false
  }
}

async function loadActivity() {
  activityLoading.value = true
  activityError.value = null
  try {
    const [commentList, reportList] = await Promise.all([
      projectsStore.fetchCommentsByAuthor(userId.value),
      projectsStore.fetchReportsByReporter(userId.value),
    ])
    comments.value = commentList
    reports.value = reportList
  } catch (e) {
    activityError.value = toUserError(e)
  } finally {
    activityLoading.value = false
  }
}

async function loadSharedProjects() {
  try {
    sharedProjects.value = await projectsStore.fetchSharedProjects(userId.value)
  } catch {
    sharedProjects.value = null
  }
}

function goBack() {
  if (window.history.state?.back) router.back()
  else router.push({ name: 'projects' })
}

watch(userId, load, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-6">
    <Button variant="ghost" size="sm" class="mb-4 gap-1" @click="goBack">
      <ChevronLeft class="h-4 w-4" />
      Назад
    </Button>

    <!-- Loading -->
    <div v-if="state === 'loading'" class="space-y-6" role="status" aria-label="Загрузка профиля">
      <Card class="gap-4 max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none">
        <CardContent class="flex animate-pulse items-center gap-4 max-sm:px-0">
          <div class="h-16 w-16 shrink-0 rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-6 w-48 rounded bg-muted" />
            <div class="h-4 w-32 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse">
          <Card>
            <CardContent class="p-4">
              <div class="flex items-start gap-3">
                <div class="h-8 w-8 shrink-0 rounded bg-muted" />
                <div class="flex-1 space-y-2">
                  <div class="h-4 w-3/4 rounded bg-muted" />
                  <div class="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <span class="sr-only">Загрузка профиля…</span>
    </div>

    <!-- Not found -->
    <div v-else-if="state === 'not-found'" class="rounded-lg border py-14 text-center">
      <SearchX class="mx-auto h-12 w-12 text-muted-foreground/60" />
      <h1 class="mt-4 text-lg font-medium">Профиль не найден</h1>
      <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Пользователь не существует или был удалён.
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
        <Button variant="outline" size="sm" class="ml-auto" @click="load">Повторить</Button>
      </div>
    </div>

    <!-- Ready -->
    <template v-else-if="profile">
      <Card class="gap-4 max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none">
        <CardContent class="flex flex-col md:flex-row flex-wrap items-center gap-4 max-sm:px-0">
          <Avatar
            class="h-16 w-16 text-xl"
            :name="profile.display_name"
            :src="profile.avatar_url"
          />
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h1 class="text-2xl font-semibold tracking-tight">
                {{ profile.display_name }}
              </h1>
              <Badge v-if="isOwnProfile" variant="secondary">Это вы</Badge>
            </div>
            <p class="mt-1 text-sm text-muted-foreground">
              Участник с {{ formatDateOnly(profile.created_at) }}
            </p>
          </div>
          <Button
            v-if="isOwnProfile"
            variant="outline"
            size="sm"
            @click="router.push({ name: 'settings' })"
          >
            Редактировать профиль
          </Button>
        </CardContent>
      </Card>

      <!-- Activity (own profile only, RLS) -->
      <section v-if="isOwnProfile" class="mt-6">
        <Card class="max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none">
          <CardContent class="max-sm:px-0">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h2 class="flex items-center gap-2 text-lg font-medium">
                <Activity class="h-5 w-5 text-muted-foreground" />
                Активность
              </h2>
              <span class="text-xs text-muted-foreground">Видна только вам</span>
            </div>

            <div
              v-if="activityLoading || bugsLoading"
              class="mt-4 animate-pulse space-y-2"
              role="status"
              aria-label="Загрузка активности"
            >
              <div class="h-3 w-full rounded bg-muted" />
              <div class="h-3 w-5/6 rounded bg-muted" />
              <span class="sr-only">Загрузка активности…</span>
            </div>

            <div
              v-else-if="activityError"
              class="mt-4 rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
            >
              <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
                <AlertTriangle class="h-4 w-4 shrink-0" />
                <span>{{ activityError }}</span>
                <Button variant="ghost" size="sm" class="ml-auto" @click="loadActivity">
                  Повторить
                </Button>
              </div>
            </div>

            <div v-else class="mt-4 flex flex-wrap items-start justify-center gap-x-6 gap-y-4">
              <div class="max-w-full shrink-0">
                <ActivityHeatmap :dates="heatmapDates" />
              </div>
              <ActivityFeed
                class="min-w-35 flex-1"
                :bugs="bugs"
                :comments="comments"
                :reports="reports"
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <!-- Bugs -->
      <section class="mt-6">
        <div class="flex items-center justify-between gap-3">
          <h2 class="flex items-center gap-2 text-lg font-medium">
            <Bug class="h-5 w-5 text-muted-foreground" />
            Созданные баги
          </h2>
          <Badge v-if="!bugsLoading && !bugsError" variant="secondary">
            {{ bugs.length }}
          </Badge>
        </div>

        <div
          v-if="isOwnProfile"
          class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Баги видите вы и участники ваших проектов.</span>
        </div>
        <div
          v-else-if="sharedProjects && sharedProjects.length > 0"
          class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span class="flex flex-wrap items-center gap-1">
            Вы видите баги только из общих проектов:
            <Badge v-for="project in sharedProjects" :key="project.id" variant="secondary">
              {{ project.name }}
            </Badge>
          </span>
        </div>
        <div
          v-else-if="sharedProjects !== null"
          class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"
        >
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Чтобы увидеть баги, созданные этим пользователем, начните с ним общий проект.
          </span>
        </div>
        <div v-else class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info class="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>Показываются только баги, доступные вам.</span>
        </div>

        <div v-if="bugsLoading" class="mt-4 space-y-3" role="status" aria-label="Загрузка багов">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <Card>
              <CardContent class="p-4">
                <div class="flex items-start gap-3">
                  <div class="h-8 w-8 shrink-0 rounded bg-muted" />
                  <div class="flex-1 space-y-2">
                    <div class="h-4 w-2/3 rounded bg-muted" />
                    <div class="h-3 w-1/3 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <span class="sr-only">Загрузка багов…</span>
        </div>

        <div
          v-else-if="bugsError"
          class="mt-4 rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
        >
          <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
            <AlertTriangle class="h-4 w-4 shrink-0" />
            <span>{{ bugsError }}</span>
            <Button variant="ghost" size="sm" class="ml-auto" @click="loadBugs"> Повторить </Button>
          </div>
        </div>

        <div
          v-else-if="bugs.length === 0"
          class="mt-4 rounded-lg border border-dashed px-6 py-10 text-center"
        >
          <Bug class="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p class="mt-2 text-sm font-medium">Багов пока нет</p>
        </div>

        <div v-else class="mt-4 space-y-3">
          <BugCard
            v-for="bug in bugs"
            :key="bug.id"
            :bug="bug"
            :project-name="bug.projects?.name ?? null"
          />
        </div>
      </section>
    </template>
  </div>
</template>
