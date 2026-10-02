<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { DialogRoot as RekaDialogRoot } from 'reka-ui'

// Внимание: reka DialogRoot рендерит фрагмент — атрибуты/классы,
// переданные в корень, в DOM не попадают; стили навешивайте на DialogContent.
interface Props extends PrimitiveProps {
  open?: boolean
  defaultOpen?: boolean
  modal?: boolean
  unmountOnHide?: boolean
  'onUpdate:open'?: (value: boolean) => void
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
  >
    <slot :open="slotProps.open" :close="slotProps.close" />
  </RekaDialogRoot>
</template>
