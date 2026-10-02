<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Separator as RekaSeparator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
  orientation: 'horizontal',
  decorative: true,
})
</script>

<template>
  <RekaSeparator
    :orientation="props.orientation"
    :decorative="props.decorative"
    data-slot="separator"
    :as="props.as"
    :class="
      cn(
        'shrink-0 bg-border',
        props.orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        props.class,
      )
    "
  />
</template>
