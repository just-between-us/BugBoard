<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Loader2, Send } from '@lucide/vue'
import { useAuthStore } from '@/stores/auth'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const otpCode = ref('')
const authStep = ref<'email' | 'code'>('email')
const authLoading = ref(false)
const authError = ref('')

function isEmailValid(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

async function sendCode() {
  authError.value = ''

  if (!isEmailValid(email.value)) {
    authError.value = 'Укажите корректную почту'
    return
  }

  authLoading.value = true
  try {
    await auth.sendOtp(email.value.trim(), route.fullPath)
    authStep.value = 'code'
  } catch (e) {
    authError.value = toUserError(e)
  } finally {
    authLoading.value = false
  }
}

async function verifyCode() {
  authError.value = ''

  if (!otpCode.value.trim()) {
    authError.value = 'Введите код из письма'
    return
  }

  authLoading.value = true
  try {
    await auth.verifyEmailOtp(email.value.trim(), otpCode.value.trim())
  } catch {
    authError.value = 'Неверный код или он истёк'
  } finally {
    authLoading.value = false
  }
}

async function resendCode() {
  authError.value = ''
  try {
    await auth.sendOtp(email.value.trim(), route.fullPath)
  } catch (e) {
    authError.value = toUserError(e)
  }
}

function backToEmail() {
  authStep.value = 'email'
  otpCode.value = ''
  authError.value = ''
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle class="font-mono text-base">Войдите, чтобы посмотреть репорт</CardTitle>
      <CardDescription v-if="authStep === 'email'">
        Одна почта и код из письма — вход и для команды, и для репортёра, без пароля. До входа
        данные репорта не видны.
      </CardDescription>
      <CardDescription v-else>Мы отправили код на {{ email }}</CardDescription>
    </CardHeader>

    <CardContent>
      <form v-if="authStep === 'email'" class="space-y-4" @submit.prevent="sendCode">
        <div class="space-y-1.5">
          <Label for="report-view-email">Почта</Label>
          <Input
            id="report-view-email"
            v-model="email"
            type="email"
            placeholder="you@example.com"
            :disabled="authLoading"
            autocomplete="email"
            autofocus
          />
        </div>

        <p v-if="authError" class="text-sm text-severity-critical">{{ authError }}</p>

        <Button type="submit" class="w-full gap-2" :disabled="authLoading">
          <Loader2 v-if="authLoading" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          {{ authLoading ? 'Отправляем…' : 'Получить код' }}
        </Button>
      </form>

      <form v-else class="space-y-4" @submit.prevent="verifyCode">
        <div class="space-y-1.5">
          <Label for="report-view-otp">Код из письма</Label>
          <Input
            id="report-view-otp"
            v-model="otpCode"
            type="text"
            inputmode="numeric"
            placeholder="123456"
            :disabled="authLoading"
            autocomplete="one-time-code"
            autofocus
          />
        </div>

        <p class="text-sm text-muted-foreground">
          Введите код из письма или перейдите по ссылке в нём
        </p>

        <p v-if="authError" class="text-sm text-severity-critical">{{ authError }}</p>

        <Button type="submit" class="w-full" :disabled="authLoading">
          <Loader2 v-if="authLoading" class="h-4 w-4 animate-spin mr-2" />
          {{ authLoading ? 'Входим…' : 'Войти' }}
        </Button>

        <div class="flex items-center justify-between text-sm">
          <button
            type="button"
            class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            :disabled="authLoading"
            @click="backToEmail"
          >
            Изменить почту
          </button>
          <button
            type="button"
            class="text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            :disabled="authLoading"
            @click="resendCode"
          >
            Отправить код ещё раз
          </button>
        </div>
      </form>
    </CardContent>
  </Card>
</template>
