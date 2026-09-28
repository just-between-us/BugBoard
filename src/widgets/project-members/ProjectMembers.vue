<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { AlertTriangle, ChevronsUpDown, Loader2, Plus, Trash2, Users } from '@lucide/vue'
import type { ProfileSummary, ProjectMember } from '@/stores/projects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { formatDate, toUserError } from '@/lib/format'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
}

const props = defineProps<Props>()

const projectsStore = useProjectsStore()
const authStore = useAuthStore()

const members = ref<ProjectMember[]>([])
const candidates = ref<ProfileSummary[]>([])

const loading = ref(false)
const error = ref<string | null>(null)

const adding = ref(false)
const addError = ref<string | null>(null)
const deleteTarget = ref<ProjectMember | null>(null)
const deleteSaving = ref(false)
const deleteError = ref<string | null>(null)

const isOwner = computed(() => projectsStore.currentProject?.owner_id === authStore.user?.id)

const candidateProfiles = computed(() =>
  candidates.value.filter((p) => !members.value.some((m) => m.user_id === p.id)),
)

function isMemberSelf(member: ProjectMember): boolean {
  return member.user_id === authStore.user?.id
}

async function load() {
  loading.value = true
  error.value = null
  addError.value = null
  deleteTarget.value = null
  try {
    const list = await projectsStore.fetchProjectMembers(props.projectId)
    members.value = list
    await projectsStore.loadProfiles(list.map((m) => m.user_id))

    if (isOwner.value) {
      const all = await projectsStore.fetchAllProfiles()
      candidates.value = all
      projectsStore.mergeProfiles(Object.fromEntries(all.map((p) => [p.id, p])))
    } else {
      candidates.value = []
    }
  } catch (e) {
    error.value = toUserError(e)
  } finally {
    loading.value = false
  }
}

async function addMember(userId: string) {
  if (adding.value) return
  adding.value = true
  addError.value = null
  try {
    await projectsStore.addProjectMember(props.projectId, userId)
    await load()
  } catch (e) {
    addError.value = toUserError(e)
  } finally {
    adding.value = false
  }
}

function askDelete(member: ProjectMember) {
  deleteError.value = null
  deleteTarget.value = member
}

function closeDelete() {
  deleteTarget.value = null
  deleteError.value = null
}

async function confirmDelete() {
  if (!deleteTarget.value || deleteSaving.value) return
  deleteSaving.value = true
  deleteError.value = null
  try {
    await projectsStore.removeProjectMember(deleteTarget.value.id)
    closeDelete()
    await load()
  } catch (e) {
    deleteError.value = toUserError(e)
  } finally {
    deleteSaving.value = false
  }
}

watch(
  () => props.projectId,
  () => {
    void load()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h3 class="flex items-center gap-2 text-lg font-medium">
        <Users class="h-5 w-5 text-muted-foreground" />
        Участники
        <Badge v-if="!loading && !error" variant="secondary">{{ members.length }}</Badge>
      </h3>

      <DropdownMenu v-if="isOwner && candidateProfiles.length > 0">
        <DropdownMenuTrigger
          :class="cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')"
          :disabled="adding"
        >
          <Loader2 v-if="adding" class="h-4 w-4 animate-spin" />
          <Plus v-else class="h-4 w-4" />
          {{ adding ? 'Добавляем…' : 'Добавить участника' }}
          <ChevronsUpDown class="h-3.5 w-3.5 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="max-h-72 w-64 overflow-y-auto">
          <DropdownMenuItem
            v-for="profile in candidateProfiles"
            :key="profile.id"
            :disabled="adding"
            @click="addMember(profile.id)"
          >
            <Avatar
              class="mr-2 h-5 w-5 text-[10px]"
              :name="profile.display_name"
              :src="profile.avatar_url"
            />
            <span class="truncate">{{ profile.display_name }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    <p v-if="addError" class="text-sm text-severity-critical">{{ addError }}</p>
    <p
      v-else-if="isOwner && candidateProfiles.length === 0 && !loading"
      class="text-xs text-muted-foreground"
    >
      Новых пользователей для добавления нет.
    </p>
    <p v-else-if="!isOwner" class="text-xs text-muted-foreground">
      Добавлять и удалять участников может только владелец проекта.
    </p>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3" role="status" aria-label="Загрузка участников">
      <div v-for="i in 3" :key="i" class="animate-pulse rounded-lg border p-3">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 shrink-0 rounded-full bg-muted" />
          <div class="flex-1 space-y-2">
            <div class="h-4 w-40 rounded bg-muted" />
            <div class="h-3 w-24 rounded bg-muted" />
          </div>
        </div>
      </div>
      <span class="sr-only">Загрузка участников…</span>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-md border border-severity-critical/20 bg-severity-critical/5 p-4"
    >
      <div class="flex flex-wrap items-center gap-3 text-sm text-severity-critical">
        <AlertTriangle class="h-4 w-4 shrink-0" />
        <span>{{ error }}</span>
        <Button variant="ghost" size="sm" class="ml-auto" @click="load">Повторить</Button>
      </div>
    </div>

    <!-- Members list -->
    <div v-else class="space-y-3">
      <div v-for="member in members" :key="member.id" class="rounded-lg border p-3">
        <div class="flex items-center gap-3">
          <Avatar
            class="h-9 w-9 text-sm"
            :name="projectsStore.profileName(member.user_id)"
            :src="projectsStore.profileAvatar(member.user_id)"
          />

          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2">
              <RouterLink
                :to="{ name: 'user-profile', params: { userId: member.user_id } }"
                class="truncate font-medium underline-offset-4 hover:underline"
              >
                {{ projectsStore.profileName(member.user_id) }}
              </RouterLink>
              <Badge
                v-if="member.role === 'owner'"
                class="bg-primary/10 text-xs text-primary"
                variant="secondary"
              >
                Владелец
              </Badge>
              <span v-if="isMemberSelf(member)" class="text-xs text-muted-foreground">вы</span>
            </p>
            <p class="mt-0.5 text-xs text-muted-foreground">
              В проекте с {{ formatDate(member.created_at) }}
            </p>
          </div>

          <Button
            v-if="isOwner && member.role !== 'owner'"
            variant="ghost"
            size="icon"
            class="h-8 w-8 text-muted-foreground hover:text-severity-critical"
            title="Удалить из проекта"
            aria-label="Удалить из проекта"
            @click="askDelete(member)"
          >
            <Trash2 class="h-4 w-4" />
          </Button>
        </div>

        <!-- Inline delete confirm -->
        <div
          v-if="deleteTarget?.id === member.id"
          class="mt-3 rounded-md border border-severity-critical/40 bg-severity-critical/5 p-3"
          role="alertdialog"
          aria-label="Подтверждение удаления участника"
        >
          <p class="text-sm font-medium">Удалить участника?</p>
          <p class="mt-1 text-xs text-muted-foreground">
            Он потеряет доступ к проекту и его багам. Вернуть можно, добавив заново.
          </p>
          <p v-if="deleteError" class="mt-1 text-xs text-severity-critical">
            {{ deleteError }}
          </p>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="destructive"
              class="h-8"
              :disabled="deleteSaving"
              @click="confirmDelete"
            >
              <Loader2 v-if="deleteSaving" class="h-4 w-4 animate-spin" />
              <Trash2 v-else class="h-4 w-4" />
              {{ deleteSaving ? 'Удаляем…' : 'Удалить' }}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="h-8"
              :disabled="deleteSaving"
              @click="closeDelete"
            >
              Отмена
            </Button>
          </div>
        </div>
      </div>

      <div
        v-if="members.length === 0"
        class="rounded-lg border border-dashed px-6 py-10 text-center"
      >
        <Users class="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p class="mt-2 text-sm font-medium">Участников нет</p>
      </div>
    </div>
  </div>
</template>
