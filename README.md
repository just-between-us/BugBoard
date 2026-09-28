# BugBoard

Курсач баг-трекер для команд разработки с открытой формой репортов. Команде — полный доступ, тому, кто нашёл баг — только ссылка и код с почты.

## Стек

- **Vue 3** + **TypeScript** + **Vite**
- **Supabase** — аутентификация и база данных
- **Pinia** — управление состоянием
- **TailwindCSS v4** + **shadcn/ui** (reka-ui) — UI компоненты
- **Vue Router** — маршрутизация
- **Lucide Vue** — иконки

## Функциональность

### Публичная часть

- **Landing page** — описание продукта, демо-лист тикетов, секция "Как это работает", разделение аудиторий (команда / репортёр)
- **Аутентификация** — регистрация с подтверждением email (OTP), вход, сброс пароля (Supabase Auth)

### Приватная часть (требует входа)

- **Сайдбар навигации** — сворачиваемый, с иконками: Проекты, Настройки; блок пользователя ведёт на его профиль
- **Проекты** — список проектов, создание проекта (RPC `create_project`), карточка проекта с описанием, аватаром и вкладками
- **Страница проекта** — баги с фильтрами (статус, важность, область, поиск) и сортировкой, создание бага; вкладки «Репорты», «Настройки» — заглушки
- **Аватар проекта** — загрузка из шапки проекта (JPG/PNG/WebP, ≤ 2 МБ); менять может любой участник команды
- **Участники** — список с ролями и аватарами, ссылки на профили; добавление и удаление (только владелец, по RLS), inline-подтверждение удаления
- **Страница бага** — inline-редактирование заголовка и описания, кнопка «Вернуть изменения», атрибуты (статус, важность, область, автор) с автосохранением
- **Комментарии** — создание, редактирование и удаление (только автор, soft delete), inline-подтверждение удаления
- **Профиль пользователя** — публичная страница `/app/users/:userId`: имя, дата регистрации, созданные баги (только видимые вам)
- **Настройки** — изменение отображаемого имени, загрузка аватарки (JPG/PNG/WebP, ≤ 2 МБ), переключение темы (светлая/тёмная/системная)
- **Header** — лого, переключатель темы, ссылки на вход/создание команды

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

## Деплой

```bash
# GitHub Pages (через gh-pages пакет)
npm run deploy

# Или напрямую
npm run deploy:direct
```

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
│   └── ui/                  # shadcn/ui компоненты (Button, Input, Card, Tooltip, Label...)
├── entities/
│   ├── bug/                 # Метаданные бага: статусы, важность, области, бейджи, иконки
│   └── bug-card/            # Карточка бага в списке
├── layouts/
│   └── AppLayout.vue        # Оболочка приватных маршрутов (сайдбар + контент)
├── lib/
│   ├── supabaseClient.ts    # Инициализация Supabase клиента
│   ├── utils.ts             # cn() — утилита для классов (clsx + tailwind-merge)
│   ├── format.ts            # formatDate(), initials(), toUserError()
│   └── avatar.ts            # validateAvatarFile(), avatarExtension(), withCacheBust()
├── router/index.ts          # Маршруты, защита auth-маршрутов
├── stores/
│   ├── auth.ts              # Pinia store: сессия, профиль, signIn/signUp/signOut, uploadAvatar
│   ├── projects.ts          # Pinia store: проекты, баги, комментарии, участники, профили
│   └── theme.ts             # Pinia store: тема (light/dark/system), localStorage
├── views/                   # Тонкие обёртки над page-виджетами
│   ├── LandingView.vue      # Публичная главная
│   ├── AuthView.vue         # Вход / регистрация / OTP
│   ├── ProjectsView.vue     # Список проектов + создание
│   ├── ProjectView.vue      # Страница проекта
│   ├── BugDetailView.vue    # Страница бага
│   ├── UserProfileView.vue  # Просмотр профиля пользователя
│   └── SettingsView.vue     # Настройки (имя, тема)
├── widgets/                 # Страницы и их блоки (Feature-Sliced Design)
│   ├── project-view-page/   # Страница проекта
│   ├── project-tabs/        # Вкладки проекта
│   ├── bugs-filters/        # Фильтры и сортировка багов
│   ├── bug-list/            # Список багов
│   ├── create-bug-dialog/   # Создание бага
│   ├── bug-detail-page/     # Страница бага
│   ├── bug-detail-header/   # Заголовок бага, inline-редактирование, revert
│   ├── bug-detail-description/
│   ├── bug-detail-comments/ # Комментарии (в т.ч. BugCommentItem)
│   ├── bug-detail-sidebar/  # Атрибуты и детали бага
│   ├── bug-detail-skeleton/
│   ├── project-members/     # Участники проекта (список, добавление, удаление)
│   └── user-profile-page/   # Профиль пользователя
├── App.vue                  # Корневой компонент (RouterView)
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

| Скрипт          | Описание                        |
| --------------- | ------------------------------- |
| `dev`           | Запуск Vite dev server          |
| `build`         | Type-check + production build   |
| `build-only`    | Production build без type-check |
| `preview`       | Превью продакшн сборки          |
| `type-check`    | `vue-tsc --build`               |
| `lint`          | Oxlint + ESLint с автофиксом    |
| `format`        | Prettier на src/                |
| `deploy`        | Build + deploy на GitHub Pages  |
| `deploy:direct` | Deploy без установки gh-pages   |

## Особенности реализации

- **Аутентификация** — email/password + OTP верификация при регистрации
- **Тема** — сохраняется в localStorage, учитывает `prefers-color-scheme`
- **UI** — компоненты на reka-ui (headless) + Tailwind, CVA для вариантов
- **Маршруты** — защита через `meta.requiresAuth`, редирект с `redirect` query
- **Сайдбар** — коллапсируемый, адаптивный, с иконками Lucide
- **Архитектура** — Feature-Sliced Design: `views/` — тонкие обёртки над page-виджетами, `widgets/` — страницы и их блоки, `entities/` — переиспользуемые сущности

## Дизайн

Гайдлайны по проектированию и визуальному оформлению экранов — в [docs/design.md](docs/design.md).
