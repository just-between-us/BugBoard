<script setup lang="ts">
import { computed } from 'vue'
import { Bug, AlertTriangle, Users, Settings, ChartColumn } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { useScrollEdges } from '@/lib/useScrollEdges'
import { Badge } from '@/components/ui/badge'

type TabId = 'bugs' | 'reports' | 'members' | 'stats' | 'settings'

interface Props {
  activeTab: TabId
  onUpdateTab: (tab: TabId) => void
}

const props = defineProps<Props>()
const projectsStore = useProjectsStore()

const { scroller, scrolledStart, scrolledEnd, updateEdges } = useScrollEdges()

const tabs = [
  { id: 'bugs', label: 'Баги', icon: Bug },
  { id: 'reports', label: 'Репорты', icon: AlertTriangle },
  { id: 'members', label: 'Участники', icon: Users },
  { id: 'stats', label: 'Статистика', icon: ChartColumn },
  { id: 'settings', label: 'Настройки', icon: Settings },
] as const

// Бейджи показываем только если счётчики загружены для текущего проекта
const reportsCount = computed(() =>
  projectsStore.tabsCounts.projectId === projectsStore.currentProject?.id
    ? projectsStore.tabsCounts.reports
    : null,
)
const membersCount = computed(() =>
  projectsStore.tabsCounts.projectId === projectsStore.currentProject?.id
    ? projectsStore.tabsCounts.members
    : null,
)

function tabCount(tabId: TabId): number | null {
  const count =
    tabId === 'bugs'
      ? projectsStore.bugs.length
      : tabId === 'reports'
        ? reportsCount.value
        : tabId === 'members'
          ? membersCount.value
          : null
  return count !== null && count > 0 ? count : null
}
</script>

<template>
  <div class="border-b border-border">
    <div
      ref="scroller"
      class="scroll-x-fade overflow-x-auto"
      :class="{ 'is-scrolled-start': scrolledStart, 'is-scrolled-end': scrolledEnd }"
      @scroll.passive="updateEdges"
    >
      <nav class="flex w-max gap-1" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            props.activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted',
          ]"
          @click="props.onUpdateTab(tab.id)"
          role="tab"
          :aria-selected="props.activeTab === tab.id"
        >
          <component :is="tab.icon" class="h-4 w-4 shrink-0" />
          <span>{{ tab.label }}</span>
          <Badge v-if="tabCount(tab.id)" variant="secondary" class="ml-1">
            {{ tabCount(tab.id) }}
          </Badge>
        </button>
      </nav>
    </div>
  </div>
</template>
