<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Loader2, Pencil, Undo2 } from '@lucide/vue'
import type { Bug } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { CopyButton } from '@/components/copy-button'
import { Avatar } from '@/components/avatar'
import {
  SEVERITY_BADGE,
  SEVERITY_BG,
  STATUS_BADGE,
  areaIcon,
  areaOptions,
  isNewBug,
  optionLabel,
  severityOptions,
  statusIcon,
  statusOptions,
} from '@/entities/bug'

interface Props {
  bug: Bug
  projectId: string
  projectName: string | null
  saving: boolean
  error: string | null
  canRevert: boolean
  editing: boolean
  patch: (updates: Partial<Bug>) => Promise<boolean>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  revert: []
  'update:editing': [value: boolean]
}>()

const projectsStore = useProjectsStore()

const titleDraft = ref('')
const titleDraftLength = computed(() => titleDraft.value.replace(/\s+/g, ' ').trim().length)
const titleInputRef = ref<{ $el: HTMLTextAreaElement } | null>(null)

watch(
  () => props.editing,
  (editing) => {
    if (!editing) titleDraft.value = ''
  },
)

function autoGrowTitle() {
  const el = titleInputRef.value?.$el
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

function startEditTitle() {
  if (props.saving) return
  titleDraft.value = props.bug.title
  emit('update:editing', true)
  void nextTick(() => {
    const el = titleInputRef.value?.$el
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
    autoGrowTitle()
  })
}

function cancelEditTitle() {
  emit('update:editing', false)
}

async function confirmEditTitle() {
  const value = titleDraft.value.replace(/\s+/g, ' ').trim()
  if (!value || value === props.bug.title) {
    cancelEditTitle()
    return
  }
  if (await props.patch({ title: value })) cancelEditTitle()
}
</script>

<template>
  <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
    <div class="flex min-w-0 flex-1 items-start gap-4">
      <div
        class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
        :class="SEVERITY_BG[bug.severity] ?? 'bg-muted'"
      >
        <component :is="areaIcon(bug.area)" class="h-6 w-6" />
      </div>

      <div class="min-w-0 w-full">
        <div class="flex w-full flex-wrap gap-2">
          <template v-if="editing">
            <div class="flex w-full flex-wrap gap-2">
              <Textarea
                ref="titleInputRef"
                v-model="titleDraft"
                :rows="1"
                class="min-h-0 min-w-55 flex-1 basis-full resize-none overflow-hidden text-lg font-semibold leading-snug"
                maxlength="200"
                :disabled="saving"
                aria-label="Название бага"
                @input="autoGrowTitle"
                @keydown.enter.exact.prevent="confirmEditTitle"
                @keydown.esc="cancelEditTitle"
              />
              <div class="flex flex-wrap basis-full items-center gap-1.5 h-min">
                <span class="ml-auto text-xs text-muted-foreground">
                  {{ titleDraftLength }}/200
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  class="h-9"
                  :disabled="saving"
                  @click="cancelEditTitle"
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  class="h-9"
                  :disabled="saving || !titleDraft.trim()"
                  @click="confirmEditTitle"
                >
                  <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
                  <Check v-else class="h-4 w-4" />
                  {{ saving ? 'Сохраняем…' : 'Сохранить' }}
                </Button>
              </div>
              <p v-if="error" class="w-full text-xs text-severity-critical">
                {{ error }}
              </p>
            </div>
          </template>

          <template v-else>
            <div class="relative inline-block pr-9">
              <h1 class="text-2xl font-semibold tracking-tight wrap-break-word">
                {{ bug.title }}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                class="absolute right-0 top-1/2 -translate-y-1/2 h-7 w-7 shrink-0 text-muted-foreground"
                title="Редактировать название"
                aria-label="Редактировать название"
                @click="startEditTitle"
              >
                <Pencil class="h-3.5 w-3.5" />
              </Button>
            </div>
          </template>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Badge :class="STATUS_BADGE[bug.status]" class="flex items-center gap-1 text-xs">
            <component
              :is="statusIcon(bug.status)"
              class="h-3 w-3"
              :class="{
                'animate-spin': bug.status === 'in_progress',
                'animate-eye-look': bug.status === 'discovered',
              }"
            />
            {{ optionLabel(statusOptions, bug.status) }}
          </Badge>
          <Badge :class="SEVERITY_BADGE[bug.severity]" class="text-xs">
            {{ optionLabel(severityOptions, bug.severity) }}
          </Badge>
          <Badge
            v-if="isNewBug(bug.created_at)"
            class="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            Новый
          </Badge>
          <Badge variant="outline" class="flex items-center gap-1 text-xs">
            <component :is="areaIcon(bug.area)" class="h-3 w-3" />
            {{ optionLabel(areaOptions, bug.area) }}
          </Badge>
        </div>

        <p class="mt-3 text-sm text-muted-foreground">
          Проект:
          <RouterLink
            :to="{ name: 'project', params: { id: projectId } }"
            class="font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            {{ projectName }}
          </RouterLink>
        </p>

        <p class="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          Автор:
          <RouterLink
            :to="{ name: 'user-profile', params: { userId: bug.created_by } }"
            class="inline-flex min-w-0 items-center gap-1.5 font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            <Avatar
              class="h-5 w-5 text-[10px]"
              :name="projectsStore.profileName(bug.created_by)"
              :src="projectsStore.profileAvatar(bug.created_by)"
            />
            <span class="truncate">{{ projectsStore.profileName(bug.created_by) }}</span>
          </RouterLink>
        </p>
        <span class="mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
          {{ bug.id }}
          <CopyButton :text="bug.id" label="Копировать ID" />
        </span>
      </div>
    </div>

    <div class="space-y-1 text-xs text-muted-foreground sm:text-right">
      <Button
        v-if="canRevert"
        variant="outline"
        size="sm"
        class="mb-2 gap-1.5"
        :disabled="saving"
        title="Вернуть название, описание и автора, которые были при открытии страницы"
        @click="emit('revert')"
      >
        <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
        <Undo2 v-else class="h-3.5 w-3.5" />
        Вернуть изменения
      </Button>
    </div>
  </div>
</template>

<style scoped>
@keyframes eye-look {
  0%,
  100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

.animate-eye-look {
  animation: eye-look 3s ease-in-out infinite;
  transform-origin: center;
}
</style>
