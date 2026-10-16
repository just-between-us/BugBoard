<script setup lang="ts">
import { Moon, Sun } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()
</script>

<template>
  <Button variant="ghost" size="icon" aria-label="Переключить тему" @click="theme.toggle()">
    <Sun v-if="theme.theme === 'dark'" class="h-4 w-4" />
    <Moon v-else class="h-4 w-4" />
  </Button>
</template>
