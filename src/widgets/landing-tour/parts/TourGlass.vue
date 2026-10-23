<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import { tourState } from '../tourState'
import tourFrameDark from '@/assets/tour-frame-dark.svg'
import tourFrameLight from '@/assets/tour-frame-light.svg'

/**
 * Стекло над окном тура — финал шага «Репорты». Тот же GlassShatter,
 * что и в превью лендинга, и в том же режиме: под стеклом лежит
 * запечённый кадр финала (1280×720, тема берётся у страницы), поэтому
 * плита непрозрачная (uAlpha=1), преломляет картинку и хроматит края,
 * а подсказка «Починить...» снова показана.
 *
 * Своё у тур-стекла только в таймингах: оно зарастает reveal-анимацией
 * (GLASS_REVEAL_SECONDS), но НЕ разбивается само — удар наносит только
 * реальный pointerdown пользователя по слою. Через паузу после такой
 * «попытки починить» в центре появляется кнопка репорта (см. ниже).
 */

const GlassShatter = defineAsyncComponent(
  () => import('@/widgets/landing-preview/GlassShatter.vue'),
)

const theme = useThemeStore()

/** Запечённый кадр финала — свой мок на каждую тему (см. tour-frame-*.svg). */
const bakedFrame = computed(() =>
  theme.theme === 'dark' ? tourFrameDark : tourFrameLight,
)

/**
 * Reduced motion: стекло показывается сразу разбитым — под ним статичный
 * кадр заставки (см. end() шага «Репорты»).
 */
const startShattered = computed(() => tourState.glassBroken)

/*
 * «Сообщить о найденом баге на лендинге» — ссылка на публичную форму
 * репортёра демо-проекта (то, что показывал шаг «Ссылка» тура).
 */
const REPORTER_LINK = '/report/09610e9d-4a4c-4872-87b4-934681ffd815'

/*
 * «Сообщить о найденом баге на лендинге» — через CTA_DELAY_MS после
 * попытки починить (реального клика по стеклу; в reduced-motion клика
 * не будет — стекло уже разбито, таймер взводится сразу при монтировании).
 * Состояние локальное: перемотка шага снимает стекло со сцены — и таймер,
 * и кнопка уходят вместе с ним.
 */

const CTA_DELAY_MS = 3000

const ctaShown = ref(false)
let ctaTimer: number | undefined

function armCta(): void {
  if (ctaShown.value || ctaTimer !== undefined) {
    return
  }

  ctaTimer = window.setTimeout(() => {
    ctaShown.value = true
    ctaTimer = undefined
  }, CTA_DELAY_MS)
}

/*
 * GlassShatter слушает pointerdown на своём контейнере — событие всплывает
 * до этой обёртки. Взводим таймер один раз: первым кликом (он же рушит
 * стекло), повторные попытки ничего не перезапускают.
 */
function onGlassPointerDown(): void {
  armCta()
}

if (startShattered.value) {
  armCta()
}

onBeforeUnmount(() => {
  if (ctaTimer !== undefined) {
    window.clearTimeout(ctaTimer)
  }
})
</script>

<template>
  <div class="absolute inset-0 z-40" data-tour="glass" @pointerdown="onGlassPointerDown">
    <GlassShatter
      style="height: 100%"
      :image="bakedFrame"
      :shard-count="30"
      :start-shattered="startShattered"
    />

    <!--
      Кнопка репорта по центру сцены: появляется, когда попытка «починить»
      провалилась, и ведёт на публичную форму репортёра демо-проекта.
      RouterLink, а не абсолютный URL — хост и base берутся из роутера,
      поэтому ссылка работает и на Pages (см. REPORTER_LINK).
    -->
    <Transition name="finale-cta">
      <div
        v-if="ctaShown"
        class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
      >
        <RouterLink
          :to="REPORTER_LINK"
          data-tour="finale-report-cta"
          class="pointer-events-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
        >
          Сообщить о найденом баге на лендинге
        </RouterLink>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Проявление кнопки: мягкий всплытие-рост поверх осколков */
.finale-cta-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.4s ease;
}

.finale-cta-leave-active {
  transition: opacity 0.2s ease;
}

.finale-cta-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
}

.finale-cta-leave-to {
  opacity: 0;
}
</style>
