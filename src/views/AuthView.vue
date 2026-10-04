<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabaseClient'
import { authRedirectUrl } from '@/lib/authRedirect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')
const step = ref<'form' | 'otp'>('form')

const email = ref('')
const password = ref('')
const displayName = ref('')
const otpCode = ref('')

const loading = ref(false)
const error = ref('')
const notice = ref('')
const sendingReset = ref(false)

const redirectTo = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/app',
)

function switchMode(next: 'signin' | 'signup') {
  mode.value = next
  step.value = 'form'
  error.value = ''
  notice.value = ''
}

async function handleSignIn() {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    await auth.signIn(email.value, password.value)
    router.push(redirectTo.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не получилось войти'
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  error.value = ''
  notice.value = ''

  const target = email.value.trim()
  if (!target) {
    error.value = 'Введите почту, чтобы восстановить пароль'
    return
  }

  sendingReset.value = true
  try {
    await auth.resetPassword(target)
    notice.value = `Отправили ссылку для сброса пароля на ${target}`
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не получилось отправить письмо'
  } finally {
    sendingReset.value = false
  }
}

async function handleSignUp() {
  error.value = ''
  notice.value = ''
  loading.value = true
  try {
    await auth.signUp(email.value, password.value, displayName.value, redirectTo.value)
    step.value = 'otp'
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не получилось зарегистрироваться'
  } finally {
    loading.value = false
  }
}

async function handleVerify() {
  error.value = ''
  loading.value = true
  try {
    await auth.verifySignup(email.value, otpCode.value)
    router.push(redirectTo.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Неверный код'
  } finally {
    loading.value = false
  }
}

async function resendCode() {
  error.value = ''
  const { error: resendError } = await supabase.auth.resend({
    type: 'signup',
    email: email.value,
    options: { emailRedirectTo: authRedirectUrl('auth/callback', redirectTo.value) },
  })
  if (resendError) error.value = resendError.message
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
    <RouterLink
      to="/"
      class="fixed left-6 top-6 text-sm text-muted-foreground hover:text-foreground"
    >
      ← На главную
    </RouterLink>

    <Card class="w-full max-w-sm">
      <CardHeader>
        <CardTitle class="font-mono text-base">BugBoard</CardTitle>
        <CardDescription v-if="step === 'form'">
          {{ mode === 'signin' ? 'Войдите в свой аккаунт' : 'Создайте аккаунт разработчика' }}
        </CardDescription>
        <CardDescription v-else>Мы отправили код на {{ email }}</CardDescription>
      </CardHeader>

      <CardContent class="space-y-4">
        <div v-if="step === 'form'" class="flex gap-4 text-sm">
          <button
            type="button"
            class="border-b-2 pb-1 transition-colors"
            :class="
              mode === 'signin'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground'
            "
            @click="switchMode('signin')"
          >
            Войти
          </button>
          <button
            type="button"
            class="border-b-2 pb-1 transition-colors"
            :class="
              mode === 'signup'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground'
            "
            @click="switchMode('signup')"
          >
            Регистрация
          </button>
        </div>

        <form
          v-if="step === 'form' && mode === 'signin'"
          class="space-y-4"
          @submit.prevent="handleSignIn"
        >
          <div class="space-y-1.5">
            <Label for="email">Почта</Label>
            <Input id="email" v-model="email" type="email" required autocomplete="email" />
          </div>
          <div class="space-y-1.5">
            <Label for="password">Пароль</Label>
            <Input
              id="password"
              v-model="password"
              type="password"
              required
              autocomplete="current-password"
            />
          </div>
          <div class="flex justify-end">
            <button
              type="button"
              class="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground disabled:opacity-50"
              :disabled="sendingReset"
              @click="handleForgotPassword"
            >
              {{ sendingReset ? 'Отправляем…' : 'Забыли пароль?' }}
            </button>
          </div>
          <p v-if="notice" class="text-sm text-muted-foreground">{{ notice }}</p>
          <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Входим…' : 'Войти' }}
          </Button>
        </form>

        <form
          v-else-if="step === 'form' && mode === 'signup'"
          class="space-y-4"
          @submit.prevent="handleSignUp"
        >
          <div class="space-y-1.5">
            <Label for="name">Имя</Label>
            <Input id="name" v-model="displayName" type="text" required autocomplete="name" />
          </div>
          <div class="space-y-1.5">
            <Label for="signup-email">Почта</Label>
            <Input id="signup-email" v-model="email" type="email" required autocomplete="email" />
          </div>
          <div class="space-y-1.5">
            <Label for="signup-password">Пароль</Label>
            <Input
              id="signup-password"
              v-model="password"
              type="password"
              required
              minlength="6"
              autocomplete="new-password"
            />
          </div>
          <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Регистрируем…' : 'Зарегистрироваться' }}
          </Button>
        </form>

        <form v-else class="space-y-4" @submit.prevent="handleVerify">
          <div class="space-y-1.5">
            <Label for="otp">Код из письма</Label>
            <Input
              id="otp"
              v-model="otpCode"
              type="text"
              inputmode="numeric"
              required
              autocomplete="one-time-code"
            />
          </div>
          <p class="text-sm text-muted-foreground">
            Введите код из письма или перейдите по ссылке в нём
          </p>
          <p v-if="error" class="text-sm text-severity-critical">{{ error }}</p>
          <Button type="submit" class="w-full" :disabled="loading">
            {{ loading ? 'Проверяем…' : 'Подтвердить' }}
          </Button>
          <button
            type="button"
            class="text-sm text-muted-foreground underline underline-offset-4"
            @click="resendCode"
          >
            Отправить код ещё раз
          </button>
        </form>
      </CardContent>
    </Card>
  </main>
</template>
