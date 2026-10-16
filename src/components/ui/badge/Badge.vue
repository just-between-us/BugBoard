<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props extends HTMLAttributes {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <span
    data-slot="badge"
    :class="
      cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        {
          'border-transparent bg-primary text-primary-foreground': variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground': variant === 'secondary',
          'border-transparent bg-destructive text-white': variant === 'destructive',
          'text-foreground': variant === 'outline',
        },
        props.class,
      )
    "
    v-bind="$attrs"
  >
    <slot />
  </span>
</template>
