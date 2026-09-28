import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabaseClient'
import { useProjectsStore } from './projects'

interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
}

const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const AVATAR_MAX_BYTES = 2 * 1024 * 1024

function avatarExtension(type: string): string {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp'
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const profile = ref<Profile | null>(null)
  const loading = ref(true)

  const user = computed<User | null>(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  async function fetchProfile() {
    if (!user.value) {
      profile.value = null
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', user.value.id)
      .single()

    if (!error) profile.value = data
  }

  /**
   * Загрузка аватарки в бакет avatars.
   *
   * Путь всегда {user_id}/avatar.{ext} с upsert: true — повторная загрузка
   * перезаписывает файл, а не плодит новые. К публичному URL приклеиваем
   * ?t=Date.now(), иначе браузер отдаст старую картинку из кэша по тому же
   * адресу. Валидация типа/размера здесь — только UX: настоящую границу
   * задаёт RLS-политика, не пускающая запись в чужую папку {user_id}/.
   */
  async function uploadAvatar(file: File): Promise<string> {
    if (!user.value) throw new Error('Требуется вход в аккаунт')
    if (!AVATAR_TYPES.includes(file.type)) {
      throw new Error('Поддерживаются только JPG, PNG или WebP')
    }
    if (file.size > AVATAR_MAX_BYTES) {
      throw new Error('Максимальный размер файла — 2 МБ')
    }

    const path = `${user.value.id}/avatar.${avatarExtension(file.type)}`

    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
      upsert: true,
      contentType: file.type,
    })
    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${publicUrl}?t=${Date.now()}`

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.value.id)
    if (updateError) throw updateError

    await fetchProfile()

    const projectsStore = useProjectsStore()
    if (profile.value) {
      projectsStore.mergeProfiles({ [profile.value.id]: profile.value })
    }
    return avatarUrl
  }

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    await fetchProfile()
    loading.value = false

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      await fetchProfile()

      const projectsStore = useProjectsStore()
      if (newSession) {
        await projectsStore.fetchProjects()
      } else {
        projectsStore.projects = []
      }
    })
  }

  async function signUp(email: string, password: string, displayName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    })
    if (error) throw error
  }

  async function verifySignup(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' })
    if (error) throw error
    session.value = data.session
    await fetchProfile()

    const projectsStore = useProjectsStore()
    await projectsStore.fetchProjects()
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    await fetchProfile()

    const projectsStore = useProjectsStore()
    await projectsStore.fetchProjects()
  }

  async function signOut() {
    await supabase.auth.signOut()
    session.value = null
    profile.value = null

    const projectsStore = useProjectsStore()
    projectsStore.projects = []
  }

  return {
    session,
    profile,
    user,
    isAuthenticated,
    loading,
    init,
    fetchProfile,
    uploadAvatar,
    signUp,
    verifySignup,
    signIn,
    signOut,
  }
})
