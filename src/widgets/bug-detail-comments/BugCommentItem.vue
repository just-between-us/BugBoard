<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Loader2, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'
import type { BugComment } from '@/stores/projects'
import { Button, buttonVariants } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDate, initials } from '@/lib/format'

interface Props {
  comment: BugComment
  authorName: string
  isAuthor: boolean
  editing: boolean
  draft: string
  saving: boolean
  actionError: string | null
  confirmDelete: boolean
  deleteSaving: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:draft': [value: string]
  edit: []
  'cancel-edit': []
  'save-edit': []
  'ask-delete': []
  'cancel-delete': []
  'confirm-delete': []
}>()

const commentTextareaRef = ref<{ $el: HTMLTextAreaElement } | null>(null)

const localDraft = computed<string>({
  get: () => props.draft,
  set: (value) => emit('update:draft', value),
})

const isEdited = computed(() => props.comment.updated_at !== props.comment.created_at)

watch(
  () => props.editing,
  (editing) => {
    if (editing) void nextTick(() => commentTextareaRef.value?.$el.focus())
  },
)
</script>

<template>
  <article class="flex gap-3">
    <div
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary"
    >
      {{ initials(authorName) }}
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-baseline gap-2">
        <span class="truncate text-sm font-medium">
          {{ authorName }}
        </span>
        <span class="text-xs text-muted-foreground">
          {{ formatDate(comment.created_at) }}
        </span>
        <span v-if="isEdited" class="text-xs text-muted-foreground"> (изменён) </span>

        <DropdownMenu v-if="isAuthor">
          <DropdownMenuTrigger
            :class="
              cn(
                buttonVariants({ variant: 'ghost' }),
                'ml-auto h-6 w-6 self-center rounded-md p-1 text-muted-foreground hover:text-foreground',
              )
            "
            title="Действия с комментарием"
            aria-label="Действия с комментарием"
          >
            <MoreHorizontal class="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-44">
            <DropdownMenuItem :disabled="saving" @click="emit('edit')">
              <Pencil class="mr-2 h-4 w-4" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              class="text-severity-critical"
              :disabled="deleteSaving"
              @click="emit('ask-delete')"
            >
              <Trash2 class="mr-2 h-4 w-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        v-if="confirmDelete"
        class="mt-2 rounded-md border border-severity-critical/40 bg-severity-critical/5 p-3"
        role="alertdialog"
        aria-label="Подтверждение удаления комментария"
      >
        <p class="text-sm font-medium">Удалить комментарий?</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Комментарий будет скрыт у всех участников. Отменить действие нельзя.
        </p>
        <p v-if="actionError" class="mt-1 text-xs text-severity-critical">
          {{ actionError }}
        </p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            class="h-8"
            :disabled="deleteSaving"
            @click="emit('confirm-delete')"
          >
            <Loader2 v-if="deleteSaving" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
            {{ deleteSaving ? 'Удаляем…' : 'Удалить' }}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            class="h-8"
            :disabled="deleteSaving"
            @click="emit('cancel-delete')"
          >
            Отмена
          </Button>
        </div>
      </div>

      <template v-if="editing">
        <Textarea
          ref="commentTextareaRef"
          v-model="localDraft"
          :rows="3"
          class="mt-2"
          maxlength="2000"
          :disabled="saving"
          aria-label="Текст комментария"
          @keydown.ctrl.enter.prevent="emit('save-edit')"
          @keydown.esc="emit('cancel-edit')"
        />
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            class="h-8"
            :disabled="saving || !draft.trim()"
            @click="emit('save-edit')"
          >
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
            <Check v-else class="h-4 w-4" />
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-8"
            :disabled="saving"
            @click="emit('cancel-edit')"
          >
            Отмена
          </Button>
          <span class="ml-auto text-xs text-muted-foreground"> {{ draft.length }}/2000 </span>
        </div>
        <p v-if="actionError" class="mt-1 text-xs text-severity-critical">
          {{ actionError }}
        </p>
      </template>

      <p v-else class="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
        {{ comment.content }}
      </p>
    </div>
  </article>
</template>
