<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { FolderKanban, Settings, PanelLeft, LogOut } from '@lucide/vue'
import { Avatar } from '@/components/avatar'

interface Props {
  open?: boolean
}

const props = withDefaults(defineProps<Props>(), { open: false })

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const collapsed = ref(false)
const router = useRouter()
const auth = useAuthStore()

const isDesktop = ref(true)
let mediaQuery: MediaQueryList | null = null

const navItems = [
  { label: 'Проекты', to: '/app', icon: FolderKanban },
  { label: 'Настройки', to: '/app/settings', icon: Settings },
]

const userName = computed(() => auth.profile?.display_name ?? auth.user?.email ?? '?')

const profileLink = computed(() => (auth.user ? `/app/users/${auth.user.id}` : '/app/settings'))

function syncViewport() {
  isDesktop.value = mediaQuery?.matches ?? true
  if (isDesktop.value && props.open) emit('update:open', false)
}

function handleToggle() {
  if (isDesktop.value) {
    collapsed.value = !collapsed.value
  } else {
    emit('update:open', false)
  }
}

function handleNavigate() {
  if (!isDesktop.value) emit('update:open', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !isDesktop.value && props.open) {
    emit('update:open', false)
  }
}

async function handleSignOut() {
  await auth.signOut()
  router.push('/')
}

onMounted(() => {
  mediaQuery = window.matchMedia('(min-width: 768px)')
  syncViewport()
  mediaQuery.addEventListener('change', syncViewport)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', syncViewport)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <!-- Backdrop: mobile / tablet overlay only -->
  <div
    v-if="props.open"
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    aria-hidden="true"
    @click="emit('update:open', false)"
  />

  <!-- Sidebar: in-flow sticky on desktop, absolute overlay below md -->
  <aside
    class="sticky top-0 flex h-screen w-56 flex-col justify-between border-r border-border bg-background transition-all duration-200 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50"
    :class="[
      props.open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
      collapsed && 'md:w-16',
    ]"
  >
    <div>
      <div
        class="flex items-center px-3 py-4"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <RouterLink
          v-if="!collapsed"
          to="/app"
          class="font-mono text-sm font-semibold"
          @click="handleNavigate"
        >
          BugBoard
        </RouterLink>
        <Button
          :aria-label="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
          variant="ghost"
          size="icon"
          @click="handleToggle"
        >
          <PanelLeft class="h-4 w-4" />
        </Button>
      </div>

      <nav class="mt-4 space-y-1 px-2">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
          active-class="bg-card text-foreground"
          @click="handleNavigate"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <div class="border-t border-border p-2">
      <div class="flex items-center gap-2" :class="collapsed && 'justify-center'">
        <RouterLink
          :to="profileLink"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-card"
          @click="handleNavigate"
        >
          <Avatar
            class="h-7 w-7 text-xs font-mono"
            :name="userName"
            :src="auth.profile?.avatar_url"
          />
          <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left text-sm">
            {{ userName }}
          </span>
        </RouterLink>
        <Button v-if="!collapsed" variant="ghost" size="icon" @click="handleSignOut">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </aside>
</template>
