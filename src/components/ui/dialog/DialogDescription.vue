<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'p',
})
</script>

<template>
  <Primitive
    data-slot="dialog-description"
    :as="as"
    :class="cn('text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </Primitive>
</template>
