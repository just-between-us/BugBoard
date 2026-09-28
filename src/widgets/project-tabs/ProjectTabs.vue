<script setup lang="ts">
import { Bug, AlertTriangle, Users, Settings } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { Badge } from '@/components/ui/badge'

interface Props {
  activeTab: 'bugs' | 'reports' | 'members' | 'settings'
  onUpdateTab: (tab: 'bugs' | 'reports' | 'members' | 'settings') => void
}

const props = defineProps<Props>()
const projectsStore = useProjectsStore()

const tabs = [
  { id: 'bugs', label: 'Баги', icon: Bug },
  { id: 'reports', label: 'Репорты', icon: AlertTriangle },
  { id: 'members', label: 'Участники', icon: Users },
  { id: 'settings', label: 'Настройки', icon: Settings },
] as const
</script>

<template>
  <div class="border-b border-border">
    <nav class="flex gap-1" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="[
          'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
          props.activeTab === tab.id
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted',
        ]"
        @click="props.onUpdateTab(tab.id)"
        role="tab"
        :aria-selected="props.activeTab === tab.id"
      >
        <component :is="tab.icon" class="h-4 w-4" />
        <span>{{ tab.label }}</span>
        <Badge
          v-if="tab.id === 'bugs' && projectsStore.bugs.length > 0"
          variant="secondary"
          class="ml-1"
        >
          {{ projectsStore.bugs.length }}
        </Badge>
      </button>
    </nav>
  </div>
</template>