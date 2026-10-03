<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import { Check, Copy } from '@lucide/vue'

const props = withDefaults(
  defineProps<{
    text: string
    label?: string
    feedback?: string
    iconClass?: string
    compact?: boolean
  }>(),
  {
    label: 'Копировать',
    feedback: 'Скопировано',
    iconClass: 'h-3 w-3',
  },
)

const isMobile = useMediaQuery('(max-width: 640px)')
const compactMode = computed(() => props.compact ?? isMobile.value)

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

function fallbackCopy(text: string) {
  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.opacity = '0'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    fallbackCopy(props.text)
  }
  copied.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
  }, 1500)
}

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>

<template>
  <span class="relative inline-flex">
    <button
      type="button"
      class="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground transition-colors duration-300 ease-out hover:text-foreground"
      :class="compactMode && copied ? 'bg-emerald-500/15' : ''"
      :title="label"
      :aria-label="label"
      @click="copy"
    >
      <Transition name="copy-icon" mode="out-in">
        <Check
          v-if="compactMode && copied"
          :class="[iconClass, 'text-emerald-600 dark:text-emerald-400']"
        />
        <Copy v-else :class="iconClass" />
      </Transition>
    </button>
    <Transition name="copy-feedback">
      <span
        v-if="copied && !compactMode"
        class="absolute bottom-full left-1/2 z-10 mb-1.5 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded bg-green-600 px-2 py-0.5 text-xs text-white shadow-sm"
      >
        {{ feedback }} <Check :class="iconClass" />
      </span>
    </Transition>
  </span>
</template>

<style scoped>
.copy-feedback-enter-active {
  transition:
    opacity 0.15s ease-out,
    transform 0.15s ease-out;
}
.copy-feedback-leave-active {
  transition:
    opacity 0.1s ease-in,
    transform 0.1s ease-in;
}
.copy-feedback-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.copy-feedback-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
.copy-icon-enter-active {
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}
.copy-icon-leave-active {
  transition:
    opacity 0.1s ease-in,
    transform 0.1s ease-in;
}
.copy-icon-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.copy-icon-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>
