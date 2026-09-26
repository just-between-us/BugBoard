<script setup lang="ts">
import AppSidebar from '@/components/layout/AppSidebar.vue'
</script>

<template>
  <div class="flex min-h-screen">
    <AppSidebar />
    <main class="flex-1 overflow-y-auto bg-background text-foreground">
      <RouterView />
    </main>
  </div>
</template>
