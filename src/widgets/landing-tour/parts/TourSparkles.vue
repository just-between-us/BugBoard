<script setup lang="ts">
import { computed } from 'vue'

/**
 * Вспышки частиц по периметру карточки — та же «магическая» эстетика, что у
 * автонабора в полях (tour-magic): глиф рожается у края, вспыхивает и уносится
 * наружу, замирая. Цвет — контрастный тексту (var(--foreground)): белый в тёмной
 * теме, тёмный в светлой. Ставится absolute inset-0 поверх карточки,
 * живёт ~0.8s, снимается снаружи.
 */
const props = withDefaults(defineProps<{ count?: number }>(), { count: 32 })

const GLYPHS = ['·', '+', '∘', '×', '*', '∙', '·', '+']

/** Точка у края карточки: сторона периметра + разлёт наружу от неё. */
function edgeSpot() {
  const side = Math.floor(Math.random() * 4) // 0 — верх, 1 — право, 2 — низ, 3 — лево
  const t = Math.random()
  if (side === 0) {
    return {
      left: t * 100,
      top: 2 + Math.random() * 13,
      sx: (t - 0.5) * 24,
      sy: -(5 + Math.random() * 12),
    }
  }
  if (side === 1) {
    return {
      left: 87 + Math.random() * 11,
      top: t * 100,
      sx: 5 + Math.random() * 12,
      sy: (t - 0.5) * 18,
    }
  }
  if (side === 2) {
    return {
      left: t * 100,
      top: 85 + Math.random() * 13,
      sx: (t - 0.5) * 24,
      sy: 5 + Math.random() * 12,
    }
  }
  return {
    left: 2 + Math.random() * 10,
    top: t * 100,
    sx: -(5 + Math.random() * 12),
    sy: (t - 0.5) * 18,
  }
}

const particles = computed(() =>
  Array.from({ length: props.count }, () => {
    const spot = edgeSpot()
    return {
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string,
      style: {
        left: `${spot.left}%`,
        top: `${spot.top}%`,
        '--sx': `${Math.round(spot.sx)}px`,
        '--sy': `${Math.round(spot.sy)}px`,
        animationDelay: `${Math.round(Math.random() * 260)}ms`,
        animationDuration: `${420 + Math.round(Math.random() * 260)}ms`,
        fontSize: `${9 + Math.round(Math.random() * 3)}px`,
      } as Record<string, string>,
    }
  }),
)
</script>

<template>
  <span class="pointer-events-none" aria-hidden="true">
    <span
      v-for="(particle, index) in particles"
      :key="index"
      class="tour-spark absolute font-mono leading-none"
      :style="particle.style"
    >
      {{ particle.char }}
    </span>
  </span>
</template>
