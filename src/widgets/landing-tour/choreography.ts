import { tourState } from './tourState'

/** Контекст, через который шаги управляют сценой: курсор, клики, ввод, ожидание. */
export interface TourCtx {
  /** Плавно вести курсор к центру элемента (селектор внутри вьюпорта). */
  moveTo(target: string, duration?: number): Promise<void>
  /** Подсветить цель так, будто курсор над ней. */
  hot(target: string | null): Promise<void>
  /** Навести курсор и «нажать»: сжатие курсора, ripple, пауза. */
  click(target: string): Promise<void>
  /** Печатать в поле по символу: focused-состояние, каретка, запись через setter. */
  type(
    target: string,
    fieldKey: string,
    text: string,
    setter: (value: string) => void,
    opts?: { speed?: number; settle?: number },
  ): Promise<void>
  /** Пауза, уважающая кнопку «Пауза» и отмену запуска. */
  wait(ms: number): Promise<void>
}

export interface TourStep {
  /** Стабильный id для ключей и логов. */
  id: string
  /** Короткое имя для чипа меню. */
  label: string
  /** Заголовок шага под сценой. */
  title: string
  /** Подпись — что показывает и зачем это пользователю. */
  caption: string
  /** Начальное состояние сцены при переходе на шаг (и при повторе). */
  setup(): void
  /** Итоговое состояние — для мгновенного показа (reduced motion). */
  end(): void
  /** Хореография: курсор, клики, смена состояний. */
  run(ctx: TourCtx): Promise<void>
  /** «Живой» курсор: движение по дуге с наклоном (пока первые два шага). */
  lively?: boolean
}

const s = tourState

/* Пояснения шага «Интерфейс»: текст-пузырь под привязанным элементом
   или вслед за курсором (см. TourNarration.vue) */
function narrate(text: string, anchor: string): void {
  s.narr.text = text
  s.narr.anchor = anchor
  s.narr.mode = 'anchor'
  s.narr.key++
}

function narrateFollow(text: string, at: 'right' | 'below'): void {
  s.narr.text = text
  s.narr.at = at
  s.narr.mode = 'follow'
  s.narr.key++
}

function narrOff(): void {
  s.narr.mode = 'off'
}

export const steps: TourStep[] = [
  {
    id: 'signup',
    label: 'Регистрация',
    lively: true,
    title: 'Аккаунт разработчика за минуту',
    caption:
      'Почта и пароль — аккаунт подтверждается кодом из письма. Отдельной «войти как разработчик» не нужно: один аккаунт подходит и команде, и репортёру.',
    setup() {
      s.screen = 'auth'
      s.auth = { tab: 'signup', name: '', email: '', password: '', otp: '' }
      // Прокрутка к настройкам не должна пережить шаг «Ссылка» — оболочка скрыта
      s.settingsScroll = 0
      s.focused = ''
    },
    end() {
      this.setup()
      s.auth.name = 'Анна'
      s.auth.email = 'anna@team.dev'
      s.auth.password = 'secret123'
      s.auth.tab = 'otp'
      s.auth.otp = '481902'
    },
    async run(ctx) {
      await ctx.wait(900)
      await ctx.moveTo('[data-tour="auth-name"]')
      await ctx.type(
        '[data-tour="auth-name"]',
        'auth-name',
        'Анна',
        (v) => {
          s.auth.name = v
        },
        { settle: 760 },
      )
      await ctx.moveTo('[data-tour="auth-email"]')
      await ctx.type(
        '[data-tour="auth-email"]',
        'auth-email',
        'anna@team.dev',
        (v) => {
          s.auth.email = v
        },
        { settle: 760 },
      )
      await ctx.moveTo('[data-tour="auth-password"]')
      await ctx.type(
        '[data-tour="auth-password"]',
        'auth-password',
        'secret123',
        (v) => {
          s.auth.password = v
        },
        { settle: 760 },
      )
      await ctx.moveTo('[data-tour="auth-submit"]')
      await ctx.click('[data-tour="auth-submit"]')
      s.auth.tab = 'otp'
      await ctx.wait(700)
      await ctx.moveTo('[data-tour="auth-otp"]')
      await ctx.type(
        '[data-tour="auth-otp"]',
        'auth-otp',
        '481902',
        (v) => {
          s.auth.otp = v
        },
        { speed: 120 },
      )
      await ctx.moveTo('[data-tour="auth-verify"]')
      await ctx.click('[data-tour="auth-verify"]')
      await ctx.wait(600)
    },
  },
  {
    id: 'project',
    label: 'Проект',
    title: 'Первый проект — и в нём команда',
    caption:
      'Название, пара слов о проекте и выбор видимости. Публичный проект принимает репорты по ссылке — приватный виден только участникам.',
    lively: true,
    setup() {
      s.screen = 'projects'
      s.dialogOpen = false
      s.project = { name: '', description: '', isPublic: false }
      s.created = false
      s.publicProjects = []
      s.settingsScroll = 0
      s.focused = ''
    },
    end() {
      this.setup()
      s.project = {
        name: 'auth-service',
        description: 'Сервис авторизации и входа',
        isPublic: true,
      }
      s.created = true
      s.publicProjects = [
        {
          name: 'landing-redesign',
          description: 'Редизайн лендинга и посадочных страниц',
          date: 'Создан: 2 октября 2026 г.',
        },
        {
          name: 'mobile-client',
          description: 'Мобильное приложение для iOS и Android',
          date: 'Создан: 28 сентября 2026 г.',
        },
        {
          name: 'status-page',
          description: 'Статус-страница сервиса и уведомления об инцидентах',
          date: 'Создан: 12 сентября 2026 г.',
        },
      ]
    },
    async run(ctx) {
      // Пауза перед первым приближением — пользователь успевает запомнить страницу
      await ctx.wait(1500)
      // Камера подъезжает к кнопке создания прежде, чем курсор тронется
      s.focused = 'new-project-btn'
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="new-project-btn"]')
      await ctx.click('[data-tour="new-project-btn"]')
      // Диалог открывается — камера мягко переезжает на весь блок формы
      s.dialogOpen = true
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="dialog-name"]')
      await ctx.type(
        '[data-tour="dialog-name"]',
        'dialog-name',
        'auth-service',
        (v) => {
          s.project.name = v
        },
        { settle: 760 },
      )
      await ctx.moveTo('[data-tour="dialog-description"]')
      await ctx.type(
        '[data-tour="dialog-description"]',
        'dialog-description',
        'Сервис авторизации и входа',
        (v) => {
          s.project.description = v
        },
        { speed: 28, settle: 760 },
      )
      // Один клик, и проект публичный — подвода камеры на чекбокс больше нет,
      // форма целиком уже в кадре; focused='' гасит каретку в описании, как blur
      s.focused = ''
      await ctx.wait(300)
      await ctx.moveTo('[data-tour="dialog-public"]')
      await ctx.click('[data-tour="dialog-public"]')
      s.project.isPublic = true
      await ctx.wait(500)
      await ctx.moveTo('[data-tour="dialog-submit"]')
      await ctx.click('[data-tour="dialog-submit"]')
      // Форма превращается в карточку проекта — морфингом и камерой ведёт экран
      s.created = true
      await ctx.wait(1500)
      s.dialogOpen = false
      // created-карточка доигрывает появление (морфинг ~1.15s + вспышки ~0.9s) —
      // даём ей закончиться в тишине, прежде чем начнётся шквал публичных
      await ctx.wait(900)
      // Публичные проекты прилетают в список со вспышками частиц — быстро: «БАМ бам бам»
      s.publicProjects.push({
        name: 'landing-redesign',
        description: 'Редизайн лендинга и посадочных страниц',
        date: 'Создан: 2 октября 2026 г.',
      })
      await ctx.wait(400)
      s.publicProjects.push({
        name: 'mobile-client',
        description: 'Мобильное приложение для iOS и Android',
        date: 'Создан: 28 сентября 2026 г.',
      })
      await ctx.wait(400)
      s.publicProjects.push({
        name: 'status-page',
        description: 'Статус-страница сервиса и уведомления об инцидентах',
        date: 'Создан: 12 сентября 2026 г.',
      })
      await ctx.wait(900)
      // Финальный клик по карточке созданного проекта — переход к шагу интерфейса
      await ctx.moveTo('[data-tour="created-card"]')
      await ctx.click('[data-tour="created-card"]')
      await ctx.wait(600)
    },
  },
  {
    id: 'interface',
    label: 'Интерфейс',
    title: 'Один проект — все разделы под рукой',
    caption:
      'Шапка даёт контекст проекта, вкладки — быстрый переход по разделам, а боковое меню дублирует их и добавляет переключатель проектов.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'bugs'
      // Сайдбар стартует свёрнутым в рейл w-16 — раскроется по ходу шага
      s.sidebarOpen = false
      s.sidebarDim = false
      s.navHotAll = false
      s.switcherProject = 'auth-service'
      // Публичность — из шага «Проект»: ссылка для репортёров уже в шапке
      s.settingsPublic = true
      // Прокрутка к настройкам не должна пережить шаг «Ссылка»
      s.settingsScroll = 0
      s.switcherOpen = false
      s.statusMenuOpen = false
      s.bugStatus = 'all'
      // Карточки видны на этой вкладке — статус шага «Баги» не должен просочиться
      s.bugPageStatus = 'in_progress'
      s.copied = false
      s.focused = ''
      narrOff()
    },
    end() {
      this.setup()
      s.sidebarOpen = true
    },
    async run(ctx) {
      await ctx.wait(600)
      // 1. Шапка проекта — контекст: имя, описание, служебная информация
      await ctx.moveTo('[data-tour="project-header"]')
      await ctx.hot('[data-tour="project-header"]')
      await ctx.wait(300)
      narrate(
        'В шапке — имя проекта, описание и служебная информация.',
        '[data-tour="project-header"]',
      )
      await ctx.wait(2800)
      // 2. Ссылка для репортёров — публичный проект принимает репорты по ней
      await ctx.moveTo('[data-tour="header-copy"]')
      await ctx.click('[data-tour="header-copy"]')
      s.copied = true
      narrate(
        'Если проект публичный, здесь есть ссылка для репортёров.',
        '[data-tour="project-header"]',
      )
      await ctx.wait(1700)
      s.copied = false
      await ctx.wait(400)
      // 3. Вкладки — навигация по разделам; обводка без клика
      await ctx.moveTo('[data-tour="project-tabs"]')
      await ctx.hot('[data-tour="project-tabs"]')
      narrate('Вкладки — навигация по разделам проекта.', '[data-tour="project-tabs"]')
      await ctx.wait(2700)
      // 4. Сайдбар свёрнут в рейл — раскрываем кнопкой, фон уходит под затемнение
      await ctx.moveTo('[data-tour="sidebar-toggle"]')
      await ctx.click('[data-tour="sidebar-toggle"]')
      s.sidebarOpen = true
      s.sidebarDim = true
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="nav-projects"]')
      await ctx.hot('[data-tour="nav-projects"]')
      narrateFollow('В боковом меню — секции проектов: ваши и публичные.', 'right')
      await ctx.wait(2700)
      // 5. Быстрая смена текущего проекта — контекст страницы остаётся, как в реальном
      await ctx.moveTo('[data-tour="switcher-next"]')
      await ctx.hot('[data-tour="switcher"]')
      narrateFollow('Меню выбора текущего проекта.', 'below')
      await ctx.click('[data-tour="switcher-next"]')
      s.switcherProject = 'website-marketing'
      await ctx.wait(850)
      await ctx.click('[data-tour="switcher-next"]')
      s.switcherProject = 'auth-service'
      await ctx.wait(1400)
      // 6. Разделы сайдбара — те же вкладки, что под шапкой: курсор на «Баги»,
      //    но зажигаются обводкой все пять пунктов разом
      narrateFollow('Здесь продублированы вкладки из-под шапки.', 'right')
      await ctx.moveTo('[data-tour="nav-bugs"]', 0.6)
      await ctx.wait(300)
      s.navHotAll = true
      await ctx.wait(2400)
      s.navHotAll = false
      // Кольцо не должно доживать до следующего шага
      await ctx.hot(null)
      await ctx.wait(400)
    },
  },
  {
    id: 'bugs',
    label: 'Баги',
    title: 'Баг: от карточки до страницы разбора',
    caption:
      'Клик по карточке открывает страницу бага: описание и обсуждение команды, атрибуты с автосохранением и привязка репортов.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'bugs'
      s.sidebarOpen = true
      s.sidebarDim = false
      s.navHotAll = false
      s.switcherProject = 'auth-service'
      s.statusMenuOpen = false
      s.bugStatus = 'all'
      s.bugPageStatus = 'in_progress'
      s.bugAttrMenuOpen = false
      s.bugSaving = false
      s.bugSavedFlash = false
      s.bugScroll = 0
      s.bugComments = []
      s.settingsScroll = 0
      s.focused = ''
      narrOff()
    },
    end() {
      this.setup()
      // Reduced motion: шаг показан готовым — статус уже применён
      s.bugPageStatus = 'fixed'
    },
    async run(ctx) {
      await ctx.wait(500)
      // 1. Список: баг читается с карточки — метки и UUID
      await ctx.moveTo('[data-tour="bug-card"]')
      narrate('Статус, важность, область и UUID — всё на карточке.', '[data-tour="bug-card"]')
      await ctx.wait(2200)
      await ctx.click('[data-tour="bug-card"]')
      // Пузырь уходит вместе с уходящим экраном — на новой странице свой рассказ
      narrOff()
      s.screen = 'bug'
      await ctx.wait(800)
      // 2. Шапка страницы — те же метки, что в списке, автор и полный ID
      await ctx.moveTo('[data-tour="bug-header"]', 0.6)
      await ctx.hot('[data-tour="bug-header"]')
      narrate('Один баг — одна страница: метки, автор и полный ID.', '[data-tour="bug-header"]')
      await ctx.wait(1800)
      // 3. Атрибуты: статус правится на месте — автосохранение без кнопок
      await ctx.moveTo('[data-tour="bug-status"]')
      await ctx.click('[data-tour="bug-status"]')
      s.bugAttrMenuOpen = true
      narrate(
        'Атрибуты правятся прямо здесь — автосохранение, без кнопок.',
        '[data-tour="bug-attrs"]',
      )
      await ctx.wait(650)
      await ctx.moveTo('[data-tour="bug-status-fixed"]')
      await ctx.click('[data-tour="bug-status-fixed"]')
      s.bugAttrMenuOpen = false
      s.bugSaving = true
      await ctx.wait(400)
      s.bugSaving = false
      s.bugSavedFlash = true
      s.bugPageStatus = 'fixed'
      await ctx.wait(1100)
      s.bugSavedFlash = false
      await ctx.hot(null)
      await ctx.wait(450)
      // 4. Комментарии прилетают штампом — та же механика, что у публичных
      //    карточек в шаге 02 (вспышки частиц, кивок страницы, ритм 400ms)
      await ctx.moveTo('[data-tour="bug-comments"]', 0.6)
      s.bugComments.push({
        id: 'c1',
        author: 'Дмитрий К.',
        time: 'Сегодня, 14:20',
        text: 'Проверил на проде — на Safari и Firefox воспроизводится, логи callback-URL приложил.',
      })
      await ctx.wait(400)
      s.bugComments.push({
        id: 'c2',
        author: 'Анна',
        time: 'Сегодня, 15:05',
        text: 'Причина в exchangeCodeForSession — починила проверку подписи, выкатываю в стейджинг.',
      })
      // Пузырь меряет карточку уже с двумя комментариями (nextTick после пушей)
      narrate(
        'Обсуждение живёт прямо под описанием — комментарии команды.',
        '[data-tour="bug-comments"]',
      )
      await ctx.wait(2100)
      // 5. Скролл к репортам — курсор на блок, пузырь справа от него
      s.bugScroll = 380
      await ctx.wait(700)
      await ctx.moveTo('[data-tour="bug-reports"]', 0.7)
      narrateFollow('Если баг соответствует репортам, их можно привязать к нему.', 'right')
      await ctx.wait(2300)
      // 6. Назад к проекту — список встречает с применённым статусом
      narrOff()
      s.bugScroll = 0
      await ctx.wait(650)
      await ctx.moveTo('[data-tour="bug-back"]')
      await ctx.click('[data-tour="bug-back"]')
      s.screen = 'shell'
      await ctx.wait(900)
      await ctx.hot(null)
    },
  },
  {
    id: 'link',
    label: 'Ссылка',
    title: 'Ссылка, с которой начинается репорт',
    caption:
      'В настройках — видимость проекта. Включите публичность, сохраните — и ссылка вида /report/:id готова: оставьте её в описании, на сайте или в дискорде. Регистрация репортёру не нужна.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'settings'
      s.sidebarOpen = true
      s.sidebarDim = false
      s.navHotAll = false
      s.switcherProject = 'auth-service'
      s.settingsPublic = false
      s.settingsSaving = false
      s.settingsSaved = false
      s.settingsScroll = 0
      s.copied = false
      s.focused = ''
      narrOff()
    },
    end() {
      this.setup()
      s.settingsPublic = true
    },
    async run(ctx) {
      await ctx.wait(600)
      // Вкладка настроек длинная — прокручиваем страницу к карточке «Видимость»
      s.settingsScroll = 480
      await ctx.wait(750)
      await ctx.moveTo('[data-tour="settings-public"]')
      await ctx.click('[data-tour="settings-public"]')
      s.settingsPublic = true
      await ctx.wait(900)
      // Ссылка работает только после сохранения видимости — как в приложении
      await ctx.moveTo('[data-tour="settings-save"]')
      await ctx.click('[data-tour="settings-save"]')
      s.settingsSaving = true
      await ctx.wait(450)
      s.settingsSaving = false
      s.settingsSaved = true
      await ctx.wait(1100)
      s.settingsSaved = false
      await ctx.wait(300)
      // Курсор — на кнопку-ссылку рядом с чекбоксом (не на копирование)
      await ctx.moveTo('[data-tour="settings-link"]')
      await ctx.click('[data-tour="settings-link"]')
      await ctx.wait(500)
      await ctx.hot(null)
    },
  },
  {
    id: 'reporter',
    label: 'Репорт',
    title: 'Репортёр приходит по ссылке',
    caption:
      'Внешний нашедший баг заполняет форму: заголовок, что произошло, почта. Код из письма вместо пароля — и черновик не теряется на шаге подтверждения.',
    setup() {
      s.screen = 'reporter'
      s.reportStep = 'form'
      s.report = { title: '', body: '', email: '', otp: '' }
      s.settingsScroll = 0
      s.focused = ''
    },
    end() {
      this.setup()
      s.report = {
        title: 'Кнопка входа через GitHub не работает',
        body: 'После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся.',
        email: 'guest@mail.ru',
        otp: '902143',
      }
      s.reportStep = 'success'
    },
    async run(ctx) {
      await ctx.wait(600)
      await ctx.moveTo('[data-tour="report-title"]')
      await ctx.type(
        '[data-tour="report-title"]',
        'report-title',
        'Кнопка входа через GitHub не работает',
        (v) => {
          s.report.title = v
        },
      )
      await ctx.moveTo('[data-tour="report-body"]')
      await ctx.type(
        '[data-tour="report-body"]',
        'report-body',
        'После клика «Войти через GitHub» окно закрывается, аккаунт не создаётся. На Safari 17 воспроизводится стабильно.',
        (v) => {
          s.report.body = v
        },
        { speed: 22 },
      )
      await ctx.moveTo('[data-tour="report-email"]')
      await ctx.type('[data-tour="report-email"]', 'report-email', 'guest@mail.ru', (v) => {
        s.report.email = v
      })
      await ctx.moveTo('[data-tour="report-submit"]')
      await ctx.click('[data-tour="report-submit"]')
      s.reportStep = 'otp'
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="report-otp"]')
      await ctx.type(
        '[data-tour="report-otp"]',
        'report-otp',
        '902143',
        (v) => {
          s.report.otp = v
        },
        { speed: 120 },
      )
      await ctx.moveTo('[data-tour="report-verify"]')
      await ctx.click('[data-tour="report-verify"]')
      s.reportStep = 'success'
      await ctx.wait(1300)
    },
  },
  {
    id: 'reports',
    label: 'Репорты',
    title: 'Входящий репорт: ответ, страница и путь к багу',
    caption:
      'Команда принимает репорт и отвечает репортёру, страница репорта привязывает его к найденному багу — а из валидного репорта можно сразу создать баг.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'reports'
      s.sidebarOpen = true
      s.sidebarDim = false
      s.navHotAll = false
      s.switcherProject = 'auth-service'
      s.reportMenuOpen = false
      s.reportBugMenuOpen = false
      s.reportStatus = 'new'
      s.replyOpen = false
      s.replyText = ''
      s.replySent = false
      s.linked = false
      s.settingsScroll = 0
      s.focused = ''
      narrOff()
    },
    end() {
      this.setup()
      s.reportStatus = 'confirmed'
      s.replySent = true
      s.replyText = 'Спасибо! Проверим и починим в ближайшем релизе.'
      s.linked = true
    },
    async run(ctx) {
      await ctx.wait(700)
      // Статус — дропдаун в шапке карточки, как в реальном ReportCard
      await ctx.moveTo('[data-tour="report-status-trigger"]')
      await ctx.click('[data-tour="report-status-trigger"]')
      s.reportMenuOpen = true
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="report-status-confirmed"]')
      await ctx.click('[data-tour="report-status-confirmed"]')
      s.reportMenuOpen = false
      s.reportStatus = 'confirmed'
      await ctx.wait(900)
      // Ответ репортёру: редактор в карточке
      await ctx.moveTo('[data-tour="report-reply-btn"]')
      await ctx.click('[data-tour="report-reply-btn"]')
      s.replyOpen = true
      await ctx.wait(600)
      await ctx.moveTo('[data-tour="report-reply-textarea"]')
      await ctx.type(
        '[data-tour="report-reply-textarea"]',
        'report-reply',
        'Спасибо! Проверим и починим в ближайшем релизе.',
        (v) => {
          s.replyText = v
        },
        { speed: 26 },
      )
      await ctx.moveTo('[data-tour="report-reply-send"]')
      await ctx.click('[data-tour="report-reply-send"]')
      s.replyOpen = false
      s.replySent = true
      await ctx.wait(1100)
      // Клик по карточке открывает страницу репорта — как goToReport в реальном
      await ctx.moveTo('[data-tour="report-card"]')
      await ctx.click('[data-tour="report-card"]')
      s.screen = 'report-page'
      await ctx.wait(900)
      // Привязка к багу — смысл страницы: репорт уходит к уже найденному багу
      await ctx.moveTo('[data-tour="report-page-link"]')
      narrate(
        'Привязка к багу: если репорт пришёл на уже найденный баг — привяжите его к существующему, а не создавайте дубль.',
        '[data-tour="report-page-link"]',
      )
      await ctx.wait(3400)
      narrOff()
      await ctx.click('[data-tour="report-page-link"]')
      s.reportBugMenuOpen = true
      await ctx.wait(900)
      await ctx.moveTo('[data-tour="report-page-link-item"]')
      await ctx.click('[data-tour="report-page-link-item"]')
      s.reportBugMenuOpen = false
      s.linked = true
      await ctx.wait(1300)
      // «/ назад» — возврат во вкладку репортов, чип привязки уже в карточке
      await ctx.moveTo('[data-tour="report-page-back"]')
      await ctx.click('[data-tour="report-page-back"]')
      s.screen = 'shell'
      await ctx.wait(1000)
      // Кнопка «Баг»: создание бага на основе репорта — только пояснение, без перехода
      narrate(
        'Если репорт валиден и действительно указывает на ошибку — можно создать запись о баге на его основе.',
        '[data-tour="report-bug-create"]',
      )
      await ctx.moveTo('[data-tour="report-bug-create"]')
      await ctx.wait(3000)
      narrOff()
      // Курсор уходит в угол сцены — тур завершён
      await ctx.moveTo('[data-tour="park"]', 1)
      await ctx.wait(600)
    },
  },
]
