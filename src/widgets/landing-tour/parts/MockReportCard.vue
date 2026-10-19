<script setup lang="ts">
import { Ban, Bug, ChevronsUpDown, Copy, FlagOff, Link2, Trash2 } from '@lucide/vue'
import { REPORT_STATUS_DOT } from '@/entities/report/meta'
import MockField from './MockField.vue'

/** Мок-карточка репорта: статус-дропдаун, ответ репортёру, привязка к багу. */
withDefaults(
  defineProps<{
    status: 'new' | 'confirmed' | 'rejected'
    menuOpen: boolean
    replyOpen: boolean
    replyText: string
    replySent: boolean
    linked: boolean
    replyFocused?: boolean
  }>(),
  { replyFocused: false },
)

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Принят',
  rejected: 'Отклонён',
}
</script>

<template>
  <article class="relative rounded-lg border border-border bg-card text-left">
    <div class="flex items-start gap-3 p-4">
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold"
      >
        ДК
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">Дмитрий К.</span>
          <span class="text-xs text-muted-foreground">18 окт · 14:02</span>
          <span
            class="ml-auto inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
          >
            ID: 7f2a…c19
            <Copy class="h-3 w-3" />
          </span>
        </div>

        <!-- Статус-дропдаун -->
        <div class="relative mt-2 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium"
          >
            <span class="h-2 w-2 rounded-full" :class="REPORT_STATUS_DOT[status]" />
            {{ STATUS_LABEL[status] }}
            <ChevronsUpDown class="h-3 w-3 text-muted-foreground" />
          </button>

          <div
            v-if="menuOpen"
            class="absolute top-full right-0 z-30 mt-1 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <p class="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Статус</p>
            <div
              v-for="opt in ['new', 'confirmed', 'rejected'] as const"
              :key="opt"
              :data-tour="opt === 'confirmed' ? 'report-status-confirmed' : undefined"
              class="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs"
              :class="opt === status ? 'bg-secondary font-medium' : 'hover:bg-secondary/60'"
            >
              <span class="h-2 w-2 rounded-full" :class="REPORT_STATUS_DOT[opt]" />
              {{ STATUS_LABEL[opt] }}
            </div>
            <div class="my-1 h-px bg-border" />
            <p class="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">Флаг</p>
            <div
              class="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60"
            >
              <FlagOff class="h-3 w-3" /> Без флага
            </div>
            <div
              class="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs hover:bg-secondary/60"
            >
              <Ban class="h-3 w-3" /> Спам
            </div>
          </div>
        </div>

        <h4 class="mt-1 text-sm font-medium">Кнопка входа через GitHub не работает</h4>
        <p class="mt-1 text-xs whitespace-pre-line text-muted-foreground">
          После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся. На Safari 17
          воспроизводится стабильно.
        </p>

        <!-- Привязка к багу -->
        <div
          v-if="linked"
          class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px]"
        >
          <Link2 class="h-3 w-3" />
          Привязан к: Кнопка входа через GitHub
        </div>

        <!-- Ответ репортёру: отправленный -->
        <div
          v-if="replySent"
          class="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs"
        >
          <p class="text-[11px] text-muted-foreground">↩ Ответ Анна · сегодня</p>
          <p class="mt-1">{{ replyText }}</p>
        </div>

        <!-- Ответ репортёру: редактор -->
        <div v-if="replyOpen" class="mt-3 rounded-md border border-border bg-muted/30 p-3">
          <p class="text-xs font-medium">Ответ репортёру — его увидит только автор репорта</p>
          <div class="mt-2">
            <MockField
              target="report-reply-textarea"
              :value="replyText"
              :focused="replyFocused"
              placeholder="Что ответить репортёру?"
              :rows="3"
            />
          </div>
          <div class="mt-2 flex items-center gap-2">
            <button
              type="button"
              data-tour="report-reply-send"
              class="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
            >
              Отправить ответ
            </button>
            <button type="button" class="rounded-md px-2 py-1.5 text-xs text-muted-foreground">
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-2 border-t border-border px-4 py-2.5">
      <button
        type="button"
        data-tour="report-reply-btn"
        class="rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium"
      >
        ↩ Ответить репортёру
      </button>
      <button
        type="button"
        data-tour="report-link-bug"
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground"
      >
        <Bug class="h-3 w-3" />
        Баг
      </button>
      <button
        type="button"
        class="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-severity-critical"
      >
        <Trash2 class="h-3 w-3" />
        Удалить
      </button>
    </div>
  </article>
</template>
