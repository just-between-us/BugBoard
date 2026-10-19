<script setup lang="ts">
import { Motion } from 'motion-v'
import { RouterLink } from 'vue-router'
import { ArrowRight, CodeXml } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { AsciiBackground } from '@/components/ascii-background'
import HeroBugCard, { type HeroBug } from './HeroBugCard.vue'
import { useCardTilt } from './useCardTilt'

const bugs: HeroBug[] = [
  {
    id: '#A3F1',
    title: 'Пустой ответ API при пустой корзине',
    description: 'GET /api/cart отдаёт 200 с null вместо пустого массива — фронт падает в ошибку.',
    area: 'api',
    severity: 'critical',
    status: 'in_progress',
    time: '2 мин назад',
  },
  {
    id: '#C9D2',
    title: 'Съезжает шапка на мобильных экранах',
    description: 'На ширине до 380px навигация наезжает на логотип при открытой клавиатуре.',
    area: 'ui',
    severity: 'major',
    status: 'confirmed',
    time: '18 мин назад',
  },
  {
    id: '#E7B4',
    title: 'Таймаут при массовой загрузке файлов',
    description: 'Больше 20 файлов подряд обрываются на 30-й секунде без ошибки в логах.',
    area: 'performance',
    severity: 'minor',
    status: 'fixed',
    time: 'вчера',
  },
  {
    id: '#D4C7',
    title: 'Медленная выдача бэклога на 500+ багов',
    description: 'Список проекта грузится около 4 секунд — пагинации пока нет.',
    area: 'database',
    severity: 'major',
    status: 'discovered',
    time: '40 мин назад',
  },
  {
    id: '#B619',
    title: 'Код с почты не приходит на Outlook',
    description: 'Письмо с кодом уходит в спам только для домена outlook.com.',
    area: 'auth',
    severity: 'minor',
    status: 'discovered',
    time: '3 ч назад',
  },
]

// У каждой карточки свой независимый набор motion-value — наклон одной не влияет на другие
const cards = bugs.map((bug) => ({ bug, tilt: useCardTilt(9) }))

const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <AsciiBackground
    class="pointer-events-none absolute inset-0 hidden text-muted-foreground/60 mask-[radial-gradient(120%_100%_at_72%_60%,black_50%,transparent_78%),linear-gradient(to_bottom,black_55%,transparent_90%)] [mask-composite:intersect] lg:block"
  />
  <section
    class="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28"
  >
    <!-- Текст: кратко — что за платформа и как её использовать; на десктопе — карточка со стеклом, чтобы ASCII-фон не мешал читать -->
    <Motion
      class="relative z-20 lg:rounded-xl lg:border lg:border-border/60 lg:bg-background/75 lg:p-8 lg:shadow-[0_18px_50px_-30px_rgba(0,0,0,0.35)] lg:backdrop-blur-md"
      :initial="{ opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: easeOut }"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-foreground" />
        Баг-трекер для команд разработки
      </span>

      <h1
        class="mt-5 text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl"
      >
        Баги находят все.<br />
        Чинит команда.
      </h1>

      <p
        class="mt-4 max-w-md text-balance text-sm text-muted-foreground max-sm:max-w-[66%] lg:text-base"
      >
        Команда ведёт баги в общем бэклоге с полным доступом друг к другу. Нашедший баг со стороны
        оставляет заявку по ссылке проекта — без регистрации, по коду с почты.
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <Button as-child size="lg">
          <RouterLink to="/auth?mode=signup" class="group">
            Создать команду
            <ArrowRight
              class="ml-1.5 h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:translate-x-1"
            />
          </RouterLink>
        </Button>
        <Button as-child size="lg" variant="outline">
          <a
            href="https://github.com/just-between-us/BugBoard"
            target="_blank"
            rel="noopener noreferrer"
          >
            <CodeXml class="mr-1.5 h-4 w-4" />
            Код на GitHub
          </a>
        </Button>
      </div>
    </Motion>

    <!-- Карточки: на десктопе — колонка с параллакс-наклоном, на мобиле — фоновая шторка справа с автопрокруткой -->
    <div
      class="hero-scroll-clip relative overflow-hidden px-4 max-lg:absolute max-lg:inset-y-0 max-lg:right-0 max-lg:w-1/2 lg:h-136"
      style="perspective: 1000px"
    >
      <div class="hero-scroll-track flex flex-col">
        <Motion
          v-for="(card, i) in cards"
          :key="card.bug.id"
          :initial="{ opacity: 0, y: 36, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.2 + i * 0.12, ease: easeOut }"
          :while-hover="{ scale: 1.015 }"
          class="mb-3 cursor-default will-change-transform"
        >
          <Motion
            :style="{
              rotateX: card.tilt.rotateX,
              rotateY: card.tilt.rotateY,
              y: card.tilt.translateY,
              transformPerspective: 700,
            }"
            @pointermove="card.tilt.onPointerMove"
            @pointerleave="card.tilt.onPointerLeave"
          >
            <HeroBugCard :bug="card.bug" />
          </Motion>
        </Motion>

        <!-- Полные копии списка — петля автопрокрутки бесшовная; наклон общий с оригиналом пары -->
        <Motion
          v-for="(card, i) in cards"
          :key="`${card.bug.id}-dup`"
          :initial="{ opacity: 0, y: 36, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.2 + (i + cards.length) * 0.12, ease: easeOut }"
          :while-hover="{ scale: 1.015 }"
          aria-hidden="true"
          class="mb-3 cursor-default will-change-transform"
        >
          <Motion
            :style="{
              rotateX: card.tilt.rotateX,
              rotateY: card.tilt.rotateY,
              y: card.tilt.translateY,
              transformPerspective: 700,
            }"
            @pointermove="card.tilt.onPointerMove"
            @pointerleave="card.tilt.onPointerLeave"
          >
            <HeroBugCard :bug="card.bug" />
          </Motion>
        </Motion>
      </div>

      <!-- Затемнения: верхний край сцены на всех размерах, мобильные карточки уходят в фон глубже -->
      <div class="pointer-events-none absolute inset-0 hidden bg-background/60 max-lg:block" />
      <div
        class="pointer-events-none absolute inset-0 hidden bg-linear-to-r from-background via-background/50 to-transparent max-lg:block"
      />
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background to-transparent lg:h-40"
      />
      <!-- Изгиб: карточки уходят в тень фона внизу окна сцены -->
      <div
        class="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-background via-background/70 to-transparent lg:h-72 lg:via-background/60 lg:via-30%"
      />
    </div>
  </section>
</template>

<style scoped>
@keyframes hero-scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

.hero-scroll-track {
  animation: hero-scroll 32s linear infinite;
}

@media (hover: hover) {
  .hero-scroll-clip:hover .hero-scroll-track {
    animation-play-state: paused;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-scroll-track {
    animation: none;
  }
}
</style>
