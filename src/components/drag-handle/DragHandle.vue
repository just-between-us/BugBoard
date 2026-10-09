<script setup lang="ts">
import { GripVertical } from '@lucide/vue'
</script>

<template>
  <button
    type="button"
    data-drag-handle
    tabindex="-1"
    aria-label="Перетащить, чтобы изменить порядок"
    title="Перетащить"
    class="absolute right-0 top-1/2 z-[5] flex w-4 -translate-y-1/2 cursor-grab touch-none select-none justify-center text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
  >
    <GripVertical class="h-4 w-4" aria-hidden="true" />
  </button>
</template>
