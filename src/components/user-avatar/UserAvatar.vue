<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, watch } from 'vue'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

interface Props {
  name: string
  src?: string | null
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const imgFailed = ref(false)

watch(
  () => props.src,
  () => {
    imgFailed.value = false
  },
)
</script>

<template>
  <span
    :class="
      cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary',
        props.class,
      )
    "
  >
    <img
      v-if="src && !imgFailed"
      :src="src"
      :alt="name"
      class="h-full w-full object-cover"
      @error="imgFailed = true"
    />
    <span v-else>{{ initials(name) }}</span>
  </span>
</template>
