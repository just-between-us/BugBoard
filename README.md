# BugBoard

Баг-трекер для команд разработки с открытой формой репортов. Команде — полный доступ, тому, кто нашёл баг — только ссылка и код с почты.

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

- **Сайдбар навигации** — сворачиваемый, с иконками: Проекты, Профиль
- **Проекты** — список проектов (пока заглушка), кнопка "Создать новый" с тултипом
- **Профиль** — изменение отображаемого имени, переключение темы (светлая/тёмная/системная)
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
│   ├── layout/              # AppLayout, AppSidebar, AppHeader
│   └── ui/                  # shadcn/ui компоненты (Button, Input, Card, Tooltip, Label...)
├── lib/
│   ├── supabaseClient.ts    # Инициализация Supabase клиента
│   └── utils.ts             # cn() — утилита для классов (clsx + tailwind-merge)
├── router/index.ts          # Маршруты, защита auth-маршрутов
├── stores/
│   ├── auth.ts              # Pinia store: сессия, профиль, signIn/signUp/signOut
│   └── theme.ts             # Pinia store: тема (light/dark/system), localStorage
├── views/
│   ├── LandingView.vue      # Публичная главная
│   ├── AuthView.vue         # Вход / регистрация / OTP
│   ├── ProjectsView.vue     # Список проектов (заглушка)
│   └── ProfileView.vue      # Профиль пользователя
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
- `comments_update_team_only` — обновлять участники

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

## Скрипты package.json

| Скрипт       | Описание                       |
| ------------ | ------------------------------ |
| `dev`        | Запуск Vite dev server         |
| `build`      | Type-check + production build  |
| `preview`    | Превью продакшн сборки         |
| `type-check` | `vue-tsc --build`              |
| `lint`       | Oxlint + ESLint с автофиксом   |
| `format`     | Prettier на src/               |
| `deploy`     | Build + deploy на GitHub Pages |

## Особенности реализации

- **Аутентификация** — email/password + OTP верификация при регистрации
- **Тема** — сохраняется в localStorage, учитывает `prefers-color-scheme`
- **UI** — компоненты на reka-ui (headless) + Tailwind, CVA для вариантов
- **Маршруты** — защита через `meta.requiresAuth`, редирект с `redirect` query
- **Сайдбар** — коллапсируемый, адаптивный, с иконками Lucide

# Design instruction

## Порядок работы

Перед проектированием каждого экрана определи:

1. Кто его пользователь и в каком контексте он находится.
2. Какую основную задачу он здесь решает.
3. Какие данные нужны для решения этой задачи.
4. Какое действие должно быть главным.
5. Какие действия и пояснения понадобятся по мере работы.
6. Как экран связан с остальным продуктом.

Если продуктовые детали неизвестны, обозначь допущения. Не выдавай вымышленные показатели, отзывы или логотипы клиентов за реальные.

## Визуальная идентичность

- Сначала определи характер продукта и аудиторию, затем подбирай цвета, типографику, изображения, иконки и движение.
- Собери небольшой набор визуальных референсов с общим настроением. Заимствуй принципы композиции, но не копируй чужую страницу целиком.
- Выведи основную палитру из выбранного визуального направления; акцентные цвета назначь осознанно.
- Используй изображения и фактуры, которые относятся к миру пользователя и продукту.
- Поддерживай единые правила для отступов, радиусов, типографики, иконок и состояний компонентов.
- Обеспечь читаемость текста поверх фотографий и фактур: при необходимости применяй затемнение, наложение или более спокойный фон.
- Используй анимацию для направления внимания и связи между состояниями или секциями. Повторяй ограниченный набор согласованных приёмов.

## Лендинг

- На первом экране ясно сформулируй, что делает продукт, для кого он создан и какое действие пользователь может совершить дальше.
- Покажи аудиторию через узнаваемый контекст: предметы, рабочую среду, интерфейс или ситуации использования.
- Сначала собери каркас страницы. Возможная последовательность: первый экран → социальное доказательство → как работает продукт → ключевые функции → отзывы или результаты → призыв к действию → подвал.
- Для каждой секции задай одну главную мысль. Изображения должны помогать её понять, а текст — дополнять.
- Показывай реальные функции через крупные, подготовленные изображения интерфейса. Убирай текст, который дублирует очевидное.
- Чередуй насыщенные визуальные секции и спокойные участки, в которых удобно изучать продукт.
- Сохраняй свободное пространство вокруг главного заголовка и кнопки. Декоративные элементы не должны мешать чтению.
- Добавляй логотипы клиентов, отзывы и цифры только при наличии подтверждённых материалов.
- Продумывай переходы между секциями; анимация должна подчёркивать сценарий просмотра, а не становиться самоцелью.

## Дашборд и данные

- Пусть формат данных определяет формат интерфейса: сравнение записей — таблица, последовательность событий — временная шкала, динамика во времени — график.
- Показывай ключевые показатели там, где они помогают принять решение. На тематических страницах оставляй только относящиеся к их задаче метрики.
- В таблицах выравнивай числовые значения по правому краю, ограниченные категории представляй понятными метками, длинный текст сокращай без потери доступа к полному значению.
- Визуально различай активные, неактивные и требующие внимания записи.
- Назначай цвету смысл: статус, срочность, категорию или значение данных. Сохраняй этот смысл во всём продукте.
- Используй аватары, значки и компактные графики, когда они ускоряют считывание информации.
- Для аналитики предлагай полезные операции над данными: фильтрацию, сравнение, детализацию и переключение представлений — если они отвечают задачам пользователя.

## Действия и раскрытие возможностей

- Делай главное действие на экране заметным сразу.
- Размещай второстепенные действия рядом с объектом, к которому они относятся: в контекстном меню, всплывающей или боковой панели.
- Внутри каждой панели снова выстраивай иерархию: наиболее вероятное действие показывай первым.
- Раскрывай сложность постепенно. Основные поля формы показывай сразу, расширенные настройки — по запросу.
- Для новых пользователей выстраивай последовательность освоения: первое важное действие, затем следующая подсказка или короткий чек-лист.
- Продумывай действия, которые появляются только при взаимодействии: копирование, комментирование, редактирование, удаление, просмотр подробностей.
- Не полагайся только на значок: для неоднозначных действий и терминов предусмотри понятную подпись или подсказку.
- Проверяй, что скрытые действия остаются обнаружимыми и доступными на устройствах без наведения курсора.

## Формы, тарифы и настройки

- Выбирай формат формы по сложности задачи: короткое действие может открываться в модальном окне, объёмный сценарий — на отдельном экране.
- Группируй поля по смыслу и оставляй место для параметров, которые действительно нужны пользователю.
- На странице тарифов выделяй цену и период оплаты, ясно объясняй скидку и различия между текущим и следующим планом.
- Размещай платежные реквизиты, способ оплаты и документы в предсказуемом разделе.
- Организуй навигацию вокруг задач пользователя; связанные настройки объединяй.

## Состояния и качество реализации

Для каждого важного экрана и компонента продумай:

- Загрузку и отсутствие данных.
- Ошибку и способ восстановления.
- Успешное выполнение действия и обратную связь.
- Отключённое, выбранное и активное состояния.
- Длинные значения, большие объёмы данных и узкий экран.
- Подсказки, всплывающие панели, диалоги подтверждения и действия с клавиатуры.

Проверяй интерфейс не только как макет, но и как последовательность реальных действий пользователя.

## Формат результата

Когда предлагаешь дизайн или реализуешь экран, представь:

1. Цель экрана и основной сценарий пользователя.
2. Структуру страницы или экрана.
3. Какие данные показаны и почему выбран этот формат.
4. Главное и второстепенные действия.
5. Визуальные правила, согласованные с остальным продуктом.
6. Интерактивные и пограничные состояния.
7. Принятые допущения и вопросы, требующие решения владельца продукта.

Критерий готовности: пользователь понимает назначение экрана, видит нужные данные, может выполнить основное действие и получает понятную обратную связь на каждом шаге.
