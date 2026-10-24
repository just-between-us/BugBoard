<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Bug as BugIcon, Check, ChevronsUpDown, Copy, Reply, Trash2 } from '@lucide/vue'
import { REPORT_FLAG_ICON, REPORT_STATUS_DOT, reportFlagOptions } from '@/entities/report/meta'
import { formatDate } from '@/lib/format'
import MockField from './MockField.vue'

/**
 * Мок-карточка репорта — анатомия реального ReportCard:
 * статус и флаг отдельными дропдаунами, ответ репортёру,
 * чип привязки и футер действий («Ответить», «Баг», «Удалить»).
 * Клик по карточке открывает страницу репорта — якорь report-card.
 * Данные репорта — пропсы: дефолты в точности повторяют демо-карточку шага.
 * hideFooter убирает футер действий — компактная карточка для ленты на лендинге.
 * interactive включает настоящие дропдауны (открытость и выбор статуса/флага
 * живут внутри карточки, меню закрывается кликом вне); тур остаётся на
 * managed-пропах menuOpen/status — локальное состояние в его режиме молчит.
 */

type Status = 'new' | 'confirmed' | 'rejected'
type Flag = 'none' | 'spam' | 'duplicate'

const props = withDefaults(
  defineProps<{
    status?: Status
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
    /** Guid репорта: при нехватке ширины обрезается многоточием (truncate). */
    reportId?: string
    /** Флаг репорта — для тура всегда «Без флага» (managed-режим). */
    flag?: Flag
    /** Скрыть футер действий — для компактных лент (демо на лендинге). */
    hideFooter?: boolean
    /**
     * Статус и флаг отдельной строкой под именем/временем/ID, над заголовком
     * (вместо правой колонки) — для узких колонок, где row-раскладка тесна.
     */
    stackControls?: boolean
    /** Настоящий дропдаун: открытие меню и выбор статуса/флага — локальные. */
    interactive?: boolean
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
    /** Дата в формате реального ReportCard: «18 окт. 2026 г., 14:02» (ru-RU). */
    reportDate: formatDate('2026-10-18T14:02:00'),
    reportId: '7f3a9c21-4b8e-4d12-9f06-83ba7c19e4d5',
    flag: 'none',
    hideFooter: false,
    stackControls: false,
    interactive: false,
  },
)

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Принят',
  rejected: 'Отклонён',
}

const FLAG_LABEL: Record<Flag, string> = {
  none: 'Без флага',
  spam: 'Спам',
  duplicate: 'Дубликат',
}

const STATUS_OPTIONS = ['new', 'confirmed', 'rejected'] as const

/*
 * Реальный дропдаун: открытость и выбранные значения — локальные (interactive),
 * тур же всегда managed — пропы menuOpen/status главнее локального состояния.
 */
const openStatus = ref(false)
const openFlag = ref(false)
const localStatus = ref<Status>(props.status)
const localFlag = ref<Flag>(props.flag)

const shownStatus = computed(() => (props.interactive ? localStatus.value : props.status))
const shownFlag = computed(() => (props.interactive ? localFlag.value : props.flag))
const statusMenuOpen = computed(() => (props.interactive ? openStatus.value : props.menuOpen))

function toggleStatusMenu() {
  if (props.interactive) {
    openStatus.value = !openStatus.value
    openFlag.value = false
  }
}

function toggleFlagMenu() {
  if (!props.interactive) return
  openFlag.value = !openFlag.value
  openStatus.value = false
}

function pickStatus(opt: Status) {
  if (!props.interactive) return
  localStatus.value = opt
  openStatus.value = false
}

function pickFlag(opt: Flag) {
  localFlag.value = opt
  openFlag.value = false
}

// Клик вне карточки закрывает интерактивные меню (в туре режим не интерактивный)
const rootRef = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!props.interactive) return
  const el = rootRef.value
  if (el && !el.contains(e.target as Node)) {
    openStatus.value = false
    openFlag.value = false
  }
}

/*
 * Teleport меню в body (interactive): фикс-позиция по rect триггера — меню не
 * может обрезаться ни карточкой, ни бенто-ячейкой, как portal у реального
 * ReportCard на reka-ui. Тур остаётся на absolute внутри карточки.
 */
const statusTriggerRef = ref<HTMLElement | null>(null)
const flagTriggerRef = ref<HTMLElement | null>(null)
const menuPos = ref<{ top?: number; bottom?: number; left: number } | null>(null)

const MENU_WIDTH = 176 // w-44
const MENU_MAX_HEIGHT = 140 // примерная высота меню из трёх пунктов

function placeMenu(trigger: HTMLElement | null) {
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  // Вверх, если снизу не хватает места (нижняя карточка ленты у края viewport)
  const flipUp =
    window.innerHeight - rect.bottom < MENU_MAX_HEIGHT + 8 && rect.top > MENU_MAX_HEIGHT + 8
  const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)
  menuPos.value = flipUp
    ? { bottom: window.innerHeight - rect.top + 4, left }
    : { top: rect.bottom + 4, left }
}

const menuStyle = computed(() => {
  const p = menuPos.value
  if (!p) return undefined
  return {
    top: p.top === undefined ? undefined : `${p.top}px`,
    bottom: p.bottom === undefined ? undefined : `${p.bottom}px`,
    left: `${Math.max(8, p.left)}px`,
  }
})

// Меню рендерится только после расчёта позиции — иначе fixed-элемент на кадр мелькнет в углу
const statusMenuVisible = computed(
  () => statusMenuOpen.value && (!props.interactive || menuPos.value !== null),
)
const flagMenuVisible = computed(
  () => openFlag.value && (!props.interactive || menuPos.value !== null),
)

watch([openStatus, openFlag], async ([status, flag]) => {
  if (!props.interactive) return
  if (!status && !flag) {
    menuPos.value = null
    return
  }
  await nextTick()
  placeMenu(status ? statusTriggerRef.value : flagTriggerRef.value)
})

// При открытом меню прокрутка/резайз «отрывают» фикс-позицию от триггера — закрываем
function onViewportChange() {
  if (!props.interactive) return
  openStatus.value = false
  openFlag.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <!-- Card: gap-0 py-0; без overflow-hidden — иначе дропдаун-меню обрезается
       краем карточки (в реальном ReportCard меню portal-ится в body) -->
  <article
    ref="rootRef"
    :data-tour="cardAnchor ? 'report-card' : undefined"
    class="flex cursor-pointer flex-col gap-0 rounded-xl border bg-card py-0 shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="space-y-3 p-4 sm:p-5">
      <div
        class="flex flex-col gap-3"
        :class="stackControls ? '' : 'sm:flex-row sm:items-start sm:justify-between'"
      >
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
              <span class="min-w-0 truncate font-mono text-xs text-muted-foreground">
                ID: {{ reportId }}
              </span>
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

        <!-- Два отдельных дропдауна: статус и флаг — реальные в interactive-режиме -->
        <div class="flex flex-wrap items-center gap-1.5 self-start">
          <div class="relative">
            <button
              type="button"
              ref="statusTriggerRef"
              data-tour="report-status-trigger"
              :aria-expanded="statusMenuOpen"
              class="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
              @click.stop="toggleStatusMenu()"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="REPORT_STATUS_DOT[shownStatus]" />
              {{ STATUS_LABEL[shownStatus] }}
              <ChevronsUpDown class="h-3 w-3 opacity-50" />
            </button>

            <!-- DropdownMenuContent align="end" w-44. В interactive меню teleport-ится
                 в body с fixed-позицией от триггера — его не режут ни карточка,
                 ни бенто-ячейка (как portal у реального ReportCard). В туре —
                 absolute внутри карточки: в stackControls триггер слева → left-0,
                 иначе меню вылезает влево за карточку и его срезает ячейка -->
            <Teleport to="body" :disabled="!interactive">
              <div
                v-if="statusMenuVisible"
                class="w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                :class="[
                  interactive
                    ? 'fixed z-50'
                    : [
                        'tour-depth-front absolute z-30 top-full mt-1',
                        stackControls ? 'left-0' : 'right-0',
                      ],
                ]"
                :style="interactive ? menuStyle : undefined"
              >
                <div
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt"
                  :data-tour="opt === 'confirmed' ? 'report-status-confirmed' : undefined"
                  class="flex w-full select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  :class="interactive ? 'cursor-pointer' : 'cursor-default'"
                  @click.stop="pickStatus(opt)"
                >
                  <span
                    class="mr-2 h-2 w-2 shrink-0 rounded-full"
                    :class="REPORT_STATUS_DOT[opt]"
                  />
                  {{ STATUS_LABEL[opt] }}
                  <Check v-if="shownStatus === opt" class="ml-auto h-4 w-4" />
                </div>
              </div>
            </Teleport>
          </div>

          <div class="relative">
            <button
              type="button"
              ref="flagTriggerRef"
              :aria-expanded="openFlag"
              class="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border bg-background px-2 text-xs font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
              :title="FLAG_LABEL[shownFlag]"
              :aria-label="`Флаг: ${FLAG_LABEL[shownFlag]}`"
              @click.stop="toggleFlagMenu()"
            >
              <component :is="REPORT_FLAG_ICON[shownFlag]" class="h-3.5 w-3.5" />
              {{ FLAG_LABEL[shownFlag] }}
              <ChevronsUpDown class="h-3 w-3 opacity-50" />
            </button>

            <Teleport to="body" :disabled="!interactive">
              <div
                v-if="flagMenuVisible"
                class="w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                :class="[
                  interactive
                    ? 'fixed z-50'
                    : [
                        'tour-depth-front absolute z-30 top-full mt-1',
                        stackControls ? 'left-0' : 'right-0',
                      ],
                ]"
                :style="interactive ? menuStyle : undefined"
              >
                <div
                  v-for="opt in reportFlagOptions"
                  :key="opt.value"
                  class="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  @click.stop="pickFlag(opt.value)"
                >
                  <component :is="REPORT_FLAG_ICON[opt.value]" class="mr-2 h-3.5 w-3.5 shrink-0" />
                  {{ opt.label }}
                  <Check v-if="shownFlag === opt.value" class="ml-auto h-4 w-4" />
                </div>
              </div>
            </Teleport>
          </div>
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
