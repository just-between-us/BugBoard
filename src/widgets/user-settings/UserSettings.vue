<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Camera, Check, Loader2, Pencil, Undo2 } from '@lucide/vue'
import { AnimatePresence, Motion } from 'motion-v'
import type { PublicProfile } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { formatDateOnly, toUserError } from '@/lib/format'
import { expandTransition } from '@/lib/motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

interface Props {
  profile: PublicProfile
}

const props = defineProps<Props>()

const emit = defineEmits<{ saved: [] }>()

const auth = useAuthStore()

const editingName = ref(false)
const nameDraft = ref('')
const nameSaving = ref(false)
const nameError = ref('')
const nameSaved = ref(false)
const nameInputRef = ref<InstanceType<typeof Input> | null>(null)

function startEditName() {
  nameDraft.value = props.profile.display_name
  nameError.value = ''
  nameSaved.value = false
  editingName.value = true
  void nextTick(() => {
    const input = nameInputRef.value?.$el
    if (input instanceof HTMLInputElement) input.select()
  })
}

function cancelEditName() {
  editingName.value = false
  nameError.value = ''
}

async function saveName() {
  if (!auth.user) return
  const value = nameDraft.value.replace(/\s+/g, ' ').trim()
  if (!value || value === props.profile.display_name) {
    cancelEditName()
    return
  }

  nameSaving.value = true
  nameError.value = ''
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ display_name: value })
    .eq('id', auth.user.id)

  if (updateError) {
    nameError.value = updateError.message
  } else {
    await auth.fetchProfile()
    editingName.value = false
    nameSaved.value = true
    emit('saved')
  }
  nameSaving.value = false
}

const editingEmail = ref(false)
const newEmail = ref('')
const emailSending = ref(false)
const emailSent = ref(false)
const emailError = ref('')
const emailInputRef = ref<InstanceType<typeof Input> | null>(null)

function startEditEmail() {
  newEmail.value = ''
  emailError.value = ''
  emailSent.value = false
  editingEmail.value = true
  void nextTick(() => emailInputRef.value?.$el?.focus())
}

function cancelEditEmail() {
  editingEmail.value = false
  emailError.value = ''
}

async function saveEmail() {
  const target = newEmail.value.trim()
  if (!target) {
    emailError.value = 'Введите новую почту'
    return
  }
  if (target === auth.user?.email) {
    emailError.value = 'Эта почта уже используется'
    return
  }

  emailSending.value = true
  emailError.value = ''
  try {
    await auth.changeEmail(target)
    emailSent.value = true
    newEmail.value = ''
  } catch (e) {
    emailError.value = toUserError(e)
  } finally {
    emailSending.value = false
  }
}

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarError = ref('')
const avatarSaved = ref(false)

function pickAvatar() {
  avatarInput.value?.click()
}

async function handleAvatarFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  avatarUploading.value = true
  avatarError.value = ''
  avatarSaved.value = false
  try {
    await auth.uploadAvatar(file)
    avatarSaved.value = true
    emit('saved')
  } catch (e) {
    avatarError.value = toUserError(e)
  } finally {
    avatarUploading.value = false
  }
}

const avatarName = computed(() => props.profile.display_name || auth.user?.email || '?')
</script>

<template>
  <Card class="gap-4 max-sm:border-0 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none">
    <CardContent class="flex flex-col gap-4 max-sm:px-0 md:flex-row md:flex-wrap md:items-center">
      <div class="relative h-16 w-16 shrink-0">
        <Avatar class="h-16 w-16 text-xl" :name="avatarName" :src="profile.avatar_url" />
        <button
          type="button"
          class="absolute -right-0.5 -bottom-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
          :disabled="avatarUploading"
          :title="profile.avatar_url ? 'Сменить аватар' : 'Загрузить аватар'"
          aria-label="Загрузить аватар"
          @click="pickAvatar"
        >
          <Loader2 v-if="avatarUploading" class="h-3.5 w-3.5 animate-spin" />
          <Camera v-else class="h-3.5 w-3.5" />
        </button>
        <input
          ref="avatarInput"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleAvatarFile"
        />
      </div>

      <div class="min-w-0 flex-1">
        <AnimatePresence mode="wait" :initial="false">
          <Motion
            v-if="!editingName"
            key="view"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="expandTransition"
            class="flex flex-wrap items-center gap-2"
          >
            <h1 class="truncate text-2xl font-semibold tracking-tight">
              {{ profile.display_name }}
            </h1>
            <Badge variant="secondary">Это вы</Badge>
            <Button
              variant="ghost"
              size="icon"
              class="h-7 w-7 text-muted-foreground"
              aria-label="Изменить отображаемое имя"
              title="Изменить имя"
              @click="startEditName"
            >
              <Pencil class="h-3 w-3" />
            </Button>
          </Motion>
          <Motion
            v-else
            key="edit"
            :initial="{ height: 0, opacity: 0 }"
            :animate="{ height: 'auto', opacity: 1 }"
            :exit="{ height: 0, opacity: 0 }"
            :transition="expandTransition"
            class="flex flex-wrap items-center gap-2 overflow-hidden"
          >
            <Input
              ref="nameInputRef"
              v-model="nameDraft"
              type="text"
              class="h-9 w-64 max-w-full"
              aria-label="Отображаемое имя"
              @keydown.enter.prevent="saveName"
              @keydown.esc="cancelEditName"
            />
            <Button
              size="icon"
              class="h-9 w-9"
              :disabled="nameSaving"
              aria-label="Сохранить имя"
              @click="saveName"
            >
              <Loader2 v-if="nameSaving" class="h-4 w-4 animate-spin" />
              <Check v-else class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              class="h-9 w-9"
              aria-label="Отменить"
              @click="cancelEditName"
            >
              <Undo2 class="h-4 w-4" />
            </Button>
          </Motion>
        </AnimatePresence>

        <p v-if="nameError" class="mt-1 text-sm text-severity-critical">{{ nameError }}</p>
        <p v-else-if="nameSaved" class="mt-1 text-sm text-muted-foreground">Сохранено</p>

        <p class="mt-1 text-sm text-muted-foreground">
          Участник с {{ formatDateOnly(profile.created_at) }}
        </p>

        <AnimatePresence mode="wait" :initial="false">
          <Motion
            v-if="!editingEmail"
            key="view"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="expandTransition"
            class="mt-2 flex flex-wrap items-center gap-2 text-sm"
          >
            <span class="text-muted-foreground">{{ auth.user?.email }}</span>
            <Button
              variant="ghost"
              size="sm"
              class="h-7 gap-1 px-2 text-xs text-muted-foreground"
              aria-label="Изменить почту"
              @click="startEditEmail"
            >
              <Pencil class="h-3 w-3" />
            </Button>
          </Motion>
          <Motion
            v-else
            key="edit"
            :initial="{ height: 0, opacity: 0, marginTop: 0 }"
            :animate="{ height: 'auto', opacity: 1, marginTop: 8 }"
            :exit="{ height: 0, opacity: 0, marginTop: 0 }"
            :transition="expandTransition"
            class="flex flex-wrap items-center gap-2 overflow-hidden"
          >
            <Input
              ref="emailInputRef"
              v-model="newEmail"
              type="email"
              placeholder="new@example.com"
              autocomplete="email"
              class="h-8 sm:w-64 max-w-full"
              aria-label="Новая почта"
              @keydown.enter.prevent="saveEmail"
              @keydown.esc="cancelEditEmail"
            />
            <div
              class="flex flex-row-reverse justify-end sm:flex-row sm:justify-start gap-2 w-full sm:w-auto"
            >
              <Button :disabled="emailSending" @click="saveEmail">
                <Loader2 v-if="emailSending" class="h-4 w-4 animate-spin" />
                {{ emailSending ? 'Отправляем…' : 'Сменить' }}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                class="h-9 w-9"
                aria-label="Отменить"
                @click="cancelEditEmail"
              >
                <Undo2 class="h-4 w-4" />
              </Button>
            </div>
          </Motion>
        </AnimatePresence>

        <p v-if="emailError" class="mt-1 text-sm text-severity-critical">{{ emailError }}</p>
        <p v-else-if="emailSent" class="mt-1 text-sm text-muted-foreground">
          Отправили письмо с подтверждением — перейдите по ссылке в нём
        </p>
      </div>

      <div class="flex items-center gap-2 self-start md:self-auto">
        <span class="text-xs text-muted-foreground">Тема</span>
        <ThemeToggle />
      </div>
    </CardContent>

    <p v-if="avatarError" class="px-4 pb-4 text-sm text-severity-critical sm:px-6">
      {{ avatarError }}
    </p>
    <p v-else-if="avatarSaved" class="px-4 pb-4 text-sm text-muted-foreground sm:px-6">
      Аватар обновлён
    </p>
  </Card>
</template>
