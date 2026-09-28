<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DropdownMenuRoot as RekaDropdownMenuRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaDropdownMenuRoot
    data-slot="dropdown-menu"
    :as="props.as"
    :class="cn('', props.class)"
  >
    <slot />
  </RekaDropdownMenuRoot>
</template>