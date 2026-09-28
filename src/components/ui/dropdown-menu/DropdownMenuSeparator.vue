<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DropdownMenuSeparator as RekaDropdownMenuSeparator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaDropdownMenuSeparator
    data-slot="dropdown-menu-separator"
    :as="props.as"
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>