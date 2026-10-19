<!-- components/TourCursor.vue -->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** любой CSS-цвет: #hex, rgb(), hsl(), 'currentColor' и т.д. */
    color?: string
  }>(),
  { color: '#0d99ff' },
)
</script>

<template>
  <svg viewBox="0 0 20 20" class="block overflow-visible" :style="{ color }" aria-hidden="true">
    <path
      d="M 3 2 L 16 12 L 9 11 L 3 17 Z"
      fill="currentColor"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>
