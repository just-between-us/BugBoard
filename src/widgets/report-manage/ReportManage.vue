<script setup lang="ts">
import { computed } from 'vue'
import { Bug as BugIcon, Check, ChevronsUpDown, Link2, Loader2, Unlink } from '@lucide/vue'
import type { Bug, Report } from '@/stores/projects'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  REPORT_FLAG_ICON,
  REPORT_STATUS_DOT,
  reportFlagOptions,
  reportStatusLabel,
  reportStatusOptions,
} from '@/entities/report'

interface Props {
  report: Report
  saving: boolean
  error: string | null
  projectBugs: Bug[]
  bugsLoading: boolean
  bugsError: string | null
  replyDraft: string
  replyDirty: boolean
  canSaveReply: boolean
  patch: (updates: Partial<Report>) => Promise<boolean>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:replyDraft': [text: string]
  saveReply: []
  revertReply: []
}>()

const linkedBug = computed(() => {
  const bugId = props.report.bug_id
  if (!bugId) return null
  return props.projectBugs.find((b) => b.id === bugId) ?? null
})
</script>

<template>
  <div class="space-y-4 rounded-md border p-4">
    <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Управление репортом
    </p>

    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1.5">
        <Label for="report-status">Статус</Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="report-status"
            :class="
              cn(
                buttonVariants({ variant: 'outline' }),
                'min-w-full flex justify-between h-8 gap-1.5 px-2 text-xs',
              )
            "
            :disabled="props.saving"
          >
            <span
              class="h-2 w-2 shrink-0 rounded-full"
              :class="REPORT_STATUS_DOT[props.report.status]"
            />
            {{ reportStatusLabel(props.report.status) }}
            <ChevronsUpDown class="h-3 w-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-44">
            <DropdownMenuItem
              v-for="opt in reportStatusOptions"
              :key="opt.value"
              :disabled="props.saving"
              @click="props.patch({ status: opt.value as Report['status'] })"
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
      </div>

      <div class="space-y-1.5">
        <Label for="report-flag">Флаг</Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            id="report-flag"
            :class="
              cn(
                buttonVariants({ variant: 'outline' }),
                'flex justify-between min-w-full h-8 gap-1.5 px-2 text-xs',
              )
            "
            :disabled="props.saving"
            :title="reportStatusLabel(props.report.flag)"
            :aria-label="`Флаг: ${reportStatusLabel(props.report.flag)}`"
          >
            <component :is="REPORT_FLAG_ICON[props.report.flag]" class="h-3.5 w-3.5" />
            {{ reportStatusLabel(props.report.flag) }}
            <ChevronsUpDown class="h-3 w-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="w-44">
            <DropdownMenuItem
              v-for="opt in reportFlagOptions"
              :key="opt.value"
              :disabled="props.saving"
              @click="props.patch({ flag: opt.value as Report['flag'] })"
            >
              <component :is="REPORT_FLAG_ICON[opt.value]" class="mr-2 h-4 w-4 shrink-0" />
              {{ opt.label }}
              <Check v-if="props.report.flag === opt.value" class="ml-auto h-4 w-4" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Link to a bug (team only) -->
    <div class="space-y-1.5">
      <Label>Привязка к багу</Label>

      <div
        v-if="props.report.bug_id"
        class="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2"
      >
        <RouterLink
          v-if="linkedBug"
          :to="{
            name: 'bug-detail',
            params: { projectId: props.report.project_id, bugId: linkedBug.id },
          }"
          class="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
        >
          <BugIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span class="truncate">{{ linkedBug.title }}</span>
        </RouterLink>
        <span v-else class="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <BugIcon class="h-3.5 w-3.5 shrink-0" />
          Баг удалён
        </span>
        <Button
          size="sm"
          variant="ghost"
          class="ml-auto h-7 gap-1 px-2 text-xs"
          :disabled="props.saving"
          @click="props.patch({ bug_id: null })"
        >
          <Loader2 v-if="props.saving" class="h-3.5 w-3.5 animate-spin" />
          <Unlink v-else class="h-3.5 w-3.5" />
          Отвязать
        </Button>
      </div>

      <template v-else>
        <p v-if="props.bugsLoading" class="text-xs text-muted-foreground">
          Загружаем баги проекта…
        </p>
        <p v-else-if="props.bugsError" class="text-sm text-severity-critical">
          {{ props.bugsError }}
        </p>

        <DropdownMenu v-else-if="props.projectBugs.length">
          <DropdownMenuTrigger
            :class="
              cn(
                buttonVariants({ variant: 'outline' }),
                'min-w-full flex justify-between h-8 gap-1.5 px-2 text-xs',
              )
            "
            :disabled="props.saving"
          >
            <Link2 class="h-3.5 w-3.5 text-muted-foreground" />
            Привязать к багу
            <ChevronsUpDown class="h-3 w-3 opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" class="max-h-72 w-72 overflow-y-auto">
            <DropdownMenuItem
              v-for="bug in props.projectBugs"
              :key="bug.id"
              :disabled="props.saving"
              @click="props.patch({ bug_id: bug.id })"
            >
              <BugIcon class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span class="min-w-0 truncate">{{ bug.title }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <p v-else class="text-xs text-muted-foreground">В проекте пока нет багов для привязки</p>
      </template>
    </div>

    <div class="space-y-1.5">
      <Label for="report-reply">Ответ репортёру</Label>
      <Textarea
        id="report-reply"
        :model-value="props.replyDraft"
        :rows="4"
        maxlength="2000"
        placeholder="Что ответить репортёру — пустое поле удалит ответ"
        :disabled="props.saving"
        @update:model-value="emit('update:replyDraft', String($event))"
      />
    </div>

    <p v-if="props.error" class="text-sm text-severity-critical">{{ props.error }}</p>

    <div class="flex items-center gap-2">
      <Button size="sm" :disabled="!props.canSaveReply" @click="emit('saveReply')">
        <Loader2 v-if="props.saving" class="h-4 w-4 animate-spin" />
        {{ props.saving ? 'Сохраняем…' : 'Сохранить' }}
      </Button>
      <Button
        v-if="props.replyDirty"
        size="sm"
        variant="ghost"
        :disabled="props.saving"
        @click="emit('revertReply')"
      >
        Отмена
      </Button>
    </div>
  </div>
</template>
