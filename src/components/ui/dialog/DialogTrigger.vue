<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DialogTrigger as RekaDialogTrigger } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
})
</script>

<template>
  <RekaDialogTrigger data-slot="dialog-trigger" :as="props.as" :class="cn('', props.class)">
    <slot />
  </RekaDialogTrigger>
</template>
