<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Пиксельная бегущая строка-разделитель: базовая скорость плюс дельта
 * прокрутки — рывок вниз ускоряет строку, страница отвечает на жест.
 * Скорость сглаживается экспоненциально, поэтому рывки не дёргают ленту.
 * prefers-reduced-motion — статичная строка без анимации.
 */

const PHRASES = [
  'NO SAVE BUTTONS',
  'RLS',
  'SELF-HOST',
  'SOFT DELETE',
  'INLINE EDIT',
  'OTP LOGIN',
  'OPEN SOURCE',
]

const trackRef = ref<HTMLElement | null>(null)
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Базовая скорость (px/с) и множитель от скорости скролла
const BASE_SPEED = 30
const SCROLL_FACTOR = 0.35
const SMOOTHING = 0.08

let raf = 0
let offset = 0
let velocity = 0 // сглаженная скорость скролла, px/с
let lastScrollY = window.scrollY
let lastTime = performance.now()
let halfWidth = 0

function measure() {
  // Лента дублируется дважды — сдвигаем на ширину одной половины
  halfWidth = (trackRef.value?.scrollWidth ?? 0) / 2
}

function onScroll() {
  const now = performance.now()
  const dt = Math.max(1, now - lastTime) / 1000
  const dy = window.scrollY - lastScrollY
  // Мгновенная скорость скролла — цель сглаживания
  const instant = dy / dt
  lastScrollY = window.scrollY
  lastTime = now
  velocity += (instant - velocity) * SMOOTHING
}

function tick(now: number) {
  raf = requestAnimationFrame(tick)
  const dt = Math.min(0.05, (now - lastTime) / 1000)
  lastTime = now
  // Сглаживание продолжается между событиями скролла
  velocity *= 1 - SMOOTHING

  offset -= (BASE_SPEED + velocity * SCROLL_FACTOR) * dt
  if (halfWidth > 0 && offset <= -halfWidth) {
    offset += halfWidth
  }
  trackRef.value?.style.setProperty('transform', `translate3d(${offset}px, 0, 0)`)
}

onMounted(() => {
  if (reduceMotion) return
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', measure)
  lastTime = performance.now()
  raf = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', measure)
})
</script>

<template>
  <div class="overflow-hidden border-y border-border bg-muted/30 py-3" aria-hidden="true">
    <div
      ref="trackRef"
      class="flex w-max will-change-transform"
    >
      <!-- Две копии ряда — петля бесшовная -->
      <template v-for="copy in 2" :key="copy">
        <span
          v-for="phrase in PHRASES"
          :key="`${copy}-${phrase}`"
          class="flex items-center gap-6 pr-6 font-pixel text-sm tracking-widest text-muted-foreground/70 select-none"
        >
          {{ phrase }}
          <span class="text-muted-foreground/40">◆</span>
        </span>
      </template>
    </div>
  </div>
</template>
