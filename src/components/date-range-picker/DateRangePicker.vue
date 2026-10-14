<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import { CalendarIcon, X } from '@lucide/vue'
import type { DateValue } from 'reka-ui'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { formatIsoDate } from '@/lib/dateRange'

interface Props {
  from: string | null
  to: string | null
  class?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:from': [value: string | null]
  'update:to': [value: string | null]
}>()

const todayIso = new Date().toISOString().slice(0, 10)

function toIso(value: DateValue | undefined | null): string | null {
  if (!value) return null
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

function fromModel(value: DateValue | DateValue[] | undefined): string | null {
  return Array.isArray(value) ? toIso(value[0]) : toIso(value)
}

function toModel(value: DateValue | DateValue[] | undefined): string | null {
  return Array.isArray(value) ? toIso(value[0]) : toIso(value)
}

function parse(value: string | null): DateValue | undefined {
  return value ? parseDate(value) : undefined
}

function clear() {
  emit('update:from', null)
  emit('update:to', null)
}
</script>

<template>
  <div :class="cn('flex items-center gap-1', props.class)">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :class="
            cn(
              buttonVariants({ variant: 'outline' }),
              'h-8 justify-start gap-1.5 px-2.5 text-xs font-normal',
              !props.from && 'text-muted-foreground',
            )
          "
          aria-label="Дата от"
        >
          <CalendarIcon class="h-3.5 w-3.5" />
          <span>{{ props.from ? formatIsoDate(props.from) : 'От' }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar
          :model-value="parse(props.from)"
          locale="ru-RU"
          :week-starts-on="1"
          layout="month-and-year"
          :max-value="props.to ? parse(props.to) : parse(todayIso)"
          @update:modelValue="emit('update:from', fromModel($event))"
        />
      </PopoverContent>
    </Popover>

    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :class="
            cn(
              buttonVariants({ variant: 'outline' }),
              'h-8 justify-start gap-1.5 px-2.5 text-xs font-normal',
              !props.to && 'text-muted-foreground',
            )
          "
          aria-label="Дата до"
        >
          <CalendarIcon class="h-3.5 w-3.5" />
          <span>{{ props.to ? formatIsoDate(props.to) : 'До' }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <Calendar
          :model-value="parse(props.to)"
          locale="ru-RU"
          :week-starts-on="1"
          layout="month-and-year"
          :min-value="props.from ? parse(props.from) : undefined"
          :max-value="parse(todayIso)"
          @update:modelValue="emit('update:to', toModel($event))"
        />
      </PopoverContent>
    </Popover>

    <Button
      v-if="props.from || props.to"
      variant="ghost"
      size="icon-sm"
      class="h-7 w-7"
      aria-label="Сбросить период"
      @click="clear"
    >
      <X class="h-3.5 w-3.5" />
    </Button>
  </div>
</template>
