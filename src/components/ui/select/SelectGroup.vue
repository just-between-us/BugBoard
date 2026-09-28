<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { SelectGroup as RekaSelectGroup } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectGroup
    data-slot="select-group"
    :as="props.as"
    :class="cn('', props.class)"
  >
    <slot />
  </RekaSelectGroup>
</template>