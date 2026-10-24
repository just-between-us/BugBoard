<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Check, LoaderCircle, Pencil } from '@lucide/vue'

/**
 * Ячейка «Правки улетают сами»: кликабельный заголовок бага.
 * Ховер — карандаш, клик — инпут, Enter/blur — «Сохраняем…» → изумрудное
 * «Сохранено» на пару секунд. Кнопки «Сохранить» нет — в этом весь тезис.
 */

const title = ref('Съезжает шапка на мобильных экранах')
const draft = ref('')
const editing = ref(false)
const saveState = ref<'idle' | 'saving' | 'saved'>('idle')

const inputEl = ref<HTMLInputElement | null>(null)
let savedTimer: ReturnType<typeof setTimeout> | undefined

async function startEdit() {
  if (editing.value) return
  draft.value = title.value
  editing.value = true
  saveState.value = 'idle'
  await nextTick()
  inputEl.value?.focus()
  inputEl.value?.select()
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const next = draft.value.trim()
  if (!next || next === title.value) return

  title.value = next
  saveState.value = 'saving'
  if (savedTimer) clearTimeout(savedTimer)
  // Имитация round-trip'а: «Сохраняем…» → «Сохранено» на пару секунд
  savedTimer = setTimeout(() => {
    saveState.value = 'saved'
    savedTimer = setTimeout(() => (saveState.value = 'idle'), 2200)
  }, 700)
}

function cancel() {
  editing.value = false
  draft.value = title.value
}
</script>

<template>
  <div class="rounded-lg border border-border/70 bg-background/60 p-4">
    <!-- Статус автосохранения — единственный цвет здесь: изумруд успеха -->
    <div class="mb-2 h-5">
      <span
        v-if="saveState === 'saving'"
        class="inline-flex items-center gap-1 text-xs text-muted-foreground"
      >
        <LoaderCircle class="h-3 w-3 animate-spin" />
        Сохраняем…
      </span>
      <span
        v-else-if="saveState === 'saved'"
        class="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"
      >
        <Check class="h-3 w-3" />
        Сохранено
      </span>
    </div>

    <!-- Заголовок: текст ↔ инпут -->
    <div class="group/edit flex items-start gap-2">
      <template v-if="editing">
        <input
          ref="inputEl"
          v-model="draft"
          class="w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-input/30"
          aria-label="Заголовок бага"
          @keydown.enter="commit"
          @keydown.esc="cancel"
          @blur="commit"
        />
      </template>
      <template v-else>
        <button
          type="button"
          class="flex w-full cursor-text items-start gap-2 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent/50"
          @click="startEdit"
        >
          <span class="wrap-break-word">{{ title }}</span>
          <Pencil
            class="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/edit:opacity-100"
          />
        </button>
      </template>
    </div>

    <p class="mt-3 font-pixel text-[11px] text-muted-foreground">
      кликните по заголовку — как в приложении
    </p>
  </div>
</template>
