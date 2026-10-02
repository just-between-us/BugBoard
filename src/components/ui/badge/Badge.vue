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
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        {
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80':
            variant === 'default',
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80':
            variant === 'secondary',
          'border-transparent bg-destructive text-white hover:bg-destructive/80':
            variant === 'destructive',
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
