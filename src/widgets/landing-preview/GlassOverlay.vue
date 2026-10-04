<script setup lang="ts">
import { ref } from 'vue'

interface Shard {
  clip: string
  tx: number
  ty: number
  rot: number
  delay: number
}

// Грубая, но правдоподобная трещина — 7 неравных осколков, покрывающих всю карточку.
// Сгенерировано на глаз; для более реалистичной геометрии можно взять точки
// из любого "svg voronoi fracture generator" и перевести координаты в проценты.
const clips = [
  'polygon(0% 0%, 38% 0%, 46% 28%, 22% 46%, 0% 38%)',
  'polygon(38% 0%, 100% 0%, 100% 18%, 58% 34%, 46% 28%)',
  'polygon(100% 18%, 100% 55%, 68% 62%, 58% 34%)',
  'polygon(100% 55%, 100% 100%, 54% 100%, 50% 68%, 68% 62%)',
  'polygon(54% 100%, 0% 100%, 0% 62%, 28% 58%, 50% 68%)',
  'polygon(0% 62%, 0% 38%, 22% 46%, 28% 58%)',
  'polygon(22% 46%, 46% 28%, 58% 34%, 68% 62%, 50% 68%, 28% 58%)',
]

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function rolledShards(): Shard[] {
  return clips.map((clip) => ({
    clip,
    tx: rand(-60, 60),
    ty: rand(-40, 90),
    rot: rand(-18, 18),
    delay: rand(0, 0.12),
  }))
}

const shards = ref<Shard[]>(rolledShards())
const containerRef = ref<HTMLElement | null>(null)
const shattered = ref(false)

function handleMove(e: MouseEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  containerRef.value?.style.setProperty('--mx', `${x}%`)
  containerRef.value?.style.setProperty('--my', `${y}%`)
}

function handleClick() {
  shards.value = rolledShards() // новый разлёт при каждом клике
  shattered.value = true
  window.setTimeout(() => {
    shattered.value = false
  }, 900)
}
</script>

<template>
  <div
    ref="containerRef"
    class="glass-root absolute inset-0 cursor-pointer"
    @pointermove="handleMove"
    @click="handleClick"
  >
    <div
      v-for="(shard, i) in shards"
      :key="i"
      class="glass-shard absolute inset-0"
      :class="{ 'is-shattered': shattered }"
      :style="{
        clipPath: shard.clip,
        '--tx': `${shard.tx}px`,
        '--ty': `${shard.ty}px`,
        '--rot': `${shard.rot}deg`,
        transitionDelay: `${shard.delay}s`,
      }"
    />
  </div>
</template>

<style scoped>
.glass-shard {
  background: linear-gradient(135deg, rgba(255 255 255 / 0.05), rgba(255 255 255 / 0.16));
  backdrop-filter: blur(2px) saturate(1.1);
  -webkit-backdrop-filter: blur(2px) saturate(1.1);
  border: 1px solid rgba(255 255 255 / 0.12);
  transition:
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.7s ease;
  will-change: transform, opacity;
}

.glass-shard::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    rgba(255 255 255 / 0.55),
    transparent 32%
  );
  mix-blend-mode: overlay;
  pointer-events: none;
}

.glass-shard.is-shattered {
  transform: translate(var(--tx), var(--ty)) rotate(var(--rot));
  opacity: 0;
}
</style>
