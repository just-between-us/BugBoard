<script setup lang="ts">
import { ref } from 'vue'
import { Plus, FolderKanban, Globe, Lock, Loader2 } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const isDialogOpen = ref(false)
const submitting = ref(false)
const formError = ref('')

const form = ref({
  name: '',
  description: '',
  is_public: false,
})

async function handleCreateProject() {
  if (!form.value.name.trim()) {
    formError.value = 'Название проекта обязательно'
    return
  }

  submitting.value = true
  formError.value = ''

  try {
    await projectsStore.createProject({
      name: form.value.name.trim(),
      description: form.value.description.trim() || undefined,
      is_public: form.value.is_public,
    })
    isDialogOpen.value = false
    form.value = { name: '', description: '', is_public: false }
  } catch {
    formError.value = projectsStore.error ?? 'Не удалось создать проект'
  } finally {
    submitting.value = false
  }
}

function openDialog() {
  formError.value = ''
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
  form.value = { name: '', description: '', is_public: false }
  formError.value = ''
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const skeletonItems = [1, 2, 3, 4]
</script>

<template>
  <div class="mx-auto max-w-4xl px-6 py-10">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Проекты</h1>
        <p class="mt-1 text-sm text-muted-foreground">Управляйте проектами и приглашайте команду</p>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button @click="openDialog">
              <Plus class="h-4 w-4" />
              <span>Создать проект</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" align="center">
            <p>Создать новый проект</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>

    <!-- Error State -->
    <div
      v-if="projectsStore.error && !projectsStore.loading"
      class="mb-6 rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex items-center gap-3 text-sm text-severity-critical">
        <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>{{ projectsStore.error }}</span>
        <Button variant="ghost" size="sm" @click="projectsStore.fetchProjects"> Повторить </Button>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div
      v-else-if="projectsStore.loading"
      class="space-y-4"
      role="status"
      aria-label="Загрузка проектов"
    >
      <div v-for="i in skeletonItems" :key="i" class="animate-pulse">
        <Card>
          <CardContent class="p-6">
            <div class="flex items-start gap-4">
              <div class="h-10 w-10 shrink-0 rounded-lg bg-muted" />
              <div class="flex-1 space-y-3">
                <div class="h-5 w-3/4 bg-muted rounded" />
                <div class="h-4 w-1/2 bg-muted rounded" />
                <div class="flex items-center gap-3">
                  <div class="h-5 w-16 bg-muted rounded-full" />
                  <div class="h-5 w-16 bg-muted rounded-full" />
                  <div class="h-5 w-20 bg-muted rounded-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else-if="!projectsStore.hasProjects" class="text-center py-16">
      <div class="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FolderKanban class="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 class="text-lg font-medium">Пока нет проектов</h2>
      <p class="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
        Создайте свой первый проект, чтобы начать отслеживать баги и принимать репорты от
        пользователей.
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button @click="openDialog" size="lg">
                <Plus class="h-4 w-4 mr-2" />
                Создать первый проект
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" align="center">
              <p>Создать новый проект</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>

    <!-- Projects List -->
    <div v-else class="space-y-4">
      <RouterLink
        v-for="project in projectsStore.projects"
        :key="project.id"
        :to="{ name: 'project', params: { id: project.id } }"
        class="block"
      >
        <Card class="overflow-hidden transition-shadow hover:shadow-md">
          <CardContent>
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4 min-w-0 flex-1">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                >
                  <FolderKanban class="h-5 w-5" />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <CardTitle class="text-base font-medium truncate">{{ project.name }}</CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger as-child>
                          <Button
                            variant="ghost"
                            size="icon"
                            class="h-6 w-6 text-muted-foreground hover:text-foreground"
                          >
                            <Globe v-if="project.is_public" class="h-3.5 w-3.5" />
                            <Lock v-else class="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                          <p>{{ project.is_public ? 'Публичный проект' : 'Приватный проект' }}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <CardDescription v-if="project.description" class="mt-1 line-clamp-2">{{
                    project.description
                  }}</CardDescription>
                  <div class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Создан: {{ formatDate(project.created_at) }}</span>
                    <span
                      v-if="project.owner_id === authStore.user?.id"
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
    </div>

    <!-- Create Project Dialog -->
    <Dialog v-model:open="isDialogOpen">
      <DialogContent class="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Новый проект</DialogTitle>
          <DialogDescription>
            Заполните название и описание. Публичные проекты принимают репорты по ссылке.
          </DialogDescription>
        </DialogHeader>
        <DialogClose class="text-muted-foreground hover:text-foreground">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </DialogClose>

        <form @submit.prevent="handleCreateProject" class="space-y-4">
          <div class="space-y-1.5">
            <Label for="project-name">Название *</Label>
            <Input
              id="project-name"
              v-model="form.name"
              placeholder="Например: auth-service"
              maxlength="100"
              :disabled="submitting"
              autocomplete="off"
            />
          </div>

          <div class="space-y-1.5">
            <Label for="project-description">Описание</Label>
            <Textarea
              id="project-description"
              v-model="form.description"
              placeholder="Краткое описание проекта..."
              maxlength="500"
              :rows="3"
              :disabled="submitting"
            />
          </div>

          <div class="flex items-center gap-2">
            <input
              type="checkbox"
              id="project-public"
              v-model="form.is_public"
              class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              :disabled="submitting"
            />
            <Label for="project-public" class="text-sm cursor-pointer">
              Публичный проект (принимать репорты по ссылке)
            </Label>
          </div>

          <p v-if="formError" class="text-sm text-severity-critical">{{ formError }}</p>

          <DialogFooter>
            <Button type="button" variant="ghost" @click="closeDialog" :disabled="submitting">
              Отмена
            </Button>
            <Button type="submit" :disabled="submitting || !form.name.trim()">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin mr-2" />
              {{ submitting ? 'Создаём…' : 'Создать проект' }}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
