<script setup lang="ts">
import { animate, Motion, motionValue } from 'motion-v'
import { useMediaQuery } from '@vueuse/core'
import { nextTick, ref, watch } from 'vue'
import { VIEW_H, tourState } from '../tourState'
import MockField from '../parts/MockField.vue'

/**
 * Шаг 1: карточка аутентификации — регистрация с OTP-подтверждением.
 * Камера: при нажатии на поле вся форма плавно приближается, а заполняемое
 * поле подводится к центру сцены (dy считается по незатронутому трансформом offsetTop).
 * Смена таба на OTP — плавная смена окна (Transition mode="out-in"): форма
 * растворяется, окно кода проявляется; камера снапит в before-enter, пока новое
 * окно ещё непрозрачно, — оно появляется сразу по центру и без рывка.
 */
const state = tourState

const EASE = [0.22, 1, 0.36, 1] as const
const ZOOM = 1.28
/** Увеличение окна OTP-подтверждения — чуть ближе к камере, чем форма. */
const OTP_ZOOM = 1.4

const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

const cardRef = ref<HTMLElement | null>(null)
const camY = motionValue(0)
const camZ = motionValue(1)

watch(
  () => state.focused,
  async (key) => {
    // '' в конце печати — не паркуем камеру, она держится до конца шага
    if (!key?.startsWith('auth-')) return
    // OTP-окно уже запарковано по центру табом — печать в нём камеру не двигает
    if (key === 'auth-otp') return
    await nextTick()
    const card = cardRef.value
    const anchor = card?.querySelector<HTMLElement>(`[data-tour="${key}"]`)
    if (!card || !anchor) return
    // Лейаут-координаты поля относительно карточки (offset* не видят трансформов)
    const fieldCenterY = card.offsetTop + anchor.offsetTop + anchor.offsetHeight / 2
    animate(camY, -(fieldCenterY - VIEW_H / 2) * ZOOM, { duration: 0.75, ease: EASE })
    animate(camZ, ZOOM, { duration: 0.75, ease: EASE })
  },
)

// Клик по «Зарегистрироваться»: таб переключается на OTP, форма уходит через
// leave (0.14s), и только потом вставляется окно кода. Снап камеры — в before-enter
// этого вставляемого окна: оно в этот момент ещё с enter-from (opacity 0), поэтому
// прыжок камеры на «центр + зум» никто не видит, а первый видимый кадр окна — уже
// по центру. Карточку центрирует flex-контейнер, поэтому центр — это ровно camY = 0.
function parkOtpCamera(): void {
  if (reduced.value || state.auth.tab !== 'otp') return
  // stop — на случай, если анимация подводки поля ещё не догнала
  camY.stop()
  camZ.stop()
  camY.set(0)
  camZ.set(OTP_ZOOM)
}

// Новый шаг или его повтор (epoch тикает в runChain перед setup) сбрасывает камеру
watch(
  () => state.epoch,
  () => {
    animate(camY, 0, { duration: 0.5, ease: EASE })
    animate(camZ, 1, { duration: 0.5, ease: EASE })
  },
)
</script>

<template>
  <div class="absolute inset-0 overflow-hidden bg-background">
    <!-- Фон: мягкая сетка, живёт на заднем плане глубины и не участвует в камере -->
    <div
      class="tour-depth-back pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(var(--mono-6)_1px,transparent_1px)] bg-size-[26px_26px]"
    />

    <!-- Камера шага: приближение и подводка активного поля к центру -->
    <Motion class="absolute inset-0" :style="{ y: camY, scale: camZ }">
      <div class="flex h-full w-full items-center justify-center">
        <Transition name="tour-auth-swap" mode="out-in" @before-enter="parkOtpCamera">
          <div
            :key="state.auth.tab === 'otp' ? 'otp' : 'form'"
            ref="cardRef"
            class="tour-depth-mid relative w-100 rounded-xl border border-border bg-card p-6 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.5)]"
          >
            <p class="font-mono text-base font-semibold tracking-tight">BugBoard</p>
            <p class="mt-1 text-sm text-muted-foreground">
              {{
                state.auth.tab === 'otp'
                  ? `Мы отправили код на ${state.auth.email || 'anna@team.dev'}`
                  : 'Создайте аккаунт разработчика'
              }}
            </p>

            <!-- Вкладки входа / регистрации -->
            <div class="mt-4 flex gap-4 border-b border-border text-sm">
              <span
                class="-mb-px border-b-2 px-0.5 pb-2"
                :class="
                  state.auth.tab === 'signin'
                    ? 'border-foreground font-medium'
                    : 'border-transparent text-muted-foreground'
                "
              >
                Войти
              </span>
              <span
                class="-mb-px border-b-2 px-0.5 pb-2"
                :class="
                  state.auth.tab !== 'signin'
                    ? 'border-foreground font-medium'
                    : 'border-transparent text-muted-foreground'
                "
              >
                Регистрация
              </span>
            </div>

            <!-- Форма -->
            <div v-if="state.auth.tab !== 'otp'" class="mt-4 space-y-3">
              <MockField
                target="auth-name"
                label="Имя"
                :value="state.auth.name"
                :focused="state.focused === 'auth-name'"
                placeholder="Как вас зовут"
              />
              <MockField
                target="auth-email"
                label="Почта"
                :value="state.auth.email"
                :focused="state.focused === 'auth-email'"
                placeholder="you@example.com"
              />
              <MockField
                target="auth-password"
                label="Пароль"
                :value="state.auth.password"
                :focused="state.focused === 'auth-password'"
                placeholder="Минимум 6 символов"
                mask
              />
              <button
                type="button"
                data-tour="auth-submit"
                class="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
              >
                Зарегистрироваться
              </button>
            </div>

            <!-- OTP -->
            <div v-else class="mt-4 space-y-3">
              <MockField
                target="auth-otp"
                label="Код из письма"
                :value="state.auth.otp"
                :focused="state.focused === 'auth-otp'"
                placeholder="123456"
              />
              <p class="text-xs text-muted-foreground">
                Введите код из письма или перейдите по ссылке в нём
              </p>
              <button
                type="button"
                data-tour="auth-verify"
                class="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
              >
                Подтвердить
              </button>
              <p class="text-center text-xs text-muted-foreground">Отправить код ещё раз</p>
            </div>
          </div>
        </Transition>
      </div>
    </Motion>
  </div>
</template>
