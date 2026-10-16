<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { Check, Loader2, Pencil } from '@lucide/vue'
import { AnimatePresence, Motion } from 'motion-v'
import type { Bug } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { expandTransition } from '@/lib/motion'

interface Props {
  bug: Bug
  saving: boolean
  error: string | null
  editing: boolean
  patch: (updates: Partial<Bug>) => Promise<boolean>
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:editing': [value: boolean]
}>()

const descriptionDraft = ref('')
const descriptionInputRef = ref<{ $el: HTMLTextAreaElement } | null>(null)

watch(
  () => props.editing,
  (editing) => {
    if (!editing) descriptionDraft.value = ''
  },
)

function startEditDescription() {
  if (props.saving) return
  descriptionDraft.value = props.bug.description ?? ''
  emit('update:editing', true)
  void nextTick(() => descriptionInputRef.value?.$el.focus())
}

function cancelEditDescription() {
  emit('update:editing', false)
}

async function confirmEditDescription() {
  const raw = descriptionDraft.value
  const normalized = raw.trim() === '' ? null : raw
  if (normalized === (props.bug.description ?? null)) {
    cancelEditDescription()
    return
  }
  if (await props.patch({ description: normalized })) cancelEditDescription()
}
</script>

<template>
  <Card class="gap-3">
    <CardContent>
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-sm font-medium text-muted-foreground">Описание</h2>
        <Button
          v-if="!editing"
          variant="ghost"
          size="icon"
          class="h-7 w-7 shrink-0 text-muted-foreground"
          title="Редактировать описание"
          aria-label="Редактировать описание"
          @click="startEditDescription"
        >
          <Pencil class="h-3.5 w-3.5" />
        </Button>
      </div>

      <AnimatePresence mode="wait" :initial="false">
        <Motion
          v-if="editing"
          key="edit"
          :initial="{ height: 0, opacity: 0 }"
          :animate="{ height: 'auto', opacity: 1 }"
          :exit="{ height: 0, opacity: 0 }"
          :transition="expandTransition"
          class="overflow-hidden"
        >
          <Textarea
            ref="descriptionInputRef"
            v-model="descriptionDraft"
            :rows="6"
            class="mt-3"
            maxlength="10000"
            :disabled="saving"
            aria-label="Описание бага"
            @keydown.ctrl.enter.prevent="confirmEditDescription"
            @keydown.esc="cancelEditDescription"
          />
          <div class="mt-3 flex flex-wrap items-center gap-1.5">
            <Button size="sm" class="h-9" :disabled="saving" @click="confirmEditDescription">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              <Check v-else class="h-4 w-4" />
              {{ saving ? 'Сохраняем…' : 'Сохранить' }}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              class="h-9"
              :disabled="saving"
              @click="cancelEditDescription"
            >
              Отмена
            </Button>
            <span class="ml-auto text-xs text-muted-foreground">
              {{ descriptionDraft.length }}/10000
            </span>
          </div>
          <p v-if="error" class="text-xs text-severity-critical">
            {{ error }}
          </p>
        </Motion>
        <Motion
          v-else-if="bug.description"
          key="view-filled"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="expandTransition"
          class="mt-3 whitespace-pre-wrap text-sm leading-relaxed"
        >
          {{ bug.description }}
        </Motion>
        <Motion
          v-else
          key="view-empty"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :transition="expandTransition"
          class="mt-3 text-sm italic text-muted-foreground"
        >
          Описание не заполнено
        </Motion>
      </AnimatePresence>
    </CardContent>
  </Card>
</template>
