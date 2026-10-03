<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Bug as BugIcon, Check, ChevronsUpDown, Eye, Loader2, Reply, Trash2 } from '@lucide/vue'
import type { Report } from '@/stores/projects'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CopyButton } from '@/components/copy-button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  REPORT_FLAG_ICON,
  REPORT_STATUS_BADGE,
  REPORT_STATUS_DOT,
  reportFlagOptions,
  reportStatusLabel,
  reportStatusOptions,
} from '@/entities/report'

interface Props {
  report: Report
  isMember: boolean
  reporterName: string
  reporterAvatar: string | null
  bugTitle: string | null
  saving: boolean
  pendingDelete: boolean
  replyOpen: boolean
  replyText: string
  replyError: string | null
  replyAuthorName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'set-status': [status: Report['status']]
  'set-flag': [flag: Report['flag']]
  'open-reply': []
  'update:replyText': [text: string]
  'cancel-reply': []
  'save-reply': []
  'remove-reply': []
  'start-delete': []
}>()

const router = useRouter()

function reportRoute() {
  return { name: 'report-view' as const, params: { reportId: props.report.id } }
}

function goToReport(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('button, a, input, textarea, [role="menuitem"]')) return
  router.push(reportRoute())
}

function openBug() {
  if (!props.report.bug_id) return
  void router.push({
    name: 'bug-detail' as const,
    params: { projectId: props.report.project_id, bugId: props.report.bug_id },
  })
}
</script>

<template>
  <Card
    class="cursor-pointer gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
    @click="goToReport"
  >
    <CardContent class="space-y-3 p-4 sm:p-5">
      <!-- Reporter meta + status -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 items-center gap-2.5">
          <Avatar
            class="h-8 w-8 shrink-0 text-xs"
            :name="props.reporterName"
            :src="props.reporterAvatar"
            :to="{ name: 'user-profile', params: { userId: props.report.reporter_id } }"
          />
          <div class="min-w-0">
            <RouterLink
              :to="{ name: 'user-profile', params: { userId: props.report.reporter_id } }"
              class="block truncate text-sm font-medium hover:underline underline-offset-4"
              @click.stop
            >
              {{ props.reporterName }}
            </RouterLink>
            <p class="text-xs text-muted-foreground">
              {{ formatDate(props.report.created_at) }}
            </p>
            <span v-if="props.isMember" class="mt-0.5 flex min-w-0 max-w-full items-center gap-0.5">
              <span class="truncate font-mono text-xs text-muted-foreground">
                ID: {{ props.report.id }}
              </span>
              <CopyButton
                class="shrink-0"
                :text="props.report.id"
                :compact="true"
                label="Копировать ID репорта"
                feedback="ID скопирован"
                icon-class="h-3 w-3"
              />
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 self-start" @click.stop>
          <template v-if="props.isMember">
            <!-- Status -->
            <DropdownMenu>
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'h-7 gap-1.5 px-2 text-xs')"
                :disabled="props.saving"
              >
                <span
                  class="h-2 w-2 shrink-0 rounded-full"
                  :class="REPORT_STATUS_DOT[props.report.status]"
                />
                {{ reportStatusLabel(props.report.status) }}
                <ChevronsUpDown class="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-44">
                <DropdownMenuItem
                  v-for="opt in reportStatusOptions"
                  :key="opt.value"
                  :disabled="props.saving"
                  @click="emit('set-status', opt.value as Report['status'])"
                >
                  <span
                    class="h-2 mr-2 w-2 shrink-0 rounded-full"
                    :class="REPORT_STATUS_DOT[opt.value]"
                  />
                  {{ opt.label }}
                  <Check v-if="props.report.status === opt.value" class="ml-auto h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <!-- Flag -->
            <DropdownMenu>
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'h-7 gap-1.5 px-2 text-xs')"
                :disabled="props.saving"
                :title="reportStatusLabel(props.report.flag)"
                :aria-label="`Флаг: ${reportStatusLabel(props.report.flag)}`"
              >
                <component :is="REPORT_FLAG_ICON[props.report.flag]" class="h-3.5 w-3.5" />
                {{ reportStatusLabel(props.report.flag) }}
                <ChevronsUpDown class="h-3 w-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="w-44">
                <DropdownMenuItem
                  v-for="opt in reportFlagOptions"
                  :key="opt.value"
                  :disabled="props.saving"
                  @click="emit('set-flag', opt.value as Report['flag'])"
                >
                  <component :is="REPORT_FLAG_ICON[opt.value]" class="mr-2 h-4 w-4 shrink-0" />
                  {{ opt.label }}
                  <Check v-if="props.report.flag === opt.value" class="ml-auto h-4 w-4" />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Loader2 v-if="props.saving" class="h-4 w-4 animate-spin text-muted-foreground" />
          </template>

          <!-- Репортёр видит статус только для чтения -->
          <Badge
            v-else
            :class="REPORT_STATUS_BADGE[props.report.status]"
            class="text-xs font-medium"
          >
            {{ reportStatusLabel(props.report.status) }}
          </Badge>
        </div>
      </div>

      <!-- Title / description -->
      <div>
        <RouterLink
          :to="reportRoute()"
          class="block break-words font-medium hover:underline underline-offset-4"
          @click.stop
        >
          {{ props.report.title }}
        </RouterLink>
        <p class="mt-1 break-words text-sm whitespace-pre-line text-muted-foreground">
          {{ props.report.description }}
        </p>
      </div>

      <!-- Привязка к багу (только команда: баг как сущность репортёру не показывается) -->
      <div v-if="props.isMember && props.report.bug_id" class="flex flex-wrap items-center gap-1.5">
        <button
          v-if="props.bugTitle"
          type="button"
          class="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:border-ring focus-visible:outline-none"
          title="Открыть баг"
          @click.stop="openBug"
        >
          <BugIcon class="h-3 w-3 shrink-0" />
          <span class="truncate">Привязан к: {{ props.bugTitle }}</span>
        </button>
        <span
          v-else
          class="inline-flex items-center gap-1 rounded-md border border-dashed bg-muted/40 px-1.5 py-0.5 text-xs font-medium text-muted-foreground"
          title="Баг удалён"
        >
          <BugIcon class="h-3 w-3 shrink-0" />
          Баг удалён
        </span>
      </div>

      <!-- Reply editor (команда) -->
      <div
        v-if="props.replyOpen"
        class="space-y-2 rounded-md border p-3"
        role="group"
        aria-label="Ответ репортёру"
        @click.stop
      >
        <p class="text-xs font-medium text-muted-foreground">
          Ответ репортёру — его увидит только автор репорта
        </p>
        <Textarea
          :model-value="props.replyText"
          :rows="3"
          maxlength="2000"
          placeholder="Что ответить репортёру?"
          class="text-sm"
          :disabled="props.saving"
          @update:model-value="emit('update:replyText', String($event))"
        />
        <p v-if="props.replyError" class="text-xs text-severity-critical">
          {{ props.replyError }}
        </p>
        <div class="flex flex-wrap gap-1.5">
          <Button
            size="xs"
            :disabled="props.saving || !props.replyText.trim()"
            @click="emit('save-reply')"
          >
            <Loader2 v-if="props.saving" class="h-3 w-3 animate-spin" />
            {{ props.saving ? 'Сохраняем…' : 'Отправить ответ' }}
          </Button>
          <Button size="xs" variant="ghost" :disabled="props.saving" @click="emit('cancel-reply')">
            Отмена
          </Button>
        </div>
      </div>

      <!-- Reply display -->
      <div
        v-else-if="props.report.reply"
        class="rounded-md border border-primary/30 bg-primary/5 p-3"
        @click.stop
      >
        <p class="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <Reply class="h-3 w-3" />
          Ответ {{ props.replyAuthorName }}
          <span v-if="props.report.replied_at">· {{ formatDate(props.report.replied_at) }}</span>
        </p>
        <p class="mt-1.5 break-words text-sm whitespace-pre-line">
          {{ props.report.reply }}
        </p>
        <div v-if="props.isMember" class="mt-2 flex flex-wrap gap-1">
          <Button size="xs" variant="ghost" :disabled="props.saving" @click="emit('open-reply')">
            Изменить
          </Button>
          <Button
            size="xs"
            variant="ghost"
            class="text-severity-critical"
            :disabled="props.saving"
            @click="emit('remove-reply')"
          >
            Удалить ответ
          </Button>
        </div>
      </div>

      <!-- Bottom actions (команда) -->
      <div
        v-if="props.isMember"
        class="flex flex-wrap items-center justify-between gap-2"
        @click.stop
      >
        <div class="flex flex-wrap items-center gap-2">
          <Button
            v-if="!props.replyOpen && !props.report.reply"
            variant="outline"
            size="sm"
            class="h-8 gap-1.5"
            :disabled="props.saving"
            @click="emit('open-reply')"
          >
            <Reply class="h-3.5 w-3.5" />
            <span class="sm:hidden">Ответить</span>
            <span class="hidden sm:inline">Ответить репортёру</span>
          </Button>
          <RouterLink
            :to="reportRoute()"
            :class="
              cn(
                buttonVariants({ variant: 'ghost' }),
                'h-8 gap-1.5 text-muted-foreground hover:text-foreground',
              )
            "
          >
            <Eye class="h-3.5 w-3.5" />
            Детали
          </RouterLink>
        </div>
        <Button
          v-if="!props.pendingDelete"
          type="button"
          size="sm"
          variant="destructive"
          class="h-8 gap-1.5 ml-auto"
          :disabled="props.saving"
          @click="emit('start-delete')"
        >
          <Trash2 class="h-3.5 w-3.5" />
          Удалить
        </Button>
      </div>
    </CardContent>
  </Card>
</template>
