<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Check,
  FolderKanban,
  LogOut,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from '@lucide/vue'
import { AnimatePresence, Motion } from 'motion-v'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/avatar'
import { expandTransition } from '@/lib/motion'

const DEFAULT_COMMENT = 'На Safari кнопка не реагирует с первого раза'

const commentText = ref(DEFAULT_COMMENT)
const draft = ref('')
const editing = ref(false)
const menuOpen = ref(false)
const confirming = ref(false)
const commentGone = ref(false)

/** Меню или подтверждение открыты — нижние демо уступают место. */
const demoHidden = computed(() => menuOpen.value || confirming.value)

const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuPos = ref<{ top: number; left: number } | null>(null)

const MENU_WIDTH = 176 // w-44

function placeMenu() {
  const trigger = triggerRef.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8)
  menuPos.value = { top: rect.bottom + 4, left }
}

const menuStyle = computed(() => {
  const p = menuPos.value
  if (!p) return undefined
  return { top: `${p.top}px`, left: `${Math.max(8, p.left)}px` }
})

// Меню рендерится только после расчёта позиции — fixed-элемент не мелькает в углу
const menuVisible = computed(() => menuOpen.value && menuPos.value !== null)

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (menuOpen.value) placeMenu()
}

function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  const target = e.target as Node
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) return
  menuOpen.value = false
}

// Фикс-позиция «отрывается» от триггера при скролле — закрываем меню
function onViewportChange() {
  menuOpen.value = false
}

// Режимы комментария взаимоисключающие: либо редактирование, либо подтверждение
function startEdit() {
  menuOpen.value = false
  confirming.value = false
  draft.value = commentText.value
  editing.value = true
}

function saveEdit() {
  const value = draft.value.trim()
  if (value) commentText.value = value
  editing.value = false
}

function cancelEdit() {
  editing.value = false
}

function askDelete() {
  menuOpen.value = false
  editing.value = false
  confirming.value = true
}

function confirmDelete() {
  confirming.value = false
  commentGone.value = true
  editing.value = false
}

function replayComment() {
  commentGone.value = false
  commentText.value = DEFAULT_COMMENT
}

/* ---------- 2. Карточка проекта: отсчёт удаления ---------- */

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

/* ---------- 3. Мок сайдбара: авторизован ⇄ разлогинен ---------- */

// По умолчанию мок уже с сессией — как в реальном приложении после входа
const signedIn = ref(true)

const SIGN_OUT_DELAY_MS = 5000
const RING_RADIUS = 14
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const signOutPending = ref(false)
const signOutProgress = ref(0)
let signOutRaf: number | null = null
let signOutStartedAt = 0

const signOutSecondsLeft = computed(() =>
  Math.max(1, Math.ceil(((1 - signOutProgress.value) * SIGN_OUT_DELAY_MS) / 1000)),
)

const accountHint = computed(() => {
  if (!signedIn.value) return 'сессия закончилась — покажем снова?'
  if (signOutPending.value)
    return `выход через ${signOutSecondsLeft.value} с — нажмите, чтобы отменить`
  return 'клик по выходу запускает кольцо-отсчёт'
})

function cancelSignOut() {
  if (signOutRaf !== null) cancelAnimationFrame(signOutRaf)
  signOutRaf = null
  signOutPending.value = false
  signOutProgress.value = 0
}

function tickSignOut(now: number) {
  signOutProgress.value = Math.min((now - signOutStartedAt) / SIGN_OUT_DELAY_MS, 1)
  if (signOutProgress.value >= 1) {
    signOutRaf = null
    signOutPending.value = false
    signOutProgress.value = 0
    // Кольцо дошло до конца — сессия закончилась, плавно уходим в гостя
    signedIn.value = false
    return
  }
  signOutRaf = requestAnimationFrame(tickSignOut)
}

function handleSignOut() {
  if (!signedIn.value) return
  if (signOutPending.value) {
    cancelSignOut()
    return
  }
  signOutPending.value = true
  signOutProgress.value = 0
  signOutStartedAt = performance.now()
  signOutRaf = requestAnimationFrame(tickSignOut)
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  window.addEventListener('scroll', onViewportChange, true)
  window.addEventListener('resize', onViewportChange)
})

onBeforeUnmount(() => {
  stopTicker()
  if (restoredTimer) clearTimeout(restoredTimer)
  cancelSignOut()
  document.removeEventListener('click', onDocClick)
  window.removeEventListener('scroll', onViewportChange, true)
  window.removeEventListener('resize', onViewportChange)
})
</script>

<template>
  <div class="space-y-3">
    <div>
      <AnimatePresence mode="wait">
        <Motion
          v-if="!commentGone"
          key="comment"
          :exit="{ height: 0, opacity: 0 }"
          :transition="expandTransition"
          class="overflow-hidden"
        >
          <article
            class="flex gap-3 items-center rounded-lg border border-border/70 bg-background/60 p-3"
          >
            <Avatar class="h-8 w-8 font-mono text-xs" name="Марина А." />
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span class="truncate text-sm font-medium">Марина А.</span>
                  <span class="text-xs whitespace-nowrap text-muted-foreground">29 сент.</span>
                </div>
                <button
                  ref="triggerRef"
                  type="button"
                  class="ml-auto h-8 w-8 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Действия с комментарием"
                  aria-label="Действия с комментарием"
                  :aria-expanded="menuOpen"
                  @click.stop="toggleMenu()"
                >
                  <MoreHorizontal class="h-full w-full" />
                </button>
              </div>

              <p v-if="!editing" class="mt-1 text-sm leading-snug">{{ commentText }}</p>
              <template v-else>
                <Input
                  v-model="draft"
                  class="mt-2"
                  maxlength="200"
                  aria-label="Текст комментария"
                  @keydown.enter.prevent="saveEdit()"
                  @keydown.esc="cancelEdit()"
                />
                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                  <Button size="sm" class="h-8" :disabled="!draft.trim()" @click="saveEdit()">
                    <Check class="h-4 w-4" />
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" class="h-8" @click="cancelEdit()">
                    Отмена
                  </Button>
                </div>
              </template>
            </div>
          </article>
        </Motion>

        <!-- Удалён: строка осталась в базе (is_deleted), демо перезапускается -->
        <Motion
          v-else
          key="gone"
          :initial="{ height: 0, opacity: 0 }"
          :animate="{ height: 'auto', opacity: 1 }"
          :exit="{ height: 0, opacity: 0 }"
          :transition="expandTransition"
          class="overflow-hidden"
        >
          <div class="flex flex-wrap items-center justify-between gap-2 py-1">
            <span class="font-mono text-xs text-muted-foreground">is_deleted = true</span>
            <button
              type="button"
              class="inline-flex h-7 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
              @click="replayComment()"
            >
              <RotateCcw class="h-3 w-3" />
              Показать снова
            </button>
          </div>
        </Motion>
      </AnimatePresence>

      <!-- Контент меню «⋯» teleport-ится в body — бенто-ячейка его не режет -->
      <Teleport to="body">
        <div
          v-if="menuVisible"
          ref="menuRef"
          class="fixed z-50 w-44 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          :style="menuStyle"
        >
          <button
            type="button"
            class="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            @click.stop="startEdit()"
          >
            <Pencil class="mr-2 h-4 w-4" />
            Редактировать
          </button>
          <button
            type="button"
            class="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm text-severity-critical transition-colors hover:bg-accent"
            @click.stop="askDelete()"
          >
            <Trash2 class="mr-2 h-4 w-4" />
            Удалить
          </button>
        </div>
      </Teleport>

      <!-- Подтверждение удаления — спокойный блок под комментарием, без модалки -->
      <AnimatePresence>
        <Motion
          v-if="confirming"
          key="confirm"
          :initial="{ height: 0, opacity: 0, marginTop: 0 }"
          :animate="{ height: 'auto', opacity: 1, marginTop: 8 }"
          :exit="{ height: 0, opacity: 0, marginTop: 0 }"
          :transition="expandTransition"
          class="overflow-hidden rounded-md border border-severity-critical/40 bg-severity-critical/5 p-3"
          role="alertdialog"
          aria-label="Подтверждение удаления комментария"
        >
          <p class="text-sm font-medium">Удалить комментарий?</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Комментарий будет скрыт у всех участников. Отменить действие нельзя.
          </p>
          <!-- На узких экранах кнопки идут в колонку -->
          <div class="mt-2 flex flex-col gap-1.5 sm:flex-row sm:justify-between">
            <Button
              size="sm"
              variant="destructive"
              class="h-8 w-full sm:w-auto"
              @click="confirmDelete()"
            >
              <Trash2 class="h-4 w-4" />
              Удалить
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="h-8 w-full sm:w-auto"
              @click="confirming = false"
            >
              Отмена
            </Button>
          </div>
        </Motion>
      </AnimatePresence>
    </div>

    <!-- 2 и 3 уступают место открытому меню/подтверждению: плавно схлопываются -->
    <AnimatePresence>
      <Motion
        v-if="!demoHidden"
        key="demos"
        :exit="{ height: 0, opacity: 0 }"
        :transition="expandTransition"
        class="space-y-3 overflow-hidden"
      >
        <!-- 2. Карточка проекта: отсчёт удаления с откатом -->
        <div
          class="relative overflow-hidden rounded-lg border border-border/70 bg-background/60 p-3 transition-opacity duration-500"
          :class="phase === 'deleted' ? 'opacity-60' : 'opacity-100'"
        >
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
            <p v-if="phase === 'deleted'" class="font-mono text-xs text-muted-foreground">
              is_deleted = true
            </p>
            <p v-else class="font-mono text-[11px] text-muted-foreground">
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

          <!-- Оверлей отсчёта: клики по карточке блокируются, внизу — восстановление.
               Таймер дублируется: на широких экранах в подписи, на узких — в кнопке -->
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
                <span class="hidden font-mono text-xs text-muted-foreground sm:inline">
                  Удаление через {{ Math.ceil(left / 1000) }} с
                </span>
                <button
                  type="button"
                  class="inline-flex h-7 items-center gap-1.5 rounded-md border border-emerald-500/40 px-2.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-500/10 dark:text-emerald-400"
                  @click="restore"
                >
                  <RotateCcw class="h-3 w-3" />
                  <span class="sm:hidden">Восстановить ({{ Math.ceil(left / 1000) }})</span>
                  <span class="hidden sm:inline">Восстановить</span>
                </button>
              </div>
            </div>
          </Transition>

          <!-- Восстановлено: карточка возвращается с пружинным кивком -->
          <Transition name="undo-restored">
            <span
              v-if="phase === 'restored'"
              class="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/80 px-4 text-center font-mono text-xs text-emerald-600 dark:text-emerald-400"
            >
              Проект на месте — ничего не удалено
            </span>
          </Transition>
        </div>

        <!-- 3. Мок сайдбара: по умолчанию авторизован, выход с кольцом-таймером -->
        <div class="rounded-lg border border-border/70 bg-background/60 p-3">
          <AnimatePresence mode="wait">
            <!-- Разлогинен: возвращаем сессию заново -->
            <Motion
              v-if="!signedIn"
              key="guest"
              :initial="{ opacity: 0, y: 4 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: -4 }"
              :transition="expandTransition"
            >
              <button
                type="button"
                class="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                @click="signedIn = true"
              >
                <RotateCcw class="h-4 w-4" />
                Показать снова
              </button>
            </Motion>

            <!-- Авторизован: аватар с именем и кнопка выхода с кольцом -->
            <Motion
              v-else
              key="user"
              :initial="{ opacity: 0, y: 4 }"
              :animate="{ opacity: 1, y: 0 }"
              :exit="{ opacity: 0, y: -4 }"
              :transition="expandTransition"
            >
              <div class="flex items-center gap-2">
                <span
                  class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-card"
                >
                  <Avatar class="h-7 w-7 font-mono text-xs" name="Анна К." />
                  <span class="min-w-0 flex-1 truncate text-left text-sm">Анна К.</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  class="relative h-9 w-9 shrink-0 rounded-full transition-colors"
                  :class="
                    signOutPending &&
                    'text-destructive hover:bg-destructive/10 hover:text-destructive'
                  "
                  :aria-label="
                    signOutPending
                      ? 'Выйти из аккаунта — нажмите, чтобы отменить'
                      : 'Выйти из аккаунта'
                  "
                  :title="
                    signOutPending
                      ? `Отменить выход (осталось ${signOutSecondsLeft} с)`
                      : 'Выйти из аккаунта'
                  "
                  @click="handleSignOut()"
                >
                  <span class="relative flex items-center justify-center">
                    <Transition name="sign-out-ring">
                      <span
                        v-if="signOutPending"
                        class="absolute inset-0 flex items-center justify-center"
                        aria-hidden="true"
                      >
                        <svg class="size-8 -rotate-90" viewBox="0 0 32 32" fill="none">
                          <circle
                            cx="16"
                            cy="16"
                            :r="RING_RADIUS"
                            class="stroke-border"
                            stroke-width="2"
                            stroke-opacity="0.7"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            :r="RING_RADIUS"
                            class="stroke-destructive"
                            stroke-width="3"
                            stroke-linecap="round"
                            :stroke-dasharray="RING_CIRCUMFERENCE"
                            :stroke-dashoffset="RING_CIRCUMFERENCE * signOutProgress"
                          />
                        </svg>
                      </span>
                    </Transition>
                    <LogOut class="h-4 w-4" />
                  </span>
                </Button>
              </div>
            </Motion>
          </AnimatePresence>

          <p class="mt-2 truncate font-mono text-[11px] text-muted-foreground">
            {{ accountHint }}
          </p>
        </div>
      </Motion>
    </AnimatePresence>
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

.sign-out-ring-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.sign-out-ring-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.sign-out-ring-enter-from,
.sign-out-ring-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
