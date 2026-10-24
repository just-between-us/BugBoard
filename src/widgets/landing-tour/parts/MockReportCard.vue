<script setup lang="ts">
import { Bug as BugIcon, Check, ChevronsUpDown, Copy, FlagOff, Reply, Trash2 } from '@lucide/vue'
import { REPORT_STATUS_DOT } from '@/entities/report/meta'
import MockField from './MockField.vue'

/**
 * Мок-карточка репорта — анатомия реального ReportCard:
 * статус и флаг отдельными дропдаунами, ответ репортёру,
 * чип привязки и футер действий («Ответить», «Баг», «Удалить»).
 * Клик по карточке открывает страницу репорта — якорь report-card.
 * Данные репорта — пропсы: дефолты в точности повторяют демо-карточку шага.
 * hideFooter убирает футер действий — компактная карточка для ленты на лендинге.
 */
withDefaults(
  defineProps<{
    status?: 'new' | 'confirmed' | 'rejected'
    menuOpen?: boolean
    replyOpen?: boolean
    replyText?: string
    replySent?: boolean
    linked?: boolean
    replyFocused?: boolean
    /** Якорь report-card ставит только карточка шага — флуд-карточкам он не нужен. */
    cardAnchor?: boolean
    reportTitle?: string
    reportBody?: string
    authorName?: string
    authorInitials?: string
    reportDate?: string
    /** Скрыть футер действий — для компактных лент (демо на лендинге). */
    hideFooter?: boolean
  }>(),
  {
    status: 'new',
    menuOpen: false,
    replyOpen: false,
    replyText: '',
    replySent: false,
    linked: false,
    replyFocused: false,
    cardAnchor: true,
    reportTitle: 'Кнопка входа через GitHub не работает',
    reportBody:
      'После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся. На Safari 17 воспроизводится стабильно.',
    authorName: 'Дмитрий К.',
    authorInitials: 'ДК',
    reportDate: '18 окт 2025, 14:02',
    hideFooter: false,
  },
)

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Принят',
  rejected: 'Отклонён',
}

const STATUS_OPTIONS = ['new', 'confirmed', 'rejected'] as const

/**
 * Опциональный emit: клик по триггеру статуса. Тур его не слушает —
 * карточка в его разметке остаётся статичной; слушают только внешние
 * демки (лента репортов на лендинге), которым нужен циклический переключатель.
 */
const emit = defineEmits<{ statusClick: [] }>()
</script>

<template>
  <!-- Card: gap-0 py-0 overflow-hidden, клик по карточке ведёт на страницу репорта -->
  <article
    :data-tour="cardAnchor ? 'report-card' : undefined"
    class="flex cursor-pointer flex-col gap-0 overflow-hidden rounded-xl border bg-card py-0 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="space-y-3 p-4 sm:p-5">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <!-- Автор: аватар, имя, дата и ID с копированием -->
        <div class="flex min-w-0 items-center gap-2.5">
          <span
            class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-medium text-primary"
          >
            {{ authorInitials }}
          </span>
          <div class="min-w-0">
            <span class="block truncate text-sm font-medium underline-offset-4 hover:underline">
              {{ authorName }}
            </span>
            <p class="text-xs text-muted-foreground">{{ reportDate }}</p>
            <span class="mt-0.5 flex min-w-0 max-w-full items-center gap-0.5">
              <span class="truncate font-mono text-xs text-muted-foreground">ID: 7f2a…c19</span>
              <span class="relative inline-flex shrink-0">
                <button
                  type="button"
                  class="inline-flex cursor-pointer items-center justify-center rounded p-0.5 text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground"
                  title="Копировать ID репорта"
                  aria-label="Копировать ID репорта"
                >
                  <Copy class="h-3 w-3" />
                </button>
              </span>
            </span>
          </div>
        </div>

        <!-- Два отдельных дропдауна: статус (интерактивный) и флаг (статичный) -->
        <div class="flex flex-wrap items-center gap-1.5 self-start">
          <div class="relative">
            <button
              type="button"
              data-tour="report-status-trigger"
              class="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
              @click.stop="emit('statusClick')"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="REPORT_STATUS_DOT[status]" />
              {{ STATUS_LABEL[status] }}
              <ChevronsUpDown class="h-3 w-3 opacity-50" />
            </button>

            <!-- DropdownMenuContent align="end" w-44 -->
            <div
              v-if="menuOpen"
              class="tour-depth-front absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            >
              <div
                v-for="opt in STATUS_OPTIONS"
                :key="opt"
                :data-tour="opt === 'confirmed' ? 'report-status-confirmed' : undefined"
                class="flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span class="mr-2 h-2 w-2 shrink-0 rounded-full" :class="REPORT_STATUS_DOT[opt]" />
                {{ STATUS_LABEL[opt] }}
                <Check v-if="status === opt" class="ml-auto h-4 w-4" />
              </div>
            </div>
          </div>

          <button
            type="button"
            class="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            title="Без флага"
            aria-label="Флаг: Без флага"
          >
            <FlagOff class="h-3.5 w-3.5" />
            Без флага
            <ChevronsUpDown class="h-3 w-3 opacity-50" />
          </button>
        </div>
      </div>

      <!-- Заголовок и описание -->
      <div>
        <span class="block wrap-break-word font-medium underline-offset-4 hover:underline">
          {{ reportTitle }}
        </span>
        <p class="mt-1 wrap-break-word text-sm whitespace-pre-line text-muted-foreground">
          {{ reportBody }}
        </p>
      </div>

      <!-- Привязка к багу: кнопка-чип, открывающая страницу бага -->
      <div v-if="linked" class="flex flex-wrap items-center gap-1.5">
        <span
          class="inline-flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          title="Открыть баг"
        >
          <BugIcon class="h-3 w-3 shrink-0" />
          <span class="truncate">Привязан к: Кнопка входа через GitHub</span>
        </span>
      </div>

      <!-- Ответ репортёру: редактор -->
      <div v-if="replyOpen" class="space-y-2 rounded-md border p-3">
        <p class="text-xs font-medium text-muted-foreground">
          Ответ репортёру — его увидит только автор репорта
        </p>
        <MockField
          target="report-reply-textarea"
          :value="replyText"
          :focused="replyFocused"
          placeholder="Что ответить репортёру?"
          :rows="3"
        />
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            data-tour="report-reply-send"
            class="inline-flex h-6 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-all hover:bg-primary/90"
          >
            Отправить ответ
          </button>
          <button
            type="button"
            class="inline-flex h-6 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
          >
            Отмена
          </button>
        </div>
      </div>

      <!-- Ответ репортёру: отправленный -->
      <div v-else-if="replySent" class="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Reply class="h-3 w-3" />
          Ответ Анна
          <span>· сегодня</span>
        </p>
        <p class="mt-1.5 wrap-break-word text-sm whitespace-pre-line">{{ replyText }}</p>
        <div class="mt-2 flex flex-wrap gap-1">
          <button
            type="button"
            class="inline-flex h-6 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
          >
            Изменить
          </button>
          <button
            type="button"
            class="inline-flex h-6 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium text-severity-critical transition-all hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50"
          >
            Удалить ответ
          </button>
        </div>
      </div>

      <!-- Футер действий: без внутренней рамки, прижат вправо «Удалить» -->
      <div v-if="!hideFooter" class="flex flex-wrap items-center justify-between gap-2">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-if="!replyOpen && !replySent"
            type="button"
            data-tour="report-reply-btn"
            class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
          >
            <Reply class="h-3.5 w-3.5" />
            Ответить репортёру
          </button>
          <!-- Реальная кнопка — RouterLink на bug-create?report=<id> (в моке — визуальная) -->
          <span
            data-tour="report-bug-create"
            class="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground dark:hover:bg-accent/50"
          >
            <BugIcon class="h-3.5 w-3.5" />
            Баг
          </span>
        </div>
        <button
          type="button"
          class="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-destructive px-3 text-sm font-medium text-white transition-all hover:bg-destructive/90 dark:bg-destructive/60"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Удалить
        </button>
      </div>
    </div>
  </article>
</template>
