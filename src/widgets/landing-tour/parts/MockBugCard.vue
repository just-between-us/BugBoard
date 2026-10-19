<script setup lang="ts">
import { Bug as BugIcon, Copy, Ellipsis } from '@lucide/vue'
import {
  areaIcon,
  areaOptions,
  optionLabel,
  SEVERITY_BG,
  statusIcon,
  STATUS_BADGE,
} from '@/entities/bug/meta'

/** Мок-карточка бага: повторяет анатомию entities/bug-card на фиктивных данных. */
defineProps<{
  bug: {
    id: string
    title: string
    description: string
    area: string
    severity: string
    status: string
    time: string
  }
}>()

const STATUS_LABEL: Record<string, string> = {
  discovered: 'Обнаружен',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  fixed: 'Исправлен',
}
</script>

<template>
  <article
    class="rounded-lg border border-border bg-card text-left transition-shadow duration-300"
    :class="bug.status === 'in_progress' && 'shadow-[0_10px_30px_-22px_rgba(0,0,0,0.5)]'"
  >
    <div class="flex items-start gap-3 p-4 pb-3">
      <span
        class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary-foreground"
        :class="SEVERITY_BG[bug.severity]"
      >
        <component :is="areaIcon(bug.area)" class="h-4 w-4" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h4 class="truncate text-sm font-medium">{{ bug.title }}</h4>
          <span
            class="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
            :class="STATUS_BADGE[bug.status]"
          >
            <component :is="statusIcon(bug.status)" class="h-3 w-3" />
            {{ STATUS_LABEL[bug.status] }}
          </span>
        </div>
        <p class="mt-1 line-clamp-2 text-xs text-muted-foreground">{{ bug.description }}</p>
      </div>
    </div>
    <div
      class="flex items-center gap-3 border-t border-border px-4 py-2 text-[11px] text-muted-foreground"
    >
      <span class="inline-flex items-center gap-1 font-mono">
        <BugIcon class="h-3 w-3" />
        {{ bug.id }}
      </span>
      <Copy class="h-3 w-3" />
      <span>Создан: {{ bug.time }}</span>
      <span class="ml-auto inline-flex items-center gap-1">
        <component :is="areaIcon(bug.area)" class="h-3 w-3" />
        {{ optionLabel(areaOptions, bug.area) }}
      </span>
      <Ellipsis class="h-3.5 w-3.5" />
    </div>
  </article>
</template>
