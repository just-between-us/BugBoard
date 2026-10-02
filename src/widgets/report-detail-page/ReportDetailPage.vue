<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle, ArrowLeft, Inbox } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useProjectsStore, type Bug, type Project, type Report } from '@/stores/projects'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ReportAuthGate from '@/widgets/report-auth-gate/ReportAuthGate.vue'
import ReportDetailSkeleton from '@/widgets/report-detail-skeleton/ReportDetailSkeleton.vue'
import ReportDetailCard from '@/widgets/report-detail-card/ReportDetailCard.vue'
import ReportManage from '@/widgets/report-manage/ReportManage.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const projectsStore = useProjectsStore()

const reportId = computed(() => route.params.reportId as string)

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

function revertReply() {
  replyDraft.value = report.value?.reply ?? ''
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
      <ReportAuthGate v-if="!auth.isAuthenticated" />

      <!-- Loading -->
      <ReportDetailSkeleton v-else-if="loading" />

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
      <ReportDetailCard
        v-else-if="report"
        :report="report"
        :project="project"
        :can-manage="canManage"
      >
        <ReportManage
          v-if="canManage"
          :report="report"
          :saving="saving"
          :error="saveError"
          :project-bugs="projectBugs"
          :bugs-loading="bugsLoading"
          :bugs-error="bugsError"
          :reply-draft="replyDraft"
          :reply-dirty="replyDirty"
          :can-save-reply="canSaveReply"
          :patch="persist"
          @update:replyDraft="replyDraft = $event"
          @saveReply="saveReply"
          @revertReply="revertReply"
        />
      </ReportDetailCard>
    </div>
  </main>
</template>
