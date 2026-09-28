<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, Loader2, MessageSquare, Send } from '@lucide/vue'
import type { Bug, BugComment } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import BugCommentItem from './BugCommentItem.vue'

interface Props {
  bug: Bug
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const comments = computed(() => projectsStore.comments)

const commentsError = ref<string | null>(null)
const commentText = ref('')
const commentSubmitting = ref(false)
const commentError = ref<string | null>(null)
const commentSaving = ref(false)
const commentActionError = ref<string | null>(null)
const editingCommentId = ref<string | null>(null)
const commentDraft = ref('')
const deleteTarget = ref<BugComment | null>(null)
const deleteSaving = ref(false)

async function load() {
  commentsError.value = null
  try {
    await projectsStore.fetchComments(props.bug.id)
    await projectsStore.loadProfiles(comments.value.map((c) => c.author_id))
  } catch (e) {
    commentsError.value = toUserError(e)
  }
}

watch(
  () => props.bug.id,
  () => {
    void load()
  },
  { immediate: true },
)

async function submitComment() {
  const content = commentText.value.trim()
  if (!content || commentSubmitting.value) return

  commentSubmitting.value = true
  commentError.value = null

  try {
    await projectsStore.createComment({
      bug_id: props.bug.id,
      project_id: props.bug.project_id,
      content,
    })
    if (authStore.user && authStore.profile) {
      projectsStore.mergeProfiles({ [authStore.user.id]: authStore.profile })
    }
    commentText.value = ''
  } catch (e) {
    commentError.value = toUserError(e)
  } finally {
    commentSubmitting.value = false
  }
}

function isCommentAuthor(comment: BugComment): boolean {
  return !!authStore.user && comment.author_id === authStore.user.id
}

function startEditComment(comment: BugComment) {
  if (commentSaving.value) return
  commentActionError.value = null
  commentDraft.value = comment.content
  editingCommentId.value = comment.id
}

function cancelEditComment() {
  if (commentSaving.value) return
  editingCommentId.value = null
  commentDraft.value = ''
  commentActionError.value = null
}

async function confirmEditComment() {
  const id = editingCommentId.value
  const comment = comments.value.find((c) => c.id === id)
  if (!id || !comment) return

  const content = commentDraft.value.trim()
  if (!content || content === comment.content) {
    cancelEditComment()
    return
  }

  commentSaving.value = true
  commentActionError.value = null
  try {
    await projectsStore.updateComment(id, content)
    editingCommentId.value = null
    commentDraft.value = ''
  } catch (e) {
    commentActionError.value = toUserError(e)
  } finally {
    commentSaving.value = false
  }
}

function askDeleteComment(comment: BugComment) {
  commentActionError.value = null
  deleteTarget.value = comment
}

function closeDeleteDialog() {
  deleteTarget.value = null
  commentActionError.value = null
}

async function confirmDeleteComment() {
  if (!deleteTarget.value || deleteSaving.value) return

  deleteSaving.value = true
  commentActionError.value = null
  try {
    await projectsStore.deleteComment(deleteTarget.value.id)
    closeDeleteDialog()
  } catch (e) {
    commentActionError.value = toUserError(e)
  } finally {
    deleteSaving.value = false
  }
}
</script>

<template>
  <Card class="gap-3">
    <CardContent>
      <div class="flex items-center justify-between gap-3">
        <h2 class="flex items-center gap-2 text-sm font-medium">
          <MessageSquare class="h-4 w-4 text-muted-foreground" />
          Комментарии
        </h2>
        <Badge variant="secondary">{{ comments.length }}</Badge>
      </div>

      <div
        v-if="commentsError"
        class="mt-4 rounded-md border border-severity-critical/20 bg-severity-critical/5 p-3"
      >
        <div class="flex items-center gap-3 text-sm text-severity-critical">
          <AlertTriangle class="h-4 w-4 shrink-0" />
          <span>{{ commentsError }}</span>
          <Button variant="ghost" size="sm" class="ml-auto" @click="load"> Повторить </Button>
        </div>
      </div>

      <div
        v-else-if="projectsStore.commentsLoading"
        class="mt-4 space-y-4"
        role="status"
        aria-label="Загрузка комментариев"
      >
        <div v-for="i in 2" :key="i" class="flex animate-pulse gap-3">
          <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-3 w-40 rounded bg-muted" />
            <div class="h-3 w-full rounded bg-muted" />
          </div>
        </div>
        <span class="sr-only">Загрузка комментариев…</span>
      </div>

      <div v-else-if="comments.length" class="mt-4 space-y-4">
        <BugCommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          :author-name="projectsStore.profileName(comment.author_id)"
          :author-avatar="projectsStore.profileAvatar(comment.author_id)"
          :is-author="isCommentAuthor(comment)"
          :editing="editingCommentId === comment.id"
          :draft="commentDraft"
          :saving="commentSaving"
          :action-error="commentActionError"
          :confirm-delete="deleteTarget?.id === comment.id"
          :delete-saving="deleteSaving"
          @update:draft="commentDraft = $event"
          @edit="startEditComment(comment)"
          @cancel-edit="cancelEditComment"
          @save-edit="confirmEditComment"
          @ask-delete="askDeleteComment(comment)"
          @cancel-delete="closeDeleteDialog"
          @confirm-delete="confirmDeleteComment"
        />
      </div>

      <div v-else class="mt-4 rounded-lg border border-dashed px-6 py-8 text-center">
        <MessageSquare class="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p class="mt-2 text-sm font-medium">Пока нет комментариев</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Обсудите баг с командой — первый комментарий за вами.
        </p>
      </div>

      <form class="mt-5 space-y-2" @submit.prevent="submitComment">
        <Textarea
          v-model="commentText"
          :rows="3"
          maxlength="2000"
          placeholder="Добавить комментарий… (Ctrl + Enter — отправить)"
          :disabled="commentSubmitting"
          @keydown.ctrl.enter.prevent="submitComment"
        />
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p v-if="commentError" class="text-xs text-severity-critical">
            {{ commentError }}
          </p>
          <span v-else class="text-xs text-muted-foreground"> {{ commentText.length }}/2000 </span>
          <Button type="submit" size="sm" :disabled="commentSubmitting || !commentText.trim()">
            <Loader2 v-if="commentSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            <Send v-else class="mr-2 h-4 w-4" />
            {{ commentSubmitting ? 'Отправляем…' : 'Отправить' }}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
