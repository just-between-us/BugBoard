<script setup lang="ts">
import { computed } from 'vue'
import { Bug, FileText, MessageSquare } from '@lucide/vue'
import type { BugComment, BugWithProject, Report } from '@/stores/projects'
import { formatDate } from '@/lib/format'

interface Props {
  bugs: BugWithProject[]
  comments: BugComment[]
  reports: Report[]
  limit?: number
}

const props = withDefaults(defineProps<Props>(), { limit: 6 })

interface FeedItem {
  id: string
  kind: 'bug' | 'comment' | 'report'
  text: string
  at: string
}

const kindIcon = { bug: Bug, comment: MessageSquare, report: FileText }

const items = computed<FeedItem[]>(() => {
  const list: FeedItem[] = [
    ...props.bugs.map((b) => ({
      id: `bug-${b.id}`,
      kind: 'bug' as const,
      text: `Баг «${b.title}»`,
      at: b.created_at,
    })),
    ...props.comments.map((c) => ({
      id: `comment-${c.id}`,
      kind: 'comment' as const,
      text: `Комментарий: ${c.content}`,
      at: c.created_at,
    })),
    ...props.reports.map((r) => ({
      id: `report-${r.id}`,
      kind: 'report' as const,
      text: `Репорт «${r.title}»`,
      at: r.created_at,
    })),
  ]
  return list
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, props.limit)
})
</script>

<template>
  <div>
    <p class="mb-2 text-xs font-medium text-muted-foreground">Последние действия</p>

    <div
      v-if="items.length === 0"
      class="rounded-lg border border-dashed px-4 py-4 text-center text-xs text-muted-foreground"
    >
      Действий пока нет
    </div>

    <ul v-else class="feed-scroll max-h-28 space-y-2.5 overflow-y-auto">
      <li v-for="item in items" :key="item.id" class="flex gap-2.5 items-center">
        <component
          :is="kindIcon[item.kind]"
          class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm">{{ item.text }}</p>
          <p class="text-xs text-muted-foreground">{{ formatDate(item.at) }}</p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
@media (hover: none) {
  .feed-scroll {
    scrollbar-width: none;
  }

  .feed-scroll::-webkit-scrollbar {
    display: none;
  }
}

@media (hover: hover) and (pointer: fine) {
  .feed-scroll {
    scrollbar-width: thin;
    scrollbar-color: color-mix(in oklab, var(--muted-foreground) 50%, transparent) transparent;
  }

  .feed-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .feed-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .feed-scroll::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--muted-foreground) 50%, transparent);
    border-radius: 9999px;
  }

  .feed-scroll::-webkit-scrollbar-thumb:hover {
    background: color-mix(in oklab, var(--muted-foreground) 80%, transparent);
  }
}
</style>
