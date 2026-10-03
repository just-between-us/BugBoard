<script setup lang="ts">
import { computed } from 'vue'
import { ChartContainer } from '@/components/ui/chart'
import { Card, CardHeader, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { VisDonut, VisSingleContainer } from '@unovis/vue'

export interface SeveritySlice {
  key: string
  label: string
  count: number
  fill: string
}

interface Props {
  total: number
  critical: number
  open: number
  fixed: number
  severity: SeveritySlice[]
}

const props = defineProps<Props>()

// Верхнее полукольцо — как в shadcn chart-radial-stacked (startAngle 0, endAngle 180)
const ANGLE_RANGE: [number, number] = [-Math.PI / 2, Math.PI / 2]

const chartConfig = {
  count: { label: 'Багов' },
}

const segments = computed(() => props.severity.filter((slice) => slice.count > 0))
const hasData = computed(() => props.total > 0)

function share(count: number): string {
  if (!props.total) return '0%'
  return `${Math.round((count / props.total) * 100)}%`
}
</script>

<template>
  <Card class="gap-0 py-0">
    <CardHeader class="border-b px-4 pt-5 pb-4 sm:px-6">
      <CardTitle class="text-base">Всего багов</CardTitle>
      <CardDescription class="mt-1">Критичность · открытые и исправленные</CardDescription>
    </CardHeader>

    <template v-if="hasData">
      <CardContent class="flex flex-col items-center gap-4 px-4 pt-5 sm:px-6">
        <ChartContainer
          :config="chartConfig"
          class="mx-auto aspect-square w-full max-w-60 [--vis-donut-background-color:var(--muted)] [--vis-donut-central-label-font-size:30px] [--vis-donut-central-label-font-weight:700] [--vis-donut-central-label-text-color:var(--card-foreground)] [--vis-donut-central-sub-label-font-size:11px] [--vis-donut-central-sub-label-text-color:var(--muted-foreground)]"
        >
          <VisSingleContainer :data="segments" :margin="{ top: 8, bottom: 8 }">
            <VisDonut
              :value="(d: SeveritySlice) => d.count"
              :color="(d: SeveritySlice) => d.fill"
              :angle-range="ANGLE_RANGE"
              :arc-width="24"
              :cornerRadius="5"
              :pad-angle="0.012"
              :central-label="String(props.total)"
              central-sub-label="багов"
            />
          </VisSingleContainer>
        </ChartContainer>

        <ul class="w-full space-y-2 pb-4">
          <li v-for="slice in segments" :key="slice.key" class="flex items-center gap-2 text-sm">
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-xs"
              :style="{ backgroundColor: slice.fill }"
              aria-hidden="true"
            />
            <span class="min-w-0 flex-1 truncate">{{ slice.label }}</span>
            <span class="shrink-0 tabular-nums text-muted-foreground">{{ slice.count }}</span>
            <span class="w-10 shrink-0 text-right tabular-nums text-xs text-muted-foreground">
              {{ share(slice.count) }}
            </span>
          </li>
        </ul>
      </CardContent>
    </template>

    <p v-else class="px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
      Багов пока нет
    </p>
  </Card>
</template>
