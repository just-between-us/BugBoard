<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectLabel as RekaSelectLabel } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectLabel
    data-slot="select-label"
    :as="props.as"
    :class="cn('px-2 py-1.5 text-xs font-medium text-muted-foreground', props.class)"
  >
    <slot />
  </RekaSelectLabel>
</template>
