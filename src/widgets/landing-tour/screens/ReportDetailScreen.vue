<script setup lang="ts">
import {
  ArrowLeft,
  Bug as BugIcon,
  ChevronsUpDown,
  FlagOff,
  Link2,
  MessageSquare,
} from '@lucide/vue'
import { REPORT_STATUS_BADGE, REPORT_STATUS_DOT } from '@/entities/report/meta'
import { tourState } from '../tourState'

/**
 * Шаг «Репорты»: страница репорта `/reports/:id` — краткий обзор
 * (анатомия ReportDetailCard + ReportManage). Клик «/ назад» возвращает
 * во вкладку репортов. Единственный интерактивный бит — привязка к багу.
 */
const state = tourState

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Принят',
  rejected: 'Отклонён',
}

/** Баги проекта в меню привязки — те же, что на вкладке «Баги». */
const PROJECT_BUGS = [
  'Кнопка входа через GitHub не создаёт аккаунт',
  'Таймаут при массовой загрузке файлов',
] as const
</script>

<template>
  <div class="absolute inset-0 overflow-hidden bg-background">
    <div class="mx-auto max-w-2xl px-6 py-8">
      <!-- Навигация страницы -->
      <div class="flex gap-2">
        <span
          class="mb-8 inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft class="h-4 w-4" />
          На главную
        </span>
        <span
          data-tour="report-page-back"
          class="mb-8 inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          / назад
        </span>
      </div>

      <!-- ReportDetailCard -->
      <div class="flex flex-col gap-6 rounded-xl border bg-card py-6 shadow-sm">
        <!-- CardHeader: проект · дата, заголовок, бейджи и автор -->
        <div class="flex flex-col gap-3 px-6">
          <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span
              class="cursor-pointer font-medium text-foreground underline-offset-4 hover:underline"
            >
              auth-service
            </span>
            <span>·</span>
            <span>18 окт 2025</span>
          </div>
          <h3 class="wrap-break-word text-xl font-semibold leading-none">
            Кнопка входа через GitHub не работает
          </h3>
          <div class="flex flex-wrap items-center gap-2">
            <span
              class="inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium"
              :class="REPORT_STATUS_BADGE[state.reportStatus]"
            >
              {{ STATUS_LABEL[state.reportStatus] }}
            </span>
            <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                class="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-[10px] font-medium text-primary"
              >
                ДК
              </span>
              Дмитрий К.
            </span>
          </div>
        </div>

        <!-- CardContent: описание, ответ команды, управление -->
        <div class="space-y-5 px-6">
          <p class="text-sm whitespace-pre-line">
            После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся. На Safari 17
            воспроизводится стабильно.
          </p>

          <!-- Ответ команды -->
          <div v-if="state.replySent" class="rounded-md border border-primary/30 bg-primary/5 p-3">
            <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <MessageSquare class="h-3 w-3" />
              Ответ команды
              <span>· сегодня</span>
            </p>
            <p class="mt-1.5 text-sm whitespace-pre-line">{{ state.replyText }}</p>
          </div>

          <!-- ReportManage: бокс управления репортом -->
          <div class="space-y-4 rounded-md border p-4">
            <p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Управление репортом
            </p>

            <!-- Статус и флаг — сеткой, статично -->
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-1.5">
                <span class="text-sm leading-none font-medium select-none">Статус</span>
                <button
                  type="button"
                  class="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                >
                  <span
                    class="h-2 w-2 shrink-0 rounded-full"
                    :class="REPORT_STATUS_DOT[state.reportStatus]"
                  />
                  {{ STATUS_LABEL[state.reportStatus] }}
                  <ChevronsUpDown class="h-3 w-3 opacity-50" />
                </button>
              </div>
              <div class="space-y-1.5">
                <span class="text-sm leading-none font-medium select-none">Флаг</span>
                <button
                  type="button"
                  class="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                  title="Без флага"
                  aria-label="Флаг: Без флага"
                >
                  <FlagOff class="h-3.5 w-3.5" />
                  Без флага
                  <ChevronsUpDown class="h-3 w-3 opacity-50" />
                </button>
              </div>
            </div>

            <!-- Привязка к багу: до привязки — дропдаун со списком багов -->
            <div class="space-y-1.5">
              <span class="text-sm leading-none font-medium select-none">Привязка к багу</span>

              <div
                v-if="state.linked"
                class="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2"
              >
                <span
                  class="inline-flex min-w-0 cursor-pointer items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                >
                  <BugIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span class="truncate">Кнопка входа через GitHub не создаёт аккаунт</span>
                </span>
                <button
                  type="button"
                  class="ml-auto inline-flex h-7 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
                >
                  Отвязать
                </button>
              </div>

              <div v-else class="relative">
                <button
                  type="button"
                  data-tour="report-page-link"
                  class="inline-flex h-8 w-full shrink-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                >
                  <span class="flex items-center gap-1.5">
                    <Link2 class="h-3.5 w-3.5 text-muted-foreground" />
                    Привязать к багу
                  </span>
                  <ChevronsUpDown class="h-3 w-3 opacity-50" />
                </button>

                <!-- DropdownMenuContent: список багов проекта -->
                <div
                  v-if="state.reportBugMenuOpen"
                  class="tour-depth-front absolute top-full left-0 z-30 mt-1 max-h-72 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                >
                  <div
                    v-for="(bug, index) in PROJECT_BUGS"
                    :key="bug"
                    :data-tour="index === 0 ? 'report-page-link-item' : undefined"
                    class="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <BugIcon class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span class="min-w-0 truncate">{{ bug }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ответ репортёру: уже сохранённый черновик -->
            <div class="space-y-1.5">
              <span class="text-sm leading-none font-medium select-none">Ответ репортёру</span>
              <div
                class="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs dark:bg-input/30 md:text-sm"
              >
                {{ state.replyText }}
              </div>
            </div>

            <div class="flex items-center gap-2">
              <span
                class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground opacity-50"
              >
                Сохранить
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
