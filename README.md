# BugBoard

Курсач баг-трекер для команд разработки с открытой формой репортов. Команде — полный доступ, тому, кто нашёл баг — только ссылка и код с почты.

Сайт: **https://just-between-us.github.io/BugBoard/**

## Стек

| Категория      | Технологии                                                       |
| -------------- | ---------------------------------------------------------------- |
| Фронтенд       | Vue 3 + TypeScript + Vite                                         |
| Состояние      | Pinia                                                             |
| Роутинг        | Vue Router                                                        |
| Стили / UI     | TailwindCSS v4 + shadcn/ui (reka-ui)                              |
| Чарты          | Unovis (`@unovis/vue` / `@unovis/ts`)                             |
| Бэкенд         | Supabase — аутентификация, Postgres, Storage                       |
| Иконки         | Lucide Vue                                                        |
| Хелперы        | VueUse (`useVModel`, `reactiveOmit`, `useMediaQuery`)             |
| Шрифты         | Inter, IBM Plex Mono, Pixelify Sans                               |
| Анимации       | motion-v                                                          |
| Стекло лендинга | three + d3-delaunay (`GlassShatter`)                             |
| OTP-поля       | vue-input-otp                                                     |

Подробности про шрифты, шкалу серого и цветовые решения — в [docs/design.md](docs/design.md).

## Быстрый старт

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Разработка
npm run dev
```

Бэкенд поднимается отдельно на Supabase (схема, RLS, бакеты, auth) — пошагово в [docs/self-hosting.md](docs/self-hosting.md).

## Переменные окружения

| Переменная               | Описание                |
| ------------------------ | ----------------------- |
| `VITE_SUPABASE_URL`      | URL проекта Supabase    |
| `VITE_SUPABASE_ANON_KEY` | Анонимный ключ Supabase |

## Скрипты package.json

| Скрипт       | Описание                                     |
| ------------ | -------------------------------------------- |
| `dev`        | Запуск Vite dev server                       |
| `build`      | Type-check + production build                |
| `build-only` | Production build без type-check              |
| `preview`    | Превью продакшн сборки                       |
| `type-check` | `vue-tsc --build`                            |
| `lint`       | Oxlint + ESLint с автофиксом                 |
| `format`     | Prettier на src/                             |
| `deploy`     | Build + публикация `dist` в ветку `gh-pages` |

## Структура проекта

```
src/
├── assets/main.css          # Глобальные стили, Tailwind тема, CSS переменные
├── components/
│   ├── layout/              # AppHeader, AppSidebar
│   ├── avatar/               # Аватар с фолбэком на инициалы (пользователи и проекты)
│   ├── copy-button/          # Кнопка копирования (ID, ссылки): буфер + fallback, всплывающее «Скопировано»
│   ├── drag-handle/          # Ручка-гриб для локального drag&drop-переупорядочивания списков
│   ├── date-range-picker/    # Выбор периода дат (фильтры багов и репортов)
│   ├── theme-toggle/         # Ghost-иконка переключения темы (шапка лендинга, профиль)
│   ├── ascii-background/     # ASCII-фон с магнитным свечением (философский блок лендинга)
│   └── ui/                  # shadcn/ui компоненты (Button, ButtonGroup, Input, Card, Badge, Dialog, DropdownMenu, Select, Textarea, Separator, Progress, Chart на Unovis, Tooltip, Label, Checkbox, Popover, InputOTP, RangeCalendar, ContextMenu...)
├── entities/
│   ├── bug/                 # Метаданные бага: статусы, важность, области, бейджи, иконки
│   ├── report/              # Метаданные репорта: статусы, флаги, бейджи, точки-индикаторы
│   ├── bug-card/            # Карточка бага в списке
│   ├── project-card/        # Карточка проекта в списке (секции «Мои» / «Публичные»)
│   ├── report-card/         # Карточка репорта в списке (кликом — переход к деталям)
│   ├── member-card/         # Строка участника проекта (аватар, роль, удаление с подтверждением)
│   ├── activity-feed/       # Лента последних действий (баги, комментарии, репорты)
│   └── activity-heatmap/    # Heatmap активности (CSS-grid, без библиотек)
├── layouts/
│   └── AppLayout.vue        # Оболочка приватных маршрутов (сайдбар + контент)
├── lib/
│   ├── supabaseClient.ts    # Инициализация Supabase клиента
│   ├── authRedirect.ts      # authRedirectUrl() — абсолютный URL auth-редиректа через BASE_URL (dev `/` и Pages `/BugBoard/`), аргумент redirect кладётся в ?redirect=
│   ├── utils.ts             # cn() — утилита для классов (clsx + tailwind-merge)
│   ├── format.ts            # formatDate(), shortFormatDate(), formatDateOnly(), initials(), pluralRu(), toUserError()
│   ├── avatar.ts            # validateAvatarFile(), avatarExtension(), withCacheBust()
│   ├── stats.ts             # bucketByDay() — бакеты дат по дням для heatmap
│   ├── dateRange.ts         # DateRange: rangeStartMs()/rangeEndMs()/isInRange()/formatIsoDate() — фильтрация по периоду
│   ├── motion.ts            # Общие transition-пресеты для motion-v (expandTransition)
│   ├── localOrder.ts        # loadIdOrder()/saveIdOrder()/applyIdOrder()/moveId() — порядок списков в localStorage
│   ├── useDragReorder.ts    # Композабл drag&drop-переупорядочивания на Pointer Events
│   └── useScrollEdges.ts    # Композабл горизонтального скролла с краевыми маркерами для масок-затемнений (табы, фильтры)
├── router/index.ts          # Маршруты (все view — ленивые), защита auth-маршрутов
├── stores/
│   ├── activeProject.ts     # Pinia store: активный проект (localStorage `bugboard-active-project`), переключатель в сайдбаре
│   ├── auth.ts              # Pinia store: сессия, профиль, signIn/signUp/signOut, sendOtp/verifyEmailOtp, resetPassword/changeEmail, uploadAvatar
│   ├── projects.ts          # Pinia store: проекты (в т.ч. мои проекты), баги, комментарии, участники, профили, репорты, общие проекты
│   └── theme.ts             # Pinia store: тема (light/dark), localStorage, начальное значение из prefers-color-scheme
├── views/                   # Маршрутизируемые экраны (часть — тонкие обёртки над page-виджетами)
│   ├── LandingView.vue      # Публичная главная (лента тикетов + превью со стеклом)
│   ├── AuthView.vue         # Вход / регистрация / OTP / сброс пароля по почте
│   ├── AuthCallbackView.vue # Ловец auth-редиректов (/auth/callback): обмен ?code= или hash-токенов на сессию + redirect
│   ├── ResetPasswordView.vue # Ввод нового пароля (только по событию PASSWORD_RECOVERY)
│   ├── ReportView.vue       # Публичная страница репорта
│   ├── ReportDetailView.vue # Просмотр конкретного репорта
│   ├── ProjectsView.vue     # Список проектов + создание
│   ├── ProjectView.vue      # Страница проекта
│   ├── ProjectBugsView.vue  # Разделы проекта из сайдбара (по аналогии Project{Reports,Members,Stats,Settings}View)
│   ├── BugDetailView.vue    # Страница бага
│   ├── BugCreateView.vue    # Страница создания бага (проект из URL, префилл из репорта)
│   └── UserProfileView.vue  # Просмотр профиля пользователя (в т.ч. настройки приложения — виджет user-settings)
├── widgets/                 # Страницы и их блоки (Feature-Sliced Design)
│   ├── project-view-page/   # Страница проекта
│   ├── project-section-page/ # Раздел проекта из сайдбара (гейт по членству, без шапки и табов)
│   ├── project-bugs/        # Содержимое вкладки «Баги» (фильтры, список, создание) — для страницы проекта и раздела
│   ├── project-header/      # Шапка проекта (аватар, описание, копирование ID)
│   ├── project-tabs/        # Вкладки проекта
│   ├── project-stats/       # Вкладка «Статистика»: 6 карточек на Unovis + прогресс-бары, chart-colors.ts
│   ├── project-settings/    # Вкладка «Настройки»: основное, аватар, видимость, удаление проекта
│   ├── bugs-filters/        # Фильтры и сортировка багов
│   ├── bug-list/            # Список багов
│   ├── bug-create-page/     # Страница создания бага (route name: bug-create)
│   ├── bug-detail-page/     # Страница бага
│   ├── bug-detail-header/   # Заголовок бага, inline-редактирование, revert
│   ├── bug-detail-description/
│   ├── bug-detail-comments/ # Комментарии (в т.ч. BugCommentItem)
│   ├── bug-detail-sidebar/  # Атрибуты и детали бага
│   ├── bug-detail-reports/  # Репорты бага: привязка/отвязка, поиск и фильтр по статусу
│   ├── bug-detail-skeleton/
│   ├── project-members/     # Участники проекта (список, добавление, удаление)
│   ├── project-reports/     # Репорты проекта: композиция (шапка, поиск, состояние)
│   ├── report-filters/      # Фильтры и сортировка репортов
│   ├── report-list/         # Список репортов: состояния, карточки, мягкое удаление
│   ├── report-page/         # Публичный репорт: форма + OTP-шаг поверх неё
│   ├── report-detail-page/  # Репорт: композиция (вход, просмотр, управление для команды)
│   ├── report-auth-gate/    # Вход по коду из письма перед просмотром репорта
│   ├── report-detail-skeleton/
│   ├── report-detail-card/  # Карточка репорта: шапка, описание, ответ команды
│   ├── report-manage/       # Управление репортом (команда): статус, флаг, привязка, ответ
│   ├── user-profile-page/   # Профиль пользователя (баги, активность, общие проекты)
│   ├── user-settings/       # Настройки приложения на профиле (имя, почта, аватар, тема)
│   ├── landing-hero/        # Герой лендинга: демо-лист тикетов, наклон карточек под курсором (useCardTilt), ASCII-фон
│   ├── landing-preview/     # Разбитие стекла (GlassShatter на three + d3-delaunay, glassReveal) — переиспользуется турами (TourGlass)
│   ├── landing-tour/        # Product Tour: хореография, мок-экраны, курсор, стекло, наводнение репортов
│   ├── landing-how/         # Бенто «Как это работает»: семь кликабельных микро-демо + useSpotlight
│   └── landing-audience/    # Философский блок: манифест, карточки аудиторий, бегущая строка
├── App.vue                  # Корневой компонент: MotionConfig + TooltipProvider + RouterView
└── main.ts                  # Точка входа, инициализация Pinia, Router, Auth
```

## Возможности

Кратко (полное описание — в [docs/features.md](docs/features.md)):

- **Публичная часть** — лендинг с Product Tour и живыми микро-демо, аутентификация (email + OTP), публичный репорт по ссылке (`/report/:projectId`), просмотр репорта по коду из письма (`/reports/:reportId`)
- **Приватная часть** — сайдбар с переключателем проектов, список проектов, страница проекта с вкладками (Баги / Репорты / Участники / Статистика / Настройки), баги с комментариями и привязкой репортов, репорты со сменой статуса, ответами репортёру и ручным порядком, статистика на Unovis, участники, профиль с heatmap активности и настройки прямо на нём

## Документация

| Документ                                     | О чём                                    |
| -------------------------------------------- | ---------------------------------------- |
| [docs/features.md](docs/features.md)         | Полная функциональность (публичная и приватная часть) |
| [docs/self-hosting.md](docs/self-hosting.md) | Self-hosting: Supabase, окружение, деплой |
| [docs/database.md](docs/database.md)         | Схема БД, RLS-политики, RPC, Storage      |
| [docs/implementation.md](docs/implementation.md) | Особенности реализации               |
| [docs/product-tour.md](docs/product-tour.md) | Механика Product Tour                    |
| [docs/design.md](docs/design.md)             | Дизайн, цвет и шрифты                    |
