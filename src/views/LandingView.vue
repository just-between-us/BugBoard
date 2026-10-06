<script setup lang="ts">
import { ref } from 'vue'
import { RotateCcw } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import AppHeader from '@/components/layout/AppHeader.vue'
import GlassShatterPrewiew from '@/widgets/landing-preview/GlassShatterPrewiew.vue'
import previewBoard from '@/assets/preview-board.svg'

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
    text: 'Статус, область и важность у каждого бага, обсуждение в комментариях, ответ на репорт — без переключений между инструментами.',
  },
]

/*
 * Крутилки эффекта «разбитое стекло».
 */

const preview = ref<InstanceType<typeof GlassShatterPrewiew> | null>(null)

const shardCount = ref(18)
const shardGap = ref(18)
const depth = ref(30)
const impulse = ref(1)
const showDirt = ref(true)
const showCracks = ref(true)

function restoreGlass() {
  preview.value?.restore()
}
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
        </div>
      </section>

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
            <GlassShatterPrewiew
              ref="preview"
              :image="previewBoard"
              :shard-count="shardCount"
              :shard-gap="shardGap"
              :depth="depth"
              :impulse="impulse"
              :show-dirt="showDirt"
              :show-cracks="showCracks"
            />
          </div>

          <Card class="mt-4">
            <CardHeader>
              <CardTitle class="text-sm">Крутилки эффекта</CardTitle>
              <CardDescription>Настройки стекла в реальном времени</CardDescription>
            </CardHeader>

            <CardContent class="grid gap-8 md:grid-cols-2">
              <div class="space-y-5">
                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label for="glass-depth">Глубина</Label>
                    <span class="font-mono text-xs text-muted-foreground">{{ depth }} px</span>
                  </div>
                  <Slider
                    id="glass-depth"
                    :model-value="[depth]"
                    :min="0"
                    :max="60"
                    :step="1"
                    @update:model-value="depth = $event?.[0] ?? depth"
                  />
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label for="glass-impulse">Ширина разлёта</Label>
                    <span class="font-mono text-xs text-muted-foreground"
                      >×{{ impulse.toFixed(1) }}</span
                    >
                  </div>
                  <Slider
                    id="glass-impulse"
                    :model-value="[impulse]"
                    :min="0"
                    :max="3"
                    :step="0.1"
                    @update:model-value="impulse = $event?.[0] ?? impulse"
                  />
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label for="glass-gap">Зазор между осколками</Label>
                    <span class="font-mono text-xs text-muted-foreground">{{ shardGap }} px</span>
                  </div>
                  <Slider
                    id="glass-gap"
                    :model-value="[shardGap]"
                    :min="0"
                    :max="36"
                    :step="1"
                    @update:model-value="shardGap = $event?.[0] ?? shardGap"
                  />
                </div>

                <div class="space-y-2">
                  <div class="flex items-center justify-between">
                    <Label for="glass-count">Осколков</Label>
                    <span class="font-mono text-xs text-muted-foreground">{{ shardCount }}</span>
                  </div>
                  <Slider
                    id="glass-count"
                    :model-value="[shardCount]"
                    :min="8"
                    :max="60"
                    :step="1"
                    @update:model-value="shardCount = $event?.[0] ?? shardCount"
                  />
                </div>
              </div>

              <div class="space-y-5">
                <div class="flex items-center justify-between gap-4">
                  <div class="space-y-0.5">
                    <Label for="glass-dirt">Грязь на стекле</Label>
                    <p class="text-xs text-muted-foreground">Пятна, разводы и пыль</p>
                  </div>
                  <Switch id="glass-dirt" v-model="showDirt" />
                </div>

                <div class="flex items-center justify-between gap-4">
                  <div class="space-y-0.5">
                    <Label for="glass-cracks">Трещины</Label>
                    <p class="text-xs text-muted-foreground">Серебристые линии по осколкам</p>
                  </div>
                  <Switch id="glass-cracks" v-model="showCracks" />
                </div>

                <Button variant="outline" class="w-full" @click="restoreGlass">
                  <RotateCcw class="size-4" />
                  Восстановить стекло
                </Button>
              </div>
            </CardContent>
          </Card>
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
