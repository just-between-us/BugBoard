import { onBeforeUnmount, ref, type Ref } from 'vue'
import { animate, motionValue, type MotionValue } from 'motion-v'
import { useMediaQuery } from '@vueuse/core'
import { tourState, VIEW_W, VIEW_H } from './tourState'
import { steps, type TourCtx, type TourStep } from './choreography'

const EASE = [0.22, 1, 0.36, 1] as const
/** Более «ручная» кривая для живой дуги: разгон и торможение без резкого старта. */
const EASE_ARC = [0.4, 0, 0.2, 1] as const

/** Индекс в шагах всегда валидирован снаружи (goTo клампит), здесь — только для TS. */
function stepAt(index: number): TourStep {
  return steps[index] as TourStep
}

interface Token {
  cancelled: boolean
  onCancel: (() => void)[]
}

const CANCELLED = Symbol('tour-cancelled')

function check(t: Token): void {
  if (t.cancelled) throw CANCELLED
}

function cancelled(t: Token): Promise<never> {
  return new Promise((_, reject) => {
    t.onCancel.push(() => reject(CANCELLED))
  })
}

/**
 * Машина Product Tour: автоплей по шагам хореографии, курсор на motion-value,
 * пауза/повтор/перемотка. Один запуск = одна цепочка шагов до конца (без лупа).
 */
export function useTour() {
  const cursorX = motionValue(VIEW_W / 2)
  const cursorY = motionValue(VIEW_H / 2)
  const cursorOpacity = motionValue(0)
  const cursorScale = motionValue(1)
  /** Наклон курсора в дуге: пик посередине полёта, в покое — 0. */
  const cursorRot = motionValue(0)
  const rippleKey = ref(0)
  const rippleAt = ref({ x: 0, y: 0 })

  /** Ссылка на сам вьюпорт (масштабированный) — измеряем цели в логических px. */
  const viewportRef: Ref<HTMLElement | null> = ref(null)

  const current = ref(0)
  const playing = ref(false)
  const paused = ref(false)
  const finished = ref(false)

  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

  let token: Token = { cancelled: false, onCancel: [] }
  let hasStarted = false
  let hotEl: HTMLElement | null = null
  const waiters = new Set<() => void>()

  /* ---------- измерения и подсветка целей ---------- */

  function measure(target: string) {
    const vp = viewportRef.value
    if (!vp) return null
    const el = vp.querySelector<HTMLElement>(target)
    if (!el) return null
    const r = el.getBoundingClientRect()
    const v = vp.getBoundingClientRect()
    const k = v.width / VIEW_W || 1
    return { x: (r.left + r.width / 2 - v.left) / k, y: (r.top + r.height / 2 - v.top) / k, el }
  }

  function setHot(el: HTMLElement | null): void {
    hotEl?.classList.remove('tour-hot')
    hotEl = el
    hotEl?.classList.add('tour-hot')
  }

  /* ---------- ожидание (уважает паузу и отмену) ---------- */

  function releaseWaiters(): void {
    for (const fn of waiters) fn()
  }

  async function sleep(ms: number, t: Token): Promise<void> {
    let left = ms
    while (left > 0) {
      check(t)
      if (paused.value) {
        await new Promise<void>((resolve) => {
          const fn = () => {
            waiters.delete(fn)
            resolve()
          }
          waiters.add(fn)
        })
        check(t)
        continue
      }
      const slice = Math.min(left, 50)
      await new Promise<void>((resolve) => setTimeout(resolve, slice))
      left -= slice
    }
    check(t)
  }

  /* ---------- побитовые операции курсора ---------- */

  /** Чередование стороны изгиба, чтобы дуги не выглядели копипастой. */
  let arcSide = 1
  /** Шаги с «живым» курсором (дуга + наклон) — пока первые два. */
  let arcEnabled = false

  async function moveTo(target: string, t: Token, duration = 0.85): Promise<void> {
    const m = measure(target)
    if (!m) return
    check(t)
    const fromX = cursorX.get()
    const fromY = cursorY.get()
    const dx = m.x - fromX
    const dy = m.y - fromY
    const dist = Math.hypot(dx, dy)
    // Курсор уже на цели — пустая анимация не нужна (частый повторный замер в type())
    if (dist < 0.5) return

    // Для живого шага длительность зависит от дистанции:
    // короткий подлёт быстрее, дальний — чуть дольше. Остальные шаги — как задано.
    const dur = arcEnabled ? duration * (0.7 + Math.min(dist, 720) / 1200) : duration

    // Единый прогресс-кадр на оба сценария: прямая (лин. интерполяция) или живая дуга
    // (квадратичная кривая Безье). Контрольная точка — перпендикулярно трассе с
    // чередующейся стороной, рука ведёт курсор не по прямой, а с лёгким выгибом.
    const side = arcSide
    if (arcEnabled) arcSide = -arcSide
    const bow = arcEnabled ? Math.min(dist * 0.18, 72) * side : 0
    const ctrlX = fromX + dx / 2 - (dy / dist) * bow
    const ctrlY = fromY + dy / 2 + (dx / dist) * bow

    const p = motionValue(0)
    const unsub = p.on('change', (v) => {
      const q = 1 - v
      cursorX.set(q * q * fromX + 2 * q * v * ctrlX + v * v * m.x)
      cursorY.set(q * q * fromY + 2 * q * v * ctrlY + v * v * m.y)
      if (bow !== 0) {
        // Наклон «в повороте»: пик посередине полёта, к финалу курсор снова ровный;
        // на коротких подлётах наклон пропорционально меньше
        cursorRot.set(side * 8 * Math.min(dist / 140, 1) * Math.sin(Math.PI * v))
      }
    })
    const anim = animate(p, 1, { duration: dur, ease: arcEnabled ? EASE_ARC : EASE })
    try {
      await Promise.race([anim.finished, cancelled(t)])
    } finally {
      unsub()
      anim.stop()
      cursorRot.set(0)
    }
  }

  async function click(target: string, t: Token): Promise<void> {
    const m = measure(target)
    if (!m) return
    setHot(m.el)
    await sleep(200, t)
    rippleAt.value = { x: m.x, y: m.y }
    rippleKey.value++
    animate(cursorScale, 0.7, { duration: 0.09 })
      .finished.then(() => animate(cursorScale, 1, { duration: 0.24, ease: EASE }).finished)
      .catch(() => {})
    await sleep(140, t)
  }

  /**
   * Вести курсор за элементом во время его движения (камера шага подводит поле к центру):
   * экспоненциальное сглаживание даёт живое сопровождение с лёгкой инерцией —
   * вместо «стоит на месте, потом прыжок в новую точку».
   */
  async function follow(target: string, ms: number, t: Token): Promise<void> {
    let elapsed = 0
    let cx = cursorX.get()
    let cy = cursorY.get()
    while (elapsed < ms) {
      const m = measure(target)
      if (m) {
        cx += (m.x - cx) * 0.4
        cy += (m.y - cy) * 0.4
        cursorX.set(cx)
        cursorY.set(cy)
      }
      await sleep(16, t)
      elapsed += 16
    }
    // Точная доводка в конечную точку — остаток ошибки сглаживания < 1px
    const m = measure(target)
    if (m) {
      cursorX.set(m.x)
      cursorY.set(m.y)
    }
  }

  async function type(
    target: string,
    fieldKey: string,
    text: string,
    setter: (value: string) => void,
    opts: { speed?: number; settle?: number } | undefined,
    t: Token,
  ): Promise<void> {
    const m = measure(target)
    if (m) {
      setHot(m.el)
      // Нажатие по полю: клик-пульс курсора + ripple + ASCII-вспышка
      rippleAt.value = { x: m.x, y: m.y }
      rippleKey.value++
      animate(cursorScale, 0.7, { duration: 0.09 })
        .finished.then(() => animate(cursorScale, 1, { duration: 0.24, ease: EASE }).finished)
        .catch(() => {})
    }
    tourState.focused = fieldKey
    // settle — время разгона камеры шага (AuthScreen подводит поле к центру):
    // курсор сопровождает поле всё время движения и мягко доводится в конечную точку
    await follow(target, opts?.settle ?? 300, t)
    for (let i = 1; i <= text.length; i++) {
      setter(text.slice(0, i))
      await sleep(opts?.speed ?? 52, t)
    }
    await sleep(240, t)
    tourState.focused = ''
  }

  function makeCtx(t: Token): TourCtx {
    return {
      moveTo: (target, duration) => moveTo(target, t, duration),
      hot: async (target) => {
        setHot(target ? (measure(target)?.el ?? null) : null)
      },
      click: (target) => click(target, t),
      type: (target, fieldKey, text, setter, opts) => type(target, fieldKey, text, setter, opts, t),
      wait: (ms) => sleep(ms, t),
    }
  }

  /* ---------- управление цепочкой ---------- */

  function cancelRun(): void {
    token.cancelled = true
    for (const fn of token.onCancel) {
      try {
        fn()
      } catch {
        /* отмена гоняется через race — повторный reject безопасен */
      }
    }
    releaseWaiters()
    cursorX.stop()
    cursorY.stop()
    cursorRot.set(0)
  }

  async function runChain(index: number): Promise<void> {
    cancelRun()
    const t: Token = { cancelled: false, onCancel: [] }
    token = t
    paused.value = false
    playing.value = true
    finished.value = false
    current.value = index

    try {
      if (reduced.value) {
        // prefers-reduced-motion: без анимаций и курсора, шаг показан готовым
        tourState.epoch++
        stepAt(index).setup()
        setHot(null)
        cursorOpacity.set(0)
        stepAt(index).end()
        playing.value = false
        finished.value = index === steps.length - 1
        return
      }

      tourState.epoch++
      arcEnabled = stepAt(index).lively === true
      stepAt(index).setup()
      animate(cursorOpacity, 1, { duration: 0.4 }).finished.catch(() => {})

      let i = index
      for (;;) {
        check(t)
        await stepAt(i).run(makeCtx(t))
        check(t)
        if (i >= steps.length - 1) break
        await sleep(700, t)
        i++
        current.value = i
        tourState.epoch++
        arcEnabled = stepAt(i).lively === true
        stepAt(i).setup()
      }

      playing.value = false
      finished.value = true
      animate(cursorOpacity, 0, { duration: 0.7 }).finished.catch(() => {})
    } catch (e) {
      if (e !== CANCELLED) throw e
    }
  }

  /** Однократный автозапуск, когда секция попала в кадр. */
  function startOnce(): void {
    if (hasStarted) return
    hasStarted = true
    void runChain(0)
  }

  function togglePause(): void {
    if (!playing.value) return
    paused.value = !paused.value
    if (!paused.value) releaseWaiters()
  }

  function goTo(index: number): void {
    void runChain(Math.max(0, Math.min(steps.length - 1, index)))
  }

  onBeforeUnmount(() => {
    cancelRun()
    setHot(null)
  })

  return {
    cursorX,
    cursorY,
    cursorOpacity,
    cursorScale,
    cursorRot,
    rippleKey,
    rippleAt,
    viewportRef,
    current,
    playing,
    paused,
    finished,
    reduced,
    steps,
    startOnce,
    togglePause,
    goTo,
    restartStep: () => goTo(current.value),
    next: () => goTo(current.value + 1),
    prev: () => goTo(current.value - 1),
    restartAll: () => goTo(0),
  }
}

export type TourController = ReturnType<typeof useTour>

export type { MotionValue }
