<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DropdownMenuTrigger as RekaDropdownMenuTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <RekaDropdownMenuTrigger
    data-slot="dropdown-menu-trigger"
    :as="props.as"
    :class="cn('', props.class)"
  >
    <slot />
  </RekaDropdownMenuTrigger>
</template>