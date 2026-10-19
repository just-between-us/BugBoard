<script setup lang="ts">
import { ref, watch } from 'vue'

/**
 * Мок-поле ввода: лейбл, значение или плейсхолдер, мигающая каретка.
 * data-tour-якорь (target) вешается на само поле, не на корень с лейблом —
 * обводка курсора тура скругляется по краям input и не захватывает подпись.
 * При вводе из тура у каретки рождаются быстро замирающие частицы цвета текста.
 */
const props = withDefaults(
  defineProps<{
    label?: string
    value: string
    focused?: boolean
    placeholder?: string
    /** Печать маскируется точками (пароль). */
    mask?: boolean
    /** Число видимых строк (для textarea-подобных полей). */
    rows?: number
    /** Селектор-якорь для курсора тура (data-tour). */
    target?: string
  }>(),
  { label: undefined, focused: false, placeholder: '', mask: false, rows: 1, target: undefined },
)

interface Particle {
  id: number
  char: string
  dx: number
  dy: number
}

const particles = ref<Particle[]>([])
let particleId = 0

const GLYPHS = ['·', '+', '×', '∘']

// Частицы появляются у каретки на каждый новый символ и замирают за ~0.5s
watch(
  () => props.value,
  (next, prev) => {
    const added = next.length - (prev?.length ?? 0)
    if (added <= 0 || !props.focused) return
    for (let i = 0; i < Math.min(added, 3); i++) {
      const particle: Particle = {
        id: particleId++,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string,
        dx: Math.round(Math.random() * 26 - 13),
        dy: -Math.round(8 + Math.random() * 18),
      }
      particles.value.push(particle)
      setTimeout(() => {
        particles.value = particles.value.filter((p) => p.id !== particle.id)
      }, 520)
    }
  },
)
</script>

<template>
  <div class="space-y-1.5">
    <span v-if="label" class="block text-sm font-medium">{{ label }}</span>
    <div
      :data-tour="props.target"
      class="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs dark:bg-input/30"
      :style="
        rows > 1
          ? { minHeight: `${rows * 22 + 16}px`, alignItems: 'flex-start', paddingTop: '9px' }
          : undefined
      "
    >
      <span v-if="value" class="break-all">
        {{ mask ? '•'.repeat(value.length) : value }}
      </span>
      <span v-else class="text-muted-foreground">{{ placeholder }}</span>
      <!-- Каретка + частицы нового символа -->
      <span v-if="focused" class="relative ml-px inline-flex h-[15px] shrink-0 translate-y-[2px]">
        <span class="tour-caret block h-[15px] w-px bg-foreground" />
        <span
          v-for="particle in particles"
          :key="particle.id"
          class="tour-magic absolute top-1/2 left-0 font-mono leading-none"
          :style="{
            fontSize: '10px',
            '--dx': `${particle.dx}px`,
            '--dy': `${particle.dy}px`,
          }"
        >
          {{ particle.char }}
        </span>
      </span>
    </div>
  </div>
</template>
