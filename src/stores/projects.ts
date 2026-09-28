import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { avatarExtension, validateAvatarFile, withCacheBust } from '@/lib/avatar'

export interface Project {
  id: string
  name: string
  description: string | null
  is_public: boolean
  owner_id: string
  avatar_url: string | null
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface Bug {
  id: string
  project_id: string
  title: string
  description: string | null
  status: 'discovered' | 'confirmed' | 'in_progress' | 'fixed'
  area: 'database' | 'ui' | 'auth' | 'api' | 'performance' | 'other'
  severity: 'critical' | 'major' | 'minor'
  created_by: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface BugComment {
  id: string
  bug_id: string
  project_id: string
  author_id: string
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface ProfileSummary {
  id: string
  display_name: string
  avatar_url: string | null
}

export interface PublicProfile extends ProfileSummary {
  created_at: string
}

export interface BugWithProject extends Bug {
  projects: { id: string; name: string } | null
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role: 'owner' | 'member'
  created_at: string
}

interface CreateProjectInput {
  name: string
  description?: string
  is_public?: boolean
}

interface CreateBugInput {
  project_id: string
  title: string
  description?: string
  status?: Bug['status']
  area?: Bug['area']
  severity?: Bug['severity']
}

export const useProjectsStore = defineStore('projects', () => {
  const projects = ref<Project[]>([])
  const currentProject = ref<Project | null>(null)
  const bugs = ref<Bug[]>([])
  const currentBug = ref<Bug | null>(null)
  const comments = ref<BugComment[]>([])
  const commentsLoading = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hasProjects = computed(() => projects.value.length > 0)

  async function fetchProjects() {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      projects.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить проекты'
      projects.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchProject(id: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .eq('is_deleted', false)
        .single()

      if (fetchError) throw fetchError
      currentProject.value = data
      return data
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить проект'
      currentProject.value = null
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchBugs(projectId: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('bugs')
        .select('*')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      bugs.value = data ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить баги'
      bugs.value = []
    }
  }

  async function fetchBug(bugId: string) {
    loading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('bugs')
        .select('*')
        .eq('id', bugId)
        .eq('is_deleted', false)
        .single()

      if (fetchError) throw fetchError
      return data as Bug
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось загрузить баг'
      throw e
    } finally {
      loading.value = false
    }
  }

  /**
   * Загрузка проекта для страницы бага с учётом RLS:
   * возвращает null, если проект скрыт политиками (не существует, удалён
   * или текущий пользователь не имеет к нему доступа).
   */
  async function fetchProjectIfVisible(projectId: string): Promise<Project | null> {
    const { data, error: fetchError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (fetchError) throw fetchError
    currentProject.value = data
    return data
  }

  /**
   * Загрузка бага в рамках конкретного проекта с учётом RLS:
   * политика bugs_select_team_only отфильтрует строку, если пользователь
   * не участник проекта, поэтому используем maybeSingle вместо single.
   */
  async function fetchBugInProject(projectId: string, bugId: string): Promise<Bug | null> {
    const { data, error: fetchError } = await supabase
      .from('bugs')
      .select('*')
      .eq('id', bugId)
      .eq('project_id', projectId)
      .eq('is_deleted', false)
      .maybeSingle()

    if (fetchError) throw fetchError
    currentBug.value = data
    return data
  }

  async function isProjectMember(projectId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false

      const { data, error: fetchError } = await supabase
        .from('project_members')
        .select('id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (fetchError) return false
      return !!data
    } catch {
      return false
    }
  }

  async function fetchComments(bugId: string): Promise<BugComment[]> {
    commentsLoading.value = true
    try {
      const { data, error: fetchError } = await supabase
        .from('bug_comments')
        .select('*')
        .eq('bug_id', bugId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError
      comments.value = data ?? []
      return comments.value
    } catch (e) {
      comments.value = []
      throw e
    } finally {
      commentsLoading.value = false
    }
  }

  async function createComment(input: {
    bug_id: string
    project_id: string
    content: string
  }): Promise<BugComment> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Требуется вход в аккаунт')

    const { data, error: insertError } = await supabase
      .from('bug_comments')
      .insert({
        bug_id: input.bug_id,
        project_id: input.project_id,
        author_id: user.id,
        content: input.content,
      })
      .select()
      .single()

    if (insertError) throw insertError
    if (!data) throw new Error('Комментарий не создан')

    const newComment = data as BugComment
    comments.value.push(newComment)
    return newComment
  }

  /**
   * Редактирование комментария. Доступно только автору — политика
   * comments_update_author_only в БД; updated_at выставляем явно,
   * потому что триггера on update в схеме нет.
   */
  async function updateComment(id: string, content: string): Promise<BugComment> {
    const { data, error: updateError } = await supabase
      .from('bug_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError
    if (!data) throw new Error('Комментарий не обновлён')

    const updatedComment = data as BugComment
    const index = comments.value.findIndex((c) => c.id === id)
    if (index !== -1) comments.value[index] = updatedComment
    return updatedComment
  }

  /**
   * Удаление комментария (soft delete): выставляем is_deleted, строка
   * остаётся в БД, но исчезает из всех выборок. Если RLS запретит
   * обновление (не автор), PostgREST вернёт 0 строк без ошибки —
   * проверяем это явно.
   */
  async function deleteComment(id: string): Promise<void> {
    const { data, error: deleteError } = await supabase
      .from('bug_comments')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')

    if (deleteError) throw deleteError
    if (!data || data.length === 0) {
      throw new Error('Комментарий не найден или нет прав на удаление')
    }

    comments.value = comments.value.filter((c) => c.id !== id)
  }

  async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error: fetchError } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (fetchError) throw fetchError
    return (data ?? []) as ProjectMember[]
  }

  /**
   * Все профили — для выпадающего списка «Добавить участника».
   * Политика profiles_select_all_authenticated разрешает читать всем вошедшим.
   */
  async function fetchAllProfiles(): Promise<ProfileSummary[]> {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .order('display_name')

    if (fetchError) throw fetchError
    return (data ?? []) as ProfileSummary[]
  }

  /**
   * Добавление участника. Политика members_insert_owner_only пропустит
   * только владельца проекта (RLS вернёт 42501), дубль отсекает unique
   * (project_id, user_id) — 23505.
   */
  async function addProjectMember(projectId: string, userId: string): Promise<void> {
    const { error: insertError } = await supabase
      .from('project_members')
      .insert({ project_id: projectId, user_id: userId, role: 'member' })

    if (insertError) {
      if (insertError.code === '23505') throw new Error('Этот пользователь уже участник')
      throw insertError
    }
  }

  /**
   * Удаление участника. Политика members_delete_owner_only: PostgREST при
   * запрете вернёт 0 строк без ошибки — проверяем явно (как в deleteComment).
   */
  async function removeProjectMember(memberId: string): Promise<void> {
    const { data, error: deleteError } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)
      .select('id')

    if (deleteError) throw deleteError
    if (!data || data.length === 0) {
      throw new Error('Участник не найден или нет прав на удаление')
    }
  }

  async function fetchProfiles(ids: string[]): Promise<Record<string, ProfileSummary>> {
    const uniqueIds = [...new Set(ids.filter(Boolean))]
    if (uniqueIds.length === 0) return {}

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', uniqueIds)

      if (fetchError) throw fetchError
      return Object.fromEntries((data ?? []).map((p) => [p.id, p as ProfileSummary]))
    } catch {
      return {}
    }
  }

  const profiles = ref<Record<string, ProfileSummary>>({})

  function mergeProfiles(map: Record<string, ProfileSummary>) {
    profiles.value = { ...profiles.value, ...map }
  }

  async function loadProfiles(
    ids: (string | null | undefined)[],
  ): Promise<Record<string, ProfileSummary>> {
    const fetched = await fetchProfiles(ids.filter((id): id is string => !!id))
    mergeProfiles(fetched)
    return fetched
  }

  function profileName(id: string): string {
    return profiles.value[id]?.display_name ?? 'Участник'
  }

  function profileAvatar(id: string): string | null {
    return profiles.value[id]?.avatar_url ?? null
  }

  function clearProfiles() {
    profiles.value = {}
  }

  /**
   * Профиль пользователя для страницы просмотра. Политика
   * profiles_select_all_authenticated разрешает читать профили всем
   * вошедшим, поэтому возвращает null только если пользователя не существует.
   */
  async function fetchProfileById(id: string): Promise<PublicProfile | null> {
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, created_at')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (data) {
      mergeProfiles({ [data.id]: data as ProfileSummary })
    }
    return (data as PublicProfile | null) ?? null
  }

  /**
   * Баги, созданные пользователем. RLS bugs_select_team_only оставит только
   * те, что видит текущий зритель; имя проекта подтягивается встроенной
   * выборкой — проект виден, если виден сам баг.
   */
  async function fetchBugsByAuthor(authorId: string): Promise<BugWithProject[]> {
    const { data, error: fetchError } = await supabase
      .from('bugs')
      .select('*, projects ( id, name )')
      .eq('created_by', authorId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (fetchError) throw fetchError
    return (data ?? []) as unknown as BugWithProject[]
  }

  function clearCurrentBug() {
    currentBug.value = null
    comments.value = []
    commentsLoading.value = false
  }

  async function createProject(input: CreateProjectInput) {
    error.value = null
    try {
      const { data, error: rpcError } = await supabase.rpc('create_project', {
        _name: input.name,
        _description: input.description ?? null,
        _is_public: input.is_public ?? false,
      })

      if (rpcError) throw rpcError
      if (!data) throw new Error('Проект не создан')

      const newProject = data as Project
      projects.value.unshift(newProject)
      return newProject
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось создать проект'
      throw e
    }
  }

  /**
   * Загрузка аватарки проекта в бакет project-avatars: {project_id}/avatar.{ext}
   * + upsert, публичный URL с cache-buster. Право есть у любого участника
   * команды (is_project_member), а не только владельца — в отличие от
   * пользовательского аватара, где папка {user_id} и auth.uid().
   */
  async function uploadProjectAvatar(projectId: string, file: File): Promise<string> {
    validateAvatarFile(file)

    const path = `${projectId}/avatar.${avatarExtension(file.type)}`
    const { error: uploadError } = await supabase.storage
      .from('project-avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const {
      data: { publicUrl },
    } = supabase.storage.from('project-avatars').getPublicUrl(path)
    const avatarUrl = withCacheBust(publicUrl)

    const { data: updated, error: updateError } = await supabase
      .from('projects')
      .update({ avatar_url: avatarUrl })
      .eq('id', projectId)
      .eq('is_deleted', false)
      .select('id')
      .maybeSingle()
    if (updateError) throw updateError
    if (!updated) {
      throw new Error('Нет прав на обновление проекта')
    }

    if (currentProject.value?.id === projectId) {
      currentProject.value = { ...currentProject.value, avatar_url: avatarUrl }
    }
    const inList = projects.value.find((p) => p.id === projectId)
    if (inList) {
      inList.avatar_url = avatarUrl
    }
    return avatarUrl
  }

  async function createBug(input: CreateBugInput) {
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('bugs')
        .insert({
          project_id: input.project_id,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'discovered',
          area: input.area ?? 'other',
          severity: input.severity ?? 'minor',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (!data) throw new Error('Баг не создан')

      const newBug = data as Bug
      bugs.value.unshift(newBug)
      return newBug
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось создать баг'
      throw e
    }
  }

  async function updateBug(id: string, updates: Partial<Bug>) {
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('bugs')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      if (!data) throw new Error('Баг не обновлён')

      const updatedBug = data as Bug
      const index = bugs.value.findIndex((b) => b.id === id)
      if (index !== -1) bugs.value[index] = updatedBug
      return updatedBug
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Не удалось обновить баг'
      throw e
    }
  }

  function clearCurrentProject() {
    currentProject.value = null
    bugs.value = []
  }

  function clearError() {
    error.value = null
  }

  return {
    projects,
    currentProject,
    bugs,
    currentBug,
    comments,
    commentsLoading,
    loading,
    error,
    hasProjects,
    fetchProjects,
    fetchProject,
    fetchProjectIfVisible,
    fetchBug,
    fetchBugInProject,
    isProjectMember,
    fetchBugs,
    fetchComments,
    createComment,
    updateComment,
    deleteComment,
    fetchProjectMembers,
    fetchAllProfiles,
    addProjectMember,
    removeProjectMember,
    fetchProfiles,
    mergeProfiles,
    loadProfiles,
    profileName,
    profileAvatar,
    clearProfiles,
    fetchProfileById,
    fetchBugsByAuthor,
    createProject,
    uploadProjectAvatar,
    createBug,
    updateBug,
    clearCurrentProject,
    clearCurrentBug,
    clearError,
  }
})
