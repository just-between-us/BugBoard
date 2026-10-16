# Идея: превью-блок на лендинге («разбивающееся стекло»)

Замысел: увидел в интернете сайт с эффектом стекла, которое разбивается на большие осколки — они остаются практически на месте, лишь с небольшим зазором между собой, реагируют на движение курсора и красиво, реалистично переливаются.

## Сценарий

1. **По умолчанию** — анимация (реализуется отдельно, через motion): блоки приложения с курсором, который показывает процедуру создания проекта и репорта.
2. **Кнопка «Запустить превью»** — по нажатию:
   - окно показывает заранее записанное видео с игрой, в которой произошёл баг компилятора шейдеров;
   - через 5 секунд открывается фейковый терминал с летящими ошибками;
   - блок «Превью» покрывается стеклом, поверх — небольшая подсказка «Нажми»;
   - после нажатия стекло разбивается и открывает форму репорта: текст автонабирается плавно, самостоятельно, но с возможностью отредактировать;
   - после отправки — редирект на авторизацию/регистрацию, а репорт улетает в seed-проект с названием приложения — BugBoard.

## Разбивка на части

| Часть                                            | Сложность                                  | Инструмент                                                        |
| ------------------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------- |
| Стекло: осколки + блик по курсору                | Высокая                                    | CSS `clip-path` + `backdrop-filter` + GSAP для разлёта            |
| Видео с багом шейдеров                           | Низкая (это контент, а не код)             | обычный `<video>`, запись — тот же OBS, что и для README          |
| Фейковый терминал с ошибками                     | Низкая                                     | самодельный composable, ~40 строк                                 |
| Автонабор текста репорта (с правом вмешаться)    | Низкая–средняя                             | composable + слушатель ручного ввода для отмены                   |
| Редирект на `/auth` + репорт в seed-проект       | Нулевая — переиспользуем то, что уже есть  | query-параметры + существующий `/report/:projectId`               |

Последний пункт требует вообще ноль нового кода. Ниже — разбор по порядку.

## 1. Стекло — осколки на месте + блик, реагирующий на курсор

Два уровня сложности, выбирай по бюджету времени.

### Практичный уровень (реально собрать за разумное время)

Слой из `div`-ов с `clip-path: polygon(...)`, лежащий поверх превью. Каждый осколок — не кусок вырезанного контента (это сложнее), а полупрозрачная стеклянная панель со своим бликом:

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// заранее заданные формы осколков — проще сгенерировать в SVG voronoi-генераторе
// (ищется как "svg shatter generator" / "voronoi fracture svg") и перевести точки в %,
// чем высчитывать вручную — геометрия реалистичной трещины на глаз не считается
const shards = [
  { clip: 'polygon(0% 0%, 45% 0%, 38% 42%, 0% 55%)', offset: [-2, -1] },
  { clip: 'polygon(45% 0%, 100% 0%, 100% 38%, 38% 42%)', offset: [3, -2] },
  { clip: 'polygon(0% 55%, 38% 42%, 52% 100%, 0% 100%)', offset: [-3, 2] },
  { clip: 'polygon(38% 42%, 100% 38%, 100% 100%, 52% 100%)', offset: [2, 3] },
  // добавить ещё 4–6 для более убедительной трещины
]

const containerRef = ref<HTMLElement | null>(null)

function handleMove(e: MouseEvent) {
  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  containerRef.value?.style.setProperty('--mx', `${x}%`)
  containerRef.value?.style.setProperty('--my', `${y}%`)
}

onMounted(() => window.addEventListener('pointermove', handleMove))
onUnmounted(() => window.removeEventListener('pointermove', handleMove))
</script>

<template>
  <div ref="containerRef" class="absolute inset-0">
    <div
      v-for="(shard, i) in shards"
      :key="i"
      class="glass-shard absolute inset-0"
      :style="{
        clipPath: shard.clip,
        transform: `translate(${shard.offset[0]}px, ${shard.offset[1]}px)`,
      }"
    />
  </div>
</template>

<style scoped>
.glass-shard {
  background: linear-gradient(135deg, rgb(255 255 255 / 0.06), rgb(255 255 255 / 0.18));
  backdrop-filter: blur(3px) saturate(1.15);
  border: 1px solid rgb(255 255 255 / 0.15);
}
.glass-shard::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--mx, 50%) var(--my, 50%),
    rgb(255 255 255 / 0.5),
    transparent 35%
  );
  mix-blend-mode: overlay;
}
</style>
```

Ключевая механика: `--mx/--my` — CSS-переменные, выставляются один раз на контейнере, но каждый осколок через `background-position: var(--mx) var(--my)` в собственных координатах `clip-path` читает их так, будто блик реально бежит по стеклу под курсором — ни одного JS-пересчёта на осколок, вся отрисовка на GPU через CSS.

### Продвинутый уровень (если останется время)

Реальное искажение фона через SVG `<feTurbulence>` + `<feDisplacementMap>` — это и есть эффект «жидкого стекла», который Apple показала на WWDC и который копируют многие сайты в 2026-м. Технически — `filter: url(#glass-distortion)` на том же слое. Совет: сначала довести до рабочего состояния практический уровень целиком, и только потом возвращаться сюда — это чисто косметическая надстройка поверх уже работающей механики.

### Разлёт при клике

Здесь действительно нужен GSAP (бесплатный) — координировать разлёт 6–8 независимых осколков с разбросом по времени и направлению — ровно то, для чего существует `stagger`:

```ts
import gsap from 'gsap'

function shatter(container: HTMLElement) {
  const shards = container.querySelectorAll('.glass-shard')
  gsap.to(shards, {
    x: () => gsap.utils.random(-120, 120),
    y: () => gsap.utils.random(-80, 200),
    rotation: () => gsap.utils.random(-25, 25),
    opacity: 0,
    duration: 0.6,
    ease: 'power2.in',
    stagger: { each: 0.03, from: 'random' },
  })
}
```

### Про мобильные

Блик «от курсора» на тач-экране не имеет смысла — курсора там нет. Не эмулировать через `DeviceOrientation` (отдельная банка червей с разрешениями браузера), а проще: на `< 768px` просто не монтировать блик-слой (`v-if="!isTouchDevice"`, для этого уже есть `useMediaQuery` из VueUse) — осколки с базовым стеклянным тоном без блика выглядят прилично и сами по себе.

## 2. Фейковый терминал

```ts
// composables/useFakeTerminal.ts
import { ref, onUnmounted } from 'vue'

const errorLines = [
  '[ERROR] shader compilation failed: vertex_main.glsl:142',
  '[ERROR] 0x8B81: INVALID_OPERATION — uniform mat4 u_model not found',
  '[WARN]  fallback to software rasterizer',
  '[ERROR] segmentation fault at 0x00007ffde3a1',
  '[ERROR] frame buffer corruption detected',
  // добавить ещё строк для разнообразия
]

export function useFakeTerminal() {
  const lines = ref<string[]>([])
  let timer: ReturnType<typeof setInterval>

  function start() {
    timer = setInterval(() => {
      const line = errorLines[Math.floor(Math.random() * errorLines.length)]
      lines.value.push(`${line} ${Date.now().toString().slice(-4)}`)
      if (lines.value.length > 30) lines.value.shift() // не копим бесконечно в DOM
    }, 180)
  }

  function stop() {
    clearInterval(timer)
  }

  onUnmounted(stop)
  return { lines, start, stop }
}
```

Рендерить `lines` в `font-mono text-severity-critical` — токен уже есть именно для такого кейса, новый цвет не изобретать. Автоскролл — `scrollTop = scrollHeight` в вотчере на `lines.length`.

## 3. Автонабор текста репорта — с правом вмешаться

```ts
// composables/useTypewriter.ts
import { ref } from 'vue'

export function useTypewriter(target: () => string, speedMs = 35) {
  const text = ref('')
  const manuallyEdited = ref(false)
  let timer: ReturnType<typeof setTimeout>

  function type(i = 0) {
    if (manuallyEdited.value) return
    const full = target()
    if (i > full.length) return
    text.value = full.slice(0, i)
    timer = setTimeout(() => type(i + 1), speedMs + (Math.random() > 0.9 ? 120 : 0))
  }

  function onUserInput() {
    manuallyEdited.value = true
    clearTimeout(timer)
  }

  return { text, type, onUserInput }
}
```

В шаблоне — обычный `<Textarea v-model="text" @keydown="onUserInput" />`: это реальное, не задизейбленное поле с самого начала, автонабор просто пишет в тот же `v-model`, а любое нажатие клавиши пользователем останавливает таймер. Никакого «переключения из фейкового в настоящее поле» не нужно.

## 4. Редирект и seed-проект — всё уже готово

Самое важное: **не строить отдельный путь отправки для этой демки**. Уже есть `/report/:projectId` с полностью рабочим драфтом, OTP и инсертом. Нужно просто:

1. Один раз создать публичный проект с именем «BugBoard» через существующий `create_project` RPC (хоть прямо из консоли браузера на своём аккаунте) — полученный `id` положить как константу в код лендинга.
2. После того как человек «написал» репорт в разбитом стекле и нажал отправить — не вызывать `insert` самим, а просто редиректить:

```ts
router.push({
  path: `/report/${SEED_PROJECT_ID}`,
  query: { title: draftTitle, description: draftDescription },
})
```

3. На самой странице `/report/:projectId` при маунте: если в query пришли `title`/`description` — предзаполнить ими черновик вместо пустой формы. Это 3–4 строки в уже существующем компоненте, а не новая система.

Дальше всё написанное ранее отрабатывает без единого изменения: OTP, вставка, редирект после входа — потому что это тот же самый путь, которым идёт настоящий репортёр.

## Структура файлов

Это самостоятельный виджет — не мешать в `LandingView.vue`: завести `widgets/landing-preview/` с внутренним состоянием-машиной:

```ts
type PreviewState = 'idle' | 'video' | 'terminal' | 'glass' | 'form'
```

и уже туда вкладывать `GlassShatter.vue`, `FakeTerminal.vue` — так же, как уже разложены блоки `project-stats`.
