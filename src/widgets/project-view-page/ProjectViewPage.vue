<script setup lang="ts">
import { watch, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, Settings } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import ProjectHeader from '@/widgets/project-header/ProjectHeader.vue'
import ProjectTabs from '@/widgets/project-tabs/ProjectTabs.vue'
import ProjectBugs from '@/widgets/project-bugs/ProjectBugs.vue'
import ProjectMembers from '@/widgets/project-members/ProjectMembers.vue'
import ProjectReports from '@/widgets/project-reports/ProjectReports.vue'
import ProjectStats from '@/widgets/project-stats/ProjectStats.vue'

const route = useRoute()
const router = useRouter()
const projectsStore = useProjectsStore()

const projectId = computed<string>(() => route.params.id as string)

type TabId = 'bugs' | 'reports' | 'members' | 'stats' | 'settings'

const TAB_IDS: readonly string[] = ['bugs', 'reports', 'members', 'stats', 'settings']

const activeTab = computed<TabId>(() => {
  const raw = route.query.tab
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && TAB_IDS.includes(value) ? (value as TabId) : 'bugs'
})

function setActiveTab(tab: TabId) {
  if (tab === activeTab.value) return
  router.replace({ query: { ...route.query, tab: tab === 'bugs' ? undefined : tab } })
}

const isMember = ref(false)

async function loadProject() {
  const id = projectId.value
  if (!id) return
  // Членство проверяем до загрузки проекта: от него зависит режим страницы
  // (полная с вкладками или простой просмотр), поэтому флаг должен быть готов
  // к первому рендеру
  isMember.value = await projectsStore.isProjectMember(id)
  try {
    await projectsStore.fetchProject(id)
    // Баги и вкладки не-участнику не показываются — запрос не нужен
    if (isMember.value) await projectsStore.fetchBugs(id)
  } catch {
    router.push({ name: 'projects' })
  }
}

watch(
  projectId,
  () => {
    projectsStore.clearCurrentProject()
    loadProject()
  },
  { immediate: true },
)
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
    <!-- Back Button -->
    <Button variant="ghost" size="sm" class="mb-4 gap-1" @click="router.push({ name: 'projects' })">
      <ChevronLeft class="h-4 w-4" />
      Назад к проектам
    </Button>

    <!-- Project Header -->
    <ProjectHeader :is-member="isMember" />

    <!-- Loading Project (when no current project yet) -->
    <div v-if="!projectsStore.currentProject" class="animate-pulse space-y-4">
      <div class="h-12 w-3/4 bg-muted rounded-lg" />
      <div class="h-4 w-1/2 bg-muted rounded" />
    </div>

    <!-- Main Content (when project loaded) -->
    <div v-else-if="projectsStore.currentProject">
      <!-- Не участник команды: простой просмотр чужого проекта — только свои репорты -->
      <ProjectReports v-if="!isMember" :project-id="projectId" :is-member="false" />

      <template v-else>
        <!-- Tabs Navigation -->
        <ProjectTabs class="mb-3" :activeTab="activeTab" @updateTab="setActiveTab" />

        <ProjectBugs v-if="activeTab === 'bugs'" :project-id="projectId" />

        <!-- Other Tabs Placeholders -->
        <!-- Members -->
        <ProjectMembers v-else-if="activeTab === 'members'" :project-id="projectId" />

        <ProjectReports
          v-else-if="activeTab === 'reports'"
          :project-id="projectId"
          :is-member="isMember"
        />

        <!-- Stats (только для участников: вкладки рендерятся только в их ветке) -->
        <ProjectStats v-else-if="activeTab === 'stats'" :project-id="projectId" />

        <div v-else-if="activeTab === 'settings'" class="text-center py-12">
          <Settings class="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 class="mt-4 text-lg font-medium">Настройки</h3>
          <p class="mt-1 text-sm text-muted-foreground">Настройки проекта</p>
        </div>
      </template>
    </div>
  </div>
</template>
