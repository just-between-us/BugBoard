<script setup lang="ts">
import { Search, X, ArrowUpDown, Plus } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

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
  <div class="py-3">
    <div class="flex items-center justify-between mb-3">
      <div>
        <h2 class="text-lg font-medium">Все обнаруженные ошибки</h2>
        <p class="text-sm text-muted-foreground">Список багов и задач</p>
      </div>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button @click="emit('open-create-bug')">
              <Plus class="h-4 w-4 mr-2" />
              Создать баг
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            <p>Добавить новый баг в проект</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- Filters & Search -->
    <div class="space-y-3">
      <div class="relative">
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

      <div class="flex justify-between">
        <div class="flex flex-wrap items-center gap-2">
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
            <Select :value="props.statusFilter" @update:modelValue="handleStatusFilterUpdate" class="w-36">
              <SelectTrigger>
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
            <span class="text-sm font-medium">{{ getSeverityLabel(props.severityFilter) }}</span>
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
            <Select :value="props.severityFilter" @update:modelValue="handleSeverityFilterUpdate" class="w-36">
              <SelectTrigger>
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
            <Select :value="props.areaFilter" @update:modelValue="handleAreaFilterUpdate" class="w-40">
              <SelectTrigger>
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
          <div class="flex items-center gap-1">
            <Select :value="props.sortBy" @update:modelValue="handleSortByUpdate">
              <SelectTrigger>
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
              size="icon"
              class="h-8 w-8"
              @click="emit('toggleSortOrder')"
              :aria-label="props.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'"
            >
              <ArrowUpDown class="h-4 w-4" />
              <span class="sr-only">
                {{ props.sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию' }}
              </span>
            </Button>
          </div>
        </div>
        <Button
          v-if="props.hasActiveFilters"
          variant="destructive"
          size="sm"
          class="ml-2"
          @click="emit('clearAllFilters')"
        >
          <X class="h-4 w-4 mr-1" />
          Сбросить всё
        </Button>
      </div>
    </div>
  </div>
</template>