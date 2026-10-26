<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { REGEXP_ONLY_DIGITS } from 'vue-input-otp'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

/**
 * Мок-поле OTP на настоящих компонентах input-otp: шесть ячеек InputOTPSlot
 * с сепаратором. Значение приходит снаружи (тур печатает в состояние), ввод
 * пользователя игнорируется — демо остаётся state-driven. data-tour-якорь
 * (target) вешается на обёртку всей группы, обводка курсора тура охватывает
 * все ячейки. Каретка тура позиционируется измерением DOM — внутри пустой
 * ячейки, куда упадёт следующий символ; на каждый новый символ у каретки
 * рождаются быстро замирающие частицы цвета текста.
 */
const props = withDefaults(
  defineProps<{
    value: string
    focused?: boolean
    label?: string
    /** Селектор-якорь для курсора тура (data-tour). */
    target?: string
  }>(),
  { focused: false, label: 'Код из письма', target: undefined },
)

const rootRef = ref<HTMLElement | null>(null)
/** Позиция каретки относительно корня (px). */
const caret = ref<{ x: number; y: number } | null>(null)

function updateCaret() {
  const root = rootRef.value
  const idx = props.value.length
  if (!root || !props.focused || idx >= 6) {
    caret.value = null
    return
  }
  const slot = root.querySelector<HTMLElement>(`[data-otp-slot="${idx}"]`)
  if (!slot) {
    caret.value = null
    return
  }
  const rootRect = root.getBoundingClientRect()
  const slotRect = slot.getBoundingClientRect()
  caret.value = {
    x: slotRect.left - rootRect.left + slotRect.width / 2,
    y: slotRect.top - rootRect.top + slotRect.height / 2,
  }
}

interface Upgraded {
  id: number
  char: string
  dx: number
  dy: number
  /** X частицы относительно корня — точка, где была каретка. */
  x: number
}

const particles = ref<Upgraded[]>([])
let particleId = 0

const GLYPHS = ['·', '+', '×', '∘']

watch(
  () => props.value,
  (next, prev) => {
    const added = next.length - (prev?.length ?? 0)
    const anchor = caret.value
    // Частицы — у каретки на только что напечатанный символ (каретка ещё не переехала)
    if (added > 0 && props.focused && anchor) {
      for (let i = 0; i < Math.min(added, 3); i++) {
        const particle: Upgraded = {
          id: particleId++,
          char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] as string,
          dx: Math.round(Math.random() * 26 - 13),
          dy: -Math.round(8 + Math.random() * 18),
          x: anchor.x,
        }
        particles.value.push(particle)
        setTimeout(() => {
          particles.value = particles.value.filter((p) => p.id !== particle.id)
        }, 520)
      }
    }
    // Символы не меняют раскладку ячеек — считаем сразу
    updateCaret()
  },
)

watch(
  () => props.focused,
  (f) => {
    particles.value = []
    if (f) void nextTick(updateCaret)
    else caret.value = null
  },
)
</script>

<template>
  <div class="space-y-1.5">
    <span v-if="label" class="block text-sm font-medium">{{ label }}</span>
    <div ref="rootRef" :data-tour="props.target" class="relative w-fit">
      <InputOTP
        :model-value="props.value"
        :maxlength="6"
        :pattern="REGEXP_ONLY_DIGITS"
        autocomplete="one-time-code"
        inputmode="numeric"
        readonly
        class="pointer-events-none"
      >
        <InputOTPGroup>
          <InputOTPSlot v-for="i in 3" :key="i" :index="i - 1" :data-otp-slot="i - 1" />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot v-for="i in 3" :key="i" :index="i + 2" :data-otp-slot="i + 2" />
        </InputOTPGroup>
      </InputOTP>

      <!-- Каретка тура в пустой ячейке под следующий символ -->
      <span
        v-if="caret"
        class="tour-caret pointer-events-none absolute block w-px bg-foreground"
        :style="{
          left: `${caret.x}px`,
          top: `${caret.y}px`,
          height: '18px',
          transform: 'translate(-50%, -50%)',
        }"
      />
      <!-- Частицы нового символа -->
      <span
        v-for="particle in particles"
        :key="particle.id"
        class="tour-magic absolute font-mono leading-none"
        :style="{
          left: `${particle.x}px`,
          top: `${caret ? caret.y : 0}px`,
          fontSize: '10px',
          '--dx': `${particle.dx}px`,
          '--dy': `${particle.dy}px`,
        }"
      >
        {{ particle.char }}
      </span>
    </div>
  </div>
</template>
