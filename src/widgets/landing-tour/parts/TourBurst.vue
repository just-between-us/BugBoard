<script setup lang="ts">
import { computed } from 'vue'

/**
 * ASCII-брызги в точке появления: глифы разлетаются по кругу и замирают
 * (анимация .tour-ascii-glyph из ProductTour — та же, что у вспышки клика).
 * Ставится absolute в нужную точку, живёт ~0.55s, дальше убирается снаружи.
 *
 * Рассеивание (углы, дальности, задержки, повороты) берётся из общего шаблона:
 * у всех появлений брызги идентичны друг другу — разброс только внутри одного.
 */
const props = withDefaults(defineProps<{ count?: number; distance?: number }>(), {
  count: 7,
  distance: 30,
})

const GLYPHS = ['+', 'x', '·', '*', '∘', '·']

/** Запас глифов в общем шаблоне — инстанс берёт срез по count. */
const MAX_GLYPHS = 16

/** Общий набор рассеиваний — фиксирован один раз на модуле. */
const BURST_TEMPLATE = Array.from({ length: MAX_GLYPHS }, () => ({
  angleJitter: Math.random() * 0.6,
  distFactor: 0.6 + Math.random() * 0.7,
  char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string,
  rot: Math.round(Math.random() * 180 - 90),
  delay: Math.round(Math.random() * 120),
}))

const glyphs = computed(() =>
  Array.from({ length: props.count }, (_, index) => {
    const jitter = BURST_TEMPLATE[index % MAX_GLYPHS] as (typeof BURST_TEMPLATE)[number]
    // Круг строится по числу глифов инстанса, рассеивание — из общего шаблона
    const angle = (index / props.count) * Math.PI * 2 + jitter.angleJitter
    const dist = props.distance * jitter.distFactor
    return {
      char: jitter.char,
      style: {
        '--tx': `${Math.cos(angle) * dist}px`,
        '--ty': `${Math.sin(angle) * dist}px`,
        '--rot': `${jitter.rot}deg`,
        animationDelay: `${jitter.delay}ms`,
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
