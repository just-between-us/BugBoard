import { reactive } from 'vue'

/** Логические размеры макета внутри сцены. Вьюпорт масштабируется целиком, поэтому
 *  реальные размеры экранов приложения сохраняются пропорционально. */
export const VIEW_W = 1280
export const VIEW_H = 720

export type TourScreen = 'auth' | 'projects' | 'shell' | 'reporter'

export type TourTab = 'bugs' | 'reports' | 'members' | 'stats' | 'settings'

/** Единое реактивное состояние мок-приложения. Все шаги читают и меняют его,
 *  экраны — чистые функции от него. Экземпляр один (на лендинге одна секция). */
export const tourState = reactive({
  screen: 'tour-screen' as TourScreen,

  // Шаг 1 — регистрация
  auth: {
    tab: 'signup' as 'signup' | 'signin' | 'otp',
    name: '',
    email: '',
    password: '',
    otp: '',
  },

  // Шаг 2 — список проектов и диалог создания
  dialogOpen: false,
  project: { name: '', description: '', isPublic: false },
  created: false,
  /** Публичные проекты «сообщества» — прилетают в список с ASCII-брызгами. */
  publicProjects: [] as { name: string; description: string; date: string }[],

  // Шаги 3–5, 7 — оболочка приложения (сайдбар, шапка, вкладки)
  switcherOpen: false,
  activeTab: 'bugs' as TourTab,
  settingsPublic: false,
  copied: false,
  /** Сайдбар раскрыт (шаг 3 стартует со свёрнутого рейла w-16 и раскрывает его). */
  sidebarOpen: false,
  /** Затемнение контента при открытом сайдбаре в шаге «Интерфейс». */
  sidebarDim: false,
  /** Все пункты разделов сайдбара зажигаются обводкой разом (финальный бит шага). */
  navHotAll: false,
  /** Активный проект в переключателе сайдбара — его меняет быстрая смена chevron'ом. */
  switcherProject: 'auth-service' as 'auth-service' | 'website-marketing',
  /** Рассказ-пузырь шага «Интерфейс»: текст проявляется по буквам. */
  narr: {
    text: '',
    key: 0,
    /** off — скрыт; anchor — под привязанным элементом; follow — вслед за курсором. */
    mode: 'off' as 'off' | 'anchor' | 'follow',
    anchor: '',
    /** Смещение в режиме follow: справа от курсора или чуть ниже. */
    at: 'right' as 'right' | 'below',
  },

  // Шаг 4 — баги
  statusMenuOpen: false,
  bugStatus: 'all' as 'all' | 'in_progress',
  bugDetail: false,

  // Шаг 6 — публичная форма репортёра
  reportStep: 'form' as 'form' | 'otp' | 'success',
  report: { title: '', body: '', email: '', otp: '' },

  // Шаг 7 — репорты команды
  reportMenuOpen: false,
  reportStatus: 'new' as 'new' | 'confirmed' | 'rejected',
  replyOpen: false,
  replyText: '',
  replySent: false,
  linked: false,

  /** Ключ заполненного поля — по нему рисуется мигающая каретка. */
  focused: '',

  /** Тикает в setup() каждого шага — экраны сбрасывают свою «камеру» при повторе. */
  epoch: 0,
})

export type TourState = typeof tourState

export function resetTourState(): void {
  Object.assign(tourState, {
    screen: 'auth',
    auth: { tab: 'signup', name: '', email: '', password: '', otp: '' },
    dialogOpen: false,
    project: { name: '', description: '', isPublic: false },
    created: false,
    publicProjects: [],
    switcherOpen: false,
    activeTab: 'bugs',
    settingsPublic: false,
    copied: false,
    sidebarOpen: false,
    sidebarDim: false,
    navHotAll: false,
    switcherProject: 'auth-service',
    narr: { text: '', key: 0, mode: 'off', anchor: '', at: 'right' },
    statusMenuOpen: false,
    bugStatus: 'all',
    bugDetail: false,
    reportStep: 'form',
    report: { title: '', body: '', email: '', otp: '' },
    reportMenuOpen: false,
    reportStatus: 'new',
    replyOpen: false,
    replyText: '',
    replySent: false,
    linked: false,
    focused: '',
    epoch: tourState.epoch + 1,
  })
}
