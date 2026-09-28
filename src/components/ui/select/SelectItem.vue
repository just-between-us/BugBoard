<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectItem as RekaSelectItem, SelectItemText, SelectItemIndicator } from 'reka-ui'
import { cn } from '@/lib/utils'
import { Check } from '@lucide/vue'

interface Props extends PrimitiveProps {
  value: string
  class?: HTMLAttributes['class']
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectItem
    :value="props.value"
    :disabled="props.disabled"
    data-slot="select-item"
    :as="props.as"
    :class="cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      props.class
    )"
  >
    <SelectItemIndicator class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Check class="h-4 w-4" />
    </SelectItemIndicator>
    <SelectItemText data-slot="select-item-text">
      <slot />
    </SelectItemText>
  </RekaSelectItem>
</template>