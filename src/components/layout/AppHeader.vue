<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
</script>

<template>
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <RouterLink to="/" class="font-mono text-base font-semibold tracking-tight">
        BugBoard
      </RouterLink>

      <nav class="flex items-center gap-3">
        <ThemeToggle />
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
