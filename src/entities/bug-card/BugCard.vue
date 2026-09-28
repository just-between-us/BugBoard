<script setup lang="ts">
import { ref } from 'vue'
import {
  Database,
  Monitor,
  Shield,
  Server,
  Activity,
  HelpCircle,
  Edit,
  Trash2,
  MoreHorizontal,
  Copy,
  Check,
  CheckCircle,
  Eye,
  Loader2,
  Pin,
} from '@lucide/vue'
import type { Bug } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface Props {
  bug: Bug
}

const props = defineProps<Props>()

const copyFeedbackId = ref<string | null>(null)

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copyFeedbackId.value = text
  setTimeout(() => {
    if (copyFeedbackId.value === text) {
      copyFeedbackId.value = null
    }
  }, 1500)
}

function getSeverityDot(severity: string) {
  const colors: Record<string, string> = {
    critical: 'bg-severity-critical text-white',
    major: 'bg-severity-major text-white',
    minor: 'bg-severity-minor text-white',
  }
  return colors[severity] ?? 'bg-muted'
}

function getStatusBadge(status: string) {
  const colors: Record<string, string> = {
    discovered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    fixed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }
  return colors[status] ?? 'bg-muted text-muted-foreground'
}

function getStatusIcon(status: string) {
  const icons: Record<string, typeof Eye> = {
    discovered: Eye,
    confirmed: Pin,
    in_progress: Loader2,
    fixed: CheckCircle,
  }
  return icons[status] ?? HelpCircle
}

function getAreaIcon(area: string) {
  const icons: Record<string, typeof Database> = {
    database: Database,
    ui: Monitor,
    auth: Shield,
    api: Server,
    performance: Activity,
    other: HelpCircle,
  }
  return icons[area] ?? HelpCircle
}

function getAreaLabel(area: string) {
  const labels: Record<string, string> = {
    database: 'База данных',
    ui: 'UI/Фронтенд',
    auth: 'Авторизация',
    api: 'API/Бэкенд',
    performance: 'Производительность',
    other: 'Другое',
  }
  return labels[area] ?? area
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    discovered: 'Обнаружен',
    confirmed: 'Подтверждён',
    in_progress: 'В работе',
    fixed: 'Исправлен',
  }
  return labels[status] ?? status
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isNewBug(createdAt: string) {
  const created = new Date(createdAt).getTime()
  const now = Date.now()
  const diffHours = (now - created) / (1000 * 60 * 60)
  return diffHours < 24
}
</script>

<template>
  <Card class="overflow-hidden transition-shadow hover:shadow-sm">
    <CardContent>
      <div class="flex items-start gap-3">
        <div
          class="h-8 w-8 shrink-0 rounded-lg flex items-center justify-center"
          :class="getSeverityDot(props.bug.severity)"
        >
          <component :is="getAreaIcon(props.bug.area)" class="h-4 w-4 text-white" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-start justify-between gap-4 pb-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <h4 class="font-medium truncate">{{ props.bug.title }}</h4>
                <Badge
                  v-if="isNewBug(props.bug.created_at)"
                  class="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs"
                >
                  Новый
                </Badge>
              </div>
              <p
                v-if="props.bug.description"
                class="mt-1 text-sm text-muted-foreground line-clamp-2"
              >
                {{ props.bug.description }}
              </p>
            </div>
            <Badge
              :class="getStatusBadge(props.bug.status)"
              class="text-xs gap-1 flex items-center"
            >
              <component
                :is="getStatusIcon(props.bug.status)"
                class="h-3 w-3"
                :class="{
                  'animate-spin': props.bug.status === 'in_progress',
                  'animate-eye-look': props.bug.status === 'discovered',
                }"
              />
              {{ getStatusLabel(props.bug.status) }}
            </Badge>
          </div>
          <div
            class="mt-2 flex flex-col justify-between flex-wrap gap-2 text-xs text-muted-foreground"
          >
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-mono inline-flex items-center gap-1">
                {{ props.bug.id }}
                <span class="relative inline-flex">
                  <button
                    class="inline-flex items-center justify-center rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                    @click="copyToClipboard(props.bug.id)"
                    title="Копировать ID"
                  >
                    <Copy class="h-3 w-3" />
                  </button>
                  <Transition name="copy-feedback">
                    <span
                      v-if="copyFeedbackId === props.bug.id"
                      class="absolute flex items-center gap-1 bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 whitespace-nowrap rounded bg-green-600 px-2 py-0.5 text-xs text-white shadow-sm"
                    >
                      Скопировано <Check class="w-4" />
                    </span>
                  </Transition>
                </span>
              </span>
            </div>
            <div class="flex justify-between">
              <span class="flex items-center gap-3">
                <span>Создан: {{ formatDate(props.bug.created_at) }}</span>
                <span class="font-medium text-foreground">{{ getAreaLabel(props.bug.area) }}</span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-6 w-6 text-muted-foreground hover:text-foreground p-1"
                        >
                          <MoreHorizontal class="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" class="w-48">
                        <DropdownMenuItem class="w-full">
                          <Edit class="h-4 w-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem class="text-severity-critical w-full">
                          <Trash2 class="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="center">
                    <p>Действия с багом</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
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

@keyframes eye-look {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(-15deg);
  }
  75% {
    transform: rotate(15deg);
  }
}

.animate-eye-look {
  animation: eye-look 3s ease-in-out infinite;
  transform-origin: center;
}
</style>
