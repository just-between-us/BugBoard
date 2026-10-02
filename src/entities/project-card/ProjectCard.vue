<script setup lang="ts">
import { FolderKanban, Globe, Lock } from '@lucide/vue'
import type { Project } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { Avatar } from '@/components/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

interface Props {
  project: Project
}

const props = defineProps<Props>()

const authStore = useAuthStore()

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
</script>

<template>
  <RouterLink :to="{ name: 'project', params: { id: props.project.id } }" class="block">
    <Card class="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent>
        <div class="flex items-start justify-between gap-4">
          <div class="flex min-w-0 flex-1 items-start gap-4">
            <Avatar
              v-if="props.project.avatar_url"
              class="h-10 w-10 shrink-0 rounded-lg text-sm"
              :name="props.project.name"
              :src="props.project.avatar_url"
            />
            <div
              v-else
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            >
              <FolderKanban class="h-5 w-5" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <CardTitle class="min-w-0 truncate text-base font-medium">
                  {{ props.project.name }}
                </CardTitle>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <Button
                        variant="ghost"
                        size="icon"
                        class="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <Globe v-if="props.project.is_public" class="h-3.5 w-3.5" />
                        <Lock v-else class="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>
                        {{ props.project.is_public ? 'Публичный проект' : 'Приватный проект' }}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <CardDescription v-if="props.project.description" class="mt-1 line-clamp-2">
                {{ props.project.description }}
              </CardDescription>
              <div
                class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
              >
                <span>Создан: {{ formatDate(props.project.created_at) }}</span>
                <span
                  v-if="props.project.owner_id === authStore.user?.id"
                  class="font-mono text-primary"
                  >Вы владелец</span
                >
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </RouterLink>
</template>
