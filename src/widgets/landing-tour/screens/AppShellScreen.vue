<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  Bug,
  ChartColumn,
  Check,
  ChevronsUpDown,
  Copy,
  Globe,
  Link2,
  Lock,
  Search,
  Settings,
  Users,
  X,
} from '@lucide/vue'
import { tourState, type TourTab } from '../tourState'
import MockBugCard from '../parts/MockBugCard.vue'
import MockReportCard from '../parts/MockReportCard.vue'
import MockSidebar from '../parts/MockSidebar.vue'

/** Шаги 3–5 и 7: оболочка приложения — сайдбар, шапка проекта, вкладки и их содержимое. */
const state = tourState

const tabs: { key: TourTab; label: string; icon: typeof Bug; count?: number }[] = [
  { key: 'bugs', label: 'Баги', icon: Bug, count: 12 },
  { key: 'reports', label: 'Репорты', icon: AlertTriangle, count: 3 },
  { key: 'members', label: 'Участники', icon: Users, count: 4 },
  { key: 'stats', label: 'Статистика', icon: ChartColumn },
  { key: 'settings', label: 'Настройки', icon: Settings },
]

const bugs = [
  {
    id: '#A3F1',
    title: 'Кнопка входа через GitHub не создаёт аккаунт',
    description:
      'После редиректа с GitHub окно закрывается, пользователь не появляется в базе. На Safari 17 воспроизводится стабильно.',
    area: 'auth',
    severity: 'critical',
    status: 'in_progress',
    time: 'сегодня, 14:02',
  },
  {
    id: '#C9D2',
    title: 'Таймаут при массовой загрузке файлов',
    description: 'Больше 20 файлов подряд обрываются на 30-й секунде без ошибки в логах.',
    area: 'performance',
    severity: 'major',
    status: 'in_progress',
    time: 'вчера, 18:40',
  },
  {
    id: '#E7B4',
    title: 'Съезжает шапка на мобильных экранах',
    description: 'На ширине до 380px навигация наезжает на логотип при открытой клавиатуре.',
    area: 'ui',
    severity: 'major',
    status: 'discovered',
    time: '17 окт, 11:20',
  },
  {
    id: '#D4C7',
    title: 'Дубли комментариев при быстрых кликах',
    description: 'Двойной клик по «Отправить» создаёт два одинаковых комментария.',
    area: 'api',
    severity: 'minor',
    status: 'fixed',
    time: '16 окт, 09:12',
  },
]

const visibleBugs = computed(() =>
  state.bugStatus === 'all' ? bugs : bugs.filter((bug) => bug.status === 'in_progress'),
)

const REPORT_LINK = 'bugboard.app/report/9f3c…d21'
</script>

<template>
  <div class="absolute inset-0 flex bg-background">
    <MockSidebar :switcher-open="state.switcherOpen" :active-tab="state.activeTab" />

    <main class="relative min-w-0 flex-1 overflow-hidden">
      <!-- Шапка проекта -->
      <header class="flex items-start gap-4 px-6 pt-5 pb-4">
        <span
          class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-lg font-semibold"
        >
          A
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-semibold tracking-tight">auth-service</h1>
            <Globe v-if="state.settingsPublic" class="h-4 w-4 text-muted-foreground" />
            <Lock v-else class="h-4 w-4 text-muted-foreground" />
          </div>
          <p class="mt-0.5 text-sm text-muted-foreground">Сервис авторизации и входа</p>
          <p class="mt-1 font-mono text-[11px] text-muted-foreground">
            ID: a3f1…9d2c · Создан: 18 окт
          </p>
        </div>
        <button
          v-if="state.settingsPublic"
          type="button"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
        >
          <Link2 class="h-3.5 w-3.5" />
          Ссылка для репортёров
          <Copy class="h-3 w-3 text-muted-foreground" />
        </button>
      </header>

      <!-- Вкладки -->
      <nav class="flex gap-1 border-b border-border px-6">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          :data-tour="`tab-${tab.key}`"
          class="inline-flex items-center gap-1.5 border-b-2 px-2.5 pb-2 text-sm whitespace-nowrap"
          :class="
            state.activeTab === tab.key
              ? 'border-primary font-medium text-primary'
              : 'border-transparent text-muted-foreground'
          "
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
          <span
            v-if="tab.count"
            class="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
          >
            {{ tab.count }}
          </span>
        </span>
      </nav>

      <!-- Вкладка «Баги» -->
      <div v-if="state.activeTab === 'bugs'" class="px-6 pt-4">
        <div class="flex items-center gap-2">
          <div
            class="flex min-h-[36px] flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground"
          >
            <Search class="h-4 w-4" />
            Поиск по названию, описанию, ID...
          </div>
          <button
            type="button"
            class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            + Создать баг
          </button>
        </div>

        <!-- Фильтры -->
        <div class="relative mt-3 flex items-center gap-2">
          <button
            type="button"
            data-tour="bug-status-filter"
            class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
            :class="state.bugStatus !== 'all' && 'border-primary/40 bg-primary/5'"
          >
            Статус: {{ state.bugStatus === 'all' ? 'Все статусы' : 'В работе' }}
            <ChevronsUpDown class="h-3 w-3 text-muted-foreground" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            Важность: Все важности
            <ChevronsUpDown class="h-3 w-3" />
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-muted-foreground"
          >
            Область: Все области
            <ChevronsUpDown class="h-3 w-3" />
          </button>

          <div
            v-if="state.statusMenuOpen"
            class="tour-depth-front absolute top-full left-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <div class="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Статус</div>
            <div class="cursor-default rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60">
              Все статусы
            </div>
            <div class="cursor-default rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60">
              Обнаружен
            </div>
            <div class="cursor-default rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60">
              Подтверждён
            </div>
            <div
              data-tour="bug-status-in-progress"
              class="cursor-default rounded-sm bg-secondary px-2 py-1.5 text-xs font-medium"
            >
              В работе
            </div>
          </div>
        </div>

        <!-- Список багов -->
        <TransitionGroup tag="div" name="tour-list" class="mt-4 space-y-3">
          <MockBugCard
            v-for="(bug, index) in visibleBugs"
            :key="bug.id"
            :bug="bug"
            :data-tour="index === 0 ? 'bug-card' : undefined"
          />
        </TransitionGroup>
      </div>

      <!-- Вкладка «Репорты» -->
      <div v-else-if="state.activeTab === 'reports'" class="px-6 pt-4">
        <div class="flex items-center gap-2">
          <p class="text-sm font-medium">Репорты</p>
          <span class="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium">3</span>
          <div
            class="ml-auto flex min-h-[32px] w-64 items-center gap-2 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground"
          >
            <Search class="h-3.5 w-3.5" />
            Поиск по репортам...
          </div>
        </div>

        <div class="mt-3 space-y-3">
          <MockReportCard
            :status="state.reportStatus"
            :menu-open="state.reportMenuOpen"
            :reply-open="state.replyOpen"
            :reply-text="state.replyText"
            :reply-sent="state.replySent"
            :linked="state.linked"
            :reply-focused="state.focused === 'report-reply'"
          />

          <!-- Намёк на продолжение списка; якорь для парковки курсора в конце тура -->
          <div
            data-tour="park"
            class="pointer-events-none rounded-lg border border-border bg-card p-4 opacity-50"
          >
            <div class="flex items-center gap-2">
              <span class="h-2 w-2 rounded-full bg-blue-500" />
              <span class="text-xs font-medium"
                >Не открывается страница оплаты после 3D-secure</span
              >
              <span class="ml-auto text-[11px] text-muted-foreground">17 окт · 09:15</span>
            </div>
            <p class="mt-1.5 line-clamp-1 text-xs text-muted-foreground">
              После возврата из банка редирект ведёт на пустую страницу.
            </p>
          </div>
        </div>
      </div>

      <!-- Вкладка «Настройки» -->
      <div v-else-if="state.activeTab === 'settings'" class="px-6 pt-4">
        <div class="rounded-lg border border-border bg-card p-5">
          <div class="flex items-start justify-between">
            <div>
              <h3 class="text-sm font-semibold">Видимость</h3>
              <p class="mt-0.5 text-xs text-muted-foreground">
                Публичный проект принимает репорты по ссылке, приватный — только от участников
              </p>
            </div>
            <button
              type="button"
              class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Сохранить
            </button>
          </div>

          <div class="mt-4 flex items-center justify-between gap-6">
            <div class="flex items-center gap-2.5" data-tour="settings-public">
              <span
                class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border"
                :class="
                  state.settingsPublic
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input'
                "
              >
                <Check v-if="state.settingsPublic" class="h-3 w-3" />
              </span>
              <span class="text-sm">Публичный проект</span>
            </div>

            <!-- Ссылка для репортёров: появляется из глубины при публичности -->
            <Transition
              enter-active-class="tour-depth-enter"
              enter-from-class="tour-depth-enter-from"
              leave-active-class="tour-depth-leave"
              leave-to-class="tour-depth-leave-to"
            >
              <div v-if="state.settingsPublic" class="flex items-center gap-2">
                <span
                  class="rounded-md border border-input bg-muted/40 px-2.5 py-1.5 font-mono text-xs"
                >
                  {{ REPORT_LINK }}
                </span>
                <button
                  type="button"
                  data-tour="settings-copy"
                  class="relative inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-xs font-medium"
                >
                  <template v-if="state.copied">
                    <Check class="h-3.5 w-3.5 text-emerald-600" />
                    <span class="text-emerald-600">Скопировано</span>
                  </template>
                  <template v-else>
                    <Copy class="h-3.5 w-3.5" />
                    Копировать ссылку
                  </template>
                </button>
              </div>
            </Transition>
          </div>

          <p class="mt-3 text-[11px] text-muted-foreground">
            {{
              state.settingsPublic
                ? 'У всех, кому выдали ссылку, по ней всё ещё откроется страница репорта'
                : 'После перехода в приватный режим ссылка для репортёров перестанет работать'
            }}
          </p>
        </div>

        <div class="mt-4 rounded-lg border border-severity-critical/30 bg-card p-5">
          <h3 class="text-sm font-semibold text-severity-critical">Опасная зона</h3>
          <p class="mt-0.5 text-xs text-muted-foreground">
            Удаление проекта необратимо: баги и репорты перестанут открываться
          </p>
        </div>
      </div>

      <!-- Деталь бага: приподнимается из списка в глубину -->
      <template v-if="state.bugDetail">
        <div class="absolute inset-0 bg-black/40" />
        <div
          class="tour-depth-front absolute top-1/2 left-1/2 w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-[0_32px_80px_-40px_rgba(0,0,0,0.6)]"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="font-mono text-[11px] text-muted-foreground">#A3F1</p>
              <h3 class="mt-1 text-lg font-semibold tracking-tight">
                Кнопка входа через GitHub не создаёт аккаунт
              </h3>
            </div>
            <button
              type="button"
              data-tour="bug-detail-close"
              class="rounded-md p-1.5 text-muted-foreground"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
          <p class="mt-3 text-sm text-muted-foreground">
            После редиректа с GitHub окно закрывается, пользователь не появляется в базе. На Safari
            17 воспроизводится стабильно. Требуется проверить exchangeCodeForSession и логи
            callback-URL.
          </p>
          <div class="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 border-t border-border pt-4 text-xs">
            <p class="flex justify-between">
              <span class="text-muted-foreground">Статус</span><span>В работе</span>
            </p>
            <p class="flex justify-between">
              <span class="text-muted-foreground">Важность</span><span>Критический</span>
            </p>
            <p class="flex justify-between">
              <span class="text-muted-foreground">Область</span><span>Авторизация</span>
            </p>
            <p class="flex justify-between">
              <span class="text-muted-foreground">Автор</span><span>Анна</span>
            </p>
          </div>
          <div class="mt-4 rounded-md border border-border bg-muted/30 p-3 text-xs">
            <p class="font-medium">Репорты бага</p>
            <p class="mt-1 text-muted-foreground">
              1 репорт привязан — «Кнопка входа через GitHub не работает» от Дмитрия К.
            </p>
          </div>
        </div>
      </template>
    </main>
  </div>
</template>
