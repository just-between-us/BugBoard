<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()
const auth = useAuthStore()

const phase = ref<'check' | 'form' | 'invalid'>('check')
const password = ref('')
const error = ref('')
const saving = ref(false)

let subscription: { unsubscribe: () => void } | undefined

onMounted(() => {
  // Форма показывается только при recovery-контексте: технически сессия по
  // ссылке восстановления выглядит как обычная, PASSWORD_RECOVERY — единственный
  // надёжный сигнал (событие могло прийти ещё до монтирования — читаем флаг стора)
  if (auth.passwordRecovery) {
    auth.passwordRecovery = false
    phase.value = 'form'
    return
  }

  subscription = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      auth.passwordRecovery = false
      phase.value = 'form'
    } else if (event === 'INITIAL_SESSION' && phase.value === 'check') {
      phase.value = 'invalid'
    }
  }).data.subscription
})

onUnmounted(() => subscription?.unsubscribe())

async function handleSubmit() {
  saving.value = true
  error.value = ''
  const { error: updateError } = await supabase.auth.updateUser({ password: password.value })
  if (updateError) {
    error.value = updateError.message
  } else {
    auth.passwordRecovery = false
    router.replace({ name: 'projects' })
  }
  saving.value = false
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <p v-if="phase === 'check'" class="text-sm text-muted-foreground">Входим…</p>

    <Card v-else-if="phase === 'invalid'" class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="font-mono text-base">BugBoard</CardTitle>
        <CardDescription>Ссылка для сброса пароля недействительна или устарела</CardDescription>
      </CardHeader>
      <CardContent>
        <RouterLink to="/auth" class="text-sm underline underline-offset-4">Войти</RouterLink>
      </CardContent>
    </Card>

    <Card v-else class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="font-mono text-base">BugBoard</CardTitle>
        <CardDescription>Введите новый пароль для аккаунта</CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="space-y-1.5">
            <Label for="new-password">Новый пароль</Label>
            <Input
              id="new-password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
              autofocus
            />
          </div>
          <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="saving">
            {{ saving ? 'Сохраняем…' : 'Сохранить пароль' }}
          </Button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
