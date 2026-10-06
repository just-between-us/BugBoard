<script setup lang="ts">
import { reactive, ref } from 'vue'
import { RotateCcw, Undo2 } from '@lucide/vue'
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

const glassDefaults = {
  depth: 30,
  cursorPower: 1,
  impulse: 1,
  shardGap: 18,
  shardCount: 18,
  dirtStrength: 1,
  crackOpacity: 50,
  crackTone: 50,
  showDirt: true,
  showCracks: true,
}

const glass = reactive({ ...glassDefaults })

type NumericSetting = keyof Omit<typeof glass, 'showDirt' | 'showCracks'>

interface SliderSetting {
  key: NumericSetting
  label: string
  min: number
  max: number
  step: number
  suffix?: string
  decimals?: number
}

const sliderGroups: { title: string; items: SliderSetting[] }[] = [
  {
    title: 'Движение',
    items: [
      { key: 'depth', label: 'Глубина', min: 0, max: 60, step: 1, suffix: ' px' },
      {
        key: 'cursorPower',
        label: 'Сила реакции',
        min: 0,
        max: 2,
        step: 0.1,
        decimals: 1,
        suffix: '×',
      },
      {
        key: 'impulse',
        label: 'Ширина разлёта',
        min: 0,
        max: 3,
        step: 0.1,
        decimals: 1,
        suffix: '×',
      },
    ],
  },
  {
    title: 'Геометрия',
    items: [
      { key: 'shardGap', label: 'Зазор', min: 0, max: 36, step: 1, suffix: ' px' },
      { key: 'shardCount', label: 'Осколков', min: 8, max: 60, step: 1 },
    ],
  },
  {
    title: 'Текстуры',
    items: [
      {
        key: 'dirtStrength',
        label: 'Сила грязи',
        min: 0,
        max: 2,
        step: 0.1,
        decimals: 1,
        suffix: '×',
      },
      { key: 'crackOpacity', label: 'Прозрачность трещин', min: 0, max: 100, step: 1, suffix: ' %' },
      { key: 'crackTone', label: 'Цвет: темнее → светлее', min: 0, max: 100, step: 1, suffix: ' %' },
    ],
  },
]

function updateSetting(key: NumericSetting, value: number[] | undefined) {
  const next = value?.[0]

  if (typeof next === 'number') {
    glass[key] = next
  }
}

function formatSetting(setting: SliderSetting): string {
  const value = glass[setting.key]

  const text = setting.decimals !== undefined ? value.toFixed(setting.decimals) : String(value)

  return text + (setting.suffix ?? '')
}

function restoreGlass() {
  preview.value?.restore()
}

function resetSettings() {
  Object.assign(glass, glassDefaults)
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
              :shard-count="glass.shardCount"
              :shard-gap="glass.shardGap"
              :depth="glass.depth"
              :impulse="glass.impulse"
              :cursor-power="glass.cursorPower"
              :show-dirt="glass.showDirt"
              :show-cracks="glass.showCracks"
              :dirt-strength="glass.dirtStrength"
              :crack-opacity="glass.crackOpacity / 100"
              :crack-tone="glass.crackTone / 100"
            />
          </div>

          <Card class="mt-4">
            <CardHeader>
              <CardTitle class="text-sm">Крутилки эффекта</CardTitle>
              <CardDescription>Настройки стекла в реальном времени</CardDescription>
            </CardHeader>

            <CardContent class="space-y-6">
              <div class="grid gap-8 md:grid-cols-3">
                <div v-for="group in sliderGroups" :key="group.title" class="space-y-5">
                  <p class="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                    {{ group.title }}
                  </p>

                  <div v-for="setting in group.items" :key="setting.key" class="space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <Label :for="`glass-${setting.key}`">{{ setting.label }}</Label>
                      <span class="font-mono text-xs text-muted-foreground">
                        {{ formatSetting(setting) }}
                      </span>
                    </div>
                    <Slider
                      :id="`glass-${setting.key}`"
                      :model-value="[glass[setting.key]]"
                      :min="setting.min"
                      :max="setting.max"
                      :step="setting.step"
                      @update:model-value="updateSetting(setting.key, $event)"
                    />
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-6">
                  <div class="flex items-center gap-2">
                    <Switch id="glass-dirt" v-model="glass.showDirt" />
                    <Label for="glass-dirt">Грязь</Label>
                  </div>
                  <div class="flex items-center gap-2">
                    <Switch id="glass-cracks" v-model="glass.showCracks" />
                    <Label for="glass-cracks">Трещины</Label>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <Button variant="secondary" @click="resetSettings">
                    <Undo2 class="size-4" />
                    Стоковые значения
                  </Button>
                  <Button variant="outline" @click="restoreGlass">
                    <RotateCcw class="size-4" />
                    Восстановить стекло
                  </Button>
                </div>
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
