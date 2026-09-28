<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import {
  SelectContent as RekaSelectContent,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
} from 'reka-ui'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from '@lucide/vue'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
  position?: 'popper' | 'item-aligned'
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  position: 'popper',
})
</script>

<template>
  <RekaSelectContent
    :position="props.position"
    data-slot="select-content"
    :as="props.as"
    :class="
      cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        props.position === 'popper' &&
          'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        props.class,
      )
    "
  >
    <SelectViewport data-slot="select-viewport" class="p-1">
      <slot />
    </SelectViewport>
    <SelectScrollUpButton
      data-slot="select-scroll-up-button"
      class="flex cursor-default items-center justify-center rounded-md py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <ChevronUp class="h-4 w-4" />
    </SelectScrollUpButton>
    <SelectScrollDownButton
      data-slot="select-scroll-down-button"
      class="flex cursor-default items-center justify-center rounded-md py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      <ChevronDown class="h-4 w-4" />
    </SelectScrollDownButton>
  </RekaSelectContent>
</template>
