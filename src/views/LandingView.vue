<script setup lang="ts">
import { Button } from '@/components/ui/button'
import AppHeader from '@/components/layout/AppHeader.vue'
import GlassOverlay from '@/widgets/landing-preview/GlassOverlay.vue'

type Severity = 'critical' | 'major' | 'minor'

const severityDot: Record<Severity, string> = {
  critical: 'bg-severity-critical',
  major: 'bg-severity-major',
  minor: 'bg-severity-minor',
}

const tickets: { id: string; area: string; severity: Severity; status: string; time: string }[] = [
  { id: 'BUG-142', area: 'auth', severity: 'critical', status: 'обнаружен', time: '2 мин назад' },
  { id: 'BUG-141', area: 'ui', severity: 'major', status: 'подтверждён', time: '14 мин назад' },
  { id: 'BUG-139', area: 'database', severity: 'minor', status: 'исправлен', time: '1 час назад' },
]

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
    text: 'Статус, область и важность у каждого бага, обсуждение в комментариях, ответ на репорт — без переключения между инструментами.',
  },
]
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground">
    <AppHeader />

    <main>
      <!-- Hero -->
      <section
        class="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-2 md:items-center md:py-28"
      >
        <div class="space-y-6">
          <h1 class="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Баги находят все.<br />Чинит команда.
          </h1>
          <p class="max-w-md text-base text-muted-foreground">
            BugBoard — общий трекер для команды разработки и открытая форма для репортов от кого
            угодно. Участнику проекта — полный доступ, тому, кто просто нашёл баг, — только ссылка и
            код с почты.
          </p>
          <div class="flex flex-wrap items-center gap-3">
            <Button as-child size="lg">
              <RouterLink to="/auth?mode=signup">Создать команду</RouterLink>
            </Button>
            <Button as-child size="lg" variant="ghost">
              <a href="#how">Как это устроено</a>
            </Button>
          </div>
        </div>

        <div class="group relative overflow-hidden rounded-lg border border-border bg-card">
          <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <span class="font-mono text-xs text-muted-foreground">auth-service / issues</span>
            <span class="font-mono text-xs text-muted-foreground"
              >{{ tickets.length }} открыто</span
            >
          </div>
          <ul class="divide-y divide-border">
            <li
              v-for="ticket in tickets"
              :key="ticket.id"
              class="flex items-center gap-3 px-4 py-3"
            >
              <span class="h-2 w-2 shrink-0 rounded-full" :class="severityDot[ticket.severity]" />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-sm">{{ ticket.id }}</span>
                  <span
                    class="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {{ ticket.area }}
                  </span>
                </div>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ ticket.status }} · {{ ticket.time }}
                </p>
              </div>
            </li>
          </ul>

          <!-- проверка стеклянного эффекта: двигай курсором по карточке, кликни -->
          <GlassOverlay />
          <span
            class="pointer-events-none absolute bottom-3 right-3 rounded-full border border-border bg-background/80 px-2.5 py-1 font-mono text-[11px] text-muted-foreground opacity-100 backdrop-blur transition-opacity duration-300 group-hover:opacity-0"
          >
            нажми
          </span>
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
