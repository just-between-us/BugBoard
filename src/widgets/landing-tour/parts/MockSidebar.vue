<script setup lang="ts">
import {
  AlertTriangle,
  Bug,
  ChartColumn,
  Check,
  ChevronsUpDown,
  FolderKanban,
  LogOut,
  PanelLeft,
  Settings,
  Users,
} from '@lucide/vue'
import type { TourTab } from '../tourState'

/**
 * Мок-сайдбар — повторяет реальный AppSidebar, включая collapsed-состояние:
 * свёрнутый рейл w-16 показывает только иконки (подписи, chevron и LogOut скрыты,
 * шапка/переключатель/низ центрируются), развёрнутый — весь контент, без счётчиков
 * (как в реальном сайдбаре — счётчики живут только во вкладках).
 */
defineProps<{
  switcherOpen: boolean
  activeTab: TourTab
  /** Сайдбар свёрнут в рейл w-16 (реальный collapsed). */
  collapsed: boolean
  /** Активный проект переключателя — быстрая смена chevron'ом. */
  project: 'auth-service' | 'website-marketing'
  /** Все пункты разделов зажигаются обводкой разом (финальный бит шага). */
  hotAll: boolean
}>()

const sections: { key: TourTab; label: string; icon: typeof Bug }[] = [
  { key: 'bugs', label: 'Баги', icon: Bug },
  { key: 'reports', label: 'Репорты', icon: AlertTriangle },
  { key: 'members', label: 'Участники', icon: Users },
  { key: 'stats', label: 'Статистика', icon: ChartColumn },
  { key: 'settings', label: 'Настройки', icon: Settings },
]

const PROJECT_LETTERS: Record<'auth-service' | 'website-marketing', string> = {
  'auth-service': 'A',
  'website-marketing': 'W',
}
</script>

<template>
  <aside
    class="relative z-40 flex h-full shrink-0 flex-col justify-between border-r border-border bg-background transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-56'"
  >
    <div>
      <!-- Шапка: логотип и кнопка сворачивания/разворачивания -->
      <div
        class="flex items-center px-3 py-4"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <span v-if="!collapsed" class="font-mono text-sm font-semibold">BugBoard</span>
        <button
          type="button"
          data-tour="sidebar-toggle"
          :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
          class="inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <PanelLeft class="h-4 w-4" />
        </button>
      </div>

      <nav class="mt-4 space-y-1 px-2">
        <div
          data-tour="nav-projects"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <FolderKanban class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">Проекты</span>
        </div>
      </nav>

      <div class="mt-4 space-y-1 border-t border-border px-2 pt-4">
        <!-- Переключатель проекта: hover-строка, контент меняется project-slide'ом -->
        <div
          class="group relative w-full rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          <button
            type="button"
            data-tour="switcher"
            class="relative flex w-full items-center overflow-hidden rounded-md py-2 text-sm"
            :class="collapsed && 'justify-center'"
          >
            <Transition name="project-slide">
              <span
                :key="project"
                class="flex min-w-0 items-center gap-3"
                :class="!collapsed && 'flex-1 px-3'"
              >
                <span
                  class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-medium text-primary"
                >
                  {{ PROJECT_LETTERS[project] }}
                </span>
                <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left">{{
                  project
                }}</span>
                <span v-if="!collapsed" class="h-4 w-4 shrink-0" aria-hidden="true" />
              </span>
            </Transition>
          </button>
          <button
            v-if="!collapsed"
            type="button"
            data-tour="switcher-next"
            class="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground opacity-60 transition group-hover:text-foreground group-hover:opacity-100"
            title="Следующий проект"
            aria-label="Следующий проект"
          >
            <ChevronsUpDown class="h-4 w-4" />
          </button>

          <!-- Список проектов -->
          <div
            v-if="switcherOpen"
            class="tour-depth-front absolute top-full left-2 z-30 mt-1 w-56 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <div
              class="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-medium text-primary"
              >
                A
              </span>
              <span class="min-w-0 flex-1 truncate text-left">auth-service</span>
              <Check v-if="project === 'auth-service'" class="ml-2 h-4 w-4 shrink-0 text-primary" />
            </div>
            <div
              class="relative flex w-full cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span
                class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-medium text-primary"
              >
                W
              </span>
              <span class="min-w-0 flex-1 truncate text-left">website-marketing</span>
              <Check
                v-if="project === 'website-marketing'"
                class="ml-2 h-4 w-4 shrink-0 text-primary"
              />
            </div>
          </div>
        </div>

        <nav class="space-y-1">
          <div
            v-for="section in sections"
            :key="section.key"
            :data-tour="`nav-${section.key}`"
            class="flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors"
            :class="[
              activeTab === section.key
                ? 'bg-card text-foreground'
                : 'text-muted-foreground hover:bg-card hover:text-foreground',
              hotAll && 'tour-hot',
            ]"
          >
            <component :is="section.icon" class="h-4 w-4 shrink-0" />
            <span v-if="!collapsed">{{ section.label }}</span>
          </div>
        </nav>
      </div>
    </div>

    <!-- Низ: профиль и выход — как в реальном AppSidebar (в рейле LogOut скрыт) -->
    <div class="border-t border-border p-2">
      <div class="flex items-center gap-2" :class="collapsed && 'justify-center'">
        <span class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-card">
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium text-primary"
          >
            А
          </span>
          <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left text-sm">Анна</span>
        </span>
        <button
          v-if="!collapsed"
          type="button"
          aria-label="Выйти из аккаунта"
          title="Выйти из аккаунта"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Смена проекта в переключателе: контент уезжает вверх, новый выезжает снизу —
   как Transition name="project-slide" в реальном AppSidebar */
.project-slide-enter-active,
.project-slide-leave-active {
  transition: transform 0.25s ease;
}

.project-slide-leave-active {
  position: absolute;
  inset: 0;
}

.project-slide-enter-from {
  transform: translateY(100%);
}

.project-slide-leave-to {
  transform: translateY(-100%);
}
</style>
