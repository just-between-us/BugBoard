<script setup lang="ts">
import { computed } from 'vue'
import {
  AlertTriangle,
  ArrowUpDown,
  Bug,
  Calendar,
  Camera,
  ChartColumn,
  Check,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  Plus,
  Search,
  Send,
  Settings,
  Trash2,
  Users,
  X,
} from '@lucide/vue'
import { tourState, type TourTab } from '../tourState'
import MockBugCard from '../parts/MockBugCard.vue'
import MockReportCard from '../parts/MockReportCard.vue'
import MockSidebar from '../parts/MockSidebar.vue'

/**
 * Шаги 3–5 и 7: оболочка приложения — сайдбар, страница проекта (контейнер
 * mx-auto max-w-6xl px-4 py-6, шапка mb-6, вкладки mb-3), фильтры и сортировка
 * как в реальном BugsFilters, карточки багов как реальный BugCard.
 */
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
    time: '18 окт 2026 г., 14:02',
    isNew: true,
  },
  {
    id: '#C9D2',
    title: 'Таймаут при массовой загрузке файлов',
    description: 'Больше 20 файлов подряд обрываются на 30-й секунде без ошибки в логах.',
    area: 'performance',
    severity: 'major',
    status: 'in_progress',
    time: '17 окт 2026 г., 18:40',
  },
  {
    id: '#E7B4',
    title: 'Съезжает шапка на мобильных экранах',
    description: 'На ширине до 380px навигация наезжает на логотип при открытой клавиатуре.',
    area: 'ui',
    severity: 'major',
    status: 'discovered',
    time: '14 окт 2026 г., 11:20',
  },
  {
    id: '#D4C7',
    title: 'Дубли комментариев при быстрых кликах',
    description: 'Двойной клик по «Отправить» создаёт два одинаковых комментария.',
    area: 'api',
    severity: 'minor',
    status: 'fixed',
    time: '11 окт 2026 г., 09:12',
  },
]

const visibleBugs = computed(() =>
  state.bugStatus === 'all' ? bugs : bugs.filter((bug) => bug.status === 'in_progress'),
)
</script>

<template>
  <div class="absolute inset-0 flex bg-background">
    <MockSidebar
      :switcher-open="state.switcherOpen"
      :active-tab="state.activeTab"
      :collapsed="!state.sidebarOpen"
      :project="state.switcherProject"
      :hot-all="state.navHotAll"
    />

    <main class="relative min-w-0 flex-1 overflow-hidden">
      <!-- Страница проекта — контейнер как в ProjectViewPage (без кнопки «Назад») -->
      <div class="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <!-- Шапка проекта -->
        <header class="mb-6 rounded-lg" data-tour="project-header">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <div class="flex items-start gap-4">
                <div class="relative h-12 w-12 shrink-0">
                  <span
                    class="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-primary/10 text-base font-medium text-primary"
                  >
                    A
                  </span>
                  <span
                    class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground"
                    title="Загрузить аватар"
                  >
                    <Camera class="h-3 w-3" />
                  </span>
                </div>
                <div class="min-w-0">
                  <h1
                    class="flex items-center gap-4 truncate text-2xl font-semibold tracking-tight"
                  >
                    auth-service
                    <Globe v-if="state.settingsPublic" class="mt-1 h-3.5 w-3.5 shrink-0" />
                    <Lock v-else class="mt-1 h-3.5 w-3.5 shrink-0" />
                  </h1>
                  <p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    Сервис авторизации и входа
                  </p>
                  <div class="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
                    <span class="min-w-0 truncate font-mono"
                      >ID: a3f1b27c-8d44-4e19-9f61-2ac5e8a39d2c</span
                    >
                    <span>Создан: 18 окт. 2026 г.</span>
                  </div>
                  <span class="font-mono text-xs text-primary">Вы владелец</span>
                </div>
              </div>
            </div>
            <div v-if="state.settingsPublic" class="ml-auto flex shrink-0 items-center gap-2">
              <span
                class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <Send class="h-3.5 w-3.5" />
                Ссылка для репортёров
              </span>
              <span class="relative inline-flex">
                <Transition name="tour-copy-tip">
                  <span
                    v-if="state.copied"
                    class="absolute bottom-full left-1/2 z-10 mb-1.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-green-600 px-2 py-0.5 text-xs text-white shadow-sm"
                  >
                    Ссылка скопирована
                    <Check class="h-3.5 w-3.5" />
                  </span>
                </Transition>
                <button
                  type="button"
                  data-tour="header-copy"
                  class="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground"
                  title="Копировать ссылку для репортёров"
                  aria-label="Копировать ссылку для репортёров"
                >
                  <Copy class="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          </div>
        </header>

        <!-- Вкладки проекта (p-2 — внутренний отступ под обводку тура) -->
        <nav class="mb-3 rounded-lg border-b border-border p-2" data-tour="project-tabs">
          <div class="flex w-max gap-1">
            <span
              v-for="tab in tabs"
              :key="tab.key"
              :data-tour="`tab-${tab.key}`"
              class="flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors"
              :class="
                state.activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted hover:text-foreground'
              "
            >
              <component :is="tab.icon" class="h-4 w-4 shrink-0" />
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.count"
                class="ml-1 inline-flex items-center rounded-full border border-transparent bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground"
              >
                {{ tab.count }}
              </span>
            </span>
          </div>
        </nav>

        <!-- Вкладка «Баги»: поиск, создание, фильтры и сортировка как в BugsFilters -->
        <div v-if="state.activeTab === 'bugs'">
          <div class="space-y-2 py-2">
            <div class="flex items-center gap-2">
              <div class="relative min-w-0 flex-1">
                <Search
                  class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <div
                  class="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-1 text-base text-muted-foreground shadow-xs md:text-sm"
                >
                  Поиск по названию, описанию, ID...
                </div>
              </div>
              <span
                class="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                <Plus class="mr-2 h-4 w-4" />
                Создать баг
              </span>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <div class="flex min-w-0 flex-1 items-center overflow-x-auto py-1">
                <div class="flex w-max items-center gap-2">
                  <!-- Статус: активный фильтр заменяет триггер чипом, как в реальном -->
                  <div
                    v-if="state.bugStatus !== 'all'"
                    class="flex items-center gap-1 rounded-md bg-secondary px-2 py-1"
                  >
                    <span class="text-sm font-medium">В работе</span>
                    <span
                      class="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                      title="Сбросить фильтр статуса"
                    >
                      <X class="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div v-else class="relative">
                    <button
                      type="button"
                      data-tour="bug-status-filter"
                      class="flex h-9 w-36 cursor-pointer items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <span class="line-clamp-1">Все статусы</span>
                    </button>
                    <!-- Содержимое Select: заголовка нет, у выбранного — галочка справа -->
                    <div
                      v-if="state.statusMenuOpen"
                      class="tour-depth-front absolute top-full left-0 z-30 mt-1 w-36 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                    >
                      <div
                        class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        <span class="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                          <Check class="h-4 w-4" />
                        </span>
                        Все статусы
                      </div>
                      <div
                        class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Обнаружен
                      </div>
                      <div
                        class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Подтверждён
                      </div>
                      <div
                        data-tour="bug-status-in-progress"
                        class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        В работе
                      </div>
                      <div
                        class="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        Исправлен
                      </div>
                    </div>
                  </div>

                  <!-- Важность и область — статичные триггеры -->
                  <div
                    class="flex h-9 w-36 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span class="line-clamp-1">Все важности</span>
                  </div>
                  <div
                    class="flex h-9 w-40 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground"
                  >
                    <span class="line-clamp-1">Все области</span>
                  </div>

                  <!-- Период -->
                  <span
                    class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-normal text-muted-foreground shadow-xs"
                  >
                    <Calendar class="h-3.5 w-3.5" />
                    Период
                  </span>
                </div>
              </div>

              <!-- Сбросить всё — только при активных фильтрах -->
              <span
                v-if="state.bugStatus !== 'all'"
                class="inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-destructive px-3 text-xs font-medium text-white"
              >
                <X class="h-4 w-4" />
                Сбросить всё
              </span>

              <!-- Сортировка: группа «поле + направление» -->
              <div
                class="inline-flex w-fit shrink-0 items-stretch [&>*:not(:first-child)]:border-l-0 [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none"
              >
                <span
                  class="flex h-8 items-center rounded-md border bg-background px-3 text-sm text-foreground shadow-xs"
                  >Дата создания</span
                >
                <span
                  class="inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs"
                  title="По убыванию"
                >
                  <ArrowUpDown class="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          <!-- Список багов -->
          <TransitionGroup tag="div" name="tour-list" class="space-y-3">
            <MockBugCard
              v-for="(bug, index) in visibleBugs"
              :key="bug.id"
              :bug="bug"
              :data-tour="index === 0 ? 'bug-card' : undefined"
            />
          </TransitionGroup>
        </div>

        <!-- Вкладка «Репорты» -->
        <div v-else-if="state.activeTab === 'reports'">
          <div class="flex items-center gap-2 pt-2">
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

        <!-- Вкладка «Настройки»: карточки в анатомии реального Card -->
        <div v-else-if="state.activeTab === 'settings'" class="space-y-4 pb-8">
          <div class="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
            <div class="flex items-start justify-between gap-4 px-6">
              <div class="grid gap-1.5">
                <h3 class="text-base font-semibold leading-none">Видимость</h3>
                <p class="text-sm text-muted-foreground">
                  Публичный проект принимает репорты по ссылке, приватный — только от участников
                </p>
              </div>
              <span
                class="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap self-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all"
                :class="!state.settingsPublic && 'pointer-events-none opacity-50'"
              >
                Сохранить
              </span>
            </div>

            <div class="space-y-4 px-6">
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-2">
                  <span
                    data-tour="settings-public"
                    class="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-[4px] border shadow-xs transition-shadow"
                    :class="
                      state.settingsPublic
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    "
                  >
                    <Check v-if="state.settingsPublic" class="h-3.5 w-3.5" />
                  </span>
                  <span class="cursor-pointer text-sm">Публичный проект</span>
                </div>

                <!-- Ссылка для репортёров: outline-кнопка + CopyButton с зелёным тултипом -->
                <Transition
                  enter-active-class="tour-depth-enter"
                  enter-from-class="tour-depth-enter-from"
                  leave-active-class="tour-depth-leave"
                  leave-to-class="tour-depth-leave-to"
                >
                  <div v-if="state.settingsPublic" class="flex items-center gap-1">
                    <span
                      class="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <ExternalLink class="h-3.5 w-3.5" />
                      Ссылка для репортёров
                    </span>
                    <span class="relative inline-flex">
                      <Transition name="tour-copy-tip">
                        <span
                          v-if="state.copied"
                          class="absolute bottom-full left-1/2 z-10 mb-1.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-green-600 px-2 py-0.5 text-xs text-white shadow-sm"
                        >
                          Ссылка скопирована
                          <Check class="h-3.5 w-3.5" />
                        </span>
                      </Transition>
                      <button
                        type="button"
                        data-tour="settings-copy"
                        class="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground"
                        title="Копировать ссылку для репортёров"
                        aria-label="Копировать ссылку для репортёров"
                      >
                        <Copy class="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </div>
                </Transition>
              </div>

              <p class="text-xs text-muted-foreground">
                {{
                  state.settingsPublic
                    ? 'У всех, кому выдали ссылку, по ней всё ещё откроется страница репорта'
                    : 'После перехода в приватный режим ссылка для репортёров перестанет работать'
                }}
              </p>
            </div>
          </div>

          <div
            class="flex flex-col gap-6 rounded-xl border border-severity-critical/30 bg-card py-6 shadow-sm"
          >
            <div class="flex items-start justify-between gap-4 px-6">
              <div class="grid gap-1.5">
                <h3 class="text-base font-semibold leading-none text-severity-critical">
                  Опасная зона
                </h3>
                <p class="text-sm text-muted-foreground">
                  Проект скрывается из списков, участники теряют к нему доступ
                </p>
              </div>
              <span
                class="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap self-center rounded-md border border-severity-critical/30 bg-background px-4 py-2 text-sm font-medium text-severity-critical shadow-xs transition-colors hover:bg-severity-critical/5"
              >
                <Trash2 class="h-4 w-4" />
                Удалить проект
              </span>
            </div>
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
              После редиректа с GitHub окно закрывается, пользователь не появляется в базе. На
              Safari 17 воспроизводится стабильно. Требуется проверить exchangeCodeForSession и логи
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
      </div>
    </main>

    <!-- Затемнение контента при открытом сайдбаре (шаг «Интерфейс») -->
    <Transition name="tour-overlay">
      <div
        v-if="state.sidebarDim"
        class="pointer-events-none absolute inset-0 z-30 bg-black/50"
        aria-hidden="true"
      />
    </Transition>
  </div>
</template>
