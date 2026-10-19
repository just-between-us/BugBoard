<script setup lang="ts">
import { computed } from 'vue'

/**
 * ASCII-брызги в точке появления: глифы разлетаются по кругу и замирают
 * (анимация .tour-ascii-glyph из ProductTour — та же, что у вспышки клика).
 * Ставится absolute в нужную точку, живёт ~0.55s, дальше убирается снаружи.
 */
const props = withDefaults(defineProps<{ count?: number; distance?: number }>(), {
  count: 7,
  distance: 30,
})

const GLYPHS = ['+', 'x', '·', '*', '∘', '·']

const glyphs = computed(() =>
  Array.from({ length: props.count }, (_, index) => {
    const angle = (index / props.count) * Math.PI * 2 + Math.random() * 0.6
    const dist = props.distance * (0.6 + Math.random() * 0.7)
    return {
      char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string,
      style: {
        '--tx': `${Math.cos(angle) * dist}px`,
        '--ty': `${Math.sin(angle) * dist}px`,
        '--rot': `${Math.round(Math.random() * 180 - 90)}deg`,
        animationDelay: `${Math.round(Math.random() * 120)}ms`,
      } as Record<string, string>,
    }
  }),
)
</script>

<template>
  <span class="tour-ascii" aria-hidden="true">
    <span
      v-for="(glyph, index) in glyphs"
      :key="index"
      class="tour-ascii-glyph absolute top-0 left-0 font-mono leading-none"
      :style="glyph.style"
    >
      {{ glyph.char }}
    </span>
  </span>
</template>
