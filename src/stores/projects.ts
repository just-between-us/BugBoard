import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export interface Project {
  id: string
  name: string
  description: string | null
  is_public: boolean
  owner_id: string
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
      const index = bugs.value.findIndex(b => b.id === id)
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
    loading,
    error,
    hasProjects,
    fetchProjects,
    fetchProject,
    fetchBugs,
    createProject,
    createBug,
    updateBug,
    clearCurrentProject,
    clearError,
  }
})