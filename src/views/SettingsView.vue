<script setup lang="ts">
import { computed, ref } from 'vue'
import { Camera, Loader2 } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { supabase } from '@/lib/supabaseClient'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/avatar'

const auth = useAuthStore()
const theme = useThemeStore()

const displayName = ref(auth.profile?.display_name ?? '')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarSaved = ref(false)
const avatarError = ref('')

const avatarName = computed(() => auth.profile?.display_name ?? auth.user?.email ?? '?')

const newEmail = ref('')
const emailSending = ref(false)
const emailSent = ref(false)
const emailError = ref('')

async function handleEmailChange() {
  emailError.value = ''
  emailSent.value = false

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

async function handleSave() {
  if (!auth.user) return
  saving.value = true
  saved.value = false
  error.value = ''

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ display_name: displayName.value })
    .eq('id', auth.user.id)

  if (updateError) {
    error.value = updateError.message
  } else {
    await auth.fetchProfile()
    saved.value = true
  }
  saving.value = false
}

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  avatarUploading.value = true
  avatarSaved.value = false
  avatarError.value = ''

  try {
    await auth.uploadAvatar(file)
    avatarSaved.value = true
  } catch (e) {
    avatarError.value = toUserError(e)
  } finally {
    avatarUploading.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl px-6 py-10">
    <h1 class="text-2xl font-semibold">Настройки</h1>
    <p class="mt-1 text-sm text-muted-foreground">{{ auth.user?.email }}</p>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-base">Аватар</CardTitle>
        <CardDescription>JPG, PNG или WebP, до 2 МБ</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <Avatar class="h-16 w-16 text-xl" :name="avatarName" :src="auth.profile?.avatar_url" />
          <div class="space-y-1.5">
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            />
            <Button variant="outline" :disabled="avatarUploading" @click="openAvatarPicker">
              <Loader2 v-if="avatarUploading" class="animate-spin" />
              <Camera v-else class="h-4 w-4" />
              {{ avatarUploading ? 'Загружаем…' : 'Загрузить' }}
            </Button>
            <p class="text-xs text-muted-foreground">Повторная загрузка заменяет текущий аватар</p>
          </div>
        </div>
        <p v-if="avatarError" class="mt-3 text-sm text-severity-critical">{{ avatarError }}</p>
        <p v-if="avatarSaved" class="mt-3 text-sm text-muted-foreground">Сохранено</p>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-base">Имя</CardTitle>
        <CardDescription>Отображается в проектах и комментариях</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex space-x-1.5">
          <Input id="display-name" v-model="displayName" type="text" />
          <Button :disabled="saving" @click="handleSave">
            {{ saving ? 'Сохраняем…' : 'Сохранить' }}
          </Button>
        </div>
        <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>
        <p v-if="saved" class="text-sm text-muted-foreground">Сохранено</p>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-base">Почта</CardTitle>
        <CardDescription>Подтверждение придёт письмом на новый адрес</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex space-x-1.5">
          <Input
            id="new-email"
            v-model="newEmail"
            type="email"
            placeholder="new@example.com"
            autocomplete="email"
          />
          <Button :disabled="emailSending" @click="handleEmailChange">
            {{ emailSending ? 'Отправляем…' : 'Сменить' }}
          </Button>
        </div>
        <p v-if="emailError" class="text-sm text-severity-critical">{{ emailError }}</p>
        <p v-if="emailSent" class="text-sm text-muted-foreground">
          Отправили письмо с подтверждением — перейдите по ссылке в нём
        </p>
      </CardContent>
    </Card>

    <Card class="mt-6">
      <CardHeader>
        <CardTitle class="text-base">Оформление</CardTitle>
        <CardDescription>Тема интерфейса на этом устройстве</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="inline-flex gap-1 rounded-md border border-border p-1">
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm transition-colors"
            :class="theme.theme === 'light' ? 'bg-card text-foreground' : 'text-muted-foreground'"
            @click="theme.set('light')"
          >
            Светлая
          </button>
          <button
            type="button"
            class="rounded px-3 py-1.5 text-sm transition-colors"
            :class="theme.theme === 'dark' ? 'bg-card text-foreground' : 'text-muted-foreground'"
            @click="theme.set('dark')"
          >
            Тёмная
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
