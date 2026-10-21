<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import type { MotionValue } from 'motion-v'
import { tourState, VIEW_W } from '../tourState'

/**
 * Пояснение-пузырь шага «Интерфейс»: текст проявляется по буквам и либо висит
 * под привязанным элементом (anchor), либо следует за курсором (follow).
 * Позиция едет через CSS-transition left/top — в режиме follow это даёт
 * мягкое запаздывание за курсором, а смена привязки скользит без рывка.
 */
const props = defineProps<{
  viewportRef: Ref<HTMLElement | null>
  x: MotionValue<number>
  y: MotionValue<number>
}>()

const boxRef = ref<HTMLElement | null>(null)
const left = ref(0)
const top = ref(0)

const PAD = 12
/** Скорость появления букв — задержка одной буквы в мс. */
const LETTER_DELAY = 16

/** Буквы по словам: так перенос строки работает только на пробелах,
 *  а глобальный порядковый номер даёт сквозную задержку по всему тексту. */
const words = computed(() => {
  const parts = tourState.narr.text.split(' ')
  let index = 0
  return parts.map((word) => {
    const letters = word.split('').map((char) => ({ char, delay: index++ * LETTER_DELAY }))
    index++ // такт пробела между словами
    return letters
  })
})

function place(): void {
  const n = tourState.narr
  if (n.mode === 'anchor') {
    const vp = props.viewportRef.value
    const el = vp?.querySelector<HTMLElement>(n.anchor)
    if (!vp || !el) return
    const r = el.getBoundingClientRect()
    const v = vp.getBoundingClientRect()
    const k = v.width / VIEW_W || 1
    const cx = (r.left + r.width / 2 - v.left) / k
    const cy = (r.bottom - v.top) / k
    const w = boxRef.value?.offsetWidth ?? 280
    left.value = Math.max(PAD, Math.min(VIEW_W - w - PAD, cx - w / 2))
    top.value = cy + 10
  } else {
    // Справа — на 44px, чтобы пузырь не наезжал на подписи пунктов меню
    left.value = props.x.get() + (n.at === 'right' ? 44 : -44)
    top.value = props.y.get() + (n.at === 'right' ? -16 : 26)
  }
}

let stopX: (() => void) | undefined
let stopY: (() => void) | undefined

onMounted(() => {
  // В режиме follow пузырь едет за курсором; в anchor пересчёт идентичен и безвреден
  stopX = props.x.on('change', place)
  stopY = props.y.on('change', place)
})

onBeforeUnmount(() => {
  stopX?.()
  stopY?.()
})

// Смена текста/режима/привязки — пересчёт после отрисовки (ширина нового текста)
watch(
  () => [tourState.narr.key, tourState.narr.mode, tourState.narr.anchor] as const,
  async () => {
    await nextTick()
    place()
  },
)
</script>

<template>
  <div class="pointer-events-none absolute inset-0 z-[45]" aria-hidden="true">
    <Transition name="tour-narr-in" @before-enter="place">
      <div
        v-if="tourState.narr.mode !== 'off' && tourState.narr.text"
        ref="boxRef"
        class="tour-narr absolute max-w-[460px] rounded-xl border border-border bg-card px-5 py-3.5 text-lg leading-relaxed text-foreground shadow-lg"
        :style="{ left: `${left}px`, top: `${top}px` }"
      >
        <span :key="tourState.narr.key">
          <template v-for="(letters, wi) in words" :key="wi">
            <span
              v-for="letter in letters"
              :key="letter.delay"
              class="tour-ltr"
              :style="{ animationDelay: `${letter.delay}ms` }"
              >{{ letter.char }}</span
            ><span v-if="wi < words.length - 1">{{ ' ' }}</span>
          </template>
        </span>
      </div>
    </Transition>
  </div>
</template>
