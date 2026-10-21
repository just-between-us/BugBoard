<script setup lang="ts">
import { Copy, Ellipsis } from '@lucide/vue'
import {
  areaIcon,
  areaOptions,
  optionLabel,
  SEVERITY_BG,
  statusIcon,
  STATUS_BADGE,
} from '@/entities/bug/meta'

/**
 * Мок-карточка бага — повторяет реальный BugCard: Card (rounded-xl, py-6, shadow-sm),
 * плитка важности rounded-lg с белой иконкой, заголовок 16px с бейджем «Новый»,
 * статус-бейдж с анимированной иконкой и футер в две строки (ID + копирование,
 * дата/область + действия).
 */
defineProps<{
  bug: {
    id: string
    title: string
    description: string
    area: string
    severity: string
    status: string
    time: string
    /** Баг младше суток — зелёный бейдж «Новый» рядом с заголовком. */
    isNew?: boolean
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
    class="flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card py-6 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="px-6 pb-4">
      <div class="flex items-start gap-3">
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
          :class="SEVERITY_BG[bug.severity]"
        >
          <component :is="areaIcon(bug.area)" class="h-4 w-4 text-white" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-4 pb-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <h4 class="truncate font-medium">{{ bug.title }}</h4>
                <span
                  v-if="bug.isNew"
                  class="inline-flex shrink-0 items-center rounded-full border border-transparent bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                >
                  Новый
                </span>
              </div>
              <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{{ bug.description }}</p>
            </div>
            <span
              class="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold"
              :class="STATUS_BADGE[bug.status]"
            >
              <component
                :is="statusIcon(bug.status)"
                class="h-3 w-3"
                :class="{
                  'animate-spin': bug.status === 'in_progress',
                  'animate-eye-look': bug.status === 'discovered',
                }"
              />
              {{ STATUS_LABEL[bug.status] }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-col items-stretch gap-2 border-t px-6 pt-4 text-xs text-muted-foreground">
      <div class="flex min-w-0 items-center gap-1">
        <span class="min-w-0 truncate font-mono">{{ bug.id }}</span>
        <span
          class="inline-flex shrink-0 items-center justify-center rounded p-0.5 text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground"
          title="Копировать ID"
        >
          <Copy class="h-3 w-3" />
        </span>
      </div>
      <div class="flex items-start justify-between gap-2">
        <span class="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <span>Создан: {{ bug.time }}</span>
          <span class="font-medium text-foreground">{{ optionLabel(areaOptions, bug.area) }}</span>
        </span>
        <span
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center self-start rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          title="Действия с багом"
        >
          <Ellipsis class="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  </article>
</template>

<style scoped>
@keyframes eye-look {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

.animate-eye-look {
  animation: eye-look 3s ease-in-out infinite;
  transform-origin: center;
}
</style>
