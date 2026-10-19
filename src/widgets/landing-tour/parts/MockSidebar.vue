<script setup lang="ts">
import {
  AlertTriangle,
  Bug,
  ChartColumn,
  Check,
  ChevronsUpDown,
  FolderKanban,
  PanelLeft,
  Settings,
  Users,
} from '@lucide/vue'
import type { TourTab } from '../tourState'

/** Мок-сайдбар: логотип, «Проекты», переключатель проекта, разделы активного проекта. */
defineProps<{
  switcherOpen: boolean
  activeTab: TourTab
}>()

const sections: { key: TourTab; label: string; icon: typeof Bug; count?: number }[] = [
  { key: 'bugs', label: 'Баги', icon: Bug, count: 12 },
  { key: 'reports', label: 'Репорты', icon: AlertTriangle, count: 3 },
  { key: 'members', label: 'Участники', icon: Users, count: 4 },
  { key: 'stats', label: 'Статистика', icon: ChartColumn },
  { key: 'settings', label: 'Настройки', icon: Settings },
]
</script>

<template>
  <aside class="flex h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar">
    <div class="flex items-center justify-between px-4 py-3.5">
      <span class="font-mono text-sm font-semibold">BugBoard</span>
      <PanelLeft class="h-4 w-4 text-muted-foreground" />
    </div>

    <nav class="space-y-0.5 px-2">
      <div class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground">
        <FolderKanban class="h-4 w-4" />
        Проекты
      </div>
    </nav>

    <div class="mx-3 my-2 h-px bg-border" />

    <!-- Переключатель проекта -->
    <div class="relative px-2">
      <button
        type="button"
        data-tour="switcher"
        class="flex w-full items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      >
        <span
          class="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-semibold"
        >
          A
        </span>
        <span class="truncate font-medium">auth-service</span>
        <ChevronsUpDown class="ml-auto h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div
        v-if="switcherOpen"
        class="absolute top-full left-2 z-30 mt-1 w-48 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        <div
          class="flex items-center gap-2 rounded-sm bg-secondary px-2 py-1.5 text-xs font-medium"
        >
          <span
            class="flex h-5 w-5 items-center justify-center rounded-md bg-secondary-foreground/10 text-[10px] font-semibold"
          >
            A
          </span>
          auth-service
          <Check class="ml-auto h-3.5 w-3.5" />
        </div>
        <div class="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60">
          <span
            class="flex h-5 w-5 items-center justify-center rounded-md bg-secondary text-[10px] font-semibold"
          >
            W
          </span>
          website-marketing
        </div>
      </div>
    </div>

    <nav class="mt-2 space-y-0.5 px-2">
      <div
        v-for="section in sections"
        :key="section.key"
        :data-tour="`nav-${section.key}`"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
        :class="activeTab === section.key ? 'bg-card font-medium' : 'text-muted-foreground'"
      >
        <component :is="section.icon" class="h-4 w-4" />
        {{ section.label }}
        <span
          v-if="section.count"
          class="ml-auto rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
        >
          {{ section.count }}
        </span>
      </div>
    </nav>

    <div class="mt-auto border-t border-border px-3 py-3">
      <div class="flex items-center gap-2 text-sm">
        <span
          class="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold"
        >
          А
        </span>
        <span class="truncate font-medium">Анна</span>
      </div>
    </div>
  </aside>
</template>
