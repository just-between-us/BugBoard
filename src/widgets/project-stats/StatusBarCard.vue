<script setup lang="ts">
import { computed } from 'vue'
import { VisAxis, VisGroupedBar, VisXYContainer, VisXYLabels } from '@unovis/vue'
import type { ChartConfig } from '@/components/ui/chart'
import {
  ChartContainer,
  ChartCrosshair,
  ChartTooltip,
  ChartTooltipContent,
  componentToString,
} from '@/components/ui/chart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface StatusRow {
  key: string
  label: string
  count: number
  fill: string
}

interface Props {
  rows: StatusRow[]
}

const props = defineProps<Props>()

const rows = computed<StatusRow[]>(() => props.rows)
const total = computed(() => rows.value.reduce((sum, row) => sum + row.count, 0))

const chartConfig = {
  count: { label: 'Багов' },
} satisfies ChartConfig

const yDomain = computed<[number | undefined, number | undefined]>(() => {
  const max = rows.value.reduce((acc, row) => Math.max(acc, row.count), 0)
  return [0, Math.max(max, 1)]
})

const crosshairTemplate = componentToString(chartConfig, ChartTooltipContent, {
  labelFormatter: (d: number | Date) => {
    if (typeof d !== 'number') return ''
    return rows.value[Math.round(d)]?.label ?? ''
  },
})
</script>

<template>
  <Card class="gap-0 py-0">
    <CardHeader class="border-b px-4 pt-5 pb-4 sm:px-6">
      <CardTitle class="text-base">Статусы</CardTitle>
      <CardDescription class="mt-1">Распределение багов по статусам</CardDescription>
    </CardHeader>

    <CardContent class="py-5 px-6 flex flex-col justify-between h-full">
      <template v-if="total > 0">
        <ChartContainer
          :config="chartConfig"
          class="mx-auto h-52.5 w-full max-w-lg [&_[class*='label-g']>text]:[translate:0_-15px]"
        >
          <VisXYContainer :data="rows" :y-domain="yDomain" :margin="{ top: 24 }">
            <VisGroupedBar
              :x="(d: StatusRow, i: number) => i"
              :y="(d: StatusRow) => d.count"
              :color="(d: StatusRow) => d.fill"
              :group-padding="0.2"
              :group-max-width="64"
              :rounded-corners="8"
            />
            <VisXYLabels
              :x="(d: StatusRow, i: number) => i"
              :y="(d: StatusRow) => d.count"
              :label="(d: StatusRow) => String(d.count)"
              :label-font-size="12"
              color="var(--card-foreground)"
              :background-color="() => 'transparent'"
              :clustering="false"
            />
            <VisAxis
              type="y"
              :y="(d: StatusRow) => d.count"
              :num-ticks="3"
              :tick-line="false"
              :domain-line="false"
              :grid-line="true"
              :tick-format="(v: number) => String(Math.round(v))"
              tick-text-color="var(--muted-foreground)"
            />
            <ChartTooltip />
            <ChartCrosshair :template="crosshairTemplate" color="#0000" :circle-radius="0" />
          </VisXYContainer>
        </ChartContainer>

        <ul class="mt-4 w-full flex flex-wrap justify-center gap-x-5 gap-y-2">
          <li v-for="row in rows" :key="row.key" class="flex w-full items-center gap-1.5 text-xs">
            <span
              class="h-2 w-2 shrink-0 rounded-xs"
              :style="{ backgroundColor: row.fill }"
              aria-hidden="true"
            />
            <span class="text-muted-foreground">{{ row.label }}</span>
            <span class="font-medium ml-auto tabular-nums text-foreground">{{ row.count }}</span>
          </li>
        </ul>
      </template>

      <p v-else class="py-8 text-center text-sm text-muted-foreground">Нет данных</p>
    </CardContent>
  </Card>
</template>
