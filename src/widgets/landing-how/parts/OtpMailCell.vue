<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { Mail } from '@lucide/vue'

/**
 * Ячейка «Код с почты вместо регистрации»: мини-письмо с шестью цифрами,
 * которые подсвечиваются по очереди монохромной вспышкой. Клик по письму
 * перезапускает последовательность; при prefers-reduced-motion цифры
 * показаны сразу все, без цикла.
 */

const CODE = '4 8 1 5 0 7'.split(' ')

const lit = ref(-1) // индекс вспыхнувшей цифры, -1 — пауза между циклами
let timer: ReturnType<typeof setTimeout> | undefined
let step = 0

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

if (reduceMotion) {
  lit.value = CODE.length - 1
}

function tick() {
  step = (step + 1) % (CODE.length + 3) // +3 — пауза перед следующим кругом
  lit.value = step < CODE.length ? step : -1
  timer = setTimeout(tick, step < CODE.length ? 380 : 1100)
}

function replay() {
  if (reduceMotion) return
  if (timer) clearTimeout(timer)
  step = -1
  tick()
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})

// Старт цикла при монтировании ячейки — она маленькая, въезжает вся разом
if (!reduceMotion) {
  timer = setTimeout(replay, 600)
}
</script>

<template>
  <button
    type="button"
    class="group flex w-full h-full cursor-default flex-col items-center justify-center gap-3 rounded-lg border border-border/70 bg-background/60 px-4 py-5 select-none"
    :aria-label="reduceMotion ? undefined : 'Показать письмо ещё раз'"
    @click="replay"
  >
    <!-- Конверт -->
    <span
      class="relative flex h-10 w-14 items-center justify-center rounded-md border border-border bg-card shadow-xs transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
    >
      <Mail class="h-5 w-5 text-muted-foreground" />
    </span>

    <!-- Код из письма -->
    <span class="flex gap-1.5">
      <span
        v-for="(digit, i) in CODE"
        :key="i"
        class="flex h-9 w-8 items-center justify-center rounded-md border font-mono text-sm shadow-xs transition-all duration-200"
        :class="
          lit === i
            ? 'scale-110 border-foreground bg-foreground text-background'
            : 'border-border bg-card text-muted-foreground'
        "
      >
        {{ digit }}
      </span>
    </span>

    <span class="max-w-56 text-center text-xs text-muted-foreground">
      Пароля нет — аккаунт появляется сам, как только почта подтвердила, кто вы
    </span>
  </button>
</template>
