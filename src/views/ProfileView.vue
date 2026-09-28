<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const auth = useAuthStore()
const theme = useThemeStore()

const displayName = ref(auth.profile?.display_name ?? '')
const saving = ref(false)
const saved = ref(false)
const error = ref('')

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
</script>

<template>
  <div class="mx-auto max-w-xl px-6 py-10">
    <h1 class="text-2xl font-semibold">Профиль</h1>
    <p class="mt-1 text-sm text-muted-foreground">{{ auth.user?.email }}</p>

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
