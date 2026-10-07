import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'bugboard-active-project'

function getInitialProjectId(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export const useActiveProjectStore = defineStore('activeProject', () => {
  const activeProjectId = ref<string | null>(getInitialProjectId())

  function setActiveProject(id: string | null) {
    activeProjectId.value = id
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return { activeProjectId, setActiveProject }
})
