<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DialogRoot as RekaDialogRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

interface Props extends PrimitiveProps {
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean
  unmountOnHide?: boolean
  'onUpdate:open'?: (value: boolean) => void
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const slotProps = {
  open: props.open ?? false,
  close: () => emit('update:open', false),
}
</script>

<template>
  <RekaDialogRoot
    :open="props.open"
    :default-open="props.defaultOpen"
    :modal="props.modal"
    :unmount-on-hide="props.unmountOnHide"
    @update:open="emit('update:open', $event)"
    data-slot="dialog"
    :class="cn('relative z-50', props.class)"
  >
    <slot :open="slotProps.open" :close="slotProps.close" />
  </RekaDialogRoot>
</template>