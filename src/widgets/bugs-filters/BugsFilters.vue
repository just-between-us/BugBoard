<script setup lang="ts">
import { Search, X, ArrowUpDown, Plus, ChevronDown, ChevronUp } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useScrollEdges } from '@/lib/useScrollEdges'

interface Props {
  searchQuery: string
  statusFilter: string
  severityFilter: string
  areaFilter: string
  sortBy: 'created_at' | 'severity' | 'status' | 'title'
  sortOrder: 'asc' | 'desc'
  hasActiveFilters: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:searchQuery': [query: string]
  'update:statusFilter': [filter: string]
  'update:severityFilter': [filter: string]
  'update:areaFilter': [filter: string]
  'update:sortBy': [sortBy: 'created_at' | 'severity' | 'status' | 'title']
  toggleSortOrder: []
  clearAllFilters: []
  'open-create-bug': []
}>()

const { scroller, scrolledStart, scrolledEnd, updateEdges } = useScrollEdges()

const isMobile = useMediaQuery('(max-width: 640px)')
// Панель (создание/фильтры/сортировка) на мобиле скрыта по умолчанию и
// открывается/закрывается только кнопкой-стрелкой; на десктопе всегда видна
const panelOpen = ref(false)

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

// «Особая» сортировка = не по умолчанию (дата создания / по убыванию)
const isSortCustom = computed(() => props.sortBy !== 'created_at' || props.sortOrder !== 'desc')

const statusOptions = [
  { value: 'discovered', label: 'Обнаружен' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'fixed', label: 'Исправлен' },
] as const

const areaOptions = [
  { value: 'database', label: 'База данных' },
  { value: 'ui', label: 'UI/Фронтенд' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'api', label: 'API/Бэкенд' },
  { value: 'performance', label: 'Производительность' },
  { value: 'other', label: 'Другое' },
] as const

const severityOptions = [
  { value: 'critical', label: 'Критический' },
  { value: 'major', label: 'Мажорный' },
  { value: 'minor', label: 'Минорный' },
] as const

const sortOptions = [
  { value: 'created_at', label: 'Дата создания' },
  { value: 'severity', label: 'Важность' },
  { value: 'status', label: 'Статус' },
  { value: 'title', label: 'Название' },
] as const

function getStatusLabel(status: string) {
  return statusOptions.find((o) => o.value === status)?.label ?? status
}

function getSeverityLabel(severity: string) {
  return severityOptions.find((o) => o.value === severity)?.label ?? severity
}

function getAreaLabel(area: string) {
  return areaOptions.find((o) => o.value === area)?.label ?? area
}

const sortFieldLabel = computed(
  () => sortOptions.find((o) => o.value === props.sortBy)?.label ?? 'Сортировка',
)
const sortDirSymbol = computed(() => (props.sortOrder === 'asc' ? '↑' : '↓'))

// Тонкие подсказки активных фильтров для свёрнутого состояния
const activeFilterChips = computed(() => {
  const chips: { key: string; label: string; onRemove: () => void }[] = []
  if (props.statusFilter !== 'all')
    chips.push({
      key: 'status',
      label: getStatusLabel(props.statusFilter),
      onRemove: () => handleStatusFilterUpdate('all'),
    })
  if (props.severityFilter !== 'all')
    chips.push({
      key: 'severity',
      label: getSeverityLabel(props.severityFilter),
      onRemove: () => handleSeverityFilterUpdate('all'),
    })
  if (props.areaFilter !== 'all')
    chips.push({
      key: 'area',
      label: getAreaLabel(props.areaFilter),
      onRemove: () => handleAreaFilterUpdate('all'),
    })
  return chips
})

const activeStateCount = computed(
  () => activeFilterChips.value.length + (isSortCustom.value ? 1 : 0),
)

// Кнопка-стрелка — только на мобиле (на десктопе панель всегда видна)
const showToggleBtn = computed(() => isMobile.value)
// Ряд подсказок — на мобиле, когда панель закрыта и есть что показать
const showCollapsedHints = computed(
  () => isMobile.value && !panelOpen.value && activeStateCount.value > 0,
)

function resetSort() {
  emit('update:sortBy', 'created_at')
  if (props.sortOrder !== 'desc') emit('toggleSortOrder')
}

function handleSearchUpdate(query: string | number) {
  emit('update:searchQuery', String(query))
}

function handleSearchClear() {
  emit('update:searchQuery', '')
}

function handleStatusFilterUpdate(filter: string) {
  emit('update:statusFilter', filter)
}

function handleSeverityFilterUpdate(filter: string) {
  emit('update:severityFilter', filter)
}

function handleAreaFilterUpdate(filter: string) {
  emit('update:areaFilter', filter)
}

function handleSortByUpdate(sortBy: 'created_at' | 'severity' | 'status' | 'title') {
  emit('update:sortBy', sortBy)
}
</script>

<template>
  <div class="space-y-2 py-2">
    <!-- Строка поиска — всегда видна; на десктопе рядом кнопка создания,
         на мобиле в свёрнутом состоянии — «⋯» для разворота панели -->
    <div class="flex items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Поиск по названию, описанию, ID..."
          :value="props.searchQuery"
          @update:modelValue="handleSearchUpdate"
          class="pl-10 pr-10"
        />
        <Button
          v-if="props.searchQuery"
          variant="ghost"
          size="icon"
          class="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
          @click="handleSearchClear"
          aria-label="Очистить поиск"
        >
          <X class="h-4 w-4" />
        </Button>
      </div>
      <Tooltip>
        <TooltipTrigger as-child>
          <Button class="hidden sm:inline-flex" @click="emit('open-create-bug')">
            <Plus class="h-4 w-4 mr-2" />
            Создать баг
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          <p>Добавить новый баг в проект</p>
        </TooltipContent>
      </Tooltip>
      <Button
        v-if="showToggleBtn"
        variant="outline"
        size="icon-sm"
        @click="togglePanel"
        :aria-expanded="panelOpen"
        aria-label="Фильтры и сортировка"
      >
        <ChevronUp v-if="panelOpen" class="h-4 w-4" />
        <ChevronDown v-else class="h-4 w-4" />
      </Button>
    </div>

    <!-- Тонкие подсказки активного состояния (мобиле, свёрнуто) -->
    <div v-if="showCollapsedHints" class="scroll-x-fade flex items-center gap-1.5 overflow-x-auto">
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

    <!-- Панель: создание + фильтры + сортировка. На десктопе всегда видна;
         на мобиле открывается/закрывается только кнопкой-стрелкой -->
    <div v-show="!isMobile || panelOpen" class="space-y-2">
      <!-- Мобильные: кнопка создания во всю ширину -->
      <Button class="w-full sm:hidden" @click="emit('open-create-bug')">
        <Plus class="h-4 w-4 mr-2" />
        Создать баг
      </Button>

      <!-- Фильтры + сброс + сортировка. На десктопе — одна строка: слева
               скролл фильтров, справа «Сбросить всё» и группа сортировки. На
               мобиле группа сортировки переносится во всю ширину -->
      <div class="flex flex-wrap items-center gap-2">
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
              <span class="text-sm font-medium">{{ getStatusLabel(props.statusFilter) }}</span>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                @click="handleStatusFilterUpdate('all')"
                aria-label="Сбросить фильтр статуса"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </div>
            <div v-else>
              <Select
                :model-value="props.statusFilter"
                @update:modelValue="handleStatusFilterUpdate"
              >
                <SelectTrigger class="w-36">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              v-if="props.severityFilter !== 'all'"
              class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
            >
              <span class="text-sm font-medium">
                {{ getSeverityLabel(props.severityFilter) }}
              </span>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                @click="handleSeverityFilterUpdate('all')"
                aria-label="Сбросить фильтр важности"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </div>
            <div v-else>
              <Select
                :model-value="props.severityFilter"
                @update:modelValue="handleSeverityFilterUpdate"
              >
                <SelectTrigger class="w-36">
                  <SelectValue placeholder="Важность" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все важности</SelectItem>
                  <SelectItem v-for="opt in severityOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div
              v-if="props.areaFilter !== 'all'"
              class="flex items-center gap-1 px-2 py-1 bg-secondary rounded-md"
            >
              <span class="text-sm font-medium">{{ getAreaLabel(props.areaFilter) }}</span>
              <Button
                variant="ghost"
                size="icon"
                class="h-6 w-6"
                @click="handleAreaFilterUpdate('all')"
                aria-label="Сбросить фильтр области"
              >
                <X class="h-3.5 w-3.5" />
              </Button>
            </div>
            <div v-else>
              <Select :model-value="props.areaFilter" @update:modelValue="handleAreaFilterUpdate">
                <SelectTrigger class="w-40">
                  <SelectValue placeholder="Область" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все области</SelectItem>
                  <SelectItem v-for="opt in areaOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </SelectItem>
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
              <SelectItem v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon-sm"
            class="shrink-0"
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
  </div>
</template>
