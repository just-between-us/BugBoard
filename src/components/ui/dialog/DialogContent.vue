<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { DialogContent as RekaDialogContent, DialogPortal as RekaDialogPortal } from 'reka-ui'
import { cn } from '@/lib/utils'
import DialogOverlay from './DialogOverlay.vue'

interface Props extends PrimitiveProps {
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  as: 'div',
})
</script>

<template>
  <RekaDialogPortal>
    <DialogOverlay />
    <RekaDialogContent
      data-slot="dialog-content"
      :as="props.as"
      :class="
        cn(
          'fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:w-full sm:rounded-lg',
          props.class,
        )
      "
    >
      <slot />
    </RekaDialogContent>
  </RekaDialogPortal>
</template>
