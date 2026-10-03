<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Loader2, Trash2 } from '@lucide/vue'
import type { ProjectMember } from '@/stores/projects'
import { Avatar } from '@/components/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/format'

interface Props {
  member: ProjectMember
  name: string
  avatar?: string | null
  canDelete: boolean
  isSelf: boolean
  confirming: boolean
  deleteSaving: boolean
  deleteError: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'ask-delete': []
  'confirm-delete': []
  'cancel-delete': []
}>()

const router = useRouter()

function goToMember() {
  void router.push({ name: 'user-profile', params: { userId: props.member.user_id } })
}
</script>

<template>
  <Card class="cursor-pointer gap-0 py-0" @click="goToMember">
    <CardContent class="px-4 py-3 sm:px-4">
      <div class="flex items-center gap-3">
        <Avatar class="h-9 w-9 shrink-0 text-sm" :name="props.name" :src="props.avatar" />

        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-2">
            <RouterLink
              :to="{ name: 'user-profile', params: { userId: props.member.user_id } }"
              class="truncate font-medium underline-offset-4 hover:underline"
              @click.stop
            >
              {{ props.name }}
            </RouterLink>
            <Badge
              v-if="props.member.role === 'owner'"
              class="bg-primary/10 text-xs text-primary"
              variant="secondary"
            >
              Владелец
            </Badge>
            <span v-if="props.isSelf" class="text-xs text-muted-foreground">вы</span>
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            В проекте с {{ formatDate(props.member.created_at) }}
          </p>
        </div>

        <Button
          v-if="props.canDelete"
          variant="ghost"
          size="icon"
          class="h-8 w-8 shrink-0 text-muted-foreground hover:text-severity-critical"
          title="Удалить из проекта"
          aria-label="Удалить из проекта"
          @click.stop="emit('ask-delete')"
        >
          <Trash2 class="h-4 w-4" />
        </Button>
      </div>

      <div
        v-if="props.confirming"
        class="mt-3 rounded-md border border-severity-critical/40 bg-severity-critical/5 p-3"
        role="alertdialog"
        aria-label="Подтверждение удаления участника"
        @click.stop
      >
        <p class="text-sm font-medium">Удалить участника?</p>
        <p class="mt-1 text-xs text-muted-foreground">
          Он потеряет доступ к проекту и его багам. Вернуть можно, добавив заново.
        </p>
        <p v-if="props.deleteError" class="mt-1 text-xs text-severity-critical">
          {{ props.deleteError }}
        </p>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="destructive"
            class="h-8"
            :disabled="props.deleteSaving"
            @click="emit('confirm-delete')"
          >
            <Loader2 v-if="props.deleteSaving" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4" />
            {{ props.deleteSaving ? 'Удаляем…' : 'Удалить' }}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            class="h-8"
            :disabled="props.deleteSaving"
            @click="emit('cancel-delete')"
          >
            Отмена
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
