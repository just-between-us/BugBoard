<script setup lang="ts">
import { ref, watch } from 'vue'
import { Check, ChevronsUpDown, Loader2, UserRound } from '@lucide/vue'
import type { Bug } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import {
  AREA_VALUES,
  SEVERITY_BG,
  SEVERITY_VALUES,
  STATUS_VALUES,
  areaIcon,
  areaOptions,
  isOneOf,
  optionLabel,
  severityOptions,
  statusIcon,
  statusOptions,
} from '@/entities/bug'

interface Props {
  bug: Bug
  saving: boolean
  error: string | null
  savedFlash: boolean
  patch: (updates: Partial<Bug>) => Promise<boolean>
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const members = ref<{ user_id: string; name: string; role: string }[]>([])

watch(
  () => props.bug.project_id,
  async (projectId) => {
    members.value = []
    try {
      const list = await projectsStore.fetchProjectMembers(projectId)
      const fetched = await projectsStore.loadProfiles(list.map((m) => m.user_id))
      members.value = list.map((m) => ({
        user_id: m.user_id,
        name: fetched[m.user_id]?.display_name ?? 'Участник',
        role: m.role,
      }))
    } catch {
      members.value = []
    }
  },
  { immediate: true },
)

function onStatusChange(value: unknown) {
  if (isOneOf(value, STATUS_VALUES)) props.patch({ status: value })
}

function onSeverityChange(value: unknown) {
  if (isOneOf(value, SEVERITY_VALUES)) props.patch({ severity: value })
}

function onAreaChange(value: unknown) {
  if (isOneOf(value, AREA_VALUES)) props.patch({ area: value })
}

function changeAuthor(userId: string) {
  if (userId === props.bug.created_by || props.saving) return
  props.patch({ created_by: userId })
}
</script>

<template>
  <div class="space-y-6">
    <Card class="gap-4">
      <CardContent>
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-sm font-medium">Атрибуты</h2>
          <span v-if="saving" class="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Loader2 class="h-3 w-3 animate-spin" />
            Сохраняем…
          </span>
          <span v-else-if="savedFlash" class="text-xs text-emerald-600 dark:text-emerald-400">
            Сохранено
          </span>
        </div>

        <div class="mt-4 space-y-4">
          <div class="space-y-1.5">
            <Label>Статус</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                :disabled="saving"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <component :is="statusIcon(bug.status)" class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">
                    {{ optionLabel(statusOptions, bug.status) }}
                  </span>
                </span>
                <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="w-full">
                <DropdownMenuItem
                  v-for="opt in statusOptions"
                  :key="opt.value"
                  :disabled="saving"
                  @click="onStatusChange(opt.value)"
                >
                  <Check v-if="bug.status === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                  <span v-else class="mr-2 h-4 w-4 shrink-0" />
                  <span class="truncate">{{ opt.label }}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="space-y-1.5">
            <Label>Важность</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                :disabled="saving"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span
                    class="h-2.5 w-2.5 shrink-0 rounded-full"
                    :class="SEVERITY_BG[bug.severity] ?? 'bg-muted'"
                  />
                  <span class="truncate">
                    {{ optionLabel(severityOptions, bug.severity) }}
                  </span>
                </span>
                <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="w-56">
                <DropdownMenuItem
                  v-for="opt in severityOptions"
                  :key="opt.value"
                  :disabled="saving"
                  @click="onSeverityChange(opt.value)"
                >
                  <Check v-if="bug.severity === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                  <span v-else class="mr-2 h-4 w-4 shrink-0" />
                  <span class="truncate">{{ opt.label }}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="space-y-1.5">
            <Label>Область</Label>
            <DropdownMenu>
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                :disabled="saving"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <component :is="areaIcon(bug.area)" class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">
                    {{ optionLabel(areaOptions, bug.area) }}
                  </span>
                </span>
                <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="w-56">
                <DropdownMenuItem
                  v-for="opt in areaOptions"
                  :key="opt.value"
                  :disabled="saving"
                  @click="onAreaChange(opt.value)"
                >
                  <Check v-if="bug.area === opt.value" class="mr-2 h-4 w-4 shrink-0" />
                  <span v-else class="mr-2 h-4 w-4 shrink-0" />
                  <span class="truncate">{{ opt.label }}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div class="space-y-1.5">
            <Label>Автор</Label>
            <DropdownMenu v-if="members.length > 0">
              <DropdownMenuTrigger
                :class="cn(buttonVariants({ variant: 'outline' }), 'w-full justify-between')"
                :disabled="saving"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <UserRound class="h-3.5 w-3.5 shrink-0" />
                  <span class="truncate">{{ projectsStore.profileName(bug.created_by) }}</span>
                </span>
                <ChevronsUpDown class="h-3.5 w-3.5 shrink-0 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" class="max-h-72 w-64 overflow-y-auto">
                <DropdownMenuItem
                  v-for="member in members"
                  :key="member.user_id"
                  :disabled="saving"
                  @click="changeAuthor(member.user_id)"
                >
                  <Check v-if="bug.created_by === member.user_id" class="mr-2 h-4 w-4 shrink-0" />
                  <span v-else class="mr-2 h-4 w-4 shrink-0" />
                  <span class="truncate">{{ member.name }}</span>
                  <span
                    v-if="member.user_id === authStore.user?.id"
                    class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground"
                  >
                    вы
                  </span>
                  <span
                    v-else-if="member.role === 'owner'"
                    class="ml-auto shrink-0 pl-2 text-xs text-muted-foreground"
                  >
                    владелец
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div
              v-else
              class="flex h-9 items-center gap-2 rounded-md border border-dashed px-3 text-sm text-muted-foreground"
            >
              <UserRound class="h-3.5 w-3.5 shrink-0" />
              <span class="truncate">{{ projectsStore.profileName(bug.created_by) }}</span>
            </div>
          </div>
        </div>

        <p v-if="error" class="mt-3 text-xs text-severity-critical">
          {{ error }}
        </p>
      </CardContent>
    </Card>

    <Card class="gap-4">
      <CardContent>
        <h2 class="text-sm font-medium">Детали</h2>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex items-start justify-between gap-3">
            <dt class="text-muted-foreground">Создан</dt>
            <dd class="text-right">{{ formatDate(bug.created_at) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="text-muted-foreground">Обновлён</dt>
            <dd class="text-right">{{ formatDate(bug.updated_at) }}</dd>
          </div>
          <div class="flex items-start justify-between gap-3">
            <dt class="text-muted-foreground">ID</dt>
            <dd class="break-all text-right font-mono text-xs">{{ bug.id }}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  </div>
</template>
