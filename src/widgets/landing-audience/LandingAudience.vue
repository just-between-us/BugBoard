<script setup lang="ts">
import { Motion } from 'motion-v'
import { AsciiBackground } from '@/components/ascii-background'
import ManifestoList from './parts/ManifestoList.vue'
import AudienceCards from './parts/AudienceCards.vue'
import PixelMarquee from './parts/PixelMarquee.vue'

/**
 * Философский блок вместо прежней секции аудиторий: манифест «Не линейка
 * с лазерным уровнем» (ASCII-фон — фирменный, как в герое, но со своей
 * маской), три аудитории с наклоном под курсором и пиксельная
 * бегущая строка-разделитель сверху.
 */
const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <section class="relative overflow-hidden border-t border-border">
    <!-- ASCII-фон: магнитное свечение под курсором, своя маска -->
    <AsciiBackground
      class="pointer-events-none absolute inset-0 hidden text-muted-foreground/50 mask-[radial-gradient(140%_120%_at_50%_0%,black_30%,transparent_75%)] lg:block"
      :cell-size="36"
      :radius="5"
    />

    <!-- Пиксельная бегущая строка-разделитель -->
    <PixelMarquee class="relative" />

    <div class="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
      <!-- Лид манифеста -->
      <Motion
        class="max-w-3xl"
        :initial="{ opacity: 0, y: 24 }"
        :whileInView="{ opacity: 1, y: 0 }"
        :viewport="{ once: true, amount: 0.4 }"
        :transition="{ duration: 0.6, ease: easeOut }"
      >
        <p class="font-pixel text-sm tracking-widest text-muted-foreground">PHILOSOPHY</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Не линейка с лазерным уровнем
        </h2>
        <p class="mt-4 max-w-2xl text-balance text-sm text-muted-foreground sm:text-base">
          BugBoard — удобный инструмент с открытым кодом для усреднённой категории проектов:
          side-project, учебная команда, небольшой продукт. Ему не нужен стабилизатор и
          сертификация — нужна понятность. Простой подход — это не «пока не доделали»,
          а позиция: чем меньше интерфейс мешает, тем быстрее баг доходит до исправления.
        </p>
      </Motion>

      <!-- Манифест -->
      <div class="mt-14 lg:mt-20">
        <ManifestoList />
      </div>

      <!-- Аудитории -->
      <div class="mt-16 lg:mt-24">
        <Motion
          class="max-w-2xl"
          :initial="{ opacity: 0, y: 20 }"
          :whileInView="{ opacity: 1, y: 0 }"
          :viewport="{ once: true, amount: 0.4 }"
          :transition="{ duration: 0.55, ease: easeOut }"
        >
          <p class="font-pixel text-sm tracking-widest text-muted-foreground">FOR WHOM</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Кому это подходит</h2>
        </Motion>

        <div class="mt-8">
          <AudienceCards />
        </div>
      </div>
    </div>
  </section>
</template>
