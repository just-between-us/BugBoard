<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { Check, Mail } from '@lucide/vue'

/**
 * Ячейка «Репорт — это ссылка»: живая копия публичной формы репортёра.
 * Поля самозаполняются печатью при первом въезде во вьюпорт; поле OTP
 * настоящее — шесть ячеек ловят клик и принимают ввод с клавиатуры
 * (маскируются точками? нет — код виден, как в реальной форме).
 * Шестая цифра отправляет репорт: эмблема «Репорт отправлен».
 */

const FULL_TITLE = 'Кнопка входа через GitHub не работает'
const FULL_DESC =
  'После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся. На Safari 17 воспроизводится стабильно.'
const FULL_EMAIL = 'kate@example.com'

const title = ref('')
const description = ref('')
const email = ref('')
const code = ref('')
const filled = ref(false)

const otpInput = ref<HTMLInputElement | null>(null)
const sent = computed(() => code.value.length === 6)

const demoRoot = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined
let timers: ReturnType<typeof setTimeout>[] = []
let started = false

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function schedule(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms))
}

/** Посимвольная печать в ref с переходом к следующему шагу по done */
function typeInto(target: Ref<string>, text: string, speed: number, done: () => void) {
  let i = 0
  const step = () => {
    if (i >= text.length) {
      done()
      return
    }
    i += 1
    target.value = text.slice(0, i)
    schedule(step, speed)
  }
  step()
}

function startFill() {
  if (started) return
  started = true

  if (reduceMotion) {
    title.value = FULL_TITLE
    description.value = FULL_DESC
    email.value = FULL_EMAIL
    filled.value = true
    return
  }

  typeInto(title, FULL_TITLE, 22, () => {
    schedule(() => {
      typeInto(description, FULL_DESC, 11, () => {
        schedule(() => typeInto(email, FULL_EMAIL, 34, () => (filled.value = true)), 260)
      })
    }, 300)
  })
}

import { REGEXP_ONLY_DIGITS } from 'vue-input-otp'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'

/** Сброс демо: очистить код и показать отправку заново */
function reset() {
  code.value = ''
  if (otpInput.value) otpInput.value.value = ''
  filled.value = false
  // Печать начинается заново — печатаем только то, что ещё пусто
  title.value = ''
  description.value = ''
  email.value = ''
  timers.forEach(clearTimeout)
  timers = []
  started = false
  startFill()
}

onMounted(() => {
  const el = demoRoot.value
  if (!el) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        startFill()
        observer?.disconnect()
        observer = undefined
      }
    },
    { threshold: 0.4 },
  )
  observer.observe(el)
})

onBeforeUnmount(() => {
  observer?.disconnect()
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div ref="demoRoot" class="relative">
    <!-- Форма репортёра: без внутренней рамки — контур даёт сама ячейка бенто -->
    <div
      class="space-y-2 rounded-lg bg-background/60 p-3 transition-opacity duration-500"
      :class="sent ? 'pointer-events-none opacity-0' : 'opacity-100'"
    >
      <label class="block space-y-1.5">
        <span class="text-xs font-medium">Заголовок</span>
        <span
          class="flex h-9 items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-xs dark:bg-input/30"
        >
          <span class="truncate">{{ title }}</span>
          <span
            v-if="!filled"
            class="tour-caret ml-px h-3.75 w-px shrink-0 translate-y-0.5 bg-foreground"
          />
        </span>
      </label>

      <label class="block space-y-1.5">
        <span class="text-xs font-medium">Описание</span>
        <span
          class="flex min-h-10 items-start rounded-md border border-input bg-transparent px-3 py-1.5 text-sm shadow-xs dark:bg-input/30"
        >
          <span class="wrap-break-word whitespace-pre-line">{{ description }}</span>
        </span>
      </label>

      <!-- Почта и OTP в один ряд: форма не тянется вниз -->
      <div class="flex flex-wrap items-start gap-x-4 gap-y-2">
        <label class="block min-w-44 flex-1 space-y-1.5">
          <span class="text-xs font-medium">Почта — на неё придёт код</span>
          <span
            class="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs dark:bg-input/30"
          >
            <Mail class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span class="truncate" :class="email ? '' : 'text-muted-foreground'">
              {{ email || 'you@example.com' }}
            </span>
          </span>
        </label>

        <!-- OTP: шесть ячеек + реальный input-перехватчик -->
        <div class="space-y-1.5">
          <span class="text-xs font-medium">Код из письма</span>
          <InputOTP
            id="otp"
            v-model="code"
            :maxlength="6"
            :pattern="REGEXP_ONLY_DIGITS"
            autocomplete="one-time-code"
            inputmode="numeric"
          >
            <InputOTPGroup>
              <InputOTPSlot :index="0" />
              <InputOTPSlot :index="1" />
              <InputOTPSlot :index="2" />
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup>
              <InputOTPSlot :index="3" />
              <InputOTPSlot :index="4" />
              <InputOTPSlot :index="5" />
            </InputOTPGroup>
          </InputOTP>
          <p class="font-mono text-[11px] text-muted-foreground">
            <template v-if="!filled">заполняем…</template>
            <template v-else>шесть цифр — и репорт ушёл</template>
          </p>
        </div>
      </div>
    </div>

    <!-- Успех: эмблема «Репорт отправлен» -->
    <Transition name="flow-sent">
      <div
        v-if="sent"
        class="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg border border-border/70 bg-background/95 p-6 text-center"
      >
        <span class="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15">
          <Check class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </span>
        <p class="font-mono text-sm font-medium">Репорт отправлен</p>
        <p class="max-w-64 text-xs text-muted-foreground">
          Аккаунт создался молча — подтверждение уже сделала почта.
        </p>
        <button
          type="button"
          class="font-mono text-[11px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          @click="reset"
        >
          ↺ отправить ещё
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Каретка печати — та же, что в MockField тура */
.tour-caret {
  animation: flow-caret 1s steps(2) infinite;
}

@keyframes flow-caret {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tour-caret {
    animation: none;
  }
}

/* Успех: мягкая конвертация формы в подтверждение */
.flow-sent-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.flow-sent-leave-active {
  transition: opacity 0.25s ease;
}

.flow-sent-enter-from {
  opacity: 0;
  transform: scale(0.96);
}

.flow-sent-leave-to {
  opacity: 0;
}
</style>
