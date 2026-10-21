<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import {
  Bug as BugIcon,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  Copy,
  Link2,
  Loader2,
  MessageSquare,
  Pencil,
  Search,
  Send,
  Unlink,
  UserRound,
} from '@lucide/vue'
import { tourState } from '../tourState'
import MockSidebar from '../parts/MockSidebar.vue'
import TourBurst from '../parts/TourBurst.vue'
import TourSparkles from '../parts/TourSparkles.vue'
import { REPORT_STATUS_BADGE, reportStatusLabel } from '@/entities/report'
import {
  areaIcon,
  areaOptions,
  optionLabel,
  SEVERITY_BADGE,
  SEVERITY_BG,
  severityOptions,
  statusIcon,
  statusOptions,
  STATUS_BADGE,
} from '@/entities/bug/meta'

/**
 * Шаг «Баги»: страница бага в анатомии реального BugDetailPage — «Назад к
 * проекту», шапка BugDetailHeader с полным UUID, описание, комментарии (прилетают
 * штампом — та же механика, что у публичных карточек в шаге 02), репорты и сбоку
 * атрибуты с автосохранением. Основной экран скроллится translate'ом (не transform),
 * чтобы кивок tour-page-thud не сбивал прокрутку.
 */
const state = tourState

const BUG_ID = '30a09dcb-be14-48c6-afda-cc048c1f7b0e'
const BUG_TITLE = 'Кнопка входа через GitHub не создаёт аккаунт'
const BUG_DESC =
  'После редиректа с GitHub окно закрывается, пользователь не появляется в базе. На Safari 17 воспроизводится стабильно. Требуется проверить exchangeCodeForSession и логи callback-URL.'
const SEVERITY = 'critical'
const AREA = 'auth'

/** Вспышки частиц в точке прилёта комментария — копия механики ProjectsScreen. */
const bursts = ref<Set<string>>(new Set())
const shaking = ref(false)
let thudTimer: ReturnType<typeof setTimeout> | undefined

function burstAt(key: string): void {
  bursts.value.add(key)
  // Таймер длиннее жизни вспышек (~0.8s), чтобы частицы не обрывались на полёте
  setTimeout(() => bursts.value.delete(key), 1100)
}

function thud(): void {
  if (thudTimer !== undefined) clearTimeout(thudTimer)
  // Сброс класса перед добавлением — иначе анимация не перезапустится
  shaking.value = false
  void nextTick(() => {
    shaking.value = true
    thudTimer = setTimeout(() => {
      shaking.value = false
      thudTimer = undefined
    }, 560)
  })
}

// Комментарий прилетает — вспышка над ним и кивок страницы от удара
watch(
  () => state.bugComments.length,
  (length, prev) => {
    if (length > (prev ?? 0)) {
      burstAt(`c-${length - 1}`)
      thud()
    }
  },
)

// Повтор шага или перемотка — вспышки прошлого запуска не должны доживать
watch(
  () => state.epoch,
  () => {
    if (thudTimer !== undefined) clearTimeout(thudTimer)
    thudTimer = undefined
    shaking.value = false
    bursts.value.clear()
  },
)
</script>

<template>
  <div class="absolute inset-0 flex bg-background">
    <MockSidebar
      :switcher-open="state.switcherOpen"
      active-tab="bugs"
      :collapsed="!state.sidebarOpen"
      :project="state.switcherProject"
      :hot-all="state.navHotAll"
    />

    <main class="relative min-w-0 flex-1 overflow-hidden">
      <!-- Контейнер как в BugDetailPage: mx-auto max-w-6xl px-6 py-6.
           Скролл — свойство translate; tour-page-thud живёт на transform и их не трогает -->
      <div
        class="mx-auto max-w-6xl px-6 py-6 transition-[translate] duration-500 ease-out"
        :class="shaking && 'tour-page-thud'"
        :style="{ translate: `0 -${state.bugScroll}px` }"
      >
        <button
          type="button"
          data-tour="bug-back"
          class="mb-4 inline-flex h-8 items-center gap-1 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <ChevronLeft class="h-4 w-4" />
          Назад к проекту
        </button>

        <!-- Шапка бага — анатомия BugDetailHeader (плитка важности, бейджи,
             ссылки проекта/автора, полный UUID с копированием) -->
        <header class="mb-6 rounded-lg" data-tour="bug-header">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="flex min-w-0 flex-1 flex-col items-start gap-4 sm:flex-row">
              <span
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
                :class="SEVERITY_BG[SEVERITY]"
              >
                <component :is="areaIcon(AREA)" class="h-6 w-6" />
              </span>
              <div class="w-full min-w-0">
                <div class="relative inline-block pr-9">
                  <h1 class="wrap-break-word text-2xl font-semibold tracking-tight">
                    {{ BUG_TITLE }}
                  </h1>
                  <span
                    class="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground"
                    title="Редактировать название"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </span>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    :class="STATUS_BADGE[state.bugPageStatus]"
                  >
                    <component
                      :is="statusIcon(state.bugPageStatus)"
                      class="h-3 w-3"
                      :class="{ 'animate-spin': state.bugPageStatus === 'in_progress' }"
                    />
                    {{ optionLabel(statusOptions, state.bugPageStatus) }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    :class="SEVERITY_BADGE[SEVERITY]"
                  >
                    {{ optionLabel(severityOptions, SEVERITY) }}
                  </span>
                  <span
                    class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                  >
                    Новый
                  </span>
                  <span
                    class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  >
                    <component :is="areaIcon(AREA)" class="h-3 w-3" />
                    {{ optionLabel(areaOptions, AREA) }}
                  </span>
                </div>

                <p class="mt-3 text-sm text-muted-foreground">
                  Проект:
                  <span
                    class="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                    >auth-service</span
                  >
                </p>
                <p class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  Автор:
                  <span
                    class="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground underline underline-offset-4 hover:text-primary"
                  >
                    <span
                      class="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-medium text-primary"
                    >
                      А
                    </span>
                    <span class="truncate">Анна</span>
                  </span>
                </p>
                <span
                  class="mt-3 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground"
                >
                  {{ BUG_ID }}
                  <span
                    class="inline-flex items-center justify-center rounded p-0.5 transition-colors duration-300 ease-out hover:text-foreground"
                    title="Копировать ID"
                  >
                    <Copy class="h-3.5 w-3.5" />
                  </span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <div class="grid gap-6 lg:grid-cols-3">
          <!-- Левая колонка: описание, обсуждение, репорты -->
          <div class="space-y-6 lg:col-span-2">
            <section class="rounded-xl border bg-card py-6 shadow-sm">
              <div class="px-6">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-medium text-muted-foreground">Описание</h2>
                  <span
                    class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground"
                    title="Редактировать описание"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </span>
                </div>
                <p class="mt-3 text-sm leading-relaxed">{{ BUG_DESC }}</p>
              </div>
            </section>

            <!-- Обсуждение: пустое состояние уходит, комментарии прилетают штампом
                 (TransitionGroup смонтирован заранее — иначе первый enter не проиграется) -->
            <section class="rounded-xl border bg-card py-6 shadow-sm" data-tour="bug-comments">
              <div class="px-6">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare class="h-4 w-4 text-muted-foreground" />
                    Комментарии
                  </h2>
                  <span
                    class="rounded-md border border-transparent bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                  >
                    {{ state.bugComments.length }}
                  </span>
                </div>

                <div
                  v-if="state.bugComments.length === 0"
                  class="mt-4 rounded-lg border border-dashed px-6 py-8 text-center"
                >
                  <MessageSquare class="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p class="mt-2 text-sm font-medium">Пока нет комментариев</p>
                  <p class="mt-1 text-xs text-muted-foreground">
                    Обсудите баг с командой — первый комментарий за вами.
                  </p>
                </div>

                <TransitionGroup name="tour-stamp" tag="div" class="mt-4 space-y-4">
                  <article
                    v-for="(comment, index) in state.bugComments"
                    :key="comment.id"
                    class="relative flex gap-3"
                  >
                    <span
                      class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium text-primary"
                    >
                      {{ comment.author.slice(0, 1) }}
                    </span>
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-baseline gap-2">
                        <span class="truncate text-sm font-medium">{{ comment.author }}</span>
                        <span class="text-xs text-muted-foreground">{{ comment.time }}</span>
                      </div>
                      <p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                        {{ comment.text }}
                      </p>
                    </div>
                    <TourBurst v-if="bursts.has(`c-${index}`)" class="absolute top-0 left-9" />
                    <TourSparkles v-if="bursts.has(`c-${index}`)" class="absolute inset-0" />
                  </article>
                </TransitionGroup>

                <!-- Композер как в реальном BugDetailComments -->
                <div class="mt-5 space-y-2">
                  <textarea
                    :rows="3"
                    placeholder="Добавить комментарий… (Ctrl + Enter — отправить)"
                    class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground dark:bg-input/30"
                  ></textarea>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="text-xs text-muted-foreground">0/2000</span>
                    <button
                      type="button"
                      disabled
                      class="inline-flex h-8 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground opacity-50"
                    >
                      <Send class="h-4 w-4" />
                      Отправить
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Репорты: привязанные и свободные — анатомия BugDetailReports -->
            <section class="rounded-xl border bg-card py-6 shadow-sm" data-tour="bug-reports">
              <div class="space-y-4 px-6">
                <div class="flex items-center justify-between gap-3">
                  <h2 class="flex items-center gap-2 text-sm font-medium">
                    <BugIcon class="h-4 w-4 text-muted-foreground" />
                    Репорты
                  </h2>
                  <span
                    class="rounded-md border border-transparent bg-secondary px-1.5 py-0.5 text-xs font-semibold text-secondary-foreground"
                  >
                    1
                  </span>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <div class="relative w-full sm:w-64">
                    <Search
                      class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      type="search"
                      readonly
                      placeholder="Поиск по репортам..."
                      class="h-9 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm shadow-xs dark:bg-input/30"
                      aria-label="Поиск по репортам"
                    />
                  </div>
                  <span
                    class="ml-auto flex h-8 w-36 items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-xs"
                  >
                    Все статусы
                    <ChevronDown class="h-4 w-4 shrink-0 opacity-50" />
                  </span>
                </div>

                <div class="space-y-2">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Привязано
                  </p>
                  <ul class="space-y-2">
                    <li class="flex flex-wrap items-center gap-2 rounded-md border p-2">
                      <span class="min-w-10 flex-1 truncate text-sm font-medium">
                        Кнопка входа через GitHub не работает
                      </span>
                      <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span
                          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          :class="REPORT_STATUS_BADGE['new']"
                        >
                          {{ reportStatusLabel('new') }}
                        </span>
                        <span class="shrink-0 text-xs text-muted-foreground">18 окт.</span>
                        <button
                          type="button"
                          class="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                        >
                          <Unlink class="h-3.5 w-3.5" />
                          Отвязать
                        </button>
                      </div>
                    </li>
                  </ul>
                </div>

                <div class="space-y-2">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Можно привязать
                  </p>
                  <ul class="space-y-2">
                    <li class="flex flex-wrap items-center gap-2 rounded-md border p-2">
                      <span class="min-w-10 flex-1 truncate text-sm font-medium">
                        Логи не сохраняются после перезагрузки страницы
                      </span>
                      <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span
                          class="rounded-full px-2.5 py-0.5 text-xs font-medium"
                          :class="REPORT_STATUS_BADGE['new']"
                        >
                          {{ reportStatusLabel('new') }}
                        </span>
                        <span class="shrink-0 text-xs text-muted-foreground">19 окт.</span>
                        <button
                          type="button"
                          class="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                        >
                          <Link2 class="h-3.5 w-3.5" />
                          Привязать
                        </button>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <!-- Правая колонка: атрибуты с автосохранением и детали -->
          <div class="space-y-6">
            <section class="rounded-xl border bg-card py-6 shadow-sm" data-tour="bug-attrs">
              <div class="px-6">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-sm font-medium">Атрибуты</h2>
                  <span
                    v-if="state.bugSaving"
                    class="inline-flex items-center gap-1 text-xs text-muted-foreground"
                  >
                    <Loader2 class="h-3 w-3 animate-spin" />
                    Сохраняем…
                  </span>
                  <span
                    v-else-if="state.bugSavedFlash"
                    class="text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    Сохранено
                  </span>
                </div>

                <div class="mt-4 space-y-4">
                  <!-- Статус — единственный дропдаун, его и щёлкает тур -->
                  <div class="space-y-1.5">
                    <span class="text-sm font-medium">Статус</span>
                    <div class="relative">
                      <button
                        type="button"
                        data-tour="bug-status"
                        class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                      >
                        <span class="flex min-w-0 items-center gap-2">
                          <component
                            :is="statusIcon(state.bugPageStatus)"
                            class="h-3.5 w-3.5 shrink-0"
                            :class="{ 'animate-spin': state.bugPageStatus === 'in_progress' }"
                          />
                          <span class="truncate">{{
                            optionLabel(statusOptions, state.bugPageStatus)
                          }}</span>
                        </span>
                        <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                      </button>
                      <div
                        v-if="state.bugAttrMenuOpen"
                        class="tour-depth-front absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
                      >
                        <button
                          v-for="opt in statusOptions"
                          :key="opt.value"
                          type="button"
                          :data-tour="`bug-status-${opt.value}`"
                          class="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <Check
                            v-if="state.bugPageStatus === opt.value"
                            class="h-4 w-4 shrink-0"
                          />
                          <span v-else class="h-4 w-4 shrink-0" />
                          <span class="truncate">{{ opt.label }}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Важность -->
                  <div class="space-y-1.5">
                    <span class="text-sm font-medium">Важность</span>
                    <span
                      class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <span
                          class="h-2.5 w-2.5 shrink-0 rounded-full"
                          :class="SEVERITY_BG[SEVERITY]"
                        ></span>
                        <span class="truncate">{{ optionLabel(severityOptions, SEVERITY) }}</span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </span>
                  </div>

                  <!-- Область -->
                  <div class="space-y-1.5">
                    <span class="text-sm font-medium">Область</span>
                    <span
                      class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <component :is="areaIcon(AREA)" class="h-3.5 w-3.5 shrink-0" />
                        <span class="truncate">{{ optionLabel(areaOptions, AREA) }}</span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </span>
                  </div>

                  <!-- Автор -->
                  <div class="space-y-1.5">
                    <span class="text-sm font-medium">Автор</span>
                    <span
                      class="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <UserRound class="h-3.5 w-3.5 shrink-0" />
                        <span class="truncate">Анна</span>
                      </span>
                      <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-xl border bg-card py-6 shadow-sm">
              <div class="px-6">
                <h2 class="text-sm font-medium">Детали</h2>
                <dl class="mt-4 space-y-3 text-sm">
                  <div class="flex items-start justify-between gap-3">
                    <dt class="text-muted-foreground">Создан</dt>
                    <dd class="text-right">18 окт. 2026 г., 14:02</dd>
                  </div>
                  <div class="flex items-start justify-between gap-3">
                    <dt class="text-muted-foreground">Обновлён</dt>
                    <dd class="text-right">22 окт. 2026 г., 15:10</dd>
                  </div>
                  <div class="flex items-start justify-between gap-3">
                    <dt class="text-muted-foreground">ID</dt>
                    <dd class="break-all text-right font-mono text-xs">{{ BUG_ID }}</dd>
                  </div>
                </dl>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
