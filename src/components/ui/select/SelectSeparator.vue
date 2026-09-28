<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectSeparator as RekaSelectSeparator } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectSeparator
    data-slot="select-separator"
    :as="props.as"
    :class="cn('-mx-1 my-1 h-px bg-muted', props.class)"
  />
</template>