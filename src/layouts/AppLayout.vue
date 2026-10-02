<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Menu } from '@lucide/vue'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { Button } from '@/components/ui/button'

const route = useRoute()
const sidebarOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar v-model:open="sidebarOpen" />
    <div class="flex min-w-0 flex-1 flex-col">
      <!-- Mobile / tablet top bar with menu trigger -->
      <header
        class="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background px-3 md:hidden"
      >
        <Button variant="ghost" size="icon" aria-label="Открыть меню" @click="sidebarOpen = true">
          <Menu class="h-4 w-4" />
        </Button>
        <RouterLink to="/app" class="font-mono text-sm font-semibold"> BugBoard </RouterLink>
      </header>

      <main class="min-w-0 flex-1 bg-background text-foreground">
        <RouterView />
      </main>
    </div>
  </div>
</template>
