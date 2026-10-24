<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check } from '@lucide/vue'
import ActivityHeatmap from '@/entities/activity-heatmap/ActivityHeatmap.vue'
import { useSpotlight } from '../lib/useSpotlight'

/**
 * Ячейка «Цвет — это сигнал»: шкала --mono-1…6 (клик копирует значение
 * токена, как его реально считает браузер) и хитмап активности из
 * приложения — под курсором ячейки разгораются мягким прожектором.
 */

const STEPS = [1, 2, 3, 4, 5, 6] as const

const copied = ref<number | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyStep(step: number) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(`--mono-${step}`)
    .trim()
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Копирование — приятность, а не суть: тихо пропускаем отказ браузера
  }
  copied.value = step
  if (copiedTimer) clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (copied.value = null), 1600)
}

// Мок активности: ~110 событий за последние месяцы, «живой» рисунок без библиотек
const heatDates = computed(() => {
  const out: string[] = []
  const today = new Date()
  let seed = 42
  const rand = () => {
    // Детерминированный псевдослучай — рисунок одинаков при каждом рендере
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  for (let day = 0; day < 150; day++) {
    const density = rand()
    if (density < 0.45) continue
    const events = 1 + Math.floor(rand() * 4)
    for (let e = 0; e < events; e++) {
      const d = new Date(today)
      d.setDate(d.getDate() - day)
      out.push(d.toISOString())
    }
  }
  return out
})

const { style, onPointerMove } = useSpotlight()
const heatGlow = ref(false)
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <!-- Шкала серого: клик — копирование токена -->
    <div class="space-y-2">
      <div class="flex gap-1.5">
        <button
          v-for="step in STEPS"
          :key="step"
          type="button"
          :aria-label="`Скопировать --mono-${step}`"
          class="group relative h-9 flex-1 cursor-pointer rounded-md border transition-transform duration-200 ease-out hover:-translate-y-0.5"
          :class="
            copied === step
              ? 'ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-card'
              : 'border-border'
          "
          :style="{ background: `var(--mono-${step})` }"
          @click="copyStep(step)"
        >
          <span
            v-if="copied === step"
            class="absolute inset-0 flex items-center justify-center"
          >
            <Check class="h-3.5 w-3.5 text-emerald-500 drop-shadow-[0_0_2px_rgb(0_0_0_0.8)]" />
          </span>
          <span
            v-else
            class="absolute inset-x-0 -bottom-5 text-center font-pixel text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          >
            {{ `mono-${step}` }}
          </span>
        </button>
      </div>
      <p class="font-pixel text-[11px] text-muted-foreground">
        {{ copied ? 'скопировано ✓' : 'клик — скопировать токен' }}
      </p>
    </div>

    <!-- Хитмап активности — тот же, что в профиле; под курсором — прожектор -->
    <div
      class="relative overflow-hidden rounded-lg border border-border/70 bg-background/60 p-3 transition-opacity duration-300"
      :class="heatGlow ? 'opacity-100' : 'opacity-90'"
      :style="style"
      @pointermove="onPointerMove"
      @pointerenter="heatGlow = true"
      @pointerleave="heatGlow = false"
    >
      <div
        class="heat-glow pointer-events-none absolute inset-0 transition-opacity duration-300"
        :class="heatGlow ? 'opacity-100' : 'opacity-0'"
        aria-hidden="true"
      />
      <ActivityHeatmap class="relative" :dates="heatDates" :weeks="14" />
    </div>

    <p class="text-xs text-muted-foreground">
      Статистика, хитмап и прогресс-бары — на шкале серого. Цветные только статусы,
      важность и «Скопировано».
    </p>
  </div>
</template>

<style scoped>
/* Прожектор над хитмапой: ячейки под курсором «разгораются» светом */
.heat-glow {
  background: radial-gradient(
    150px circle at var(--mx, 50%) var(--my, 50%),
    color-mix(in oklab, var(--foreground) 10%, transparent),
    transparent 72%
  );
}

@media (hover: none), (prefers-reduced-motion: reduce) {
  .heat-glow {
    display: none;
  }
}
</style>
