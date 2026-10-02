<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { DropdownMenuRoot as RekaDropdownMenuRoot } from 'reka-ui'

// Внимание: reka DropdownMenuRoot рендерит фрагмент — атрибуты/классы,
// переданные в корень, в DOM не попадают; стили навешивайте на триггер/контент.
const props = withDefaults(defineProps<PrimitiveProps>(), {
  as: 'div',
})
</script>

<template>
  <RekaDropdownMenuRoot :as="props.as">
    <slot />
  </RekaDropdownMenuRoot>
</template>
