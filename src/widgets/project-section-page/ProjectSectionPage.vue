<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import ProjectBugs from '@/widgets/project-bugs/ProjectBugs.vue'
import ProjectReports from '@/widgets/project-reports/ProjectReports.vue'
import ProjectMembers from '@/widgets/project-members/ProjectMembers.vue'
import ProjectStats from '@/widgets/project-stats/ProjectStats.vue'
import ProjectSettings from '@/widgets/project-settings/ProjectSettings.vue'

type Section = 'bugs' | 'reports' | 'members' | 'stats' | 'settings'

interface Props {
  section: Section
}

const props = defineProps<Props>()

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed<string>(() => route.params.id as string)
const isMember = ref(false)
const ready = ref(false)

const sectionLabels: Record<Section, string> = {
  bugs: 'Баги',
  reports: 'Репорты',
  members: 'Участники',
  stats: 'Статистика',
  settings: 'Настройки',
}

let loadSeq = 0

async function load() {
  const id = projectId.value
  if (!id) return
  const seq = ++loadSeq
  ready.value = false

  isMember.value = await projectsStore.isProjectMember(id)
  if (seq !== loadSeq) return

  if (!isMember.value) {
    router.replace({ name: 'project', params: { id } })
    return
  }

  try {
    if (projectsStore.currentProject?.id !== id) {
      await projectsStore.fetchProject(id)
    }
  } catch {
    if (seq === loadSeq) router.replace({ name: 'projects' })
    return
  }

  if (seq === loadSeq) ready.value = true
}

watch(projectId, load, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <div
      v-if="!ready"
      class="animate-pulse space-y-4"
      role="status"
      aria-label="Загрузка раздела проекта"
    >
      <div class="h-6 w-48 bg-muted rounded" />
      <div class="h-32 bg-muted rounded-lg" />
    </div>

    <template v-else>
      <h1 class="mb-5 flex flex-wrap items-baseline gap-2">
        <span class="text-lg font-semibold tracking-tight">
          {{ projectsStore.currentProject?.name }}
        </span>
        <span class="text-sm font-normal text-muted-foreground">
          / {{ sectionLabels[props.section] }}
        </span>
      </h1>

      <ProjectBugs v-if="props.section === 'bugs'" :project-id="projectId" />

      <ProjectReports
        v-else-if="props.section === 'reports'"
        :project-id="projectId"
        :is-member="true"
      />

      <ProjectMembers v-else-if="props.section === 'members'" :project-id="projectId" />

      <ProjectStats v-else-if="props.section === 'stats'" :project-id="projectId" />

      <ProjectSettings v-else :project-id="projectId" />
    </template>
  </div>
</template>
