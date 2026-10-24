<script setup lang="ts">
import { Motion } from 'motion-v'
import { CodeXml, FolderKanban, Link2 } from '@lucide/vue'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { useCardTilt } from '@/widgets/landing-hero/useCardTilt'

/**
 * Три карточки аудиторий — разного веса, не равные колонки: команда,
 * тот, кто нашёл баг, и тот, кто хочет свой инстанс. Наклон под курсором —
 * тот же useCardTilt, что у карточек героя.
 */

const audiences = [
  {
    icon: FolderKanban,
    num: '01',
    title: 'Команде разработки',
    text: 'Один проект — полный доступ для всех участников: баги с обсуждением, репорты со стороны, статусы и статистика. Приватный проект не виден никому снаружи — это политика базы, а не обещание в интерфейсе.',
    cta: null,
  },
  {
    icon: Link2,
    num: '02',
    title: 'Тому, кто нашёл баг',
    text: 'Ссылка, три поля и код с почты — весь онбординг. Ответ команды виден прямо в репорте; если вас позовут в команду — аккаунт уже готов, ничего мигрировать не надо.',
    cta: null,
  },
  {
    icon: CodeXml,
    num: '03',
    title: 'Тому, кто хочет своё',
    text: 'Открытый код, Supabase free tier, деплой одной командой. Данные остаются там, где вы их положили.',
    cta: 'github',
  },
] as const

// Наклон каждой карточки — независимый набор motion-value
const cards = audiences.map((audience) => ({ audience, tilt: useCardTilt(5) }))

const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <div class="grid gap-4 md:grid-cols-3">
    <Motion
      v-for="(card, i) in cards"
      :key="card.audience.num"
      class="h-full"
      :initial="{ opacity: 0, y: 24 }"
      :whileInView="{ opacity: 1, y: 0 }"
      :viewport="{ once: true, amount: 0.3 }"
      :transition="{ duration: 0.55, delay: i * 0.1, ease: easeOut }"
    >
      <Motion
        class="flex h-full flex-col rounded-xl border border-border bg-card/70 p-6 shadow-xs backdrop-blur-sm"
        :style="{
          rotateX: card.tilt.rotateX,
          rotateY: card.tilt.rotateY,
          y: card.tilt.translateY,
          transformPerspective: 900,
        }"
        @pointermove="card.tilt.onPointerMove"
        @pointerleave="card.tilt.onPointerLeave"
      >
        <div class="flex items-center justify-between">
          <span class="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <component :is="card.audience.icon" class="h-4.5 w-4.5" />
          </span>
          <span class="font-pixel text-lg leading-none text-muted-foreground/40">
            {{ card.audience.num }}
          </span>
        </div>

        <h3 class="mt-4 text-base font-medium">{{ card.audience.title }}</h3>
        <p class="mt-2 flex-1 text-sm text-muted-foreground">{{ card.audience.text }}</p>

        <div v-if="card.audience.cta === 'github'" class="mt-5">
          <Button as-child size="sm" variant="outline">
            <a
              href="https://github.com/just-between-us/BugBoard"
              target="_blank"
              rel="noopener noreferrer"
            >
              <CodeXml class="mr-1.5 h-4 w-4" />
              Смотреть код
            </a>
          </Button>
        </div>
      </Motion>
    </Motion>
  </div>

  <!-- CTA -->
  <div class="mt-10 flex flex-wrap items-center justify-center gap-3">
    <Button as-child size="lg">
      <RouterLink to="/auth?mode=signup">Создать команду</RouterLink>
    </Button>
    <Button as-child size="lg" variant="outline">
      <RouterLink to="/">В начало — посмотреть тур</RouterLink>
    </Button>
  </div>
</template>
