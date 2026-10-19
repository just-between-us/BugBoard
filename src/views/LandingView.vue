<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import HeroSection from '@/widgets/landing-hero/HeroSection.vue'
import previewBoard from '@/assets/preview-board.svg'

const ProductTour = defineAsyncComponent(() => import('@/widgets/landing-tour/ProductTour.vue'))

const GlassShatter = defineAsyncComponent(
  () => import('@/widgets/landing-preview/GlassShatter.vue'),
)

const steps = [
  {
    title: 'Создайте проект',
    text: 'Название, описание и выбор: приватный — только для своей команды, или публичный — с приёмом репортов по ссылке.',
  },
  {
    title: 'Позовите команду или дайте ссылку',
    text: 'Добавьте разработчиков в проект напрямую или поделитесь адресом вида /report/:id — репортёру хватит кода с почты.',
  },
  {
    title: 'Разбирайте баги вместе',
    text: 'Статус, область и важность у каждого бага, обсуждение в комментариях, ответ на репорт — без переключений между инструментами.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground">
    <AppHeader />

    <main>
      <HeroSection />

      <!-- Product Tour: туториал сразу после героя -->
      <ProductTour />

      <!-- Preview -->
      <section class="border-t border-border">
        <div class="mx-auto max-w-6xl px-6 py-20">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="space-y-3">
              <h2 class="text-2xl font-semibold tracking-tight">Как это выглядит</h2>
              <p class="max-w-md text-sm text-muted-foreground">
                Интерфейс BugBoard под стеклом: нажми, чтобы разбить, и двигай курсором — осколки
                наклоняются следом за ним.
              </p>
            </div>
            <span class="font-mono text-xs text-muted-foreground">нажми, чтобы разбить</span>
          </div>

          <div class="mt-8 overflow-hidden rounded-lg border border-border">
            <GlassShatter :image="previewBoard" />
          </div>
        </div>
      </section>

      <!-- How it works -->
      <section id="how" class="border-t border-border">
        <div class="mx-auto max-w-6xl px-6 py-20">
          <h2 class="text-2xl font-semibold tracking-tight">Как это устроено</h2>
          <ol class="mt-10 grid gap-10 md:grid-cols-3">
            <li v-for="(step, index) in steps" :key="step.title" class="space-y-2">
              <span class="font-mono text-sm text-muted-foreground">{{
                String(index + 1).padStart(2, '0')
              }}</span>
              <h3 class="text-lg font-medium">{{ step.title }}</h3>
              <p class="text-sm text-muted-foreground">{{ step.text }}</p>
            </li>
          </ol>
        </div>
      </section>

      <!-- Audience -->
      <section class="border-t border-border">
        <div class="mx-auto grid max-w-6xl gap-8 px-6 py-20 md:grid-cols-2">
          <div class="rounded-lg border border-border p-6">
            <h3 class="font-mono text-sm text-muted-foreground">Команда разработки</h3>
            <p class="mt-3 text-lg font-medium">Один проект — общий доступ для всех участников</p>
            <p class="mt-2 text-sm text-muted-foreground">
              Заводите баги, ведите обсуждение под каждым, привязывайте к ним репорты и решайте, что
              чинить в первую очередь. Приватный проект — только команда видит баги и репорты.
            </p>
          </div>
          <div class="rounded-lg border border-border p-6">
            <h3 class="font-mono text-sm text-muted-foreground">Тот, кто нашёл баг</h3>
            <p class="mt-3 text-lg font-medium">Ссылка — и весь онбординг</p>
            <p class="mt-2 text-sm text-muted-foreground">
              Публичный проект принимает репорты по прямой ссылке. Код с почты вместо регистрации, а
              дальше можно следить за ответом команды в том же репорте.
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-border">
      <div class="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
        BugBoard — учебный проект.
      </div>
    </footer>
  </div>
</template>
