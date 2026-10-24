# BugBoard

Курсач баг-трекер для команд разработки с открытой формой репортов. Команде — полный доступ, тому, кто нашёл баг — только ссылка и код с почты.

## Стек

- **Vue 3** + **TypeScript** + **Vite**
- **Supabase** — аутентификация и база данных
- **Pinia** — управление состоянием
- **TailwindCSS v4** + **shadcn/ui** (reka-ui) — UI компоненты
- **Unovis** (`@unovis/vue` / `@unovis/ts`) — чарты вкладки «Статистика»
- **Vue Router** — маршрутизация
- **Lucide Vue** — иконки
- **VueUse** — хелперы для UI-компонентов (`useVModel`, `reactiveOmit`, `useMediaQuery`)

## Функциональность

### Публичная часть

- **Landing page** — описание продукта, демо-лист тикетов, секция «Product Tour» («Путь от регистрации до первого репорта») — автоплей-хореография по шагам на уменьшенном аналоге интерфейса с курсором и меню повтора шагов, бенто-секция «Как это работает» (`widgets/landing-how`) — семь ячеек с живыми кликабельными микро-демо вместо скриншотов: форма репортёра, самозаполняющаяся печатью с настоящим полем OTP (шестая цифра отправляет репорт), письмо с кодом, инлайн-редактирование заголовка («Сохраняем…» → «Сохранено», без кнопки «Сохранить»), 10-секундный отсчёт удаления с живым «Восстановить», лента репортов с циклическим переключением статуса, шкала `--mono-*` с копированием токена и хитмапа под прожектором, терминал self-host (печать посимвольно, клик — перезапечатать); ячейки въезжают по `whileInView` и подсвечиваются прожектором под курсором (`useSpotlight`), пиксельный шрифт Pixelify Sans — номера, eyebrow-лейблы и подписи демо; философский блок (`widgets/landing-audience`) — «Не линейка с лазерным уровнем»: ASCII-фон с магнитным свечением, манифест «Чего здесь нет» (пункты зачёркиваются по въезду, клик возвращает строку) против «Что вместо», три карточки аудиторий с наклоном под курсором (команда / репортёр / self-host) и пиксельная бегущая строка-разделитель, скорость которой зависит от скорости прокрутки
- **Аутентификация** — регистрация с подтверждением email (OTP-код), вход по паролю, сброс пароля по ссылке из письма и подтверждение смены почты (служебные маршруты `/auth/reset-password` и `/auth/callback` принимают редиректы из писем Supabase Auth)
- **Публичный репорт** — страница `/report/:projectId` для публичных проектов: форма (заголовок, описание, почта), OTP-код вводится вторым шагом прямо на ней — черновик не теряется, инсерт в `reports` сразу после `verifyOtp`. Приватный или несуществующий проект — «Проект недоступен», форма не показывается
- **Просмотр репорта** — страница `/reports/:reportId` для всех: до входа только форма «почта → код» (RLS не отдаёт даже факт существования репорта), после входа — данные репорта, если RLS (`reports_select_team_or_owner`) вернул строку. Элементы управления показываются, только если `project_members` подтвердил членство в проекте репорта, включая блок «Привязка к багу» (только баги того же проекта)

### Приватная часть (требует входа)

- **Сайдбар навигации** — сворачиваемый, с иконками: Проекты, Настройки; блок пользователя ведёт на его профиль; переключатель активного проекта (дропдаун с аватаром и названием: список проектов с галочкой у активного, состояния загрузки и «Вы пока не состоите в проектах» с пунктом «Создать проект»; выбор проекта меняет только контекст, не уводя со страницы) и ссылки на разделы активного проекта — Баги, Репорты, Участники, Статистика, Настройки; на мобильных и планшетах (< 768px) — оверлей поверх контента (закрытие: кнопкой в шапке сайдбара, кликом по фону, Escape или при переходе), на десктопе — обычный sticky-столбец
- **Проекты** — список проектов, разбитый на секции «Мои проекты» и «Публичные проекты» (для пустой секции — своя подсказка), создание проекта (RPC `create_project`), карточка проекта с описанием, аватаром и вкладками; в секции «Мои проекты» порядок меняется перетаскиванием за ручку-гриб справа (порядок хранится в localStorage, новые проекты появляются сверху), в «Публичных» — обычный список
- **Страница проекта** — два режима по членству в команде (проверяется до загрузки проекта, флаг готов к первому рендеру): участникам — вкладки «Баги» (на десктопе поиск и кнопка создания в одну строку, а фильтры — статус, важность, область — с горизонтальным скроллом, краевыми затемнениями и закреплённой справа кнопкой сброса (на мобиле — только крестик), сортировка (Button Group из Select и кнопки направления) прижата вправо в той же строке; на мобиле панель создания/фильтров/сортировки скрыта по умолчанию и открывается/закрывается только кнопкой-стрелкой в строке поиска (˅ открыть / ˄ закрыть, без анимации и без привязки к скроллу), развёрнутая панель — кнопка создания во всю ширину, фильтры и сортировка (во всю ширину); в свёрнутом состоянии остаются поиск, тонкие подсказки активных фильтров и нестандартной сортировки (чипы с крестиком сброса)), «Репорты», «Участники», «Статистика», «Настройки» с бейджами-счётчиками (баги, репорты, участники); активная вкладка синхронизируется с URL (`?tab=`): `router.back()` возвращает на последнюю открытую вкладку, значение валидируется по белому списку, «Баги» как значение по умолчанию в URL не пишутся; не-участнику (даже для публичного проекта) — простой просмотр без вкладок и без кнопки создания бага: шапка проекта (без подсказки «можно изменить в настройках» и без загрузки аватара) плюс только свои репорты; на узких экранах вкладки прокручиваются горизонтально, а длинные поля (ID, дата, область, ссылка на репорт) складываются в колонку
- **Разделы проекта в сайдбаре** — те же вкладки доступны как отдельные маршруты `/app/projects/:id/{bugs,reports,members,stats,settings}`: `ProjectSectionPage` рендерит контент без шапки проекта и табов, с компактным заголовком «Проект / Раздел» (для участников и репортов — со счётчиком), скелетоном на загрузке; не-участника страница возвращает на страницу проекта, при неудачной загрузке — на список проектов; контент переиспользует те же виджеты, что и вкладки (логика не дублируется), при этом сами виджеты не рисуют собственные заголовки — контекст даёт обёртка (табы или заголовок раздела); единственное исключение — «Репорты» в режиме не-участника, где заголовок остаётся единственным контекстом списка
- **Статистика проекта** — вкладка только для участников (вкладки в этом режиме рендерятся только для них): карточки на Unovis — «Всего багов» (полукруглый donut с разбивкой по важности и процентами), «Статусы» (группированная столбчатая диаграмма), «Распределение по областям» (интерактивный donut: ховер на сегмент или строку легенды подсвечивает сектор и выводит его в центр), «Динамика появления» (area-чарт багов и репортов, переключатель диапазона 3 месяца / 30 дней / 7 дней); плюс карточки «Участников» и «Репорты» — число со склонением и прогресс-бар «N из M» с редактируемым лимитом (сохраняется в `localStorage` по проекту), цвет бара — градиент по шкале серого к пределу; состояния загрузки/ошибки со скелетоном и кнопкой «Повторить»
- **Репорты** — рабочая вкладка команды: список репортов с поиском и панелью фильтров «как у багов»: фильтры (статус, привязка к багу) — с горизонтальным скроллом, краевыми затемнениями и закреплённой справа кнопкой сброса, сортировка (по дате создания / обновления с переключением направления, для участников ещё «Вручную») — Button Group из Select и кнопки направления, прижатая вправо в той же строке (на мобиле — во всю ширину отдельной строкой); активный фильтр — чип с крестиком, сброс всего — одной кнопкой (на мобиле — только крестик); на мобиле панель фильтров/сортировки скрыта по умолчанию и открывается/закрывается только кнопкой-стрелкой в строке поиска (˅ открыть / ˄ закрыть, без анимации и привязки к скроллу), в свёрнутом состоянии остаются тонкие подсказки активных фильтров и нестандартной сортировки — чипы с крестиком сброса; смена статуса (`new` / `confirmed` / `rejected`) и флага (`spam` / `duplicate`) через дропдауны, ответ репортёру (создание, изменение, удаление), бейдж привязки к багу со ссылкой на него, кнопка «Баг» внизу карточки ведёт на страницу создания бага с префиллом из репорта (`?report=<id>` — заголовок и описание подставляются, после создания бага репорт привязывается к нему автоматически), переход к деталям репорта кликом по карточке (как у багов: клики по кнопкам, ссылкам и полям ввода навигацию не вызывают), мягкое удаление с 10-секундным окном восстановления (кнопка «Удалить» — внизу карточки рядом с «Ответить репортёру»); для участников — третий режим сортировки «Вручную»: список перетаскивается за ручку-гриб (первый drag сам переключает сортировку на «Вручную»), порядок хранится в localStorage по проекту и переживает перезагрузку, при активных фильтрах или поиске ручки скрываются; для не-участников команды (по RLS видны только их собственные репорты) — упрощённая карточка: статус-бейдж только для чтения и ответ команды, без ID, флагов, привязки к багу и действий; фильтр привязки к багу и загрузка багов для них отключены
- **Аватар проекта** — загрузка из шапки проекта (JPG/PNG/WebP, ≤ 2 МБ); менять может любой участник команды
- **Настройки проекта** — вкладка и раздел `/app/projects/:id/settings` для любого участника: «Основное» — название и описание (валидация, кнопка неактивна без изменений, «Сохранено»), «Аватар» — загрузка и удаление (тот же стор, что и в шапке), «Видимость» — чекбокс публичности с подсказкой про выданные ранее ссылки и кнопкой копирования ссылки для репортёров, «Опасная зона» — удаление проекта: кнопка по правому краю запускает 10-секундный отсчёт с прогресс-баром и «Отмена» (защита от мискликов), по истечении — soft delete (`is_deleted = true`), сброс активного проекта и редирект на список
- **Участники** — список с ролями и аватарами, ссылки на профили; добавление и удаление (только владелец, по RLS), inline-подтверждение удаления
- **Страница бага** — inline-редактирование заголовка и описания, кнопка «Вернуть изменения», атрибуты (статус, важность, область, автор) с автосохранением; блок «Репорты» — привязанные и свободные репорты проекта с поиском и фильтром по статусу
- **Комментарии** — создание, редактирование и удаление (только автор, soft delete), inline-подтверждение удаления
- **Профиль пользователя** — публичная страница `/app/users/:userId`: имя, дата регистрации, созданные баги (только видимые вам), секция «Активность» (видна только на своём профиле: heatmap событий в стиле GitHub по багам/комментариям/репортам + лента последних действий); на чужом профиле — бейджи общих проектов с вами (пересечение `project_members`) и баги, видимые только из этих проектов
- **Настройки приложения** — живут прямо на своём профиле как inline-редактирование (без отдельной страницы и без пункта в сайдбаре): отображаемое имя (клик по карандашу → инпут, Enter — сохранить, Esc — отмена), почта (ввод новой → письмо с подтверждением), аватар (кнопка-камера на аватаре, JPG/PNG/WebP ≤ 2 МБ), переключатель темы — та же ghost-иконка `ThemeToggle`, что в шапке лендинга. Роль подтверждает бейдж «Это вы»; чужой профиль — read-only карточка без редактирования. Удалённая страница `/app/settings` теперь редиректит на `/app` (старые ссылки из писем не ломаются)
- **Header** — лого, переключатель темы, ссылки на вход/создание команды (на лендинге; в приватной части — топбар внутри `AppLayout`)

## Запуск

```bash
# Установка зависимостей
npm install

# Настройка окружения
cp .env.example .env
# Заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY

# Разработка
npm run dev

# Проверка типов
npm run type-check

# Линтинг
npm run lint

# Форматирование
npm run format

# Продакшн сборка
npm run build

# Превью сборки
npm run preview
```

## Деплой (GitHub Pages)

Сайт: **https://just-between-us.github.io/BugBoard/**

```bash
npm run deploy
```

Что делает скрипт:

1. `npm run build` (type-check + сборка с `base: '/BugBoard/'` из `vite.config.ts`)
2. Копирует `dist/index.html` → `dist/404.html` — SPA-фолбэк: GitHub Pages отдаёт `404.html` на любой неизвестный путь, иначе прямой заход по ссылке вида `/BugBoard/app/projects/:projectId/bugs/:bugId` давал бы 404
3. Публикует содержимое `dist` в orphan-ветку `gh-pages` (`gh-pages --dotfiles --nojekyll`; `.nojekyll` отключает Jekyll)

После первого деплоя — включить Pages в настройках репозитория:
**Settings → Pages → Source: Deploy from a branch → `gh-pages` / `/ (root)`**.

Что учесть:

- **base path**: `base: '/BugBoard/'` задаётся только для `command === 'build'`, dev-сервер остаётся на `/`. При переименовании репозитория base надо поменять
- **Supabase → Authentication → URL Configuration**: Redirect URLs настроены wildcard'ом — он должен покрывать `…/auth/callback` и `…/auth/reset-password` на обоих хостах (`https://just-between-us.github.io/BugBoard/*` для Pages и `http://localhost:5173/*` для dev); все auth-ссылки в письмах строятся через `authRedirectUrl()` (src/lib/authRedirect.ts) от `import.meta.env.BASE_URL`, поэтому путь подставляется сам
- **Supabase → Authentication → Email Templates**: шаблоны должны содержать и `{{ .Token }}` (код из 6 цифр — нужен `verifyOtp({ type: 'email' })`), и `{{ .ConfirmationURL }}` (ссылка — ведёт на `/auth/callback` или `/auth/reset-password` и не теряет `#access_token=` / `?code=`: `404.html` — копия `index.html`, поэтому hash и query долетают до Vue-роутера нетронутыми)
- **Ключи**: `VITE_SUPABASE_ANON_KEY` попадает в бандл — это нормально, он публичный по дизайну; RLS-политики от origin не зависают и работают одинаково локально и на Pages
- публикуется только `dist`, рабочая ветка не переключается; `vite.config.ts` и `package.json` коммитятся в `main` отдельно

## Переменные окружения

| Переменная               | Описание                |
| ------------------------ | ----------------------- |
| `VITE_SUPABASE_URL`      | URL проекта Supabase    |
| `VITE_SUPABASE_ANON_KEY` | Анонимный ключ Supabase |

## Структура проекта

```
src/
├── assets/main.css          # Глобальные стили, Tailwind тема, CSS переменные
├── components/
│   ├── layout/              # AppHeader, AppSidebar
│   ├── avatar/               # Аватар с фолбэком на инициалы (пользователи и проекты)
│   ├── copy-button/          # Кнопка копирования (ID, ссылки): буфер + fallback, всплывающее «Скопировано»
│   ├── drag-handle/          # Ручка-гриб для локального drag&drop-переупорядочивания списков
│   └── ui/                  # shadcn/ui компоненты (Button, ButtonGroup, Input, Card, Badge, Dialog, DropdownMenu, Select, Textarea, Separator, Progress, Chart на Unovis, Tooltip, Label...)
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
│   ├── format.ts            # formatDate(), formatDateOnly(), initials(), pluralRu(), toUserError()
│   ├── avatar.ts            # validateAvatarFile(), avatarExtension(), withCacheBust()
│   ├── stats.ts             # bucketByDay() — бакеты дат по дням для heatmap
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
│   ├── UserProfileView.vue  # Просмотр профиля пользователя
│   └── SettingsView.vue     # Настройки (имя, почта, аватар, тема)
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
│   └── user-profile-page/   # Профиль пользователя (баги, активность, общие проекты)
├── App.vue                  # Корневой компонент: TooltipProvider + RouterView
└── main.ts                  # Точка входа, инициализация Pinia, Router, Auth
```

## База данных (Supabase)

### Таблицы

**profiles** — профиль пользователя поверх `auth.users`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);
```

Автосоздание профиля при регистрации:

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

**projects** — проекты

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_public boolean not null default false,
  owner_id uuid not null references public.profiles(id),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**project_members** — участники проектов

```sql
create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);
```

**bugs** — баги/тикеты

```sql
create table public.bugs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'discovered'
    check (status in ('discovered','confirmed','in_progress','fixed')),
  area text not null default 'other'
    check (area in ('database','ui','auth','api','performance','other')),
  severity text not null default 'minor'
    check (severity in ('critical','major','minor')),
  created_by uuid not null references public.profiles(id),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**bug_comments** — комментарии к багам

```sql
create table public.bug_comments (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid not null references public.bugs(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**reports** — публичные репорты (от внешних пользователей)

```sql
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bug_id uuid references public.bugs(id) on delete set null,
  reporter_id uuid not null references public.profiles(id),
  title text not null,
  description text not null,
  status text not null default 'new' check (status in ('new','confirmed','rejected')),
  flag text not null default 'none' check (flag in ('none','spam','duplicate')),
  reply text,
  reply_author_id uuid references public.profiles(id),
  replied_at timestamptz,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### Row Level Security (RLS)

Все таблицы имеют включённый RLS:

```sql
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.bugs enable row level security;
alter table public.bug_comments enable row level security;
alter table public.reports enable row level security;
```

Хелпер для проверки членства в проекте:

```sql
create or replace function public.is_project_member(_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members pm
    where pm.project_id = _project_id and pm.user_id = auth.uid()
  );
$$;
```

### Политики доступа

**profiles**

- `profiles_select_all_authenticated` — читать могут все аутентифицированные
- `profiles_update_self` — обновлять только свой профиль

**projects**

- `projects_select` — публичные проекты или если участник
- `projects_insert` — создавать может владелец (owner_id = auth.uid())
- `projects_update_members` — обновлять могут участники проекта

**project_members**

- `members_select` — читать участники проекта
- `members_insert_owner_only` — добавлять участников только владелец
- `members_delete_owner_only` — удалять участников только владелец

**bugs**

- `bugs_select_team_only` — читать только участники проекта
- `bugs_insert_team_only` — создавать только участники (created_by = auth.uid())
- `bugs_update_team_only` — обновлять только участники

**bug_comments**

- `comments_select_team_only` — читать участники проекта
- `comments_insert_team_only` — писать участники (author_id = auth.uid())
- `comments_update_author_only` — редактировать и удалять (soft delete) только автор
- `comments_delete_author_only` — физическое удаление только автором (фронт использует soft delete)

**reports**

- `reports_select_team_or_owner` — читать участники проекта или автор репорта
- `reports_insert_team_or_public` — создавать: участники или публичные проекты (reporter_id = auth.uid())
- `reports_update_team_only` — обновлять (статус, ответ, флаг) только участники

### RPC-функции

**create_project** — атомарное создание проекта + добавление владельца в участники

```sql
create or replace function public.create_project(
  _name text,
  _description text,
  _is_public boolean
)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
begin
  insert into public.projects (name, description, is_public, owner_id)
  values (_name, _description, _is_public, auth.uid())
  returning * into new_project;

  insert into public.project_members (project_id, user_id, role)
  values (new_project.id, auth.uid(), 'owner');

  return new_project;
end;
$$;

grant execute on function public.create_project(text, text, boolean) to authenticated;
```

**Почему RPC, а не два `insert()` с фронта:**

- Атомарность: оба `INSERT` в одной транзакции на стороне БД
- `security definer` обходит RLS, выполняя функцию от имени владельца (postgres)
- Нет race conditions: между двумя запросами с фронтенда может пройти время, пользователь закроет вкладку, сеть упадёт
- Чистый контракт: фронтенд вызывает `rpc('create_project', {...})` и получает готовый проект с `id`

### Хранилище (Storage) — аватарки

**Бакет `avatars`** — публичные аватарки пользователей:

```sql
-- public bucket: avatars are not sensitive, a public URL is fine
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- anyone can read (redundant with public bucket, but covers the API path too)
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- a user may only write into a folder named after their own id: avatars/{user_id}/...
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

**Бакет `project-avatars`** — публичные аватарки проектов:

```sql
-- 1. new column on projects
alter table public.projects
  add column if not exists avatar_url text;

-- 2. bucket for project avatars (public read, same as user avatars)
insert into storage.buckets (id, name, public)
values ('project-avatars', 'project-avatars', true)
on conflict (id) do nothing;

-- 3. anyone can read
create policy "project_avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'project-avatars');

-- 4. any team member (not just the owner) can upload/replace/delete —
--    reuses the same is_project_member() function as the rest of the schema.
--    File path convention: {project_id}/avatar.{ext}
create policy "project_avatars_insert_team"
  on storage.objects for insert
  with check (
    bucket_id = 'project-avatars'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project_avatars_update_team"
  on storage.objects for update
  using (
    bucket_id = 'project-avatars'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );

create policy "project_avatars_delete_team"
  on storage.objects for delete
  using (
    bucket_id = 'project-avatars'
    and public.is_project_member(((storage.foldername(name))[1])::uuid)
  );
```

**Контракт фронта (пользовательский аватар):**

- путь файла всегда `{user_id}/avatar.{расширение}` + `upsert: true` — повторная загрузка перезаписывает файл, а не плодит новые
- к публичному URL приклеивается `?t=${Date.now()}` — иначе браузер закэширует старую картинку по тому же адресу и после замены аватара будет видно старое фото
- валидация типа и размера (2 МБ) — только на клиенте, это UX, а не защита; настоящая граница безопасности — RLS-политика, не пускающая запись в чужую папку `{user_id}/`
- в проде стоит дополнительно ограничить бакет (`file_size_limit`, `allowed_mime_types` в `storage.buckets`)

**Контракт фронта (аватар проекта)** — отличия от пользовательского:

- путь файла `{project_id}/avatar.{расширение}` + `upsert: true`
- политика проверяет `is_project_member(folder::uuid)`, а не `auth.uid() = folder` — **любой участник команды** может заменить аватар проекта, не только владелец
- после загрузки файл URL пишется в `projects.avatar_url` (обновляет любой участник, `projects_update_members`); без записи в БД картинка загрузилась бы, но не отобразилась бы
- общий код валидации/кэш-бастера — `src/lib/avatar.ts`, используется и user-аватаром

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

## Особенности реализации

- **Product Tour** (`src/widgets/landing-tour/`) — секция лендинга сразу после героя: автоплей по 7 шагам (регистрация с OTP → создание проекта: «рука» камера подъезжает к кнопке, приближает блок формы и поочерёдно поля, после отправки диалог плавно превращается в карточку проекта, следом публичные проекты — с цветными аватарками-иконками — прилетают штампом со вспышками частиц и сотрясением страницы, финальный клик по карточке уводит к следующему шагу → шаг «Интерфейс» с пояснением-пузырём (`TourNarration.vue` — текст проявляется по буквам, висит под обведённым блоком или следует за курсором; `choreography.ts` ведёт его по битам: шапка → копирование ссылки → вкладки → раскрытие сайдбара → быстрая смена проекта → разделы меню): мок-оболочка приложения повторяет реальный UI размер в размер — сайдбар как `AppSidebar` (стартует свёрнутым в рейл w-16, раскрывается кнопкой PanelLeft под затемнением фона `bg-black/50`; переключатель проекта — hover-строка с аватаром, абсолютным шевроном «Следующий проект» и `project-slide`-переходом контента, разделы без счётчиков, внизу профиль и статичная LogOut), страница проекта (контейнер `mx-auto max-w-6xl px-4 py-6`: шапка с плиткой-аватаром и камерой, полным uuid, «Вы владелец» и кнопками Send/Copy, вкладки со счётчиками-бейджами), строка поиска и фильтров как в `BugsFilters` (Select-триггеры без шеврона с Check справа, активный фильтр заменяет триггер чипом с крестиком, «Период», «Сбросить всё», группа сортировки) и карточки багов в анатомии `BugCard` (плитка важности, бейдж «Новый», анимированная иконка статуса, футер в две строки с UUID и датой) → шаг «Баги»: клик по карточке открывает отдельную страницу бага (`BugPageScreen.vue` — анатомия `BugDetailPage`: «Назад к проекту», шапка с метками и полным UUID, описание, обсуждение, блок «Репорты», сбоку атрибуты с автосохранением «Сохраняем…» → «Сохранено»); комментарии прилетают под описанием штампом с вспышками частиц и кивком страницы — тем же механизмом, что публичные карточки шага «Проект», — затем страница прокручивается к привязке репортов и возвращается в список → шаг «Ссылка»: страница сама прокручивается к карточке «Видимость» (в настройках все четыре карточки реального `ProjectSettings` — «Основное», «Аватар», «Видимость», «Опасная зона»), чекбокс публичности → «Сохранить» («Сохраняем…» → «Сохранено») → курсор и клик по кнопке-ссылке «Ссылка для репортёров» (outline-кнопка h-8 поверх `<a target="_blank">`: ExternalLink в настройках, Send в шапке, якоря `settings-link`/`header-link` разделены; CopyButton рядом — иконка `ml-2` и зелёный тултип «Ссылка скопирована») → публичная форма репортёра с OTP и карточка успеха отдельно от неё (эмблема в изумрудном круге, font-mono «Репорт отправлен», сводка отправленного, блок про аккаунт по почте и «Открыть репорт» — как в `ReportPage`) → шаг «Репорты»: вкладка репортов — embedded-вид реальной секции (поиск во всю ширину и статичная панель фильтров `ReportFilters`), карточка 1:1 с `ReportCard` (аватар, имя, дата и ID с CopyButton, два отдельных дропдауна «статус»/«флаг» в анатомии outline h-7 + `DropdownMenuContent w-44`, ответ репортёру — редактор и изумрудный блок с «Изменить»/«Удалить ответ», футер «Ответить репортёру»/ghost «Баг»/destructive «Удалить»): статус «Новый» → «Принят», ответ печатается и отправляется, клик по карточке открывает страницу репорта (`ReportDetailScreen.vue` — анатомия `ReportDetailCard`/`ReportManage`: бейджи, изумрудный ответ, бокс «Управление репортом» — «Статус»/«Флаг», «Привязать к багу» с меню `w-72` списка багов проекта и блоком «Отвязать», textarea с ответом и disabled «Сохранить») с пояснением-пузырём, что репорт на уже найденный баг привязывается к существующему, а не дублируется; «/ назад» возвращает во вкладку, где в карточке уже чип «Привязан к…», и на нём же курсор зависает с пояснением про кнопку «Баг» — создание бага из репорта (`bug-create?report=`) без перехода); финал шага: шапка проекта и вкладки плавно уезжают вверх (сайдбар к тому моменту уже свёрнут в рейл — последним битом шага «Интерфейс», и свёрнут он на всех последующих шагах), первые репорты потока (`lib/floodReports.ts`) прилетают в список штампом, а не поместившиеся натекают стопкой по z (`ReportFloodStack.vue` — смещения и наклон по индексу, тень растёт с глубиной, «сбитый шрифт» `lib/glitch.ts` перескакивает по таймеру, слои плывут за реальным курсором); когда окно завалено — оно зарастает стеклом: тот же `GlassShatter` из превью лендинга в «живом» режиме без картинки (`TourGlass.vue`: полупрозрачный материал поверх живого DOM, `shatterAt` бьёт в точке курсора по команде хореографии, после удара осколки остаются висеть — реальный клик пользователя тоже разбивает; в `prefers-reduced-motion` финал показан готовым — завал под уже разбитым стеклом). Интерфейс — собственные мок-экраны фиксированного логического размера 1280×720 (`tourState.ts` — одно реактивное состояние, экраны — чистые функции от него), масштабируемые целиком `transform: scale()` через `ResizeObserver`-замер (`TourStage` → `TourViewport`) — уменьшение строго пропорциональное, без пересчёта шрифтов. Хореография декларативна: `choreography.ts` описывает шаги (label для чипов меню, setup/end состояния и run-последовательность), `useTour.ts` — машина состояний на `motion-v`: курсор на `motionValue` едет к цели (`[data-tour="…"]`), на шагах регистрации и проекта траектория «живая» (`lively`-флаг шага): дуга — квадратичная кривая Безье с чередующейся стороной выгиба и наклоном-пиком посередине полёта, длительность зависит от дистанции, а во время движения камеры курсор сопровождает поле с экспоненциальным сглаживанием (вместо отдельного «прыжка» после разгона); кликает (сжатие + ripple + ASCII-вспышка из глифов), печатает по символу с мигающей кареткой и «магическим появлением» — у каретки рождаются частицы цвета текста, замирающие за 0.5s; шаг регистрации снят «с рук»: при нажатии на поле вся форма плавно приближается (`scale 1.28`), а заполняемое поле камера подводит к центру сцены (dy считается по незатронутым трансформом `offsetTop`, переход к окну OTP — плавная смена самого окна (`<Transition mode="out-in">`: форма сначала растворяется, затем окно кода проявляется — `opacity`/`scale`/`translate` как отдельные CSS-свойства, чтобы не перебивать `translateZ` глубины и центрирование на `translate` из Tailwind v4), камера при этом снапит в хуке `before-enter`, пока новое окно ещё непрозрачно — оно появляется сразу по центру с собственным зумом `1.4` и при печати кода не двигается; сброс камеры — по счётчику эпох `state.epoch`); шаг проекта повторяет эту камеру уже на странице во всю ширину сцены — подход к кнопке создания (`1.6`), приближение блока формы (`1.18`) и подводка полей (`1.28`), причём целевой элемент центрируется обратным раскладыванием его экранных координат с учётом текущего трансформа камеры; после отправки формы диалог не просто уходит, а превращается в карточку проекта: карточки ещё не видно — панель-контейнер (явная лейаут-геометрия + CSS-переходы) перелетает в позицию списка и плавно перекрашивается под карточку (`bg-background` → `bg-card`, `rounded-lg` → `rounded-xl`), введённые название, описание и чекбокс «поднимаются» из полей и летят в слоты карточки (якоря `data-tour-card`), а иконка, заголовок, описание, глобус и meta-строка проявляются по очереди — дата и «Вы владелец» выезжают снизу; только после этого карточка «полноценна» (пропсы `assembling`/`assembled` у `MockProjectCard`), окно живёт отдельным `dialogShown` и доживает до конца морфинга; следом публичные проекты прибиваются в список штампом (быстрый слет сверху с лёгким перелётом) с сотрясением страницы от удара, ASCII-брызгами `TourBurst` у иконки и вспышками частиц `TourSparkles` по периметру карточки (цвет контрастный теме — эстетика магического автонабора из полей), финальный клик по карточке созданного проекта уводит к шагу интерфейса; мок-дизайн выровнен с приложением: диалог — `bg-background`/`rounded-lg`/`shadow-lg` с крестиком, поля — `bg-transparent dark:bg-input/30` как реальные Input/Textarea, карточка повторяет `ProjectCard` (иконка FolderKanban на `primary/10`, meta-строка «Создан … / Вы владелец»); пауза уважается внутри `sleep`, отмена — через токен с `Promise.race`. Глубина тремя слоями: уход/приход экранов вглубь (`translateZ` + blur, `tour-screen`), слои внутри экрана (`tour-depth-*` через `transform: translateZ()`, чтобы не конфликтовать с центрированием на CSS-свойстве `translate` из Tailwind v4) и параллакс декораций при скролле (`useElementBounding`). Старт — по `IntersectionObserver` (порог 0.35, однократно), меню шагов — чипы под сценой (клик = перемотка и повтор), управление — пауза/повтор шага/стрелки, в конце — «Показать снова»; `prefers-reduced-motion` показывает шаг готовым состоянием без анимаций и курсора; секция скрыта ниже `lg` (мобильная адаптация — отдельной итерацией)
- **Аутентификация** — email/password + OTP верификация при регистрации
- **Auth-редиректы** — один механизм под тремя масками (магическая ссылка входа, подтверждение смены почты, подтверждение регистрации): Supabase шлёт письмо со ссылкой на `/auth/callback` (или `/auth/reset-password` для сброса), а `authRedirectUrl(path, redirect?)` поднимает абсолютный URL через `import.meta.env.BASE_URL` — работает и на `/` в dev, и на `/BugBoard/` на Pages. Ловец вне `/app`, без `requiresAuth`: для PKCE (`?code=`) делает `exchangeCodeForSession`, для дефолтного implicit (токены в `#hash`) делает `fetchProfile()` и уходит по `?redirect=` (иначе `/app`). Сброс пароля — отдельный роут: форма нового пароля открывается только по событию `PASSWORD_RECOVERY` (сессия по recovery-ссылке технически неотличима от обычной, а событие может прийти ещё до монтирования компонента — поэтому подписка в `init()` идёт до `getSession()`, а флаг читается из стора). Смена почты — чисто Auth-операция (`updateUser({ email })`), `profiles` не участвует; после подтверждения ловец возвращает в `/app/settings`
- **Публичный репорт** — passwordless-аккаунт репортёра: `signInWithOtp` → код вводится вторым шагом той же формы → `verifyOtp({ type: 'email' })` → `insert` в `reports` сразу после, пока черновик в памяти. Редиректа на `/auth` нет, черновик (title/description) живёт в `ref` компонента. Аккаунт один и тот же: если репортёра позже добавят в команду, миграция данных не нужна — тот же `auth.uid()` просто появится в `project_members`
- **Публичная страница репорта** — `is_public = false` показывается как «Проект недоступен» до отправки: RLS всё равно завернёт инсерт, но без бессмысленной попытки
- **Ответ репортёру** — команда пишет ответ в репорт (`reply` + `reply_author_id` + `replied_at`); репортёр видит его на странице `/reports/:reportId`
- **Привязка репорта к багу** — `reports.bug_id` (FK `on delete set null`). Привязывает только команда: на странице репорта — блок «Привязка к багу» с выбором из багов проекта, на странице бага — блок «Репорты» с привязкой/отвязкой. Обе стороны ограничены одним проектом (`fetchProjectBugs` / `fetchReports` фильтруют по `project_id`), репортёр `bug_id` не видит и не меняет; update охраняет тот же `reports_update_team_only`
- **Мягкое удаление репорта** — «Удалить» (внизу карточки, справа от «Ответить репортёру») запускает 10-секундный откат: поверх карточки ложится полупрозрачный скелетон-оверлей (клики по карточке блокируются), в правом нижнем углу — зелёная «Восстановить (N)» с отсчётом; по истечении времени (или при уходе со вкладки/страницы) ставится `is_deleted = true`. Отмена и удаление идут одним `updateReport`, так что RLS `reports_update_team_only` действует на оба сценария
- **Настройки и удаление проекта** — правки (название, описание, `is_public`, аватар) идут обычным update под политику `projects_update_members`, то есть любым участником; удаление — soft delete (`is_deleted = true`) без отдельной RPC: проект исчезает из списков и перестаёт открываться (`fetchProject` фильтрует `is_deleted`), а баги, репорты и записи участников остаются в базе
- **Локальный drag&drop порядок** — свой композабл `src/lib/useDragReorder.ts` на Pointer Events (мышь, тач, stylus; без новых зависимостей): ручка-гриб `[data-drag-handle]` внутри обёртки элемента `[data-item-id]` (клонировать клики не нужно — ручка sibling карточки, клик после drag попадает в общий предок и не триггерит навигацию), тянемый элемент следует за курсором, соседи сдвигаются через `transform`, drop — FLIP-анимация всех элементов, Escape отменяет, у краёв окна — автоскролл. Порядок живёт в localStorage (`src/lib/localOrder.ts`: ключи `bugboard-projects-order` и `bugboard-reports-order-{projectId}`, «свежие» id без сохранённой позиции встают сверху); применяется к секции «Мои проекты» и к репортам участников (в составе третьего режима сортировки «Вручную»)
- **Один вход для всех** — на странице просмотра репорта нет выбора «разработчик или репортёр»: `signInWithOtp` работает для любого аккаунта, даже с паролем. Дальше всё решает RLS: `reports_select_team_or_owner` — виден ли репорт, `project_members` (`isProjectMember`) — есть ли кнопки управления (`reports_update_team_only` охраняет сам update)
- **Статистика** — вкладка «Статистика» только у участников (вкладки рендерятся только в их ветке страницы, данные дополнительно ограничены RLS): чарты на Unovis через порт shadcn-chart (`src/components/ui/chart/` — `ChartContainer`, `ChartTooltip`/`ChartCrosshair`), монохромная палитра и хелперы микширования цвета — `src/widgets/project-stats/chart-colors.ts` (шкала `--mono-*`, см. «Дизайн и цвет»); лимиты прогресс-бара пишутся в `localStorage` ключом `bugboard-stats-{members|reports}-limit-{projectId}`; склонения чисел — `pluralRu()` из `src/lib/format.ts`
- **Активность профиля** — heatmap (чистый CSS-grid, `src/lib/stats.ts` `bucketByDay()`, 4 уровня интенсивности) + лента последних действий (баги/комментарии/репорты); рендерятся только на своём профиле (RLS всё равно не отдаст чужие данные). На чужом профиле — пересечение `project_members` (`fetchSharedProjects`) показывает общие проекты, а список багов ограничивается ими
- **Ленивые маршруты** — все view подгружаются через динамический `import()` (code-splitting); единственный немедленный импорт в приложении — `AppLayout`; `TooltipProvider` поднят в `App.vue`, чтобы тултипы (карточки, фильтры, шапка проекта) работали в любом месте дерева
- **Тема** — `light`/`dark`, сохраняется в localStorage, начальное значение (если сохранённой нет) — `prefers-color-scheme`
- **UI** — компоненты на reka-ui (headless) + Tailwind, CVA для вариантов, VueUse-хелперы (`useVModel`, `reactiveOmit`, `useMediaQuery`); модальное окно (создание проекта) — с затемнённым фоном, блокировкой скролла страницы и закрытием по Escape или клику вне окна
- **Маршруты** — защита через `meta.requiresAuth`, редирект с `redirect` query; разделы проекта — `/app/projects/:id/{bugs,reports,members,stats,settings}` (имена `project-bugs` … `project-settings`); служебные публичные `/auth/callback` и `/auth/reset-password` — ловцы редиректов из писем Supabase Auth
- **Сайдбар** — коллапсируемый, адаптивный, с иконками Lucide; переключатель проекта и ссылки на его разделы. Список проектов — один запрос `project_members → projects(*)` (`fetchMyProjects`, без удалённых, по алфавиту); активный проект хранится в сторе `activeProject` (localStorage `bugboard-active-project`) и синхронизируется из параметров маршрута: переход на свой проект делает его активным, исчезнувший из списка — подменяется первым; подсветка активного пункта учитывает и разделы-маршруты, и страницу проекта с `?tab=`, и страницу бага
- **Вкладки в URL** — активная вкладка страницы проекта пишется в `?tab=` через `router.replace` (по умолчанию `?tab=` опускается): `router.back()` возвращает на последнюю открытую вкладку, история не засоряется, неизвестное значение игнорируется
- **Контент разделов переиспользуется** — вкладки и одноимённые маршруты рендерят одни и те же виджеты: содержимое «Багов» вынесено в `widgets/project-bugs`, страница проекта и `ProjectSectionPage` — просто разные обёртки над ним; в сторе багов — `bugsProjectId`/`bugsLoading`, чтобы не перезапрашивать при возврате и не гонять данные между проектами; счётчики для бейджей вкладок и заголовков разделов — `tabsCounts`/`fetchTabsCounts` в сторе проектов (два head-count запроса под RLS, обновляются после добавления/удаления участника и удаления репорта); горизонтальный скролл с масками-затемнениями у краёв (вкладки проекта, фильтры багов) — композабл `src/lib/useScrollEdges.ts` + класс `.scroll-x-fade` из `main.css`
- **Архитектура** — Feature-Sliced Design: `views/` — маршрутизируемые экраны (часть — тонкие обёртки над page-виджетами, часть — своя логика), `widgets/` — страницы и их блоки, `entities/` — переиспользуемые сущности
- **Деплой** — GitHub Pages из ветки `gh-pages` (`npm run deploy`), SPA-фолбэк через `404.html`, `base: '/BugBoard/'` только в прод-сборке

## Дизайн и цвет

Направление — **монохром**. Цвет в интерфейсе не украшение, а несущая нагрузка: он маркирует значение, чтобы пользователь отличал его глазом, не читая текст.

### Где цвет допустим

Только два случая:

1. **Маркеры сущностей** — бейджи и точки, по которым различаются значения перечислений. Это единственные цветные элементы в списках:
   - статусы и важность бага — `entities/bug/meta.ts` (`STATUS_BADGE`, `SEVERITY_BADGE`, `SEVERITY_BG`), те же классы продублированы в `BugCard.vue`
   - статусы и флаги репорта — `entities/report/meta.ts` (`REPORT_STATUS_BADGE`, `REPORT_FLAG_BADGE`, `REPORT_STATUS_DOT`)
2. **Кратковременный фидбек действия** — «Скопировано», «Сохранено», успех/ошибка запроса. Обычно `emerald` для успеха и `severity-critical` для ошибки, живут пару секунд и исчезают.

Всё остальное — графика, фоны, границы, иконки, состояния загрузки, прогресс-бары, чарты и хитмап — **без цвета**, на шкале серого.

### Шкала серого

Шесть ступеней `--mono-1` … `--mono-6` в `src/assets/main.css`. Ступени объявлены в `:root` **и продублированы в `.dark` инвертированными**: `--mono-1` — самый контрастный оттенок (на светлой теме почти чёрный, на тёмной — почти белый), `--mono-6` — самый приглушённый. Один и тот же токен поэтому читается верно на обеих темах.

Токены в CSS-переменных, а не в захардкоженных HEX, не случайно: тёмная тема переключается на лету (`stores/theme.ts` вешает `.dark` на `<html>`), и статически зашитый серый на фоне `--card: oklch(0.21 …)` попросту не виден.

> Unovis пишет цвет через `style="fill"`, а не через атрибут `fill` — поэтому `var(--mono-N)` резолвится в чартах. Это свойство библиотеки, на него стоит опираться, а не брать за аксиому: если подменить её на `.attr('fill', …)`, переменная перестанет работать.

### Где шкала применяется

- `src/widgets/project-stats/chart-colors.ts` — палитра чартов (`SEVERITY_CHART_COLOR`, `STATUS_CHART_COLOR`, `AREA_CHART_COLOR`) и хелперы `withAlpha()` / `mixColors()`. Оба собирают `color-mix(in srgb, …)` — это работает с любым CSS-цветом, включая `var()` и `oklch()`, в отличие от прежних реализаций, парсивших HEX
- `src/entities/activity-heatmap/ActivityHeatmap.vue` — четыре уровня интенсивности активности: `bg-muted` (нет событий) → `bg-(--mono-6)` → `bg-(--mono-5)` → `bg-(--mono-3)` → `bg-(--mono-1)` (много)

### Исключение: severity-токены

`--color-severity-critical` / `-major` / `-minor` в `main.css` — цветные и остаются таковыми: они маркируют важность бага (пункт 1 выше) и одновременно служат семантикой ошибок примерно в тридцати файлах. Дробить их на «цветной бейдж» и «чёрно-белую ошибку» нет смысла — это один сигнал.
