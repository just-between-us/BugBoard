<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Primitive } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <Primitive
    data-slot="dialog-footer"
    :as="as"
    :class="cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', props.class)"
  >
    <slot />
  </Primitive>
</template>
