<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Ячейка «Свой хостинг, открытый код»: терминал печатает установку
 * посимвольно с мигающей кареткой; клик по окну — перезапечатать.
 * При prefers-reduced-motion — сразу весь вывод.
 */

const LINES = [
  { prompt: '$', text: 'git clone github.com/just-between-us/BugBoard' },
  { prompt: '$', text: 'cp .env.example .env' },
  { prompt: '·', text: 'VITE_SUPABASE_URL=…', muted: true },
  { prompt: '·', text: 'VITE_SUPABASE_ANON_KEY=…', muted: true },
  { prompt: '$', text: 'npm run dev' },
  { prompt: '✓', text: 'local ready — supabase.com/dashboard', muted: true },
] as const

const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const shown = ref(reduceMotion ? LINES.length : 0)
const typed = ref(reduceMotion ? (LINES[4]?.text ?? '') : '')
const typing = ref(false)

let charTimer: ReturnType<typeof setTimeout> | undefined
let lineTimer: ReturnType<typeof setTimeout> | undefined
let run = 0

function clearTimers() {
  if (charTimer) clearTimeout(charTimer)
  if (lineTimer) clearTimeout(lineTimer)
}

/** Печать строк по очереди: каждая строка — посимвольно, с быстрым стартом */
function play() {
  clearTimers()
  const my = ++run
  shown.value = 0
  typed.value = ''
  typing.value = true

  let lineIndex = 0
  const typeLine = () => {
    if (my !== run) return
    const line = LINES[lineIndex]
    if (!line) {
      typing.value = false
      return
    }
    let charIndex = 0
    const typeChar = () => {
      if (my !== run) return
      charIndex += 1
      typed.value = line.text.slice(0, charIndex)
      if (charIndex < line.text.length) {
        charTimer = setTimeout(typeChar, 18 + Math.random() * 34)
      } else {
        shown.value = lineIndex + 1
        lineIndex += 1
        typed.value = ''
        lineTimer = setTimeout(typeLine, 320)
      }
    }
    typeChar()
  }
  typeLine()
}

onMounted(() => {
  if (!reduceMotion) play()
})

onBeforeUnmount(() => {
  run += 1
  clearTimers()
})
</script>

<template>
  <button
    type="button"
    class="group w-full cursor-default text-left"
    aria-label="Перезапечатать терминал"
    @click="play"
  >
    <div
      class="h-full overflow-hidden rounded-lg border border-border bg-foreground/95 p-4 font-mono text-xs leading-relaxed text-background shadow-xs sm:text-sm"
    >
      <!-- Уже напечатанные строки -->
      <p v-for="(line, i) in LINES.slice(0, shown)" :key="i" class="flex gap-2">
        <span class="shrink-0 opacity-50">{{ line.prompt }}</span>
        <span class="wrap-break-word" :class="('muted' in line && line.muted) ? 'opacity-55' : ''">
          {{ line.text }}
        </span>
      </p>

      <!-- Текущая печатаемая строка с кареткой -->
      <p v-if="typing" class="flex gap-2">
        <span class="shrink-0 opacity-50">{{ LINES[shown]?.prompt ?? '$' }}</span>
        <span class="wrap-break-word">{{ typed }}</span>
        <span class="term-caret inline-block h-4 w-1.5 shrink-0 translate-y-0.5 bg-background/80" />
      </p>

      <p
        v-if="!typing && shown === LINES.length"
        class="mt-2 font-pixel text-[11px] opacity-50"
      >
        клик — перезапечатать
      </p>
    </div>
  </button>
</template>

<style scoped>
.term-caret {
  animation: term-blink 1s steps(2) infinite;
}

@keyframes term-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .term-caret {
    display: none;
  }
}
</style>
