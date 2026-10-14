<script setup lang="ts">
import { parseDate } from '@internationalized/date'
import { CalendarIcon, X } from '@lucide/vue'
import { computed } from 'vue'
import type { DateRange, DateValue } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { RangeCalendar } from '@/components/ui/range-calendar'
import { cn } from '@/lib/utils'
import { dateRangeLabel } from '@/lib/dateRange'

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

function toIso(value: DateValue | undefined): string | null {
  if (!value) return null
  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

function parse(value: string | null): DateValue | undefined {
  return value ? parseDate(value) : undefined
}

const model = computed<DateRange>({
  get: () => ({ start: parse(props.from), end: parse(props.to) }),
  set: (value) => {
    emit('update:from', toIso(value.start))
    emit('update:to', toIso(value.end))
  },
})

const label = computed(() => dateRangeLabel({ from: props.from, to: props.to }))

function clear() {
  emit('update:from', null)
  emit('update:to', null)
}
</script>

<template>
  <ButtonGroup :class="props.class">
    <Popover>
      <PopoverTrigger as-child>
        <Button
          variant="outline"
          :class="
            cn('h-8 justify-start gap-1.5 px-2.5 text-xs font-normal', {
              'text-muted-foreground': !label,
            })
          "
          aria-label="Период"
        >
          <CalendarIcon class="h-3.5 w-3.5" />
          <span>{{ label ?? 'Период' }}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent class="w-auto p-0" align="start">
        <RangeCalendar
          v-model="model"
          locale="ru-RU"
          :week-starts-on="1"
          :max-value="parse(todayIso)"
          :default-placeholder="parse(props.from) ?? parse(todayIso)"
          initial-focus
        />
      </PopoverContent>
    </Popover>

    <Button
      v-if="label"
      variant="outline"
      size="icon-sm"
      aria-label="Сбросить период"
      @click="clear"
    >
      <X class="h-3.5 w-3.5" />
    </Button>
  </ButtonGroup>
</template>
