<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { FolderKanban, RotateCcw, Trash2 } from '@lucide/vue'

/**
 * Ячейка «Опасное — с откатом»: реальная кнопка «Удалить» запускает
 * такой же отсчёт, как в настройках проекта — 10 секунд с полосой и
 * «Восстановить (N)». Успел нажать — карточка возвращается с пружиной;
 * не успел — мягкое удаление (is_deleted), но демо можно перезапустить.
 */

const COUNTDOWN_MS = 10_000
const TICK_MS = 100

type Phase = 'idle' | 'deleting' | 'deleted' | 'restored'

const phase = ref<Phase>('idle')
const left = ref(0)
const progress = computed(() => (left.value / COUNTDOWN_MS) * 100)

let startedAt = 0
let ticker: ReturnType<typeof setInterval> | undefined
let restoredTimer: ReturnType<typeof setTimeout> | undefined

function start() {
  if (phase.value === 'deleting') return
  phase.value = 'deleting'
  left.value = COUNTDOWN_MS
  startedAt = Date.now()
  ticker = setInterval(() => {
    left.value = Math.max(0, COUNTDOWN_MS - (Date.now() - startedAt))
    if (left.value <= 0) {
      stopTicker()
      phase.value = 'deleted'
    }
  }, TICK_MS)
}

function restore() {
  stopTicker()
  phase.value = 'restored'
  restoredTimer = setTimeout(() => (phase.value = 'idle'), 2400)
}

function replay() {
  if (restoredTimer) clearTimeout(restoredTimer)
  phase.value = 'idle'
}

function stopTicker() {
  if (ticker) clearInterval(ticker)
  ticker = undefined
}

onBeforeUnmount(() => {
  stopTicker()
  if (restoredTimer) clearTimeout(restoredTimer)
})
</script>

<template>
  <div
    class="relative overflow-hidden rounded-lg border border-border/70 bg-background/60 p-4 transition-opacity duration-500"
    :class="phase === 'deleted' ? 'opacity-60' : 'opacity-100'"
  >
    <!-- Карточка проекта -->
    <div class="flex items-center gap-3">
      <span
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
      >
        <FolderKanban class="h-4.5 w-4.5" />
      </span>
      <div class="min-w-0">
        <p class="truncate text-sm font-medium">Магазин игрушек</p>
        <p class="text-xs text-muted-foreground">Создан 3 окт · Вы владелец</p>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between gap-2">
      <!-- Удалён (мягко): состояние показывает, что строка осталась в базе -->
      <p v-if="phase === 'deleted'" class="font-mono text-xs text-muted-foreground">
        is_deleted = true
      </p>
      <p v-else class="font-pixel text-[11px] text-muted-foreground">
        {{ phase === 'idle' ? 'нажмите «Удалить»' : 'успейте до конца отсчёта' }}
      </p>

      <button
        v-if="phase !== 'deleted'"
        type="button"
        class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-destructive px-3 text-sm font-medium text-white transition-all hover:bg-destructive/90 dark:bg-destructive/60"
        @click="start"
      >
        <Trash2 class="h-3.5 w-3.5" />
        Удалить
      </button>
      <button
        v-else
        type="button"
        class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        @click="replay"
      >
        <RotateCcw class="h-3.5 w-3.5" />
        Показать снова
      </button>
    </div>

    <!-- Оверлей отсчёта: клики по карточке блокируются, внизу — восстановление -->
    <Transition name="undo-overlay">
      <div
        v-if="phase === 'deleting'"
        class="absolute inset-0 flex flex-col justify-center gap-2 bg-background/85 p-4 backdrop-blur-[2px]"
      >
        <div class="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full bg-foreground transition-[width] duration-100 ease-linear"
            :style="{ width: `${progress}%` }"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="font-mono text-xs text-muted-foreground">
            Удаление через {{ Math.ceil(left / 1000) }} с
          </span>
          <button
            type="button"
            class="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-500/40 px-2.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
            @click="restore"
          >
            <RotateCcw class="h-3 w-3" />
            Восстановить ({{ Math.ceil(left / 1000) }})
          </button>
        </div>
      </div>
    </Transition>

    <!-- Восстановлено: карточка возвращается с пружинным кивком -->
    <Transition name="undo-restored">
      <span
        v-if="phase === 'restored'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 font-mono text-xs text-emerald-600 dark:text-emerald-400"
      >
        Проект на месте — ничего не удалено
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.undo-overlay-enter-active {
  transition: opacity 0.25s ease;
}

.undo-overlay-leave-active {
  transition: opacity 0.4s ease;
}

.undo-overlay-enter-from,
.undo-overlay-leave-to {
  opacity: 0;
}

.undo-restored-enter-active {
  transition:
    opacity 0.25s ease,
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.undo-restored-leave-active {
  transition: opacity 0.3s ease;
}

.undo-restored-enter-from {
  opacity: 0;
  transform: scale(0.97);
}

.undo-restored-leave-to {
  opacity: 0;
}
</style>
