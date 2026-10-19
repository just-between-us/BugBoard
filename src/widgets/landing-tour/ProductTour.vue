<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Motion } from 'motion-v'
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from '@lucide/vue'
import { useTour } from './useTour'
import TourStage from './TourStage.vue'

/**
 * Product Tour — секция лендинга сразу после героя.
 * Автоплей по шагам хореографии (см. choreography.ts), меню шагов под сценой
 * позволяет перемотать и повторить любой шаг. Мобильная адаптация — отдельной итерацией.
 */
const tour = useTour()
const { current, playing, paused, finished, reduced, steps } = tour
const activeStep = computed(() => steps[current.value] ?? steps[0]!)

const rootRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

onMounted(() => {
  const el = rootRef.value
  if (!el) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        tour.startOnce()
        observer?.disconnect()
        observer = undefined
      }
    },
    { threshold: 0.35 },
  )
  observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())

const pad = (i: number) => String(i + 1).padStart(2, '0')
</script>

<template>
  <section ref="rootRef" class="border-t border-border hidden lg:block">
    <Motion
      class="mx-auto max-w-6xl px-6 py-20"
      :initial="{ opacity: 0, y: 24 }"
      :whileInView="{ opacity: 1, y: 0 }"
      :viewport="{ once: true, amount: 0.15 }"
      :transition="{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }"
    >
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="space-y-3">
          <h2 class="text-2xl font-semibold tracking-tight">
            Путь от регистрации до первого репорта
          </h2>
          <p class="max-w-xl text-sm text-muted-foreground">
            Короткий тур по BugBoard: как завести аккаунт и проект, вести баги, дать репортёрам
            ссылку и разобрать входящий репорт. Шаги идут сами — любой можно повторить.
          </p>
        </div>
        <span class="font-mono text-xs text-muted-foreground">01 → 07 · шаги</span>
      </div>

      <TourStage class="mt-8" :controller="tour" />

      <!-- Подпись текущего шага + управление -->
      <div class="mt-6 flex items-start justify-between gap-6">
        <div class="min-w-0">
          <p class="font-mono text-xs text-muted-foreground">
            Шаг {{ pad(current) }} из {{ pad(steps.length - 1) }}
          </p>
          <h3 class="mt-1 text-lg font-medium">{{ activeStep.title }}</h3>
          <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
            {{ activeStep.caption }}
          </p>
          <p v-if="reduced" class="mt-2 text-xs text-muted-foreground">
            Автовоспроизведение отключено в системных настройках — переключайте шаги вручную.
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-1">
          <button
            v-if="finished"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
            @click="tour.restartAll()"
          >
            <RotateCcw class="h-3.5 w-3.5" />
            Показать снова
          </button>
          <template v-else>
            <button
              type="button"
              aria-label="Предыдущий шаг"
              class="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              @click="tour.prev()"
            >
              <ChevronLeft class="h-4 w-4" />
            </button>
            <button
              type="button"
              :aria-label="paused ? 'Продолжить' : 'Пауза'"
              class="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              @click="tour.togglePause()"
            >
              <component :is="paused || !playing ? Play : Pause" class="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Повторить шаг"
              class="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              @click="tour.restartStep()"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Следующий шаг"
              class="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              @click="tour.next()"
            >
              <ChevronRight class="h-4 w-4" />
            </button>
          </template>
        </div>
      </div>

      <!-- Меню шагов -->
      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          type="button"
          :aria-current="current === index"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-200"
          :class="
            current === index
              ? 'border-primary/40 bg-primary/5 font-medium text-foreground'
              : 'border-border text-muted-foreground hover:bg-secondary/60'
          "
          @click="tour.goTo(index)"
        >
          <span class="font-mono text-[11px]">{{ pad(index) }}</span>
          {{ step.label }}
        </button>
      </div>
    </Motion>
  </section>
</template>

<!-- Общие классы сцены: глубина, каретка, hover курсора, ripple, список -->
<style>
.tour-screen {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: translateZ(-160px) scale(0.94);
  filter: blur(4px);
  pointer-events: none;
  will-change: transform, opacity, filter;
  transition:
    opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-screen.is-active {
  opacity: 1;
  transform: none;
  filter: none;
  pointer-events: auto;
}

/* Слои глубины внутри экрана — через transform: translateZ(), а не translate:
   Tailwind-утилиты центрирования (translate-x/y-1/2) живут в свойстве translate,
   и перезапись его обнуляла бы центрирование всплывающих окон */
.tour-depth-back {
  transform: translateZ(-60px);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-depth-mid {
  transform: translateZ(-24px);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-depth-front {
  transform: translateZ(80px);
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-depth-enter {
  transition:
    transform 0.55s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.55s;
}

.tour-depth-enter-from {
  transform: translateZ(70px);
  opacity: 0;
}

.tour-depth-leave {
  transition:
    transform 0.3s ease,
    opacity 0.3s;
}

.tour-depth-leave-to {
  transform: translateZ(50px);
  opacity: 0;
}

/* Шаг 1: плавная смена окна аутентификации — форма растворяется, окно OTP
   проявляется (легкий рост снизу + масштаб). Анимируются отдельные CSS-свойства
   scale/translate, а не transform, — чтобы не перебивать translateZ у tour-depth-*
   и центрирование на translate из Tailwind v4 */
.tour-auth-swap-enter-active {
  transition:
    opacity 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    scale 0.32s cubic-bezier(0.22, 1, 0.36, 1),
    translate 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-auth-swap-enter-from {
  opacity: 0;
  scale: 0.94;
  translate: 0 12px;
}

.tour-auth-swap-leave-active {
  transition:
    opacity 0.14s ease,
    scale 0.14s ease;
}

.tour-auth-swap-leave-to {
  opacity: 0;
  scale: 0.97;
}

/* Шаг 2: диалог создания проекта всплывает и уходит как реальный Dialog
   (fade + zoom-in-95). Анимируются opacity/scale — отдельные свойства, чтобы
   не перебивать translateZ глубины и центрирование на translate из Tailwind v4 */
.tour-dialog-enter-active {
  transition:
    opacity 0.2s ease,
    scale 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-dialog-enter-from {
  opacity: 0;
  scale: 0.95;
}

.tour-dialog-leave-active {
  transition:
    opacity 0.16s ease,
    scale 0.16s ease;
}

.tour-dialog-leave-to {
  opacity: 0;
  scale: 0.97;
}

.tour-overlay-enter-active,
.tour-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.tour-overlay-enter-from,
.tour-overlay-leave-to {
  opacity: 0;
}

/* Подсветка цели для курсора тура — цветом самого курсора, по краям элемента
   (у input это скругление его собственного rounded-md) */
.tour-hot {
  box-shadow: 0 0 0 2px #0d99ff;
}

/* Мигающая каретка в заполняемых полях */
.tour-caret {
  animation: tour-blink 1s step-end infinite;
}

@keyframes tour-blink {
  50% {
    opacity: 0;
  }
}

/* Ripple клика */
.tour-ripple {
  width: 46px;
  height: 46px;
  border: 2px solid #0d99ff;
  border-radius: 9999px;
  animation: tour-ripple 0.6s ease-out forwards;
}

@keyframes tour-ripple {
  from {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0.5;
  }
  to {
    transform: translate(-50%, -50%) scale(2.6);
    opacity: 0;
  }
}

/* ASCII-вспышка клика: глифы разлетаются от точки нажатия и замирают */
.tour-ascii {
  width: 0;
  height: 0;
}

.tour-ascii-glyph {
  color: #0d99ff;
  font-size: 11px;
  text-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
  animation: tour-ascii 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes tour-ascii {
  from {
    transform: translate(-50%, -50%) rotate(0deg) scale(0.6);
    opacity: 1;
  }
  to {
    transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(1);
    opacity: 0;
  }
}

/* Магическое появление символа: частицы у каретки цветом текста замирают */
.tour-magic {
  color: inherit;
  opacity: 0;
  animation: tour-magic 0.5s ease-out forwards;
  pointer-events: none;
}

@keyframes tour-magic {
  0% {
    transform: translate(-20%, -50%) scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: translate(calc(-20% + var(--dx)), calc(-50% + var(--dy))) scale(1);
    opacity: 0;
  }
}

/* Вспышки частиц по периметру появившейся карточки: та же референсная эстетика,
   что у автонабора в полях (tour-magic) — точка вспыхивает у края и уносится
   наружу, замирая. Цвет контрастный теме (foreground: белый в тёмной, тёмный
   в светлой); длительность и задержка задаются инлайном на частице */
.tour-spark {
  color: var(--foreground);
  opacity: 0;
  pointer-events: none;
  animation-name: tour-spark;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  animation-fill-mode: forwards;
}

@keyframes tour-spark {
  0% {
    transform: translate(-50%, -50%) scale(0.4);
    opacity: 0;
  }
  22% {
    transform: translate(-50%, -50%) scale(1.05);
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(0.8);
    opacity: 0;
  }
}

/* Перестроение списка багов при смене фильтра */
.tour-list-enter-active {
  transition:
    opacity 0.45s ease,
    transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-list-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

.tour-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.tour-list-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.tour-list-move {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Карточка в момент морфинга уже «занимает» прибывающую панель формы, поэтому
   собственный вход отключается — она собирается, а не въезжает */
.tour-morphing.tour-list-enter-active {
  transition: none;
}

.tour-morphing.tour-list-enter-from {
  transform: none;
}

/* Панель-контейнер морфинга: геометрия (left/top/width/height — явные лейаут-px)
   и цвета плавно перетекают из состояния диалога в состояние карточки списка.
   opacity панели ведёт motion (delay 0.62) — вне списка, чтобы не конфликтовать */
.tour-morph-box {
  transition:
    left 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    width 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    height 0.62s cubic-bezier(0.22, 1, 0.36, 1),
    background-color 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s,
    border-color 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s,
    border-radius 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s,
    box-shadow 0.5s ease 0.05s;
}

/* Состояние карточки: bg-card, rounded-xl, shadow-sm — как у реального ProjectCard */
.tour-morph-box.is-card {
  background-color: var(--card);
  border-color: var(--border);
  border-radius: 0.75rem;
  box-shadow:
    0 1px 3px 0 rgb(0 0 0 / 0.1),
    0 1px 2px -1px rgb(0 0 0 / 0.1);
}

/* Содержимое формы в момент морфинга: не перестраивается от смены ширины панели */
.tour-morph-form {
  position: absolute;
  inset: 0;
}

/* Летящие из формы элементы: поднимаются из полей и летят в слоты карточки */
.tour-fly {
  opacity: 0;
  pointer-events: none;
  transition:
    left 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    top 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.16s ease;
}

.tour-fly.is-on {
  opacity: 1;
}

/* Карточка «собирается» под панелью: щит прозрачен, части скрыты; по команде
   (is-done) проявляются с задержками — иконка, заголовок, описание, глобус,
   затем meta-строка выезжает снизу. Щит обретает карточные цвета чуть позже —
   под 아직 непрозрачной панелью, чтобы смена была незаметной */
.tour-morph-card {
  background-color: transparent;
  border-color: transparent;
  box-shadow: none;
  transition:
    background-color 0.22s ease 0.28s,
    border-color 0.22s ease 0.28s,
    box-shadow 0.22s ease 0.28s;
}

.tour-morph-card [data-tour-card] {
  opacity: 0;
  transition:
    opacity 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.tour-morph-card [data-tour-card='icon'] {
  transform: scale(0.55);
}

.tour-morph-card [data-tour-card='meta-date'],
.tour-morph-card [data-tour-card='meta-owner'] {
  transform: translateY(14px);
}

.tour-morph-card.is-done [data-tour-card] {
  opacity: 1;
  transform: none;
}

.tour-morph-card.is-done [data-tour-card='title'] {
  transition-delay: 0.07s;
}

.tour-morph-card.is-done [data-tour-card='desc'] {
  transition-delay: 0.15s;
}

.tour-morph-card.is-done [data-tour-card='globe'] {
  transition-delay: 0.23s;
}

.tour-morph-card.is-done [data-tour-card='meta-date'] {
  transition-delay: 0.3s;
}

.tour-morph-card.is-done [data-tour-card='meta-owner'] {
  transition-delay: 0.4s;
}

/* Штамп: публичная карточка «прибивается» в список — быстрый слет сверху,
   удар с лёгким перелётом, от которого страницу качает */
.tour-stamp-enter-active {
  animation: tour-stamp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes tour-stamp {
  0% {
    transform: translateY(-16px) scale(1.14) rotate(-1.2deg);
    opacity: 0;
  }

  30% {
    opacity: 1;
  }

  62% {
    transform: translateY(1px) scale(0.985) rotate(0.25deg);
  }

  100% {
    transform: none;
    opacity: 1;
  }
}

.tour-stamp-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.tour-stamp-leave-to {
  opacity: 0;
  transform: translateX(-24px);
}

.tour-stamp-move {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Сотрясение страницы от удара штампа: короткий кивок вниз с затуханием */
.tour-page-thud {
  animation: tour-page-thud 0.32s cubic-bezier(0.3, 0, 0.6, 1) 0.18s;
}

@keyframes tour-page-thud {
  0% {
    transform: translateY(0);
  }

  32% {
    transform: translateY(3.5px);
  }

  58% {
    transform: translateY(-1.6px);
  }

  78% {
    transform: translateY(0.7px);
  }

  100% {
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tour-screen {
    transition: opacity 0.2s ease;
    transform: none;
    filter: none;
  }

  .tour-auth-swap-enter-active,
  .tour-auth-swap-leave-active,
  .tour-dialog-enter-active,
  .tour-dialog-leave-active,
  .tour-overlay-enter-active,
  .tour-overlay-leave-active,
  .tour-list-enter-active,
  .tour-list-leave-active,
  .tour-list-move,
  .tour-stamp-leave-active,
  .tour-stamp-move,
  .tour-fly {
    transition: none;
  }

  /* Штамп и сотрясение — чистая анимация: в reduced motion их не должно быть */
  .tour-stamp-enter-active,
  .tour-page-thud {
    animation: none;
  }

  /* Брызги и вспышки без анимации превратились бы в неподвижные глифы — прячем совсем */
  .tour-ascii-glyph,
  .tour-spark {
    animation: none;
    visibility: hidden;
  }

  .tour-caret,
  .tour-ripple,
  .tour-magic {
    animation: none;
  }
}
</style>
