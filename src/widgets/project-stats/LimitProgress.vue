<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Pencil } from '@lucide/vue'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { mixHex, REPORTS_PROGRESS_MAX, REPORTS_PROGRESS_MIN } from './chart-colors'

interface Props {
  count: number
  /** Единица после числа (уже склонённая): «репортов», «людей» … */
  unit: string
  /** Ключ localStorage для предела (уникален на проект/метрику) */
  storageKey: string
  defaultLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  defaultLimit: 20,
})

const limit = ref(props.defaultLimit)
const draft = ref(String(props.defaultLimit))
const editing = ref(false)
const inputRef = ref<InstanceType<typeof Input> | null>(null)

function loadLimit() {
  try {
    const stored = Number(localStorage.getItem(props.storageKey))
    limit.value = Number.isFinite(stored) && stored > 0 ? Math.round(stored) : props.defaultLimit
  } catch {
    limit.value = props.defaultLimit
  }
}

watch(() => props.storageKey, loadLimit, { immediate: true })

function startEdit() {
  draft.value = String(limit.value)
  editing.value = true
  void nextTick(() => {
    const input = inputRef.value?.$el
    if (input instanceof HTMLInputElement) input.select()
  })
}

function commit() {
  const next = Math.round(Number(draft.value))
  if (Number.isFinite(next) && next > 0) {
    limit.value = next
    try {
      localStorage.setItem(props.storageKey, String(next))
    } catch {
      // localStorage может быть недоступен (private mode) — просто не сохраняем
    }
  }
  editing.value = false
}

function cancel() {
  editing.value = false
}

const ratio = computed(() => (limit.value > 0 ? Math.min(props.count / limit.value, 1) : 1))
const percent = computed(() => Math.round(ratio.value * 100))
const barColor = computed(() => mixHex(REPORTS_PROGRESS_MIN, REPORTS_PROGRESS_MAX, ratio.value))
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <div class="flex items-baseline gap-1.5">
        <span class="text-3xl leading-none font-bold tabular-nums">{{ props.count }}</span>
        <span class="text-sm text-muted-foreground">{{ props.unit }}</span>
      </div>

      <div class="flex items-baseline gap-1.5 text-sm text-muted-foreground">
        <span>из</span>
        <button
          v-if="!editing"
          type="button"
          class="flex cursor-pointer items-center gap-1 rounded-md border border-dashed px-2 py-0.5 font-semibold tabular-nums text-foreground transition-colors hover:bg-muted"
          title="Кликните, чтобы изменить предел"
          @click="startEdit"
        >
          {{ limit }}
          <Pencil class="h-3 w-3 text-muted-foreground" aria-hidden="true" />
        </button>
        <Input
          v-else
          ref="inputRef"
          v-model="draft"
          type="number"
          min="1"
          step="1"
          class="h-7 w-20 px-2 text-right text-sm"
          aria-label="Предел"
          @blur="commit"
          @keydown.enter.prevent="commit"
          @keydown.esc="cancel"
        />
      </div>
    </div>

    <Progress
      :model-value="percent"
      class="bg-muted [&_[data-slot=progress-indicator]]:bg-[var(--progress-fill)]"
      :style="{ '--progress-fill': barColor }"
    />

    <p class="text-xs text-muted-foreground">{{ percent }}% от предела · предел правится кликом</p>
  </div>
</template>
