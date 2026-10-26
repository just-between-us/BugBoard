# Self-hosting

Инструкция по самостоятельному разворачиванию BugBoard: свой Supabase (или его self-hosted вариант) + статический фронтенд на любом хостинге. Публичный деплой проекта — GitHub Pages, но фронтенд ничем не привязан к Pages: это обычный Vite-билд, который отдаётся как статика.

## Что нужно

- **Node.js** `^22.18.0` или `>=24.12.0` (см. `engines` в `package.json`)
- **Проект Supabase** — облачный или self-hosted (Docker). Нужны Auth, Postgres и Storage
- Хостинг для статики (GitHub Pages, Netlify, Vercel, Cloudflare Pages, nginx — любой)

## 1. Клонировать и поставить

```bash
git clone <репозиторий>
cd BugBoard
npm install
```

## 2. Поднять бэкенд (Supabase)

Порядок шагов важен: сначала таблицы и функции, потом RLS, потом бакеты.

1. **Создать проект** в Supabase (в облаке — через дашборд, self-hosted — через `docker compose` из официального репозитория Supabase)
2. **Применить схему БД** — в SQL-редакторе Supabase выполнить все блоки из [docs/database.md](database.md) по порядку:
   - таблицы `profiles`, `projects`, `project_members`, `bugs`, `bug_comments`, `reports`
   - триггер `handle_new_user` (автосоздание профиля при регистрации)
   - хелпер `is_project_member`
   - RPC-функция `create_project`
3. **Включить RLS** на всех таблицах и **применить политики** — раздел «Row Level Security» и «Политики доступа» в [docs/database.md](database.md)
4. **Создать бакеты Storage** `avatars` и `project-avatars` (публичные для чтения) и **применить их политики** — раздел «Хранилище (Storage)» в [docs/database.md](database.md)
5. **Настроить Auth**:
   - включить нужные провайдеры (минимум email/password + email OTP)
   - в шаблонах писем оставить и `{{ .Token }}` (шестизначный код для `verifyOtp({ type: 'email' })`), и `{{ .ConfirmationURL }}` (ссылка для `/auth/callback` и `/auth/reset-password`) — приложение использует оба сценария
   - добавить URL'ы редиректов, покрывающие ваш хост и пути `/auth/callback` и `/auth/reset-password` (см. «Что учесть» ниже)
6. **Взять URL проекта и anon key** из настроек API — они понадобятся в `.env`

> Точные названия вкладок и пунктов в дашборде Supabase со временем меняются, поэтому выше даны только сами операции, а не пути до них в UI.

## 3. Настроить окружение

```bash
cp .env.example .env
```

Заполнить `.env`:

| Переменная               | Описание                                            |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | URL вашего проекта Supabase                         |
| `VITE_SUPABASE_ANON_KEY` | anon key (публичный ключ) Supabase                  |

`VITE_SUPABASE_ANON_KEY` попадает в бандл — это нормально, он публичный по дизайну; доступ к данным контролируют RLS-политики, а не сокрытие ключа.

## 4. Запуск и проверка

```bash
npm run dev        # dev-сервер на http://localhost:5173
npm run type-check # проверка типов
npm run build      # продакшн-сборка в dist/
```

## 5. Деплой фронтенда

Фронтенд — статика из `dist/`. Любой хостинг, но с двумя нюансами SPA:

- **SPA-фолбэк**: маршрутизация history-based, поэтому неизвестные пути должны отдавать `index.html`. На GitHub Pages это решается копией `dist/index.html` → `dist/404.html` (уже входит в `npm run deploy`); на Netlify/Vercel/Cloudflare — rewrite правилом `/* → /index.html`; на nginx — `try_files $uri $uri/ /index.html`
- **base path**: `base: '/BugBoard/'` задаётся в `vite.config.ts` только для `command === 'build'`. Если сайт живёт в корне домена — уберите или обнулите base; если в подкаталоге — укажите его. Dev-сервер всегда работает на `/`

### GitHub Pages (штатный способ)

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

Публикуется только `dist`, рабочая ветка не переключается; `vite.config.ts` и `package.json` коммитятся в `main` отдельно.

## Что учесть

- **Auth-редиректы**: все ссылки в письмах строятся через `authRedirectUrl()` (`src/lib/authRedirect.ts`) от `import.meta.env.BASE_URL`, поэтому путь подставляется сам при любом base. Redirect URLs в Supabase настройте wildcard'ом, покрывающим `…/auth/callback` и `…/auth/reset-password` на обоих хостах — dev (`http://localhost:5173/*`) и прод
- **Хэш и query в письмах**: `404.html` — копия `index.html`, поэтому `#access_token=` / `?code=` долетают до Vue-роутера нетронутыми. На хостингах с rewrite это обеспечивает правило `/* → index.html`
- **RLS не зависит от origin**: политики работают одинаково локально и на Pages — проверять origin'ом их не нужно
- **Тема и порядок списков** живут в `localStorage` браузера (`bugboard-theme`, `bugboard-active-project`, `bugboard-projects-order`, `bugboard-reports-order-{projectId}`, `bugboard-stats-{members|reports}-limit-{projectId}`) — переносить их между устройствами не нужно и нельзя
