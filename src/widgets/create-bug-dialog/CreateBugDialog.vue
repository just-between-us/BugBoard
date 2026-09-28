<script setup lang="ts">
import { ref } from 'vue'
import { Loader2 } from '@lucide/vue'
import { useProjectsStore } from '@/stores/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateBugInput) => void
  submitting: boolean
  projectId: string
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()

const bugForm = ref({
  title: '',
  description: '',
  status: 'discovered' as const,
  area: 'other' as const,
  severity: 'minor' as const,
})

const bugFormError = ref('')

const statusOptions = [
  { value: 'discovered', label: 'Обнаружен', color: 'default' },
  { value: 'confirmed', label: 'Подтверждён', color: 'secondary' },
  { value: 'in_progress', label: 'В работе', color: 'outline' },
  { value: 'fixed', label: 'Исправлен', color: 'default' },
] as const

const areaOptions = [
  { value: 'database', label: 'База данных' },
  { value: 'ui', label: 'UI/Фронтенд' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'api', label: 'API/Бэкенд' },
  { value: 'performance', label: 'Производительность' },
  { value: 'other', label: 'Другое' },
] as const

const severityOptions = [
  { value: 'critical', label: 'Критический', color: 'destructive' },
  { value: 'major', label: 'Мажорный', color: 'default' },
  { value: 'minor', label: 'Минорный', color: 'secondary' },
] as const

interface CreateBugInput {
  project_id: string
  title: string
  description?: string
  status: 'discovered' | 'confirmed' | 'in_progress' | 'fixed'
  area: 'database' | 'ui' | 'auth' | 'api' | 'performance' | 'other'
  severity: 'critical' | 'major' | 'minor'
}

async function handleSubmit() {
  if (!bugForm.value.title.trim()) {
    bugFormError.value = 'Название бага обязательно'
    return
  }

  bugFormError.value = ''

  try {
    await props.onSubmit({
      project_id: props.projectId,
      title: bugForm.value.title.trim(),
      description: bugForm.value.description.trim() || undefined,
      status: bugForm.value.status,
      area: bugForm.value.area,
      severity: bugForm.value.severity,
    })
    closeDialog()
  } catch {
    bugFormError.value = projectsStore.error ?? 'Не удалось создать баг'
  }
}

function closeDialog() {
  props.onClose()
  bugForm.value = {
    title: '',
    description: '',
    status: 'discovered',
    area: 'other',
    severity: 'minor',
  }
  bugFormError.value = ''
}
</script>

<template>
  <Dialog
    :open="props.isOpen"
    @update:open="props.onClose"
    @close="closeDialog"
    class="fixed inset-0 z-50"
  >
    <DialogContent class="sm:max-w-130">
      <DialogHeader>
        <DialogTitle>Новый баг</DialogTitle>
        <DialogDescription>
          Заполните информацию о баге. Обязательные поля отмечены *
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

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-1.5">
          <Label for="bug-title">Название *</Label>
          <Input
            id="bug-title"
            v-model="bugForm.title"
            placeholder="Например: Ошибка авторизации при неверном пароле"
            maxlength="200"
            :disabled="props.submitting"
            autocomplete="off"
          />
        </div>

        <div class="space-y-1.5">
          <Label for="bug-description">Описание</Label>
          <Textarea
            id="bug-description"
            v-model="bugForm.description"
            placeholder="Подробное описание бага, шаги воспроизведения, ожидаемое поведение..."
            maxlength="2000"
            :rows="4"
            :disabled="props.submitting"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <div class="space-y-1.5">
            <Label for="bug-status">Статус</Label>
            <Select v-model="bugForm.status" :disabled="props.submitting">
              <SelectTrigger id="bug-status">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="bug-area">Область</Label>
            <Select v-model="bugForm.area" :disabled="props.submitting">
              <SelectTrigger id="bug-area">
                <SelectValue placeholder="Область" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in areaOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-1.5">
            <Label for="bug-severity">Важность</Label>
            <Select v-model="bugForm.severity" :disabled="props.submitting">
              <SelectTrigger id="bug-severity">
                <SelectValue placeholder="Важность" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in severityOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p v-if="bugFormError" class="text-sm text-severity-critical">{{ bugFormError }}</p>

        <DialogFooter>
          <Button type="button" variant="ghost" @click="closeDialog" :disabled="props.submitting">
            Отмена
          </Button>
          <Button type="submit" :disabled="props.submitting || !bugForm.title.trim()">
            <Loader2 v-if="props.submitting" class="h-4 w-4 animate-spin mr-2" />
            {{ props.submitting ? 'Создаём…' : 'Создать баг' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
