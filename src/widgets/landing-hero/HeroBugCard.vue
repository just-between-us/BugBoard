<script setup lang="ts">
import {
  areaIcon,
  optionLabel,
  SEVERITY_BG,
  STATUS_BADGE,
  statusIcon,
  statusOptions,
} from '@/entities/bug'

export interface HeroBug {
  id: string
  title: string
  description: string
  area: 'database' | 'ui' | 'auth' | 'api' | 'performance' | 'other'
  severity: 'critical' | 'major' | 'minor'
  status: 'discovered' | 'confirmed' | 'in_progress' | 'fixed'
  time: string
}

defineProps<{ bug: HeroBug }>()

const areaLabels = {
  database: 'БД',
  ui: 'UI',
  auth: 'Auth',
  api: 'API',
  performance: 'Perf',
  other: 'Другое',
} as const
</script>

<template>
  <!-- Презентационная карточка: никаких ссылок/дропдаунов — данные ненастоящие -->
  <div
    class="flex min-w-60 items-start gap-3.5 rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow max-sm:gap-2 max-sm:rounded-lg max-sm:p-2.5"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg max-sm:h-6 max-sm:w-6 max-sm:rounded-md"
      :class="SEVERITY_BG[bug.severity]"
    >
      <component :is="areaIcon(bug.area)" class="h-5 w-5 text-white max-sm:h-3 max-sm:w-3" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3 max-sm:gap-1.5">
        <p class="text-base font-medium leading-snug max-sm:text-xs">{{ bug.title }}</p>
        <span
          class="mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] max-sm:mt-0 max-sm:gap-0.5 max-sm:px-1.5 max-sm:text-[9px]"
          :class="STATUS_BADGE[bug.status]"
        >
          <component
            :is="statusIcon(bug.status)"
            class="h-3 w-3 max-sm:h-2.5 max-sm:w-2.5"
            :class="bug.status === 'in_progress' && 'animate-spin'"
          />
          {{ optionLabel(statusOptions, bug.status) }}
        </span>
      </div>
      <p class="mt-1.5 line-clamp-2 text-sm text-muted-foreground max-sm:mt-1 max-sm:text-[11px]">
        {{ bug.description }}
      </p>
      <p
        class="mt-2.5 flex items-center gap-2 font-mono text-xs text-muted-foreground max-sm:mt-1 max-sm:gap-1 max-sm:text-[10px]"
      >
        <span>{{ bug.id }}</span>
        <span>·</span>
        <span>{{ areaLabels[bug.area] }}</span>
        <span>·</span>
        <span>{{ bug.time }}</span>
      </p>
    </div>
  </div>
</template>
