<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpDown, X } from '@lucide/vue'
import { useMediaQuery } from '@vueuse/core'
import type { Report } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reportStatusLabel, reportStatusOptions } from '@/entities/report'
import { useScrollEdges } from '@/lib/useScrollEdges'

type SortBy = 'created_at' | 'updated_at' | 'manual'

interface Props {
  statusFilter: 'all' | Report['status']
  bugFilter: 'all' | 'linked' | 'unlinked'
  sortBy: SortBy
  sortOrder: 'asc' | 'desc'
  isMember: boolean
  hasActiveFilters: boolean
  panelOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:statusFilter': [filter: 'all' | Report['status']]
  'update:bugFilter': [filter: 'all' | 'linked' | 'unlinked']
  'update:sortBy': [sortBy: SortBy]
  toggleSortOrder: []
  clearAllFilters: []
}>()

const isMobile = useMediaQuery('(max-width: 640px)')

const { scroller, scrolledStart, scrolledEnd, updateEdges } = useScrollEdges()

const sortOptions = [
  { value: 'created_at', label: 'Дата создания' },
  { value: 'updated_at', label: 'Дата обновления' },
  { value: 'manual', label: 'Вручную' },
] as const

// Ручной порядок доступен только участникам — только они могут перетаскивать
const visibleSortOptions = computed(() =>
  props.isMember ? sortOptions : sortOptions.filter((opt) => opt.value !== 'manual'),
)

// «Особая» сортировка = не по умолчанию (дата создания / по убыванию)
const isSortCustom = computed(() => props.sortBy !== 'created_at' || props.sortOrder !== 'desc')

const sortFieldLabel = computed(
  () => sortOptions.find((o) => o.value === props.sortBy)?.label ?? 'Сортировка',
)
const sortDirSymbol = computed(() => (props.sortOrder === 'asc' ? '↑' : '↓'))

// Тонкие подсказки активного состояния для закрытой панели (мобиле)
const activeFilterChips = computed(() => {
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (props.statusFilter !== 'all')
    chips.push({
      key: 'status',
      label: reportStatusLabel(props.statusFilter),
      onRemove: () => emit('update:statusFilter', 'all'),
    })
  if (props.isMember && props.bugFilter !== 'all')
    chips.push({
      key: 'bug',
      label: props.bugFilter === 'linked' ? 'Привязаны к багу' : 'Без привязки',
      onRemove: () => emit('update:bugFilter', 'all'),
    })
  return chips
})

const activeStateCount = computed(
  () => activeFilterChips.value.length + (isSortCustom.value ? 1 : 0),
)

// Ряд подсказок — на мобиле, когда панель закрыта и есть что показать
// (кнопка-стрелка живёт в строке поиска у родителя)
const showCollapsedHints = computed(
  () => isMobile.value && !props.panelOpen && activeStateCount.value > 0,
)

function resetSort() {
  emit('update:sortBy', 'created_at')
  if (props.sortOrder !== 'desc') emit('toggleSortOrder')
}

function handleStatusFilterUpdate(filter: string) {
  emit('update:statusFilter', filter as 'all' | Report['status'])
}

function handleBugFilterUpdate(filter: string) {
  emit('update:bugFilter', filter as 'all' | 'linked' | 'unlinked')
}

function handleSortByUpdate(sortBy: string) {
  emit('update:sortBy', sortBy as SortBy)
}
</script>

<template>
  <div class="space-y-2">
    <!-- Мобиле: тонкие подсказки активного состояния (кнопка-стрелка — в строке поиска у родителя) -->
    <div v-if="showCollapsedHints" class="flex items-center gap-1.5">
      <span
        v-for="chip in activeFilterChips"
        :key="chip.key"
        class="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
      >
        {{ chip.label }}
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5"
          @click="chip.onRemove"
          :aria-label="`Сбросить фильтр: ${chip.label}`"
        >
          <X class="h-3 w-3" />
        </Button>
      </span>
      <span
        v-if="isSortCustom"
        class="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium"
      >
        {{ sortFieldLabel }} {{ sortDirSymbol }}
        <Button
          variant="ghost"
          size="icon"
          class="h-5 w-5"
          @click="resetSort"
          aria-label="Сбросить сортировку"
        >
          <X class="h-3 w-3" />
        </Button>
      </span>
    </div>

    <!-- Панель: фильтры (горизонтальный скролл с масками) + сброс + сортировка
         (ButtonGroup). На десктопе всегда видна, на мобиле — по кнопке-стрелке -->
    <div v-show="!isMobile || props.panelOpen" class="flex flex-wrap items-center gap-2">
      <div
        ref="scroller"
        class="scroll-x-fade min-w-0 flex-1 overflow-x-auto py-1"
        :class="{ 'is-scrolled-start': scrolledStart, 'is-scrolled-end': scrolledEnd }"
        @scroll.passive="updateEdges"
      >
        <div class="flex w-max items-center gap-2">
          <div
            v-if="props.statusFilter !== 'all'"
            class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
          >
            <span class="text-sm font-medium">{{ reportStatusLabel(props.statusFilter) }}</span>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              @click="emit('update:statusFilter', 'all')"
              aria-label="Сбросить фильтр статуса"
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
          <div v-else>
            <Select :model-value="props.statusFilter" @update:modelValue="handleStatusFilterUpdate">
              <SelectTrigger>
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem v-for="opt in reportStatusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div
            v-if="props.isMember && props.bugFilter !== 'all'"
            class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
          >
            <span class="text-sm font-medium">
              {{ props.bugFilter === 'linked' ? 'Привязаны к багу' : 'Без привязки' }}
            </span>
            <Button
              variant="ghost"
              size="icon"
              class="h-6 w-6"
              @click="emit('update:bugFilter', 'all')"
              aria-label="Сбросить фильтр привязки"
            >
              <X class="h-3.5 w-3.5" />
            </Button>
          </div>
          <div v-else-if="props.isMember">
            <Select :model-value="props.bugFilter" @update:modelValue="handleBugFilterUpdate">
              <SelectTrigger>
                <SelectValue placeholder="Привязка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все репорты</SelectItem>
                <SelectItem value="linked">Привязаны к багу</SelectItem>
                <SelectItem value="unlinked">Без привязки</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Button
        v-if="props.hasActiveFilters"
        variant="destructive"
        size="sm"
        class="shrink-0"
        @click="emit('clearAllFilters')"
        aria-label="Сбросить всё"
      >
        <X class="h-4 w-4 sm:mr-1" />
        <span class="hidden sm:inline">Сбросить всё</span>
      </Button>

      <!-- Группа сортировки: на десктопе прижата вправо в той же строке,
           на мобиле занимает всю ширину отдельной строкой -->
      <ButtonGroup class="w-full shrink-0 sm:w-fit">
        <Select :model-value="props.sortBy" @update:modelValue="handleSortByUpdate">
          <SelectTrigger class="h-8 min-w-0 flex-1 sm:w-fit sm:flex-none" aria-label="Сортировка">
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in visibleSortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon-sm"
          class="shrink-0"
          :disabled="props.sortBy === 'manual'"
          @click="emit('toggleSortOrder')"
          :aria-label="props.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'"
        >
          <ArrowUpDown class="h-4 w-4" />
          <span class="sr-only">
            {{ props.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию' }}
          </span>
        </Button>
      </ButtonGroup>
    </div>
  </div>
</template>
