<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { FolderKanban, User, PanelLeft, LogOut } from '@lucide/vue'

const collapsed = ref(false)
const router = useRouter()
const auth = useAuthStore()

const navItems = [
  { label: 'Проекты', to: '/app', icon: FolderKanban },
  { label: 'Профиль', to: '/app/profile', icon: User },
]

const initials = computed(() => {
  const name = auth.profile?.display_name ?? auth.user?.email ?? '?'
  return name.trim().slice(0, 2).toUpperCase()
})

async function handleSignOut() {
  await auth.signOut()
  router.push('/')
}
</script>

<template>
  <aside
    class="sticky top-0 flex h-screen flex-col justify-between border-r border-border bg-background text-foreground transition-all duration-200"
    :class="collapsed ? 'w-16' : 'w-56'"
  >
    <div>
      <div
        class="flex items-center px-3 py-4"
        :class="collapsed ? 'justify-center' : 'justify-between'"
      >
        <RouterLink v-if="!collapsed" to="/app" class="font-mono text-sm font-semibold">
          BugBoard
        </RouterLink>
        <Button variant="ghost" size="icon" @click="collapsed = !collapsed">
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
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </RouterLink>
      </nav>
    </div>

    <div class="border-t border-border p-2">
      <div class="flex items-center gap-2" :class="collapsed && 'justify-center'">
        <RouterLink
          to="/app/profile"
          class="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-card"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card font-mono text-xs"
          >
            {{ initials }}
          </span>
          <span v-if="!collapsed" class="min-w-0 flex-1 truncate text-left text-sm">
            {{ auth.profile?.display_name ?? auth.user?.email }}
          </span>
        </RouterLink>
        <Button v-if="!collapsed" variant="ghost" size="icon" @click="handleSignOut">
          <LogOut class="h-4 w-4" />
        </Button>
      </div>
    </div>
  </aside>
</template>
