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

- **Landing page** — описание продукта, демо-лист тикетов, секция "Как это работает", разделение аудиторий (команда / репортёр)
- **Аутентификация** — регистрация с подтверждением email (OTP), вход, сброс пароля (Supabase Auth)
- **Публичный репорт** — страница `/report/:projectId` для публичных проектов: форма (заголовок, описание, почта), OTP-код вводится вторым шагом прямо на ней — черновик не теряется, инсерт в `reports` сразу после `verifyOtp`. Приватный или несуществующий проект — «Проект недоступен», форма не показывается
- **Просмотр репорта** — страница `/reports/:reportId` для всех: до входа только форма «почта → код» (RLS не отдаёт даже факт существования репорта), после входа — данные репорта, если RLS (`reports_select_team_or_owner`) вернул строку. Элементы управления показываются, только если `project_members` подтвердил членство в проекте репорта, включая блок «Привязка к багу» (только баги того же проекта)

### Приватная часть (требует входа)

- **Сайдбар навигации** — сворачиваемый, с иконками: Проекты, Настройки; блок пользователя ведёт на его профиль; переключатель активного проекта (дропдаун с аватаром и названием: список проектов с галочкой у активного, состояния загрузки и «Вы пока не состоите в проектах» с пунктом «Создать проект»; выбор проекта меняет только контекст, не уводя со страницы) и ссылки на разделы активного проекта — Баги, Репорты, Участники, Статистика, Настройки; на мобильных и планшетах (< 768px) — оверлей поверх контента (закрытие: кнопкой в шапке сайдбара, кликом по фону, Escape или при переходе), на десктопе — обычный sticky-столбец
- **Проекты** — список проектов, разбитый на секции «Мои проекты» и «Публичные проекты» (для пустой секции — своя подсказка), создание проекта (RPC `create_project`), карточка проекта с описанием, аватаром и вкладками
- **Страница проекта** — два режима по членству в команде (проверяется до загрузки проекта, флаг готов к первому рендеру): участникам — вкладки «Баги» (фильтры: статус, важность, область, поиск; сортировка; создание бага), «Репорты», «Участники», «Статистика», «Настройки» (заглушка); активная вкладка синхронизируется с URL (`?tab=`): `router.back()` возвращает на последнюю открытую вкладку, значение валидируется по белому списку, «Баги» как значение по умолчанию в URL не пишутся; не-участнику (даже для публичного проекта) — простой просмотр без вкладок и без кнопки создания бага: шапка проекта (без подсказки «можно изменить в настройках» и без загрузки аватара) плюс только свои репорты; на узких экранах вкладки прокручиваются горизонтально, а длинные поля (ID, дата, область, ссылка на репорт) складываются в колонку
- **Разделы проекта в сайдбаре** — те же вкладки доступны как отдельные маршруты `/app/projects/:id/{bugs,reports,members,stats,settings}`: `ProjectSectionPage` рендерит контент без шапки проекта и табов, с компактным заголовком «Проект / Раздел», скелетоном на загрузке; не-участника страница возвращает на страницу проекта, при неудачной загрузке — на список проектов; контент переиспользует те же виджеты, что и вкладки (логика не дублируется)
- **Статистика проекта** — вкладка только для участников (вкладки в этом режиме рендерятся только для них): карточки на Unovis — «Всего багов» (полукруглый donut с разбивкой по важности и процентами), «Статусы» (группированная столбчатая диаграмма), «Распределение по областям» (интерактивный donut: ховер на сегмент или строку легенды подсвечивает сектор и выводит его в центр), «Динамика появления» (area-чарт багов и репортов, переключатель диапазона 3 месяца / 30 дней / 7 дней); плюс карточки «Участников» и «Репорты» — число со склонением и прогресс-бар «N из M» с редактируемым лимитом (сохраняется в `localStorage` по проекту), цвет бара градиентом синий→красный; состояния загрузки/ошибки со скелетоном и кнопкой «Повторить»
- **Репорты** — рабочая вкладка команды: список репортов с поиском, фильтрами (статус, привязка к багу) и сортировкой по дате создания / обновления с переключением направления (как у багов: активный фильтр — чип с крестиком, сброс всего — одной кнопкой), смена статуса (`new` / `confirmed` / `rejected`) и флага (`spam` / `duplicate`) через дропдауны, ответ репортёру (создание, изменение, удаление), бейдж привязки к багу со ссылкой на него, переход к деталям репорта кликом по карточке (как у багов: клики по кнопкам, ссылкам и полям ввода навигацию не вызывают), мягкое удаление с 10-секундным окном восстановления (кнопка «Удалить» — внизу карточки рядом с «Ответить репортёру»); для не-участников команды (по RLS видны только их собственные репорты) — упрощённая карточка: статус-бейдж только для чтения и ответ команды, без ID, флагов, привязки к багу и действий; фильтр привязки к багу и загрузка багов для них отключены
- **Аватар проекта** — загрузка из шапки проекта (JPG/PNG/WebP, ≤ 2 МБ); менять может любой участник команды
- **Участники** — список с ролями и аватарами, ссылки на профили; добавление и удаление (только владелец, по RLS), inline-подтверждение удаления
- **Страница бага** — inline-редактирование заголовка и описания, кнопка «Вернуть изменения», атрибуты (статус, важность, область, автор) с автосохранением; блок «Репорты» — привязанные и свободные репорты проекта с поиском и фильтром по статусу
- **Комментарии** — создание, редактирование и удаление (только автор, soft delete), inline-подтверждение удаления
- **Профиль пользователя** — публичная страница `/app/users/:userId`: имя, дата регистрации, созданные баги (только видимые вам), секция «Активность» (видна только на своём профиле: heatmap событий в стиле GitHub по багам/комментариям/репортам + лента последних действий); на чужом профиле — бейджи общих проектов с вами (пересечение `project_members`) и баги, видимые только из этих проектов
- **Настройки** — изменение отображаемого имени, загрузка аватарки (JPG/PNG/WebP, ≤ 2 МБ), переключение темы (светлая/тёмная)
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
- **Supabase → Authentication → URL Configuration**: добавить `https://just-between-us.github.io` в Site URL и Redirect URLs — иначе подтверждение почты и OAuth будут редиректить на `localhost`
- **Supabase → Authentication → Email Templates**: шаблон, который уходит на `signInWithOtp`, должен содержать `{{ .Token }}` (код из 6 цифр) — иначе в письме придёт только ссылка и `verifyOtp({ type: 'email' })` не пройдёт
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
│   └── ui/                  # shadcn/ui компоненты (Button, Input, Card, Badge, Dialog, DropdownMenu, Select, Textarea, Separator, Progress, Chart на Unovis, Tooltip, Label...)
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
│   ├── utils.ts             # cn() — утилита для классов (clsx + tailwind-merge)
│   ├── format.ts            # formatDate(), formatDateOnly(), initials(), pluralRu(), toUserError()
│   ├── avatar.ts            # validateAvatarFile(), avatarExtension(), withCacheBust()
│   └── stats.ts             # bucketByDay() — бакеты дат по дням для heatmap
├── router/index.ts          # Маршруты (все view — ленивые), защита auth-маршрутов
├── stores/
│   ├── activeProject.ts     # Pinia store: активный проект (localStorage `bugboard-active-project`), переключатель в сайдбаре
│   ├── auth.ts              # Pinia store: сессия, профиль, signIn/signUp/signOut, sendOtp/verifyEmailOtp, uploadAvatar
│   ├── projects.ts          # Pinia store: проекты (в т.ч. мои проекты), баги, комментарии, участники, профили, репорты, общие проекты
│   └── theme.ts             # Pinia store: тема (light/dark), localStorage, начальное значение из prefers-color-scheme
├── views/                   # Маршрутизируемые экраны (часть — тонкие обёртки над page-виджетами)
│   ├── LandingView.vue      # Публичная главная
│   ├── AuthView.vue         # Вход / регистрация / OTP
│   ├── ReportView.vue       # Публичная страница репорта
│   ├── ReportDetailView.vue # Просмотр конкретного репорта
│   ├── ProjectsView.vue     # Список проектов + создание
│   ├── ProjectView.vue      # Страница проекта
│   ├── ProjectBugsView.vue  # Разделы проекта из сайдбара (по аналогии Project{Reports,Members,Stats,Settings}View)
│   ├── BugDetailView.vue    # Страница бага
│   ├── UserProfileView.vue  # Просмотр профиля пользователя
│   └── SettingsView.vue     # Настройки (имя, аватар, тема)
├── widgets/                 # Страницы и их блоки (Feature-Sliced Design)
│   ├── project-view-page/   # Страница проекта
│   ├── project-section-page/ # Раздел проекта из сайдбара (гейт по членству, без шапки и табов)
│   ├── project-bugs/        # Содержимое вкладки «Баги» (фильтры, список, создание) — для страницы проекта и раздела
│   ├── project-header/      # Шапка проекта (аватар, описание, копирование ID)
│   ├── project-tabs/        # Вкладки проекта
│   ├── project-stats/       # Вкладка «Статистика»: 6 карточек на Unovis + прогресс-бары, chart-colors.ts
│   ├── bugs-filters/        # Фильтры и сортировка багов
│   ├── bug-list/            # Список багов
│   ├── create-bug-dialog/   # Создание бага
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

- **Аутентификация** — email/password + OTP верификация при регистрации
- **Публичный репорт** — passwordless-аккаунт репортёра: `signInWithOtp` → код вводится вторым шагом той же формы → `verifyOtp({ type: 'email' })` → `insert` в `reports` сразу после, пока черновик в памяти. Редиректа на `/auth` нет, черновик (title/description) живёт в `ref` компонента. Аккаунт один и тот же: если репортёра позже добавят в команду, миграция данных не нужна — тот же `auth.uid()` просто появится в `project_members`
- **Публичная страница репорта** — `is_public = false` показывается как «Проект недоступен» до отправки: RLS всё равно завернёт инсерт, но без бессмысленной попытки
- **Ответ репортёру** — команда пишет ответ в репорт (`reply` + `reply_author_id` + `replied_at`); репортёр видит его на странице `/reports/:reportId`
- **Привязка репорта к багу** — `reports.bug_id` (FK `on delete set null`). Привязывает только команда: на странице репорта — блок «Привязка к багу» с выбором из багов проекта, на странице бага — блок «Репорты» с привязкой/отвязкой. Обе стороны ограничены одним проектом (`fetchProjectBugs` / `fetchReports` фильтруют по `project_id`), репортёр `bug_id` не видит и не меняет; update охраняет тот же `reports_update_team_only`
- **Мягкое удаление репорта** — «Удалить» (внизу карточки, справа от «Ответить репортёру») запускает 10-секундный откат: поверх карточки ложится полупрозрачный скелетон-оверлей (клики по карточке блокируются), в правом нижнем углу — зелёная «Восстановить (N)» с отсчётом; по истечении времени (или при уходе со вкладки/страницы) ставится `is_deleted = true`. Отмена и удаление идут одним `updateReport`, так что RLS `reports_update_team_only` действует на оба сценария
- **Один вход для всех** — на странице просмотра репорта нет выбора «разработчик или репортёр»: `signInWithOtp` работает для любого аккаунта, даже с паролем. Дальше всё решает RLS: `reports_select_team_or_owner` — виден ли репорт, `project_members` (`isProjectMember`) — есть ли кнопки управления (`reports_update_team_only` охраняет сам update)
- **Статистика** — вкладка «Статистика» только у участников (вкладки рендерятся только в их ветке страницы, данные дополнительно ограничены RLS): чарты на Unovis через порт shadcn-chart (`src/components/ui/chart/` — `ChartContainer`, `ChartTooltip`/`ChartCrosshair`), палитра и хелперы микширования цвета — `src/widgets/project-stats/chart-colors.ts`; лимиты прогресс-бара пишутся в `localStorage` ключом `bugboard-stats-{members|reports}-limit-{projectId}`; склонения чисел — `pluralRu()` из `src/lib/format.ts`
- **Активность профиля** — heatmap (чистый CSS-grid, `src/lib/stats.ts` `bucketByDay()`, 4 уровня интенсивности) + лента последних действий (баги/комментарии/репорты); рендерятся только на своём профиле (RLS всё равно не отдаст чужие данные). На чужом профиле — пересечение `project_members` (`fetchSharedProjects`) показывает общие проекты, а список багов ограничивается ими
- **Ленивые маршруты** — все view подгружаются через динамический `import()` (code-splitting); единственный немедленный импорт в приложении — `AppLayout`; `TooltipProvider` поднят в `App.vue`, чтобы тултипы (карточки, фильтры, шапка проекта) работали в любом месте дерева
- **Тема** — `light`/`dark`, сохраняется в localStorage, начальное значение (если сохранённой нет) — `prefers-color-scheme`
- **UI** — компоненты на reka-ui (headless) + Tailwind, CVA для вариантов, VueUse-хелперы (`useVModel`, `reactiveOmit`, `useMediaQuery`)
- **Маршруты** — защита через `meta.requiresAuth`, редирект с `redirect` query; разделы проекта — `/app/projects/:id/{bugs,reports,members,stats,settings}` (имена `project-bugs` … `project-settings`)
- **Сайдбар** — коллапсируемый, адаптивный, с иконками Lucide; переключатель проекта и ссылки на его разделы. Список проектов — один запрос `project_members → projects(*)` (`fetchMyProjects`, без удалённых, по алфавиту); активный проект хранится в сторе `activeProject` (localStorage `bugboard-active-project`) и синхронизируется из параметров маршрута: переход на свой проект делает его активным, исчезнувший из списка — подменяется первым; подсветка активного пункта учитывает и разделы-маршруты, и страницу проекта с `?tab=`, и страницу бага
- **Вкладки в URL** — активная вкладка страницы проекта пишется в `?tab=` через `router.replace` (по умолчанию `?tab=` опускается): `router.back()` возвращает на последнюю открытую вкладку, история не засоряется, неизвестное значение игнорируется
- **Контент разделов переиспользуется** — вкладки и одноимённые маршруты рендерят одни и те же виджеты: содержимое «Багов» вынесено в `widgets/project-bugs`, страница проекта и `ProjectSectionPage` — просто разные обёртки над ним; в сторе багов — `bugsProjectId`/`bugsLoading`, чтобы не перезапрашивать при возврате и не гонять данные между проектами
- **Архитектура** — Feature-Sliced Design: `views/` — маршрутизируемые экраны (часть — тонкие обёртки над page-виджетами, часть — своя логика), `widgets/` — страницы и их блоки, `entities/` — переиспользуемые сущности
- **Деплой** — GitHub Pages из ветки `gh-pages` (`npm run deploy`), SPA-фолбэк через `404.html`, `base: '/BugBoard/'` только в прод-сборке

## Дизайн

Гайдлайны по проектированию и визуальному оформлению экранов — в [docs/design.md](docs/design.md).
