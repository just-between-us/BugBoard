import { reactive } from 'vue'

/** Логические размеры макета внутри сцены. Вьюпорт масштабируется целиком, поэтому
 *  реальные размеры экранов приложения сохраняются пропорционально. */
export const VIEW_W = 1280
export const VIEW_H = 720

export type TourScreen = 'auth' | 'projects' | 'shell' | 'bug' | 'reporter' | 'report-page'

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
  /** Сохранение видимости: «Сохраняем…» в кнопке → вспышка «Сохранено» рядом. */
  settingsSaving: false,
  settingsSaved: false,
  /** Прокрутка оболочки к карточке «Видимость» — вкладка настроек длинная (логические px). */
  settingsScroll: 0,
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
  /** Статус открытого бага: страница бага и первая карточка списка — одно состояние. */
  bugPageStatus: 'in_progress' as 'in_progress' | 'fixed',
  /** Дропдаун «Статус» в Card «Атрибуты» на странице бага. */
  bugAttrMenuOpen: false,
  /** Автосохранение атрибутов: индикатор «Сохраняем…» → вспышка «Сохранено». */
  bugSaving: false,
  bugSavedFlash: false,
  /** Прокрутка страницы бага вверх к блоку «Репорты» (логические px). */
  bugScroll: 0,
  /** Комментарии прилетают под описанием штампом — как публичные карточки в шаге 02. */
  bugComments: [] as { id: string; author: string; time: string; text: string }[],

  // Шаг 6 — публичная форма репортёра
  reportStep: 'form' as 'form' | 'otp' | 'success',
  report: { title: '', body: '', email: '', otp: '' },

  // Шаг 7 — репорты команды
  reportMenuOpen: false,
  /** Меню «Привязать к багу» в блоке управления на странице репорта. */
  reportBugMenuOpen: false,
  reportStatus: 'new' as 'new' | 'confirmed' | 'rejected',
  replyOpen: false,
  replyText: '',
  replySent: false,
  linked: false,

  // Шаг 7 — финал: репорты заваливают окно и оно зарастает стеклом
  /** Шапка проекта и вкладки скрыты вверх — секция репортов на всю высоту. */
  chromeHidden: false,
  /** Сколько репортов потока уже встроилось в список (штампом в конец ленты). */
  floodCount: 0,
  /** Прокрутка ленты вниз по мере роста списка — хвост всегда в кадре (логические px). */
  floodScroll: 0,
  /** Стекло над окном: 'on' — заросло (после разбивания остаётся осколками). */
  glassPhase: 'off' as 'off' | 'on',
  /** Reduced motion: стекло сразу разбитое — статичная картина финала. */
  glassBroken: false,

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
    settingsSaving: false,
    settingsSaved: false,
    settingsScroll: 0,
    copied: false,
    sidebarOpen: false,
    sidebarDim: false,
    navHotAll: false,
    switcherProject: 'auth-service',
    narr: { text: '', key: 0, mode: 'off', anchor: '', at: 'right' },
    statusMenuOpen: false,
    bugStatus: 'all',
    bugPageStatus: 'in_progress',
    bugAttrMenuOpen: false,
    bugSaving: false,
    bugSavedFlash: false,
    bugScroll: 0,
    bugComments: [],
    reportStep: 'form',
    report: { title: '', body: '', email: '', otp: '' },
    reportMenuOpen: false,
    reportBugMenuOpen: false,
    reportStatus: 'new',
    replyOpen: false,
    replyText: '',
    replySent: false,
    linked: false,
    chromeHidden: false,
    floodCount: 0,
    floodScroll: 0,
    glassPhase: 'off',
    glassBroken: false,
    focused: '',
    epoch: tourState.epoch + 1,
  })
}
