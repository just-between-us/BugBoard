<script setup lang="ts">
import { Globe, Lock, Settings, Trash2, MoreHorizontal, Camera, Loader2, Send } from '@lucide/vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/avatar'
import { CopyButton } from '@/components/copy-button'
import { toUserError } from '@/lib/format'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

const router = useRouter()
const route = useRoute()
const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const reportUrl = computed(() => {
  const projectId = projectsStore.currentProject?.id
  if (!projectId) return ''
  const { href } = router.resolve({ name: 'report', params: { projectId } })
  return new URL(href, window.location.origin).href
})

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isOwner() {
  return projectsStore.currentProject?.owner_id === authStore.user?.id
}

const canEditAvatar = ref(false)
const avatarInput = ref<HTMLInputElement | null>(null)
const uploadingAvatar = ref(false)
const avatarError = ref<string | null>(null)

function pickAvatar() {
  avatarInput.value?.click()
}

async function handleAvatarFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  uploadingAvatar.value = true
  avatarError.value = null
  try {
    await projectsStore.uploadProjectAvatar(route.params.id as string, file)
  } catch (e) {
    avatarError.value = toUserError(e)
  } finally {
    uploadingAvatar.value = false
  }
}

onMounted(async () => {
  canEditAvatar.value = await projectsStore.isProjectMember(route.params.id as string)
})

async function confirmDelete() {
  if (!confirm('Удалить проект? Это действие нельзя отменить.')) return
  alert('Удаление проекта будет реализовано позже')
}
</script>

<template>
  <div v-if="projectsStore.currentProject" class="mb-6">
    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
      <div class="flex-1 min-w-0">
        <div class="flex items-start gap-4 flex-wrap">
          <div class="relative h-12 w-12 shrink-0">
            <Avatar
              class="h-12 w-12 rounded-xl text-base"
              :name="projectsStore.currentProject.name"
              :src="projectsStore.currentProject.avatar_url"
            />
            <button
              v-if="canEditAvatar"
              type="button"
              class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
              :disabled="uploadingAvatar"
              :title="
                projectsStore.currentProject.avatar_url ? 'Сменить аватар' : 'Загрузить аватар'
              "
              @click="pickAvatar"
            >
              <Loader2 v-if="uploadingAvatar" class="h-3 w-3 animate-spin" />
              <Camera v-else class="h-3 w-3" />
            </button>
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarFile"
            />
          </div>
          <div class="min-w-0">
            <h1 class="text-2xl font-semibold tracking-tight truncate">
              {{ projectsStore.currentProject.name }}
            </h1>
            <p
              v-if="projectsStore.currentProject.description"
              class="mt-1 text-sm text-muted-foreground line-clamp-2"
            >
              {{ projectsStore.currentProject.description }}
            </p>
            <p v-if="avatarError" class="mt-1 text-xs text-severity-critical">
              {{ avatarError }}
            </p>
            <div
              class="mt-4 flex items-center justify-between flex-wrap gap-2 text-xs text-muted-foreground"
            >
              <span class="font-mono"> ID: {{ projectsStore.currentProject.id }} </span>
              <span> ● </span>
              <span>Создан: {{ formatDate(projectsStore.currentProject.created_at) }}</span>
            </div>
            <span v-if="isOwner()" class="font-mono text-primary text-xs">Вы владелец</span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 sm:ml-auto">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button variant="outline" size="sm" class="gap-1">
                <Globe v-if="projectsStore.currentProject.is_public" class="h-3.5 w-3.5" />
                <Lock v-else class="h-3.5 w-3.5" />
                <span>{{
                  projectsStore.currentProject.is_public ? 'Публичный' : 'Приватный'
                }}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <p>
                {{
                  projectsStore.currentProject.is_public
                    ? 'Принимает репорты по ссылке'
                    : 'Только для участников'
                }}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div v-if="projectsStore.currentProject.is_public" class="flex items-center gap-1">
          <Button variant="outline" size="sm" class="gap-1" as-child>
            <a :href="reportUrl" target="_blank" rel="noopener">
              <Send class="h-3.5 w-3.5" />
              Ссылка для репортёров
            </a>
          </Button>
          <CopyButton
            :text="reportUrl"
            label="Копировать ссылку для репортёров"
            feedback="Ссылка скопирована"
            icon-class="h-3.5 w-3.5 ml-2"
          />
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="ghost" size="icon" class="h-8 w-8">
                    <MoreHorizontal class="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" class="w-56">
                  <DropdownMenuItem
                    class="w-full"
                    @click="
                      router.push({
                        name: 'project',
                        params: { id: route.params.id },
                        query: { tab: 'settings' },
                      })
                    "
                  >
                    <Settings class="h-4 w-4 mr-2" />
                    Настройки
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem class="text-severity-critical w-full" @click="confirmDelete">
                    <Trash2 class="h-4 w-4 mr-2" />
                    Удалить проект
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <p>Дополнительные действия</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  </div>
</template>
