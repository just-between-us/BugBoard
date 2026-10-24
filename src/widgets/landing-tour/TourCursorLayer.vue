<script setup lang="ts">
import { Motion, type MotionValue } from 'motion-v'
import TourCursor from './parts/TourCursor.vue'

/** Слой курсора внутри вьюпорта: позиция — motion-value, клик — сжатие + ripple + ASCII-вспышка. */
defineProps<{
  x: MotionValue<number>
  y: MotionValue<number>
  opacity: MotionValue<number>
  scale: MotionValue<number>
  /** Наклон в дуге (шаги с lively-курсором), в покое 0. */
  rot: MotionValue<number>
  rippleKey: number
  rippleAt: { x: number; y: number }
}>()

/* ASCII-вспышка клика: глифы разлетаются по кругу и замирают */
const GLYPHS = ['+', 'x', '·', '*', '∘', '·']

function burstStyle(index: number) {
  const angle = (index / GLYPHS.length) * Math.PI * 2 + Math.random() * 0.6
  const distance = 16 + Math.random() * 14
  return {
    '--tx': `${Math.cos(angle) * distance}px`,
    '--ty': `${Math.sin(angle) * distance}px`,
    '--rot': `${Math.round(Math.random() * 180 - 90)}deg`,
    animationDelay: `${Math.round(Math.random() * 60)}ms`,
  }
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-50" aria-hidden="true">
    <span
      v-if="rippleKey > 0"
      :key="rippleKey"
      class="tour-ripple absolute"
      :style="{ left: `${rippleAt.x}px`, top: `${rippleAt.y}px` }"
    />
    <!-- ASCII-вспышка: тот же ключ, что у ripple — обе анимации стартуют вместе -->
    <span
      v-if="rippleKey > 0"
      :key="`ascii-${rippleKey}`"
      class="tour-ascii absolute"
      :style="{ left: `${rippleAt.x}px`, top: `${rippleAt.y}px` }"
    >
      <span
        v-for="(glyph, index) in GLYPHS"
        :key="index"
        class="tour-ascii-glyph absolute top-0 left-0 font-mono leading-none"
        :style="burstStyle(index)"
      >
        {{ glyph }}
      </span>
    </span>

    <Motion
      class="absolute top-0 left-0 origin-top-left drop-shadow-[0_3px_8px_rgba(0,0,0,0.35)] will-change-transform"
      :style="{ x, y, scale, opacity, rotate: rot }"
    >
      <TourCursor class="h-5 w-5" />
    </Motion>
  </div>
</template>
