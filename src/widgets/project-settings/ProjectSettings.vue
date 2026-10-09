<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Camera, ExternalLink, Loader2, Trash2 } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useProjectsStore } from '@/stores/projects'
import { useActiveProjectStore } from '@/stores/activeProject'
import { toUserError } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar } from '@/components/avatar'
import { CopyButton } from '@/components/copy-button'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const router = useRouter()
const projectsStore = useProjectsStore()
const activeProjectStore = useActiveProjectStore()

const project = computed(() => projectsStore.currentProject)

const name = ref('')
const description = ref('')
const savingMain = ref(false)
const mainSaved = ref(false)
const mainError = ref('')

const avatarInput = ref<HTMLInputElement | null>(null)
const avatarUploading = ref(false)
const avatarRemoving = ref(false)
const avatarSaved = ref(false)
const avatarError = ref('')

const isPublic = ref(false)
const savingVisibility = ref(false)
const visibilitySaved = ref(false)
const visibilityError = ref('')

const DELETE_DELAY_MS = 10_000

const deleting = ref(false)
const deleteError = ref('')
const deleteCountdownEndsAt = ref<number | null>(null)
const now = ref(Date.now())
let deleteTimer: ReturnType<typeof setInterval> | null = null

const deleteCountdownActive = computed(() => deleteCountdownEndsAt.value !== null)

const deleteSecondsLeft = computed(() => {
  if (deleteCountdownEndsAt.value === null) return 0
  return Math.max(0, Math.ceil((deleteCountdownEndsAt.value - now.value) / 1000))
})

const deleteProgress = computed(() => {
  if (deleteCountdownEndsAt.value === null) return 0
  const left = deleteCountdownEndsAt.value - now.value
  return Math.max(0, Math.min(100, (left / DELETE_DELAY_MS) * 100))
})

function stopDeleteCountdownTimer() {
  if (deleteTimer !== null) {
    clearInterval(deleteTimer)
    deleteTimer = null
  }
}

function cancelDeleteCountdown() {
  stopDeleteCountdownTimer()
  deleteCountdownEndsAt.value = null
}

onBeforeUnmount(stopDeleteCountdownTimer)

let initializedFor: string | null = null

watch(
  () => props.projectId,
  () => {
    initializedFor = null
  },
)

watch(
  project,
  (p) => {
    if (!p || p.id !== props.projectId || initializedFor === p.id) return
    initializedFor = p.id
    name.value = p.name
    description.value = p.description ?? ''
    isPublic.value = p.is_public
    mainSaved.value = false
    mainError.value = ''
    visibilitySaved.value = false
    visibilityError.value = ''
    cancelDeleteCountdown()
    deleteError.value = ''
  },
  { immediate: true },
)

const mainDirty = computed(() => {
  const p = project.value
  if (!p) return false
  return name.value.trim() !== p.name || description.value.trim() !== (p.description ?? '')
})

const reportUrl = computed(() => {
  const { href } = router.resolve({ name: 'report', params: { projectId: props.projectId } })
  return new URL(href, window.location.origin).href
})

async function saveMain() {
  const p = project.value
  if (!p) return

  const trimmedName = name.value.trim()
  if (!trimmedName) {
    mainError.value = 'Название проекта обязательно'
    return
  }

  savingMain.value = true
  mainError.value = ''
  mainSaved.value = false
  try {
    await projectsStore.updateProject(p.id, {
      name: trimmedName,
      description: description.value.trim() || null,
    })
    mainSaved.value = true
  } catch (e) {
    mainError.value = toUserError(e)
  } finally {
    savingMain.value = false
  }
}

function pickAvatar() {
  avatarInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  avatarUploading.value = true
  avatarSaved.value = false
  avatarError.value = ''
  try {
    await projectsStore.uploadProjectAvatar(props.projectId, file)
    avatarSaved.value = true
  } catch (e) {
    avatarError.value = toUserError(e)
  } finally {
    avatarUploading.value = false
  }
}

async function removeAvatar() {
  avatarRemoving.value = true
  avatarSaved.value = false
  avatarError.value = ''
  try {
    await projectsStore.removeProjectAvatar(props.projectId)
    avatarSaved.value = true
  } catch (e) {
    avatarError.value = toUserError(e)
  } finally {
    avatarRemoving.value = false
  }
}

async function saveVisibility() {
  const p = project.value
  if (!p) return

  savingVisibility.value = true
  visibilityError.value = ''
  visibilitySaved.value = false
  try {
    await projectsStore.updateProject(p.id, { is_public: isPublic.value })
    visibilitySaved.value = true
  } catch (e) {
    visibilityError.value = toUserError(e)
  } finally {
    savingVisibility.value = false
  }
}

function startDeleteCountdown() {
  deleteError.value = ''
  now.value = Date.now()
  deleteCountdownEndsAt.value = now.value + DELETE_DELAY_MS
  stopDeleteCountdownTimer()
  deleteTimer = setInterval(() => {
    now.value = Date.now()
    if (deleteCountdownEndsAt.value !== null && now.value >= deleteCountdownEndsAt.value) {
      stopDeleteCountdownTimer()
      deleteCountdownEndsAt.value = null
      void handleDelete()
    }
  }, 100)
}

async function handleDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await projectsStore.deleteProject(props.projectId)
    if (activeProjectStore.activeProjectId === props.projectId) {
      activeProjectStore.setActiveProject(null)
    }
    router.push({ name: 'projects' })
  } catch (e) {
    deleteError.value = toUserError(e)
    deleting.value = false
  }
}
</script>

<template>
  <div v-if="project && project.id === projectId" class="space-y-4 pb-8">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">Основное</CardTitle>
        <CardDescription>Название и описание проекта</CardDescription>
        <CardAction class="sm:self-center">
          <div class="hidden items-center gap-2 sm:flex">
            <p v-if="mainSaved" class="text-sm text-muted-foreground">Сохранено</p>
            <Button :disabled="savingMain || !name.trim() || !mainDirty" @click="saveMain">
              <Loader2 v-if="savingMain" class="h-4 w-4 animate-spin" />
              {{ savingMain ? 'Сохраняем…' : 'Сохранить' }}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-1.5">
          <Label for="settings-project-name">Название *</Label>
          <Input
            id="settings-project-name"
            v-model="name"
            maxlength="100"
            autocomplete="off"
            :disabled="savingMain"
          />
        </div>
        <div class="space-y-1.5">
          <Label for="settings-project-description">Описание</Label>
          <Textarea
            id="settings-project-description"
            v-model="description"
            placeholder="Краткое описание проекта..."
            maxlength="500"
            :rows="3"
            :disabled="savingMain"
          />
        </div>
        <div class="flex flex-col gap-2 sm:hidden">
          <Button
            class="w-full"
            :disabled="savingMain || !name.trim() || !mainDirty"
            @click="saveMain"
          >
            <Loader2 v-if="savingMain" class="h-4 w-4 animate-spin" />
            {{ savingMain ? 'Сохраняем…' : 'Сохранить' }}
          </Button>
          <p v-if="mainSaved" class="text-sm text-muted-foreground">Сохранено</p>
        </div>
        <p v-if="mainError" class="text-sm text-severity-critical">{{ mainError }}</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Аватар</CardTitle>
        <CardDescription>JPG, PNG или WebP, ≤ 2 МБ — как в шапке проекта и списках</CardDescription>
      </CardHeader>
      <CardContent>
        <div class="flex items-center gap-4">
          <Avatar class="h-16 w-16 text-xl" :name="project.name" :src="project.avatar_url" />
          <div class="space-y-1.5">
            <input
              ref="avatarInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="hidden"
              @change="handleAvatarChange"
            />
            <div class="flex flex-wrap gap-2">
              <Button
                variant="outline"
                :disabled="avatarUploading || avatarRemoving"
                @click="pickAvatar"
              >
                <Loader2 v-if="avatarUploading" class="h-4 w-4 animate-spin" />
                <Camera v-else class="h-4 w-4" />
                {{ avatarUploading ? 'Загружаем…' : 'Загрузить' }}
              </Button>
              <Button
                v-if="project.avatar_url"
                variant="outline"
                :disabled="avatarUploading || avatarRemoving"
                @click="removeAvatar"
              >
                <Loader2 v-if="avatarRemoving" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4" />
                {{ avatarRemoving ? 'Удаляем…' : 'Удалить' }}
              </Button>
            </div>
            <p class="text-xs text-muted-foreground">
              Показывается в списках проектов и в шапке проекта
            </p>
          </div>
        </div>
        <p v-if="avatarError" class="mt-3 text-sm text-severity-critical">{{ avatarError }}</p>
        <p v-else-if="avatarSaved" class="mt-3 text-sm text-muted-foreground">Сохранено</p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Видимость</CardTitle>
        <CardDescription>
          Публичный проект принимает репорты по ссылке, приватный — только от участников
        </CardDescription>
        <CardAction class="sm:self-center">
          <div class="hidden items-center gap-2 sm:flex">
            <p v-if="visibilitySaved" class="text-sm text-muted-foreground">Сохранено</p>
            <Button
              :disabled="savingVisibility || isPublic === project.is_public"
              @click="saveVisibility"
            >
              <Loader2 v-if="savingVisibility" class="h-4 w-4 animate-spin" />
              {{ savingVisibility ? 'Сохраняем…' : 'Сохранить' }}
            </Button>
          </div>
        </CardAction>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex gap-4 flex-col sm:flex-row justify-between">
          <div class="flex items-center gap-2">
            <Checkbox
              id="settings-project-public"
              v-model="isPublic"
              :disabled="savingVisibility"
            />
            <Label for="settings-project-public" class="cursor-pointer text-sm">
              Публичный проект
            </Label>
          </div>

          <div v-if="isPublic" class="flex items-center gap-1">
            <Button variant="outline" size="sm" class="gap-1" as-child>
              <a :href="reportUrl" target="_blank" rel="noopener">
                <ExternalLink class="h-3.5 w-3.5" />
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
        </div>

        <p class="text-xs text-muted-foreground">
          {{
            isPublic
              ? 'У всех, кому выдали ссылку, по ней всё ещё откроется страница репорта'
              : 'После перехода в приватный режим ссылка для репортёров перестанет работать'
          }}
        </p>

        <div class="flex flex-col gap-2 sm:hidden">
          <Button
            class="w-full"
            :disabled="savingVisibility || isPublic === project.is_public"
            @click="saveVisibility"
          >
            <Loader2 v-if="savingVisibility" class="h-4 w-4 animate-spin" />
            {{ savingVisibility ? 'Сохраняем…' : 'Сохранить' }}
          </Button>
          <p v-if="visibilitySaved" class="text-sm text-muted-foreground">Сохранено</p>
        </div>
        <p v-if="visibilityError" class="text-sm text-severity-critical">{{ visibilityError }}</p>
      </CardContent>
    </Card>

    <Card class="border-severity-critical/30">
      <CardHeader>
        <CardTitle class="text-base text-severity-critical">Опасная зона</CardTitle>
        <CardDescription>
          Проект скрывается из списков, участники теряют к нему доступ
        </CardDescription>
        <CardAction class="sm:self-center">
          <div class="hidden items-center gap-2 sm:flex">
            <template v-if="!deleteCountdownActive && !deleting">
              <Button
                variant="outline"
                class="border-severity-critical/30 text-severity-critical hover:bg-severity-critical/5"
                @click="startDeleteCountdown"
              >
                <Trash2 class="h-4 w-4" />
                Удалить проект
              </Button>
            </template>
            <template v-else-if="deleteCountdownActive">
              <p class="text-sm text-severity-critical">Удаление через {{ deleteSecondsLeft }} с</p>
              <Button variant="ghost" size="sm" @click="cancelDeleteCountdown">Отмена</Button>
            </template>
            <template v-else>
              <Button variant="destructive" size="sm" disabled>
                <Loader2 class="h-4 w-4 animate-spin" />
                Удаляем…
              </Button>
            </template>
          </div>
        </CardAction>
      </CardHeader>

      <!-- Мобильная версия опасной зоны -->
      <CardContent class="space-y-3 sm:hidden">
        <div class="flex justify-end">
          <Button
            v-if="!deleteCountdownActive && !deleting"
            variant="outline"
            class="border-severity-critical/30 text-severity-critical hover:bg-severity-critical/5"
            @click="startDeleteCountdown"
          >
            <Trash2 class="h-4 w-4" />
            Удалить проект
          </Button>
        </div>

        <div v-if="deleteCountdownActive" class="flex items-center justify-end gap-2">
          <p class="text-sm text-severity-critical">Удаление через {{ deleteSecondsLeft }} с</p>
          <Progress
            :model-value="deleteProgress"
            class="h-1.5 w-20 shrink-0 bg-muted **:data-[slot=progress-indicator]:bg-severity-critical"
          />
          <Button variant="ghost" size="sm" @click="cancelDeleteCountdown">Отмена</Button>
        </div>

        <div v-else-if="deleting" class="flex items-center justify-end">
          <Button variant="destructive" size="sm" disabled>
            <Loader2 class="h-4 w-4 animate-spin" />
            Удаляем…
          </Button>
        </div>

        <p v-if="deleteError" class="text-sm text-severity-critical">{{ deleteError }}</p>
      </CardContent>

      <!-- Десктоп: прогресс на всю ширину внизу + ошибка -->
      <CardContent v-if="deleteCountdownActive || deleteError" class="hidden space-y-3 sm:block">
        <Progress
          v-if="deleteCountdownActive"
          :model-value="deleteProgress"
          class="h-1.5 w-full bg-muted **:data-[slot=progress-indicator]:bg-severity-critical"
        />
        <p v-if="deleteError" class="text-sm text-severity-critical">{{ deleteError }}</p>
      </CardContent>
    </Card>
  </div>
</template>
