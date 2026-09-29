<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ref, watch } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

interface Props {
  name: string
  src?: string | null
  to?: RouteLocationRaw
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

defineOptions({ name: 'EntityAvatar' })

const imgFailed = ref(false)

watch(
  () => props.src,
  () => {
    imgFailed.value = false
  },
)
</script>

<template>
  <component
    :is="props.to ? RouterLink : 'span'"
    :to="props.to"
    :class="
      cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary',
        props.to && 'transition hover:opacity-80',
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
  </component>
</template>
