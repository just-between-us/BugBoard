<script setup lang="ts">
import { AlertTriangle, Inbox, Loader2, Search, Undo2 } from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import ReportCard from '@/entities/report-card/ReportCard.vue'

interface Props {
  reports: Report[]
  totalReports: number
  loading: boolean
  error: string | null
  isMember: boolean
  bugs: Bug[]
  now: number
  savingId: string | null
  replyTargetId: string | null
  replyText: string
  replyError: string | null
  pendingDeletes: Record<string, number>
  finalizingDeletes: Record<string, boolean>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  retry: []
  clearFilters: []
  'set-status': [report: Report, status: Report['status']]
  'set-flag': [report: Report, flag: Report['flag']]
  'open-reply': [report: Report]
  'update:replyText': [text: string]
  'cancel-reply': []
  'save-reply': [report: Report]
  'remove-reply': [report: Report]
  'start-delete': [report: Report]
  'cancel-delete': [id: string]
}>()

const projectsStore = useProjectsStore()

const skeletonReports = [1, 2, 3]

function reporterName(id: string): string {
  return projectsStore.profiles[id]?.display_name ?? 'Репортёр'
}

function reporterAvatar(id: string): string | null {
  return projectsStore.profiles[id]?.avatar_url ?? null
}

function replyAuthorName(report: Report): string {
  return report.reply_author_id ? projectsStore.profileName(report.reply_author_id) : ''
}

function isPendingDelete(report: Report): boolean {
  return report.id in props.pendingDeletes || !!props.finalizingDeletes[report.id]
}

function deleteSecondsLeft(id: string): number {
  const deleteAt = props.pendingDeletes[id]
  if (deleteAt === undefined) return 0
  return Math.max(0, Math.ceil((deleteAt - props.now) / 1000))
}

function bugTitleFor(report: Report): string | null {
  if (!report.bug_id) return null
  return props.bugs.find((b) => b.id === report.bug_id)?.title ?? null
}
</script>

<template>
  <!-- Loading -->
  <div v-if="props.loading" class="space-y-3" role="status" aria-label="Загрузка репортов">
    <div v-for="i in skeletonReports" :key="i" class="animate-pulse rounded-lg border p-4">
      <div class="flex items-center gap-3">
        <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
        <div class="flex-1 space-y-2">
          <div class="h-4 w-40 rounded bg-muted" />
          <div class="h-3 w-64 rounded bg-muted" />
        </div>
      </div>
      <div class="mt-3 h-3 w-full rounded bg-muted" />
    </div>
    <span class="sr-only">Загрузка репортов…</span>
  </div>

  <!-- Error -->
  <div
    v-else-if="props.error"
    class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
  >
    <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
      <AlertTriangle class="h-4 w-4 shrink-0" />
      <span>{{ props.error }}</span>
      <Button variant="ghost" size="sm" class="ml-auto" @click="emit('retry')">Повторить</Button>
    </div>
  </div>

  <!-- Empty -->
  <div
    v-else-if="props.totalReports === 0"
    class="rounded-lg border border-dashed px-6 py-10 text-center"
  >
    <Inbox class="mx-auto h-8 w-8 text-muted-foreground/50" />
    <p class="mt-2 text-sm font-medium">Репортов пока нет</p>
    <p class="mt-1 text-xs text-muted-foreground">
      {{
        props.isMember
          ? 'Отправьте репортёрам ссылку из шапки проекта — репорты появятся здесь.'
          : 'Здесь появятся ваши репорты — баг можно отправить по ссылке из шапки проекта.'
      }}
    </p>
  </div>

  <!-- Filtered empty -->
  <div
    v-else-if="props.reports.length === 0"
    class="rounded-lg border border-dashed px-6 py-10 text-center"
  >
    <Search class="mx-auto h-8 w-8 text-muted-foreground/50" />
    <p class="mt-2 text-sm font-medium">Ничего не найдено</p>
    <Button variant="outline" size="sm" class="mt-3" @click="emit('clearFilters')">
      Сбросить фильтры
    </Button>
  </div>

  <!-- Reports list -->
  <div v-else class="space-y-3">
    <div v-for="report in props.reports" :key="report.id" class="relative">
      <ReportCard
        :report="report"
        :is-member="props.isMember"
        :reporter-name="reporterName(report.reporter_id)"
        :reporter-avatar="reporterAvatar(report.reporter_id)"
        :bug-title="bugTitleFor(report)"
        :saving="props.savingId === report.id"
        :pending-delete="isPendingDelete(report)"
        :reply-open="props.replyTargetId === report.id"
        :reply-text="props.replyText"
        :reply-error="props.replyError"
        :reply-author-name="replyAuthorName(report)"
        @set-status="emit('set-status', report, $event)"
        @set-flag="emit('set-flag', report, $event)"
        @open-reply="emit('open-reply', report)"
        @update:replyText="emit('update:replyText', $event)"
        @cancel-reply="emit('cancel-reply')"
        @save-reply="emit('save-reply', report)"
        @remove-reply="emit('remove-reply', report)"
        @start-delete="emit('start-delete', report)"
      />

      <!-- Skeleton overlay while the report is pending deletion -->
      <div
        v-if="isPendingDelete(report)"
        aria-hidden="true"
        class="absolute inset-0 z-10 animate-pulse rounded-xl border bg-muted/70 backdrop-blur-[1px]"
      />

      <!-- Actions above the overlay -->
      <div
        v-if="isPendingDelete(report)"
        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
      >
        <Button
          v-if="report.id in props.pendingDeletes"
          type="button"
          size="sm"
          class="pointer-events-auto gap-1.5 bg-green-600 text-white shadow-md hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
          @click.stop="emit('cancel-delete', report.id)"
        >
          <Undo2 class="h-4 w-4" />
          Восстановить ({{ deleteSecondsLeft(report.id) }})
        </Button>
        <Button
          v-else
          type="button"
          size="sm"
          variant="destructive"
          class="pointer-events-auto gap-1.5 shadow-md"
          disabled
        >
          <Loader2 class="h-4 w-4 animate-spin" />
          Удаляем…
        </Button>
      </div>
    </div>
  </div>
</template>
