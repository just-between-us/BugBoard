<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { AlertTriangle, ChevronLeft, Lock, SearchX, ShieldAlert } from '@lucide/vue'
import type { Bug } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import BugDetailHeader from '@/widgets/bug-detail-header/BugDetailHeader.vue'
import BugDetailDescription from '@/widgets/bug-detail-description/BugDetailDescription.vue'
import BugDetailComments from '@/widgets/bug-detail-comments/BugDetailComments.vue'
import BugDetailSidebar from '@/widgets/bug-detail-sidebar/BugDetailSidebar.vue'
import BugDetailSkeleton from '@/widgets/bug-detail-skeleton/BugDetailSkeleton.vue'

type PageState = 'loading' | 'ready' | 'no-project' | 'no-bug' | 'no-access' | 'error'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed<string>(() => route.params.projectId as string)
const bugId = computed<string>(() => route.params.bugId as string)

const state = ref<PageState>('loading')
const pageError = ref<string | null>(null)
const bug = ref<Bug | null>(null)

const attrSaving = ref(false)
const attrError = ref<string | null>(null)
const errorContext = ref<'title' | 'description' | 'attributes' | null>(null)
const savedFlash = ref(false)

const original = ref<{ title: string; description: string | null; created_by: string } | null>(null)
const editingTitle = ref(false)
const editingDescription = ref(false)

const project = computed(() => projectsStore.currentProject)
const projectName = computed(() => project.value?.name ?? null)

const titleError = computed(() => (errorContext.value === 'title' ? attrError.value : null))
const descriptionError = computed(() =>
  errorContext.value === 'description' ? attrError.value : null,
)
const attributesError = computed(() =>
  errorContext.value === 'attributes' ? attrError.value : null,
)

const isDirty = computed(() => {
  if (!bug.value || !original.value) return false
  return (
    bug.value.title !== original.value.title ||
    (bug.value.description ?? null) !== original.value.description ||
    bug.value.created_by !== original.value.created_by
  )
})

const canRevert = computed(() => isDirty.value || editingTitle.value || editingDescription.value)

async function load() {
  state.value = 'loading'
  pageError.value = null
  bug.value = null
  attrError.value = null
  errorContext.value = null
  original.value = null
  editingTitle.value = false
  editingDescription.value = false
  projectsStore.clearProfiles()
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
    await projectsStore.loadProfiles([visibleBug.created_by])
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

const patchTitle = (updates: Partial<Bug>) => patchBug(updates, 'title')
const patchDescription = (updates: Partial<Bug>) => patchBug(updates, 'description')
const patchAttributes = (updates: Partial<Bug>) => patchBug(updates, 'attributes')

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
    <BugDetailSkeleton v-if="state === 'loading'" />

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
      <BugDetailHeader
        v-model:editing="editingTitle"
        :bug="bug"
        :project-id="projectId"
        :project-name="projectName"
        :saving="attrSaving"
        :error="titleError"
        :can-revert="canRevert"
        :patch="patchTitle"
        @revert="revertChanges"
      />

      <!-- Content -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <BugDetailDescription
            v-model:editing="editingDescription"
            :bug="bug"
            :saving="attrSaving"
            :error="descriptionError"
            :patch="patchDescription"
          />

          <BugDetailComments :bug="bug" />
        </div>

        <!-- Sidebar -->
        <BugDetailSidebar
          :bug="bug"
          :saving="attrSaving"
          :error="attributesError"
          :saved-flash="savedFlash"
          :patch="patchAttributes"
        />
      </div>
    </template>
  </div>
</template>
