<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementBounding, useElementSize } from '@vueuse/core'
import { VIEW_H, VIEW_W } from './tourState'
import type { TourController } from './useTour'
import TourViewport from './TourViewport.vue'

/**
 * Сцена тура: карточка с перспективой, внутри — масштабируемый вьюпорт.
 * Вокруг — декоративные слои глубины, они параллаксят при скролле сцены.
 */
const props = defineProps<{ controller: TourController }>()

const frameRef = ref<HTMLElement | null>(null)
const wrapRef = ref<HTMLElement | null>(null)

const frameSize = useElementSize(frameRef)
const scale = computed(() => (frameSize.width.value ? frameSize.width.value / VIEW_W : 1))
const frameHeight = computed(() => Math.round(VIEW_H * scale.value))

const bounds = useElementBounding(wrapRef)
const decorShift = computed(() => Math.max(-48, Math.min(48, bounds.y.value * -0.05)))
</script>

<template>
  <div ref="wrapRef" class="relative">
    <!-- Декорации заднего плана: смещаются медленнее контента при скролле -->
    <div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div
        class="absolute -top-12 -right-10 h-64 w-64 rounded-full bg-muted/60 blur-3xl"
        :style="{ transform: `translate3d(0, ${decorShift}px, 0)` }"
      />
      <div
        class="absolute -bottom-10 -left-12 h-52 w-80 rounded-3xl border border-border/70 bg-muted/40"
        :style="{ transform: `translate3d(0, ${decorShift * 1.6}px, 0) rotate(-5deg)` }"
      />
      <div
        class="absolute top-1/3 left-1/4 h-48 w-96 rounded-2xl bg-[radial-gradient(var(--mono-6)_1px,transparent_1px)] opacity-40 [background-size:22px_22px]"
        :style="{ transform: `translate3d(0, ${decorShift * 2.2}px, 0)` }"
      />
    </div>

    <div
      ref="frameRef"
      class="relative overflow-hidden rounded-xl border border-border bg-background shadow-[0_44px_100px_-60px_rgba(0,0,0,0.55)]"
      :style="{ height: `${frameHeight}px` }"
    >
      <TourViewport :controller="props.controller" :scale="scale" />
    </div>
  </div>
</template>
