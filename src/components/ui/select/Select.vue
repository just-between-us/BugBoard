<script setup lang="ts">
import type { PrimitiveProps } from 'reka-ui'
import { SelectRoot as RekaSelectRoot } from 'reka-ui'

// Внимание: reka SelectRoot рендерит фрагмент (PopperRoot без элемента) —
// атрибуты/классы, переданные в корень, в DOM не попадают.
const props = withDefaults(defineProps<PrimitiveProps>(), {
  as: 'div',
})
</script>

<template>
  <RekaSelectRoot :as="props.as">
    <slot />
  </RekaSelectRoot>
</template>
