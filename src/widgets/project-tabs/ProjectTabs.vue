<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Bug, AlertTriangle, Users, Settings, ChartColumn } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { Badge } from '@/components/ui/badge'

type TabId = 'bugs' | 'reports' | 'members' | 'stats' | 'settings'

interface Props {
  activeTab: TabId
  onUpdateTab: (tab: TabId) => void
}

const props = defineProps<Props>()
const projectsStore = useProjectsStore()

const tabs = [
  { id: 'bugs', label: 'Баги', icon: Bug },
  { id: 'reports', label: 'Репорты', icon: AlertTriangle },
  { id: 'members', label: 'Участники', icon: Users },
  { id: 'stats', label: 'Статистика', icon: ChartColumn },
  { id: 'settings', label: 'Настройки', icon: Settings },
] as const

const scroller = ref<HTMLElement | null>(null)
const scrolledStart = ref(false)
const scrolledEnd = ref(false)

let observer: ResizeObserver | null = null

function updateEdges() {
  const el = scroller.value
  if (!el) return
  scrolledStart.value = el.scrollLeft > 0
  scrolledEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
}

onMounted(() => {
  updateEdges()
  window.addEventListener('resize', updateEdges)
  if (scroller.value && 'ResizeObserver' in window) {
    observer = new ResizeObserver(updateEdges)
    observer.observe(scroller.value)
    if (scroller.value.firstElementChild) observer.observe(scroller.value.firstElementChild)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateEdges)
  observer?.disconnect()
})
</script>

<template>
  <div class="border-b border-border">
    <div
      ref="scroller"
      class="tabs-scroller overflow-x-auto"
      :class="{ 'is-scrolled-start': scrolledStart, 'is-scrolled-end': scrolledEnd }"
      @scroll.passive="updateEdges"
    >
      <nav class="flex w-max gap-1" role="tablist">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            'flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            props.activeTab === tab.id
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted',
          ]"
          @click="props.onUpdateTab(tab.id)"
          role="tab"
          :aria-selected="props.activeTab === tab.id"
        >
          <component :is="tab.icon" class="h-4 w-4 shrink-0" />
          <span>{{ tab.label }}</span>
          <Badge
            v-if="tab.id === 'bugs' && projectsStore.bugs.length > 0"
            variant="secondary"
            class="ml-1"
          >
            {{ projectsStore.bugs.length }}
          </Badge>
        </button>
      </nav>
    </div>
  </div>
</template>

<style scoped>
@media (hover: none) {
  .tabs-scroller {
    scrollbar-width: none;
  }

  .tabs-scroller::-webkit-scrollbar {
    display: none;
  }

  .tabs-scroller.is-scrolled-start {
    -webkit-mask-image: linear-gradient(to right, transparent, black 16px);
    mask-image: linear-gradient(to right, transparent, black 16px);
  }

  .tabs-scroller.is-scrolled-end {
    -webkit-mask-image: linear-gradient(to left, transparent, black 16px);
    mask-image: linear-gradient(to left, transparent, black 16px);
  }

  .tabs-scroller.is-scrolled-start.is-scrolled-end {
    -webkit-mask-image: linear-gradient(
      to right,
      transparent,
      black 16px,
      black calc(100% - 16px),
      transparent
    );
    mask-image: linear-gradient(
      to right,
      transparent,
      black 16px,
      black calc(100% - 16px),
      transparent
    );
  }
}

@media (hover: hover) and (pointer: fine) {
  .tabs-scroller {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 50%, transparent) transparent;
  }

  .tabs-scroller::-webkit-scrollbar {
    height: 6px;
  }

  .tabs-scroller::-webkit-scrollbar-track {
    background: transparent;
  }

  .tabs-scroller::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--muted-foreground) 50%, transparent);
    border-radius: 9999px;
  }

  .tabs-scroller::-webkit-scrollbar-thumb:hover {
    background: color-mix(in oklab, var(--muted-foreground) 80%, transparent);
  }
}
</style>
