<script setup lang="ts">
import { Search, AlertTriangle } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import BugCard from '@/entities/bug-card/BugCard.vue'
import type { Bug } from '@/stores/projects'

interface Props {
  filteredBugs: Bug[]
  loading: boolean
  error: string | null
  searchQuery: string
  statusFilter: string
  severityFilter: string
  areaFilter: string
  onRetry: () => void
  onClearFilters: () => void
}

const props = defineProps<Props>()

const skeletonBugs = [1, 2, 3]
</script>

<template>
  <div v-if="props.loading" class="space-y-3" role="status">
    <div v-for="i in skeletonBugs" :key="i" class="animate-pulse">
      <Card>
        <CardContent class="p-4">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 shrink-0 rounded bg-muted" />
            <div class="flex-1 space-y-2">
              <div class="h-4 w-3/4 bg-muted rounded" />
              <div class="h-3 w-1/2 bg-muted rounded" />
              <div class="flex items-center gap-2">
                <div class="h-5 w-16 bg-muted rounded-full" />
                <div class="h-5 w-16 bg-muted rounded-full" />
                <div class="h-5 w-20 bg-muted rounded-full" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>

  <div
    v-else-if="props.error"
    class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
  >
    <div class="flex items-center gap-3 text-sm text-severity-critical">
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span>{{ props.error }}</span>
      <Button variant="ghost" size="sm" @click="props.onRetry"> Повторить </Button>
    </div>
  </div>

  <div v-else class="space-y-3">
    <div
      v-if="
        props.filteredBugs.length === 0 &&
        (props.searchQuery ||
          props.statusFilter !== 'all' ||
          props.severityFilter !== 'all' ||
          props.areaFilter !== 'all')
      "
      class="text-center py-8"
    >
      <div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Search class="h-5 w-5 text-muted-foreground" />
      </div>
      <h3 class="text-lg font-medium">Ничего не найдено</h3>
      <p class="mt-1 text-sm text-muted-foreground">
        Попробуйте изменить параметры поиска или фильтры
      </p>
      <Button variant="outline" class="mt-3" @click="props.onClearFilters">
        Сбросить фильтры
      </Button>
    </div>

    <BugCard v-else v-for="bug in props.filteredBugs" :key="bug.id" :bug="bug" />
  </div>
</template>
