<script setup lang="ts">
import { animate, Motion, motionValue } from 'motion-v'
import { computed, nextTick, ref, watch } from 'vue'
import { Check, Plus } from '@lucide/vue'
import { VIEW_H, VIEW_W, tourState } from '../tourState'
import MockField from '../parts/MockField.vue'
import MockProjectCard from '../parts/MockProjectCard.vue'
import TourBurst from '../parts/TourBurst.vue'
import TourSparkles from '../parts/TourSparkles.vue'

/**
 * Шаг 2: страница проектов на всю ширину сцены и диалог создания с «рукой» камеры —
 * подход к кнопке создания, приближение всего блока формы, затем поочерёдная
 * подводка заполняемых полей к центру (как в шаге регистрации).
 *
 * Отправка формы — содержательный морфинг, а не затухание: карточки ещё не видно,
 * панель контейнера перелетает в позицию списка и перекрашивается под карточку,
 * введённые название и описание вместе с чекбоксом перелетают в слоты карточки,
 * иконка и meta-строка проявляются по очереди — и только тогда карточка «полноценна».
 * Следом публичные проекты прилетают в список штампом с сотрясением страницы.
 */
const state = tourState

const EASE = [0.22, 1, 0.36, 1] as const
/** Подход к кнопке «Создать проект» — сильный зум на правый верхний угол. */
const ZOOM_BTN = 1.6
/** Весь блок формы диалога. */
const ZOOM_FORM = 1.18
/** Подводка заполняемого поля к центру сцены. */
const ZOOM_FIELD = 1.28

const rootRef = ref<HTMLElement | null>(null)
const camX = motionValue(0)
const camY = motionValue(0)
const camZ = motionValue(1)

/** Слои диалога: сама панель (контейнер) и её содержимое (форма). */
const dialogRef = ref<HTMLElement | null>(null)
const dialogContentRef = ref<HTMLElement | null>(null)
const overlayRef = ref<HTMLElement | null>(null)
/** Обёртка карточки только что созданного проекта — цель морфинга. */
const createdRef = ref<HTMLElement | null>(null)

/** Диалог живёт отдельно от флага хореографии — доживает до конца морфинга. */
const dialogShown = ref(false)
/** Морфинг «форма → карточка» в полёте: закрытие по флагу его не трогает. */
const morphing = ref(false)
/** Геометрия панели в лейаут-координатах: null — автоцентрирование диалога. */
const panelBox = ref<Record<string, string> | null>(null)
/** Панель перекрашивается под карточку (bg-background → bg-card). */
const boxCard = ref(false)
/** Карточка набирает части: щит прозрачен, элементы проявляются по очереди. */
const cardAssembled = ref(false)

/** Летящие из формы элементы: тексты и чекбокс перелетают в слоты карточки. */
interface Flyer {
  left: number
  top: number
  on: boolean
  scale: number
}

const flyName = ref<Flyer | null>(null)
const flyDesc = ref<Flyer | null>(null)
const flyCheck = ref<Flyer | null>(null)

/** Поколение морфинга: свежий запуск делает промахом таймеры предыдущего. */
let morphGen = 0

/** Сотрясение страницы от удара «штампа» — карточка прилипает с весом. */
const shaking = ref(false)

/** Ключи точек, у которых карточка появилась — в них рисуются брызги и вспышки. */
const bursts = ref<Set<string>>(new Set())

function burstAt(key: string): void {
  bursts.value.add(key)
  // Таймер длиннее жизни вспышек (~0.8s), чтобы частицы не обрывались на полёте
  setTimeout(() => bursts.value.delete(key), 1100)
}

function thud(): void {
  // Сброс класса перед добавлением — иначе анимация не перезапустится
  shaking.value = false
  void nextTick(() => {
    shaking.value = true
    setTimeout(() => {
      shaking.value = false
    }, 560)
  })
}

/** Отложенный вызов, привязанный к поколению морфинга (отмена — новым запуском). */
function later(ms: number, gen: number, fn: () => void): void {
  setTimeout(() => {
    if (gen === morphGen) fn()
  }, ms)
}

const panelStyle = computed(() => {
  if (!panelBox.value) return undefined
  return { ...panelBox.value, translate: 'none' }
})

/**
 * Центрирует элемент в кадре на заданном зуме. Экранный центр элемента раскладывается
 * обратно в лейаут-координаты сцены с учётом текущего трансформа камеры:
 * screen = (layout − C)·z + смещение + C.
 */
async function centerOn(selector: string, zoom: number): Promise<void> {
  await nextTick()
  const root = rootRef.value
  const el = root?.querySelector<HTMLElement>(selector)
  if (!root || !el) return
  const rootRect = root.getBoundingClientRect()
  const rect = el.getBoundingClientRect()
  if (!rootRect.width || !rootRect.height) return
  const screenX = ((rect.left + rect.width / 2 - rootRect.left) / rootRect.width) * VIEW_W
  const screenY = ((rect.top + rect.height / 2 - rootRect.top) / rootRect.height) * VIEW_H
  const layoutX = (screenX - camX.get() - VIEW_W / 2) / camZ.get() + VIEW_W / 2
  const layoutY = (screenY - camY.get() - VIEW_H / 2) / camZ.get() + VIEW_H / 2
  animate(camX, -(layoutX - VIEW_W / 2) * zoom, { duration: 0.75, ease: EASE })
  animate(camY, -(layoutY - VIEW_H / 2) * zoom, { duration: 0.75, ease: EASE })
  animate(camZ, zoom, { duration: 0.75, ease: EASE })
}

function resetCamera(): void {
  animate(camX, 0, { duration: 0.6, ease: EASE })
  animate(camY, 0, { duration: 0.6, ease: EASE })
  animate(camZ, 1, { duration: 0.6, ease: EASE })
}

/**
 * Прямоугольник элемента в лейаут-координатах сцены: обратное раскладывание
 * экранных координат через текущий трансформ камеры — та же формула, что в centerOn.
 */
function layoutRect(
  el: HTMLElement,
): { left: number; top: number; width: number; height: number } | null {
  const root = rootRef.value
  if (!root) return null
  const rootRect = root.getBoundingClientRect()
  if (!rootRect.width || !rootRect.height) return null
  const rect = el.getBoundingClientRect()
  const kx = VIEW_W / rootRect.width
  const ky = VIEW_H / rootRect.height
  const centerX = VIEW_W / 2
  const centerY = VIEW_H / 2
  return {
    left: ((rect.left - rootRect.left) * kx - camX.get() - centerX) / camZ.get() + centerX,
    top: ((rect.top - rootRect.top) * ky - camY.get() - centerY) / camZ.get() + centerY,
    width: (rect.width * kx) / camZ.get(),
    height: (rect.height * ky) / camZ.get(),
  }
}

function toPx(rect: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${Math.round(rect.left)}px`,
    top: `${Math.round(rect.top)}px`,
    width: `${Math.round(rect.width)}px`,
    height: `${Math.round(rect.height)}px`,
  }
}

/**
 * Отправка формы: контейнер формы превращается в контейнер карточки.
 * Панель (её прямоугольник и цвета) перелетает в позицию списка; введённые
 * название, описание и чекбокс поднимаются из полей и летят в слоты карточки;
 * иконка, заголовок, описание, глобус и meta-строка проявляются по очереди —
 * только после этого карточка «полноценна», и брызги отмечают её рождение.
 */
async function morphDialogToCard(): Promise<void> {
  const gen = ++morphGen
  morphing.value = true
  cardAssembled.value = false
  await nextTick()
  const panel = dialogRef.value
  const content = dialogContentRef.value
  const cardEl = createdRef.value
  const from = panel ? layoutRect(panel) : null
  const to = cardEl ? layoutRect(cardEl) : null
  const title = cardEl?.querySelector<HTMLElement>("[data-tour-card='title']")
  const desc = cardEl?.querySelector<HTMLElement>("[data-tour-card='desc']")
  const globe = cardEl?.querySelector<HTMLElement>("[data-tour-card='globe']")
  const nameField = panel?.querySelector<HTMLElement>('[data-tour="dialog-name"]')
  const descField = panel?.querySelector<HTMLElement>('[data-tour="dialog-description"]')
  const checkBox = panel?.querySelector<HTMLElement>('[data-tour-part="checkbox"]')
  const titleSlot = title ? layoutRect(title) : null
  const descSlot = desc ? layoutRect(desc) : null
  const globeSlot = globe ? layoutRect(globe) : null
  const nameSrc = nameField ? layoutRect(nameField) : null
  const descSrc = descField ? layoutRect(descField) : null
  const checkSrc = checkBox ? layoutRect(checkBox) : null
  if (
    !panel ||
    !from ||
    !to ||
    !titleSlot ||
    !descSlot ||
    !globeSlot ||
    !nameSrc ||
    !descSrc ||
    !checkSrc
  ) {
    // Нечего превращать — закрываем диалог как есть
    dialogShown.value = false
    morphing.value = false
    burstAt('created')
    return
  }

  // Панель получает явную геометрию от текущего прямоугольника — без единого скачка
  panelBox.value = toPx(from)
  // Летящие копии встают в точки полей формы (тексты ещё видны в самих полях)
  flyName.value = {
    left: nameSrc.left + 12,
    top: nameSrc.top + (nameSrc.height - 24) / 2,
    on: false,
    scale: 1,
  }
  flyDesc.value = { left: descSrc.left + 12, top: descSrc.top + 9, on: false, scale: 1 }
  flyCheck.value = {
    left: checkSrc.left,
    top: checkSrc.top,
    on: false,
    scale: 1,
  }
  // Рефлоу с новой геометрией — иначе переход left/top/width/height не стартует
  await nextTick()
  panel.getBoundingClientRect()
  resetCamera()

  // Форма увядает, панель перелетает к карточке и перекрашивается под неё
  if (content) void animate(content, { opacity: 0 }, { duration: 0.2, ease: EASE })
  panelBox.value = toPx(to)
  boxCard.value = true

  // Тексты и чекбокс поднимаются из полей…
  later(40, gen, () => {
    if (flyName.value) flyName.value.on = true
    if (flyDesc.value) flyDesc.value.on = true
    if (flyCheck.value) flyCheck.value.on = true
  })
  // …и летят в слоты карточки (чекбокс ужимается под глобус)
  later(170, gen, () => {
    flyName.value = { left: titleSlot.left, top: titleSlot.top, on: true, scale: 1 }
    flyDesc.value = { left: descSlot.left, top: descSlot.top, on: true, scale: 1 }
    flyCheck.value = {
      left: globeSlot.left - 1,
      top: globeSlot.top - 1,
      on: true,
      scale: 0.88,
    }
  })
  // Карточка собирается: части проявляются с задержками, щит обретает цвета
  later(320, gen, () => {
    cardAssembled.value = true
  })
  // Летящие копии растворяются, уступая своим частям карточки
  later(500, gen, () => {
    if (flyName.value) flyName.value.on = false
    if (flyDesc.value) flyDesc.value.on = false
    if (flyCheck.value) flyCheck.value.on = false
  })
  // Панель доезжает и растворяется, обнажая собранную карточку
  void animate(panel, { opacity: 0 }, { duration: 0.2, delay: 0.62, ease: EASE })

  // Завершение — после meta-строки (последняя часть «доезжает» ~1.05s)
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 1150)
  })
  if (gen !== morphGen) return
  dialogShown.value = false
  panelBox.value = null
  boxCard.value = false
  flyName.value = null
  flyDesc.value = null
  flyCheck.value = null
  morphing.value = false
  burstAt('created')
}

// Хореография ведёт камеру состоянием: focused — кнопка создания или поле формы,
// dialogOpen — приближение на весь блок диалога; само окно показывает и прячет
// экран (диалог доживает до конца морфинга даже после снятия флага)
watch(
  () => state.focused,
  (key) => {
    if (key === 'new-project-btn') void centerOn(`[data-tour="${key}"]`, ZOOM_BTN)
    else if (key?.startsWith('dialog-')) void centerOn(`[data-tour="${key}"]`, ZOOM_FIELD)
  },
)

watch(
  () => state.dialogOpen,
  (open) => {
    if (open) {
      dialogShown.value = true
      void centerOn('[data-tour="dialog-card"]', ZOOM_FORM)
    } else if (!morphing.value) {
      // Повтор шага или reduced motion: закрытие без морфинга
      morphGen++
      dialogShown.value = false
      resetCamera()
    }
  },
)

// Повтор шага или перемотка (epoch тикает в runChain перед setup): морфинг в
// этот момент мёртв по определению — закрываем окно и обнуляем всё наследие
watch(
  () => state.epoch,
  () => {
    morphGen++
    morphing.value = false
    cardAssembled.value = false
    dialogShown.value = false
    panelBox.value = null
    boxCard.value = false
    flyName.value = null
    flyDesc.value = null
    flyCheck.value = null
    resetCamera()
  },
)

// Отправка формы: диалог превращается в карточку; без открытой формы (повтор,
// reduced motion) — сразу вспышки в месте появления карточки
watch(
  () => state.created,
  (created) => {
    cardAssembled.value = false
    if (created && dialogShown.value) void morphDialogToCard()
    else if (created) {
      morphing.value = false
      burstAt('created')
    }
  },
)

// Публичные карточки «прибиваются» штампом — страницу качает от удара
watch(
  () => state.publicProjects.length,
  (length, prev) => {
    if (length > (prev ?? 0)) {
      burstAt(`pub-${length - 1}`)
      thud()
    }
  },
)
</script>

<template>
  <div ref="rootRef" class="absolute inset-0 overflow-hidden bg-background">
    <Motion class="absolute inset-0" :style="{ x: camX, y: camY, scale: camZ }">
      <!-- Страница проектов — на всю ширину сцены, для наглядности.
           Вертикальный ритм подогнан: шапка + 4 карточки влезают в 720 логических px.
           tour-page-thud — лёгкое сотрясение от удара прибившейся карточки -->
      <div class="w-full px-10 pt-6" :class="shaking && 'tour-page-thud'">
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Проекты</h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Управляйте проектами и приглашайте команду
            </p>
          </div>
          <button
            type="button"
            data-tour="new-project-btn"
            class="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus class="h-4 w-4" />
            Создать проект
          </button>
        </div>

        <!-- Мои проекты: пустое состояние сменяется карточкой созданного проекта -->
        <div class="mb-2 mt-6 flex items-baseline gap-2">
          <h2 class="text-lg font-medium">Мои проекты</h2>
          <span v-if="state.created" class="text-sm text-muted-foreground">1</span>
        </div>
        <Transition name="tour-list">
          <div
            v-if="state.created"
            key="created"
            ref="createdRef"
            data-tour="created-card"
            class="relative"
            :class="morphing && 'tour-morphing'"
          >
            <MockProjectCard
              name="auth-service"
              description="Сервис авторизации и входа"
              :is-public="state.settingsPublic || state.project.isPublic"
              date="Создан: 14 октября 2026 г."
              owner
              :assembling="morphing"
              :assembled="cardAssembled"
            />
            <TourBurst v-if="bursts.has('created')" class="absolute top-11 left-11" />
            <TourSparkles v-if="bursts.has('created')" class="absolute inset-0" />
          </div>
          <div
            v-else
            key="empty"
            class="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground"
          >
            Проектов пока нет — создайте первый, чтобы вести баги и принимать репорты
          </div>
        </Transition>

        <!-- Публичные проекты прилетают в список штампом: слет сверху, удар,
             лёгкий перелёт — и страницу качает от веса карточки -->
        <template v-if="state.publicProjects.length > 0">
          <div class="mb-2 mt-6 flex items-baseline gap-2">
            <h2 class="text-lg font-medium">Публичные проекты</h2>
            <span class="text-sm text-muted-foreground">{{ state.publicProjects.length }}</span>
          </div>
          <TransitionGroup name="tour-stamp" tag="div" class="space-y-2">
            <div
              v-for="(project, index) in state.publicProjects"
              :key="project.name"
              class="relative"
            >
              <MockProjectCard
                :name="project.name"
                :description="project.description"
                :date="project.date"
                is-public
              />
              <TourBurst v-if="bursts.has(`pub-${index}`)" class="absolute top-11 left-11" />
              <TourSparkles v-if="bursts.has(`pub-${index}`)" class="absolute inset-0" />
            </div>
          </TransitionGroup>
        </template>
      </div>

      <!-- Диалог создания проекта — всплывает и уходит как в приложении.
           v-if живёт внутри Transition, чтобы снятие шаблона не отменяло leave -->
      <Transition name="tour-overlay">
        <div v-if="dialogShown" ref="overlayRef" class="absolute inset-0 bg-black/40" />
      </Transition>
      <Transition name="tour-dialog">
        <div v-if="dialogShown" class="absolute inset-0">
          <!-- Панель-контейнер: до отправки — диалог, после — будущая карточка:
               геометрия и цвета плавно перетекают (tour-morph-box) -->
          <div
            ref="dialogRef"
            data-tour="dialog-card"
            class="tour-depth-front absolute top-1/2 left-1/2 w-[512px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-background shadow-lg"
            :class="[morphing && 'tour-morph-box', boxCard && 'is-card']"
            :style="panelStyle"
          >
            <!-- Содержимое формы: увядает в момент морфинга, не мигая от смены
                 ширины панели (tour-morph-form переводит его в абсолют) -->
            <div ref="dialogContentRef" class="p-6" :class="morphing && 'tour-morph-form'">
              <button
                type="button"
                class="absolute top-4 right-4 rounded-sm text-muted-foreground opacity-70 transition-opacity hover:opacity-100"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              <h2 class="text-lg font-semibold tracking-tight">Новый проект</h2>
              <p class="mt-1 text-sm text-muted-foreground">
                Заполните название и описание. Публичные проекты принимают репорты по ссылке.
              </p>

              <div class="mt-4 space-y-4">
                <MockField
                  target="dialog-name"
                  label="Название *"
                  :value="state.project.name"
                  :focused="state.focused === 'dialog-name'"
                  placeholder="Например: auth-service"
                />
                <MockField
                  target="dialog-description"
                  label="Описание"
                  :value="state.project.description"
                  :focused="state.focused === 'dialog-description'"
                  placeholder="Краткое описание проекта..."
                  :rows="3"
                />

                <div class="flex items-center gap-2" data-tour="dialog-public">
                  <span
                    data-tour-part="checkbox"
                    class="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border"
                    :class="
                      state.project.isPublic
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input'
                    "
                  >
                    <Check v-if="state.project.isPublic" class="h-3 w-3" />
                  </span>
                  <span class="text-sm">Публичный проект (принимать репорты по ссылке)</span>
                </div>
              </div>

              <div class="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  class="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  data-tour="dialog-submit"
                  class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  :disabled="!state.project.name"
                >
                  Создать проект
                </button>
              </div>
            </div>
          </div>

          <!-- Летящие из формы элементы: над панелью, в лейаут-координатах сцены -->
          <div class="pointer-events-none absolute inset-0">
            <span
              v-if="flyName"
              class="tour-fly absolute whitespace-nowrap text-base font-medium"
              :class="flyName.on && 'is-on'"
              :style="{ left: `${flyName.left}px`, top: `${flyName.top}px` }"
            >
              {{ state.project.name }}
            </span>
            <span
              v-if="flyDesc"
              class="tour-fly absolute whitespace-nowrap text-sm text-muted-foreground"
              :class="flyDesc.on && 'is-on'"
              :style="{ left: `${flyDesc.left}px`, top: `${flyDesc.top}px` }"
            >
              {{ state.project.description }}
            </span>
            <span
              v-if="flyCheck"
              class="tour-fly absolute flex h-4 w-4 items-center justify-center rounded-[4px] border border-primary bg-primary text-primary-foreground"
              :class="flyCheck.on && 'is-on'"
              :style="{
                left: `${flyCheck.left}px`,
                top: `${flyCheck.top}px`,
                transform: `scale(${flyCheck.scale})`,
              }"
            >
              <Check class="h-3 w-3" />
            </span>
          </div>
        </div>
      </Transition>
    </Motion>
  </div>
</template>
