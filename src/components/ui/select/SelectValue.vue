<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectValue as RekaSelectValue } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
  placeholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  as: 'span',
})
</script>

<template>
  <RekaSelectValue
    data-slot="select-value"
    :as="props.as"
    :placeholder="props.placeholder"
    :class="cn('text-foreground', props.class)"
  />
</template>
