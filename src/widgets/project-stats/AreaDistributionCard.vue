<script setup lang="ts">
import { computed, ref } from 'vue'
import { Donut } from '@unovis/ts'
import { VisDonut, VisSingleContainer } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { areaIcon, areaOptions, optionLabel } from '@/entities/bug/meta'
import type { Bug } from '@/stores/projects'
import { AREA_CHART_COLOR as AREA_COLORS, withAlpha } from './chart-colors'

interface Props {
  bugs: Bug[]
}

const props = defineProps<Props>()

interface AreaRow {
  area: string
  label: string
  count: number
  fill: string
}

const chartConfig = {
  count: { label: 'Багов' },
} satisfies ChartConfig

const rows = computed<AreaRow[]>(() => {
  const counts = new Map<string, number>()
  for (const bug of props.bugs) {
    counts.set(bug.area, (counts.get(bug.area) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([area, count]) => ({
      area,
      label: optionLabel(areaOptions, area),
      count,
      fill: AREA_COLORS[area] ?? AREA_COLORS.other ?? '#94a3b8',
    }))
    .sort((a, b) => b.count - a.count)
})

const total = computed(() => props.bugs.length)

function share(count: number): string {
  if (!total.value) return '0%'
  return `${Math.round((count / total.value) * 100)}%`
}

// Активный сектор (наведение на сегмент или на строку легенды)
const activeIndex = ref<number | null>(null)

function setActive(index: number | null) {
  activeIndex.value = index
}

const donutEvents = {
  [Donut.selectors.segment]: {
    mouseenter: (_d: unknown, _e: MouseEvent, i: number) => setActive(i),
    mouseleave: () => setActive(null),
  },
}

// Новый экземпляр функции при смене активного сектора — инициирует перерисовку Unovis
const segmentColor = computed(() => {
  const active = activeIndex.value
  return (d: AreaRow, i: number) =>
    active === null || active === i ? d.fill : withAlpha(d.fill, 0.3)
})

const activeRow = computed(() =>
  activeIndex.value === null ? null : (rows.value[activeIndex.value] ?? null),
)

const donutTriggers = {
  [Donut.selectors.segment]: componentToString(chartConfig, ChartTooltipContent, {
    labelKey: 'label',
  }),
}
</script>

<template>
  <Card class="gap-4">
    <CardHeader class="border-b px-4 sm:px-6">
      <CardTitle class="flex items-center gap-2 text-base"> Распределение по областям </CardTitle>
      <CardDescription>Где сосредоточены баги</CardDescription>
    </CardHeader>

    <CardContent class="flex w-full flex-col items-center gap-4 px-4 sm:px-6">
      <ChartContainer
        :config="chartConfig"
        class="mx-auto aspect-square max-h-55 w-full max-w-60 shrink-0 sm:mx-0 [--vis-donut-background-color:var(--muted)] [--vis-donut-central-label-text-color:var(--card-foreground)]"
      >
        <VisSingleContainer :data="rows" :margin="{ top: 8, bottom: 8 }">
          <VisDonut
            :value="(d: AreaRow) => d.count"
            :color="segmentColor"
            :events="donutEvents"
            :arc-width="34"
            :corner-radius="4"
            :pad-angle="0.02"
            :central-label="String(activeRow ? activeRow.count : total)"
            :central-sub-label="activeRow ? activeRow.label : 'багов'"
          />
          <ChartTooltip :triggers="donutTriggers" />
        </VisSingleContainer>
      </ChartContainer>
      <ul class="min-w-0 w-full flex-1 space-y-2">
        <li
          v-for="(row, index) in rows"
          :key="row.area"
          class="flex w-full items-center gap-2 text-sm"
          @mouseenter="setActive(index)"
          @mouseleave="setActive(null)"
        >
          <component :is="areaIcon(row.area)" class="h-4 w-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1 truncate">{{ row.label }}</span>
          <span class="shrink-0 tabular-nums text-muted-foreground">{{ row.count }}</span>
          <span class="w-10 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
            {{ share(row.count) }}
          </span>
        </li>
      </ul>
    </CardContent>
  </Card>
</template>
