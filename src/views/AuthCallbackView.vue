<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

onMounted(async () => {
  // PKCE-флоу: токен приходит как ?code=... — его надо обменять на сессию руками.
  // При дефолтном implicit-флоу токены в hash разбирает сам supabase-js при
  // инициализации клиента, и этот блок просто не выполняется
  if (route.query.code) {
    await supabase.auth.exchangeCodeForSession(window.location.href)
  }

  // Событие сессии от auth-js приходит через setTimeout(0) — даём ему время дойти
  const deadline = Date.now() + 1000
  while (!auth.isAuthenticated && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25))
  }

  await auth.fetchProfile()

  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/app'
  router.replace(auth.isAuthenticated ? redirect : { name: 'auth' })
})
</script>

<template>
  <main class="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
    Входим…
  </main>
</template>
