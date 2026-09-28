<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectRoot as RekaSelectRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectRoot
    data-slot="select"
    :as="props.as"
    :class="cn('', props.class)"
  >
    <slot />
  </RekaSelectRoot>
</template>