<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { bucketByDay, type DayBucket } from '@/lib/stats'

const props = defineProps<{ dates: string[]; weeks?: number }>()

function resolveWeeks(): number {
  if (typeof window === 'undefined') return 20
  const width = window.innerWidth
  if (width >= 1024) return 26
  if (width >= 640) return 20
  return 12
}

const viewportWeeks = ref(resolveWeeks())

function syncViewport() {
  viewportWeeks.value = resolveWeeks()
}

const weeks = computed(() => props.weeks ?? viewportWeeks.value)

const days = computed(() => {
  const mondayIndex = (new Date().getDay() + 6) % 7
  const total = (weeks.value - 1) * 7 + mondayIndex + 1
  return bucketByDay(props.dates, total)
})

const columns = computed(() => {
  const cols: DayBucket[][] = []
  for (let i = 0; i < days.value.length; i += 7) {
    cols.push(days.value.slice(i, i + 7))
  }
  return cols
})

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const monthLabels = computed<(string | null)[]>(() => {
  const labels: (string | null)[] = []
  let prevMonth = ''
  for (const col of columns.value) {
    const date = col[0]?.date ?? ''
    const month = date.slice(0, 7)
    labels.push(date && month !== prevMonth ? formatMonth(date) : null)
    prevMonth = month
  }
  return labels
})

function formatMonth(date: string): string {
  const name = new Date(date).toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' })
  const clean = name.replace(/\.$/, '')
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function levelClass(count: number): string {
  if (count === 0) return 'bg-muted'
  if (count === 1) return 'bg-sky-500/30'
  if (count === 2) return 'bg-sky-500/60'
  if (count <= 4) return 'bg-blue-600/75'
  return 'bg-blue-600'
}

function tooltip(day: DayBucket): string {
  const label = new Date(day.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  if (day.count === 0) return `${label}: активности не было`
  return `${label}: ${day.count} ${day.count === 1 ? 'событие' : 'события'}`
}

onMounted(() => {
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})
</script>

<template>
  <div class="flex w-full justify-center">
    <div class="flex w-fit max-w-full gap-1.5 overflow-x-auto pb-1">
      <div class="flex shrink-0 flex-col gap-0.75 sm:gap-1 md:gap-1.5">
        <div class="h-3.5 w-6" />
        <div
          v-for="label in weekdayLabels"
          :key="label"
          class="flex h-3.5 w-6 items-center justify-end text-[10px] leading-none text-muted-foreground"
        >
          {{ label }}
        </div>
      </div>

      <div class="flex flex-col gap-0.75">
        <div class="flex gap-0.75 sm:gap-1 md:gap-1.5">
          <div v-for="(label, ci) in monthLabels" :key="ci" class="relative h-3.5 w-3.5">
            <span
              v-if="label"
              class="absolute top-0 left-0 whitespace-nowrap text-[10px] leading-none text-muted-foreground"
            >
              {{ label }}
            </span>
          </div>
        </div>

        <div class="flex gap-0.75">
          <div
            v-for="(col, ci) in columns"
            :key="ci"
            class="flex flex-col gap-0.75 sm:gap-1 md:gap-1.5"
          >
            <div
              v-for="day in col"
              :key="day.date"
              class="rounded-sm transition-colors h-3.5 w-3.5"
              :class="levelClass(day.count)"
              :title="tooltip(day)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
