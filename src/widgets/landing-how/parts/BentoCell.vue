<script setup lang="ts">
import { ref } from 'vue'
import { Motion } from 'motion-v'
import { useSpotlight } from '../lib/useSpotlight'

/**
 * Карточка бенто-сетки «Как это работает»: пиксельный номер, заголовок,
 * описание и слот с живым демо. Въезжает в вьюпорт (whileInView, once)
 * и подсвечивается прожектором под курсором (--mx/--my из useSpotlight).
 */
withDefaults(
  defineProps<{
    /** Пиксельный номер ячейки: 01, 02, … */
    num: string
    title: string
    description?: string
    /** Задержка въезда относительно начала появления сетки */
    delay?: number
    /** Вертикальный лейбл по правому краю крупной ячейки */
    sideLabel?: string
  }>(),
  { description: undefined, delay: 0, sideLabel: undefined },
)

// Блик включается только под курсором — на тач-устройствах и при
// prefers-reduced-motion слой скрыт в CSS, состояние им не мешает
const { style, onPointerMove } = useSpotlight()
const hovered = ref(false)
</script>

<template>
  <Motion
    class="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5"
    :initial="{ opacity: 0, y: 24 }"
    :whileInView="{ opacity: 1, y: 0 }"
    :viewport="{ once: true, amount: 0.35 }"
    :transition="{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }"
    :style="style"
    @pointermove="onPointerMove"
    @pointerenter="hovered = true"
    @pointerleave="hovered = false"
  >
    <!-- Прожектор: мягкий блик в точке курсора, монохром — только свет -->
    <div
      class="bento-glow pointer-events-none absolute inset-0 transition-opacity duration-300"
      :class="hovered ? 'opacity-100' : 'opacity-0'"
      aria-hidden="true"
    />

    <!-- Вертикальный лейбл у крупных ячеек -->
    <span
      v-if="sideLabel"
      class="pointer-events-none absolute top-1/2 right-[] hidden -translate-y-1/2 rotate-90 font-pixel text-xs tracking-widest text-muted-foreground/40 select-none xl:block"
      aria-hidden="true"
    >
      {{ sideLabel }}
    </span>

    <header class="relative flex items-baseline gap-3">
      <span class="font-pixel text-xl leading-none text-muted-foreground/50">{{ num }}</span>
      <h3 class="text-base font-medium tracking-tight sm:text-lg">{{ title }}</h3>
    </header>

    <p v-if="description" class="relative mt-2 max-w-prose text-sm text-muted-foreground">
      {{ description }}
    </p>

    <!-- Живое демо ячейки: при растяжении ячейки в ряду контент центрируется,
         а не копит пустоту внизу -->
    <div class="relative mt-4 flex flex-1 flex-col justify-center">
      <slot />
    </div>
  </Motion>
</template>

<style scoped>
/* Блик в точке курсора — монохромная радиальная заливка поверх карточки */
.bento-glow {
  background: radial-gradient(
    340px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in oklab, var(--foreground) 5%, transparent),
    transparent 70%
  );
}

@media (hover: none) {
  .bento-glow {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bento-glow {
    display: none;
  }
}
</style>
