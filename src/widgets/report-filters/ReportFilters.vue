<script setup lang="ts">
import { ArrowUpDown, X } from '@lucide/vue'
import type { Report } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { reportStatusLabel, reportStatusOptions } from '@/entities/report'

interface Props {
  statusFilter: 'all' | Report['status']
  bugFilter: 'all' | 'linked' | 'unlinked'
  sortBy: 'created_at' | 'updated_at'
  sortOrder: 'asc' | 'desc'
  isMember: boolean
  hasActiveFilters: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:statusFilter': [filter: 'all' | Report['status']]
  'update:bugFilter': [filter: 'all' | 'linked' | 'unlinked']
  'update:sortBy': [sortBy: 'created_at' | 'updated_at']
  toggleSortOrder: []
  clearAllFilters: []
}>()

const sortOptions = [
  { value: 'created_at', label: 'Дата создания' },
  { value: 'updated_at', label: 'Дата обновления' },
] as const

function handleStatusFilterUpdate(filter: string) {
  emit('update:statusFilter', filter as 'all' | Report['status'])
}

function handleBugFilterUpdate(filter: string) {
  emit('update:bugFilter', filter as 'all' | 'linked' | 'unlinked')
}

function handleSortByUpdate(sortBy: string) {
  emit('update:sortBy', sortBy as 'created_at' | 'updated_at')
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-2">
    <div class="flex flex-wrap items-center gap-2">
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

      <div class="flex items-center gap-1">
        <Select :model-value="props.sortBy" @update:modelValue="handleSortByUpdate">
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
      @click="emit('clearAllFilters')"
    >
      <X class="h-4 w-4 mr-1" />
      Сбросить всё
    </Button>
  </div>
</template>
