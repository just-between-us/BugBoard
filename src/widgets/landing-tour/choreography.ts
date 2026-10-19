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
      // Камера подводит чекбокс публичности к центру
      s.focused = 'dialog-public'
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="dialog-public"]')
      // Пользователь щёлкает чекбоксом туда-сюда — и всё равно оставляет проект публичным
      await ctx.click('[data-tour="dialog-public"]')
      s.project.isPublic = true
      await ctx.wait(420)
      await ctx.click('[data-tour="dialog-public"]')
      s.project.isPublic = false
      await ctx.wait(420)
      await ctx.click('[data-tour="dialog-public"]')
      s.project.isPublic = true
      await ctx.wait(500)
      await ctx.moveTo('[data-tour="dialog-submit"]')
      await ctx.click('[data-tour="dialog-submit"]')
      // Форма превращается в карточку проекта — морфингом и камерой ведёт экран
      s.created = true
      await ctx.wait(1500)
      s.dialogOpen = false
      await ctx.wait(500)
      // Публичные проекты прилетают в список со вспышками частиц
      s.publicProjects.push({
        name: 'landing-redesign',
        description: 'Редизайн лендинга и посадочных страниц',
        date: 'Создан: 2 октября 2026 г.',
      })
      await ctx.wait(520)
      s.publicProjects.push({
        name: 'mobile-client',
        description: 'Мобильное приложение для iOS и Android',
        date: 'Создан: 28 сентября 2026 г.',
      })
      await ctx.wait(520)
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
      'Слева — переключатель проектов и разделы текущего: баги, репорты, участники, статистика и настройки. Счётчики на вкладках показывают, где накопилось работу.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'bugs'
      s.switcherOpen = false
      s.statusMenuOpen = false
      s.bugStatus = 'all'
      s.bugDetail = false
      s.focused = ''
    },
    end() {
      this.setup()
    },
    async run(ctx) {
      await ctx.wait(600)
      await ctx.moveTo('[data-tour="switcher"]')
      await ctx.click('[data-tour="switcher"]')
      s.switcherOpen = true
      await ctx.wait(1100)
      await ctx.click('[data-tour="switcher"]')
      s.switcherOpen = false
      await ctx.wait(400)
      // Быстрый облёт разделов сайдбара…
      await ctx.moveTo('[data-tour="nav-reports"]', 0.6)
      await ctx.wait(250)
      await ctx.moveTo('[data-tour="nav-stats"]', 0.6)
      await ctx.wait(250)
      // …и вкладок проекта с бейджами
      await ctx.moveTo('[data-tour="tab-reports"]', 0.7)
      await ctx.wait(300)
      await ctx.moveTo('[data-tour="tab-members"]', 0.7)
      await ctx.wait(300)
      await ctx.moveTo('[data-tour="tab-bugs"]', 0.7)
      await ctx.wait(250)
      await ctx.click('[data-tour="tab-bugs"]')
      s.activeTab = 'bugs'
      await ctx.wait(500)
    },
  },
  {
    id: 'bugs',
    label: 'Баги',
    title: 'Бэклог: фильтры вместо хаоса',
    caption:
      'Статус, важность и область — как метки, по которым баг читается глазом. Клик по карточке открывает разбор: описание, обсуждение и привязанные репорты.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'bugs'
      s.statusMenuOpen = false
      s.bugStatus = 'all'
      s.bugDetail = false
      s.focused = ''
    },
    end() {
      this.setup()
      s.bugStatus = 'in_progress'
    },
    async run(ctx) {
      await ctx.wait(600)
      await ctx.moveTo('[data-tour="bug-status-filter"]')
      await ctx.click('[data-tour="bug-status-filter"]')
      s.statusMenuOpen = true
      await ctx.wait(700)
      await ctx.moveTo('[data-tour="bug-status-in-progress"]')
      await ctx.click('[data-tour="bug-status-in-progress"]')
      s.statusMenuOpen = false
      s.bugStatus = 'in_progress'
      await ctx.wait(900)
      await ctx.moveTo('[data-tour="bug-card"]')
      await ctx.wait(300)
      await ctx.click('[data-tour="bug-card"]')
      s.bugDetail = true
      await ctx.wait(1400)
      await ctx.moveTo('[data-tour="bug-detail-close"]')
      await ctx.click('[data-tour="bug-detail-close"]')
      s.bugDetail = false
      await ctx.wait(500)
    },
  },
  {
    id: 'link',
    label: 'Ссылка',
    title: 'Ссылка, с которой начинается репорт',
    caption:
      'В настройках — видимость проекта. Включите публичность и скопируйте ссылку вида /report/:id: её можно оставить в описании, на сайте или в дискорде. Регистрация репортёру не нужна.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'settings'
      s.settingsPublic = false
      s.copied = false
      s.focused = ''
    },
    end() {
      this.setup()
      s.settingsPublic = true
    },
    async run(ctx) {
      await ctx.wait(700)
      await ctx.moveTo('[data-tour="settings-public"]')
      await ctx.click('[data-tour="settings-public"]')
      s.settingsPublic = true
      await ctx.wait(900)
      await ctx.moveTo('[data-tour="settings-copy"]')
      await ctx.click('[data-tour="settings-copy"]')
      s.copied = true
      await ctx.wait(1500)
      s.copied = false
      await ctx.wait(300)
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
    title: 'Входящие репорты и ответ репортёру',
    caption:
      'Команда принимает или отклоняет репорт, отвечает репортёру и привязывает его к багу — дальше баг живёт в бэклоге, а репортёр видит ответ по той же ссылке.',
    setup() {
      s.screen = 'shell'
      s.activeTab = 'reports'
      s.reportMenuOpen = false
      s.reportStatus = 'new'
      s.replyOpen = false
      s.replyText = ''
      s.replySent = false
      s.linked = false
      s.focused = ''
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
      await ctx.moveTo('[data-tour="report-status-trigger"]')
      await ctx.click('[data-tour="report-status-trigger"]')
      s.reportMenuOpen = true
      await ctx.wait(800)
      await ctx.moveTo('[data-tour="report-status-confirmed"]')
      await ctx.click('[data-tour="report-status-confirmed"]')
      s.reportMenuOpen = false
      s.reportStatus = 'confirmed'
      await ctx.wait(900)
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
      await ctx.moveTo('[data-tour="report-link-bug"]')
      await ctx.click('[data-tour="report-link-bug"]')
      s.linked = true
      await ctx.wait(1000)
      // Курсор уходит в угол сцены — тур завершён
      await ctx.moveTo('[data-tour="park"]', 1)
      await ctx.wait(600)
    },
  },
]
