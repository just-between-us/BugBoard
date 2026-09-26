<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'
import { Sun, Moon } from '@lucide/vue'

const theme = useThemeStore()
</script>

<template>
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <RouterLink to="/" class="font-mono text-base font-semibold tracking-tight">
        BugBoard
      </RouterLink>

      <nav class="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Переключить тему" @click="theme.toggle()">
          <Sun v-if="theme.theme === 'dark'" class="h-4 w-4" />
          <Moon v-else class="h-4 w-4" />
        </Button>
        <RouterLink
          to="/auth"
          class="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Войти
        </RouterLink>
        <Button as-child size="sm">
          <RouterLink to="/auth?mode=signup">Создать команду</RouterLink>
        </Button>
      </nav>
    </div>
  </header>
</template>
