<script setup lang="ts">
import { computed } from 'vue'
import { MessageSquare } from '@lucide/vue'
import type { Project, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { formatDate } from '@/lib/format'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { REPORT_FLAG_BADGE, REPORT_STATUS_BADGE, reportStatusLabel } from '@/entities/report'

interface Props {
  report: Report
  project: Project | null
  canManage: boolean
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()

const reporterName = computed(() => projectsStore.profileName(props.report.reporter_id))
const reporterAvatar = computed(() => projectsStore.profileAvatar(props.report.reporter_id))
</script>

<template>
  <Card>
    <CardHeader class="space-y-3">
      <div class="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <template v-if="props.project">
          <RouterLink
            v-if="props.canManage"
            :to="{ name: 'project', params: { id: props.project.id } }"
            class="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {{ props.project.name }}
          </RouterLink>
          <span v-else class="font-medium text-foreground">{{ props.project.name }}</span>
          <span>·</span>
        </template>
        <span>{{ formatDate(props.report.created_at) }}</span>
      </div>

      <CardTitle class="text-xl">{{ props.report.title }}</CardTitle>

      <div class="flex flex-wrap items-center gap-2">
        <Badge :class="REPORT_STATUS_BADGE[props.report.status]" class="text-xs font-medium">
          {{ reportStatusLabel(props.report.status) }}
        </Badge>
        <Badge
          v-if="props.report.flag !== 'none'"
          :class="REPORT_FLAG_BADGE[props.report.flag]"
          class="text-xs font-medium"
        >
          {{ reportStatusLabel(props.report.flag) }}
        </Badge>
        <span class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Avatar class="h-5 w-5 text-[10px]" :name="reporterName" :src="reporterAvatar" />
          {{ reporterName }}
        </span>
      </div>
    </CardHeader>

    <CardContent class="space-y-5">
      <p class="text-sm whitespace-pre-line">{{ props.report.description }}</p>

      <!-- Reply from the team -->
      <div v-if="props.report.reply" class="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <MessageSquare class="h-3 w-3" />
          Ответ команды
          <span v-if="props.report.replied_at">· {{ formatDate(props.report.replied_at) }}</span>
        </p>
        <p class="mt-1.5 text-sm whitespace-pre-line">{{ props.report.reply }}</p>
      </div>

      <slot />
    </CardContent>
  </Card>
</template>
