<script setup lang="ts">
import { computed } from 'vue'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { pluralRu } from '@/lib/format'
import LimitProgress from './LimitProgress.vue'

interface Props {
  count: number
  projectId: string
}

const props = defineProps<Props>()

const unit = computed(() => pluralRu(props.count, ['человек', 'человека', 'людей']))
</script>

<template>
  <Card class="gap-0 py-0">
    <div class="flex items-center gap-2 border-b px-4 pt-5 pb-4 sm:px-6">
      <CardTitle class="text-base">Участников</CardTitle>
    </div>

    <CardContent class="px-4 py-5 sm:px-6">
      <LimitProgress
        :count="props.count"
        :unit="unit"
        :storage-key="`bugboard-stats-members-limit-${props.projectId}`"
      />
    </CardContent>
  </Card>
</template>
