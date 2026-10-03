<script setup lang="ts">
import { computed, ref } from 'vue'
import { VisArea, VisAxis, VisXYContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { ACCENT, ACCENT_DEEP } from './chart-colors'

interface Props {
  bugs: Bug[]
  reports: Report[]
}

const props = defineProps<Props>()

interface Point {
  ts: number
  bugs: number
  reports: number
}

const DAY_MS = 86_400_000

const RANGES = [
  { days: 90, label: 'Последние 3 месяца' },
  { days: 30, label: 'Последние 30 дней' },
  { days: 7, label: 'Последние 7 дней' },
] as const

// Выбор периода прямо в шапке карточки (как в shadcn area-interactive)
const range = ref<number>(90)

function onRangeChange(value: string) {
  const days = Number(value)
  if (RANGES.some((item) => item.days === days)) range.value = days
}

function startOfDay(time: number): number {
  const date = new Date(time)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function countByDay(items: { created_at: string }[]): Map<number, number> {
  const counts = new Map<number, number>()
  for (const item of items) {
    const key = startOfDay(new Date(item.created_at).getTime())
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return counts
}

const points = computed<Point[]>(() => {
  const bugsByDay = countByDay(props.bugs)
  const reportsByDay = countByDay(props.reports)
  const today = startOfDay(Date.now())
  const result: Point[] = []

  for (let i = range.value - 1; i >= 0; i--) {
    const ts = startOfDay(today - i * DAY_MS)
    result.push({
      ts,
      bugs: bugsByDay.get(ts) ?? 0,
      reports: reportsByDay.get(ts) ?? 0,
    })
  }

  return result
})

const totalBugs = computed(() => points.value.reduce((sum, p) => sum + p.bugs, 0))
const totalReports = computed(() => points.value.reduce((sum, p) => sum + p.reports, 0))
const hasData = computed(() => totalBugs.value > 0 || totalReports.value > 0)

const chartConfig = {
  bugs: { label: 'Баги', color: ACCENT },
  reports: { label: 'Репорты', color: ACCENT_DEEP },
} satisfies ChartConfig

const yDomain = computed<[number, number]>(() => {
  const max = points.value.reduce((acc, p) => Math.max(acc, p.bugs + p.reports), 0)
  return [0, Math.max(max, 1)]
})

const tickValues = computed<number[]>(() => {
  const count = points.value.length
  if (count === 0) return []
  const step = Math.max(1, Math.ceil((count - 1) / 6))
  const ticks: number[] = []
  for (let i = 0; i < count; i += step) ticks.push(i)
  if (ticks[ticks.length - 1] !== count - 1) ticks.push(count - 1)
  return ticks
})

const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })

function formatDay(ts: number): string {
  return dayFormatter.format(new Date(ts))
}

function formatTick(value: number): string {
  const point = points.value[Math.round(value)]
  return point ? formatDay(point.ts) : ''
}

const crosshairTemplate = componentToString(chartConfig, ChartTooltipContent, {
  labelFormatter: (d: number | Date) => {
    const point = points.value[Math.round(Number(d))]
    return point ? formatDay(point.ts) : ''
  },
})
</script>

<template>
  <Card class="pt-0">
    <CardHeader
      class="flex flex-col gap-4 border-b px-4 pt-5 sm:flex-row sm:items-center sm:gap-2 sm:px-6"
    >
      <div class="grid flex-1 gap-1">
        <CardTitle class="text-base">Динамика появления</CardTitle>
        <CardDescription>Баги и репорты за выбранный период</CardDescription>
      </div>

      <Select :model-value="String(range)" @update:modelValue="onRangeChange">
        <SelectTrigger class="rounded-lg sm:ml-auto w-auto" aria-label="Выберите период">
          <Calendar class="h-4 w-4 mr-2" />
          <SelectValue placeholder="Последние 3 месяца" />
        </SelectTrigger>
        <SelectContent class="rounded-xl">
          <SelectItem
            v-for="item in RANGES"
            :key="item.days"
            class="rounded-lg"
            :value="String(item.days)"
          >
            {{ item.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </CardHeader>

    <CardContent class="px-2 pt-4 sm:px-6 sm:pt-6">
      <template v-if="hasData">
        <ChartContainer
          :config="chartConfig"
          cursor
          class="aspect-auto h-[250px] w-full [&_.tick>line]:!stroke-border/50"
        >
          <VisXYContainer :data="points" :y-domain="yDomain">
            <VisArea
              :x="(d: Point, i: number) => i"
              :y="(d: Point) => d.bugs + d.reports"
              :baseline="(d: Point) => d.bugs"
              :color="ACCENT_DEEP"
              :line="true"
              :line-width="2"
              :opacity="0.4"
            />
            <VisArea
              :x="(d: Point, i: number) => i"
              :y="(d: Point) => d.bugs"
              :color="ACCENT"
              :line="true"
              :line-width="2"
              :opacity="0.55"
            />
            <VisAxis
              type="y"
              :y="(d: Point) => d.bugs + d.reports"
              :num-ticks="3"
              :tick-line="false"
              :domain-line="false"
              :grid-line="true"
              :tick-format="(v: number) => String(Math.round(v))"
              tick-text-color="var(--muted-foreground)"
            />
            <VisAxis
              type="x"
              :x="(d: Point, i: number) => i"
              :tick-values="tickValues"
              :num-ticks="tickValues.length || 1"
              :tick-line="false"
              :domain-line="false"
              :grid-line="false"
              :tick-format="formatTick"
              :tick-text-adaptive-sets="true"
              :tick-text-hide-overlapping="true"
              tick-text-color="var(--muted-foreground)"
            />
            <ChartTooltip />
            <ChartCrosshair :template="crosshairTemplate" color="#0000" :circle-radius="0" />
          </VisXYContainer>
        </ChartContainer>

        <div
          class="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-1 text-xs text-muted-foreground"
        >
          <span class="flex items-center gap-1.5">
            <span
              class="h-2 w-2 shrink-0 rounded-xs"
              :style="{ backgroundColor: ACCENT }"
              aria-hidden="true"
            />
            Баги
            <span class="font-medium tabular-nums text-foreground">{{ totalBugs }}</span>
          </span>
          <span class="flex items-center gap-1.5">
            <span
              class="h-2 w-2 shrink-0 rounded-xs"
              :style="{ backgroundColor: ACCENT_DEEP }"
              aria-hidden="true"
            />
            Репорты
            <span class="font-medium tabular-nums text-foreground">{{ totalReports }}</span>
          </span>
        </div>
      </template>

      <p v-else class="py-10 text-center text-sm text-muted-foreground">
        Нет данных за выбранный период
      </p>
    </CardContent>
  </Card>
</template>
