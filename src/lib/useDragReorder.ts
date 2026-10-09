import { nextTick, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface DragReorderOptions {
  /** Список-контейнер: прямые дети — элементы с `data-item-id`, внутри ручка с `data-drag-handle`. */
  container: Ref<HTMLElement | null>
  disabled?: Ref<boolean>
  /** `beforeId === null` — в конец списка. */
  onReorder: (draggedId: string, beforeId: string | null) => void
}

const AUTO_SCROLL_EDGE = 80
const AUTO_SCROLL_MAX = 14
const DRAG_TRANSITION_MS = 160

/**
 * Pointer-events drag&drop reorder for a vertical `space-y` list.
 * The dragged item follows the pointer, neighbours shift to open a gap,
 * the final order is reported through `onReorder` (data is not touched otherwise).
 */
export function useDragReorder(options: DragReorderOptions) {
  const dragging = ref(false)

  let items: HTMLElement[] = []
  let ids: string[] = []
  let startIndex = 0
  let targetIndex = 0
  let step = 0
  let centers: number[] = []
  let startPointerPageY = 0
  let lastClientY = 0
  let active = false
  let rafId: number | null = null
  let pointerId: number | null = null
  let capturedEl: HTMLElement | null = null
  // Инвалидирует отложенную очистку стилей, если drag начался заново
  let styleEpoch = 0

  function startDrag(event: PointerEvent, handle: HTMLElement, item: HTMLElement) {
    const container = options.container.value
    if (!container) return

    items = Array.from(container.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !!el.dataset.itemId,
    )
    if (items.length < 2) return
    startIndex = items.indexOf(item)
    if (startIndex === -1) return
    styleEpoch++

    const scrollY = window.scrollY
    const rects = items.map((el) => el.getBoundingClientRect())
    centers = rects.map((r) => (r.top + r.bottom) / 2 + scrollY)
    let gap = 0
    for (let i = 0; i < rects.length - 1; i++) {
      const nextRect = rects[i + 1]
      const rect = rects[i]
      if (!nextRect || !rect) continue
      const g = nextRect.top - rect.bottom
      if (g > 0) {
        gap = g
        break
      }
    }
    const draggedRect = rects[startIndex]
    if (!draggedRect) return
    step = draggedRect.height + gap

    ids = items.map((el) => el.dataset.itemId ?? '')
    targetIndex = startIndex
    startPointerPageY = event.clientY + scrollY
    lastClientY = event.clientY
    active = true
    dragging.value = true

    items.forEach((el, i) => {
      el.style.transition = i === startIndex ? 'none' : 'transform 120ms ease'
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.boxShadow = ''
    })
    item.style.zIndex = '40'
    item.style.boxShadow = 'var(--shadow-lg)'

    pointerId = event.pointerId
    try {
      handle.setPointerCapture(event.pointerId)
      capturedEl = handle
    } catch {
      capturedEl = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerCancel)
    window.addEventListener('keydown', onKeyDown, true)
    rafId = requestAnimationFrame(tick)
  }

  function render() {
    if (!active) return
    const dy = lastClientY + window.scrollY - startPointerPageY
    const startCenter = centers[startIndex]
    if (startCenter === undefined) return
    const center = startCenter + dy

    let target = startIndex
    for (let i = startIndex - 1; i >= 0; i--) {
      const c = centers[i]
      if (c === undefined) break
      if (center < c + step / 2) target = i
      else break
    }
    for (let i = startIndex + 1; i < items.length; i++) {
      const c = centers[i]
      if (c === undefined) break
      if (center > c - step / 2) target = i
      else break
    }
    targetIndex = target

    for (let i = 0; i < items.length; i++) {
      const el = items[i]
      if (!el) continue
      if (i === startIndex) {
        el.style.transform = `translateY(${dy}px)`
        continue
      }
      let shift = 0
      if (startIndex < i && i <= target) shift = -step
      else if (target <= i && i < startIndex) shift = step
      el.style.transform = shift === 0 ? '' : `translateY(${shift}px)`
    }
  }

  function tick() {
    if (!active) return
    const y = lastClientY
    let scrollDelta = 0
    if (y < AUTO_SCROLL_EDGE) {
      scrollDelta = -AUTO_SCROLL_MAX * Math.min(1, 1 - y / AUTO_SCROLL_EDGE)
    } else if (y > window.innerHeight - AUTO_SCROLL_EDGE) {
      scrollDelta = AUTO_SCROLL_MAX * Math.min(1, 1 - (window.innerHeight - y) / AUTO_SCROLL_EDGE)
    }
    if (scrollDelta !== 0) window.scrollBy(0, scrollDelta)
    render()
    rafId = requestAnimationFrame(tick)
  }

  function onPointerDown(event: PointerEvent) {
    if (active || options.disabled?.value) return
    if (!event.isPrimary || event.button !== 0) return
    const target = event.target as Element | null
    if (!target || typeof target.closest !== 'function') return
    const container = options.container.value
    if (!container) return
    const handle = target.closest<HTMLElement>('[data-drag-handle]')
    if (!handle || !container.contains(handle)) return
    const item = handle.closest<HTMLElement>('[data-item-id]')
    if (!item || item.parentElement !== container) return
    event.preventDefault()
    startDrag(event, handle, item)
  }

  function onPointerMove(event: PointerEvent) {
    if (!active || event.pointerId !== pointerId) return
    lastClientY = event.clientY
  }

  function stopListeners() {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerCancel)
    window.removeEventListener('keydown', onKeyDown, true)
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (capturedEl && pointerId !== null) {
      try {
        capturedEl.releasePointerCapture(pointerId)
      } catch {
        // Захват уже снят браузером
      }
    }
    capturedEl = null
    pointerId = null
  }

  function clearStylesLater(els: HTMLElement[]) {
    const epoch = styleEpoch
    window.setTimeout(() => {
      if (epoch !== styleEpoch) return
      for (const el of els) {
        el.style.transition = ''
        el.style.transform = ''
        el.style.zIndex = ''
        el.style.boxShadow = ''
      }
    }, DRAG_TRANSITION_MS + 60)
  }

  /** Drop: FLIP-анимация всех элементов в новые позиции + отчёт о новом порядке. */
  async function finish() {
    stopListeners()
    const epoch = styleEpoch
    const els = items
    const draggedId = ids[startIndex] ?? ''
    const changed = targetIndex !== startIndex && draggedId !== ''

    const first = new Map<Element, DOMRect>()
    for (const el of els) first.set(el, el.getBoundingClientRect())

    for (const el of els) {
      el.style.transition = 'none'
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.boxShadow = ''
    }
    active = false
    dragging.value = false

    let beforeId: string | null = null
    if (changed) {
      const without = ids.filter((id) => id !== draggedId)
      beforeId = without[targetIndex] ?? null
      options.onReorder(draggedId, beforeId)
    }

    await nextTick()

    for (const el of els) {
      if (!el.isConnected) continue
      const f = first.get(el)
      if (!f) continue
      const l = el.getBoundingClientRect()
      const dx = f.left - l.left
      const dy = f.top - l.top
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
      el.style.transform = `translate(${dx}px, ${dy}px)`
    }

    requestAnimationFrame(() => {
      if (epoch !== styleEpoch) return
      for (const el of els) {
        if (!el.isConnected) continue
        el.style.transition = `transform ${DRAG_TRANSITION_MS}ms ease`
        el.style.transform = ''
      }
      clearStylesLater(els)
    })
  }

  /** Escape или потеря события: данные не менялись, элементы откатываются назад. */
  function cancel() {
    if (!active) return
    stopListeners()
    const dragged = items[startIndex]
    if (dragged) dragged.style.transition = 'transform 150ms ease'
    for (const el of items) {
      el.style.transform = ''
      el.style.zIndex = ''
      el.style.boxShadow = ''
    }
    active = false
    dragging.value = false
    clearStylesLater(items)
  }

  function onPointerUp(event: PointerEvent) {
    if (!active || event.pointerId !== pointerId) return
    void finish()
  }

  function onPointerCancel(event: PointerEvent) {
    if (!active || event.pointerId !== pointerId) return
    cancel()
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      cancel()
    }
  }

  function onDragStart(event: DragEvent) {
    event.preventDefault()
  }

  function unbind(el: HTMLElement | null) {
    if (!el) return
    el.removeEventListener('pointerdown', onPointerDown)
    el.removeEventListener('dragstart', onDragStart)
    if (active) cancel()
  }

  watch(
    options.container,
    (el, old) => {
      unbind(old ?? null)
      if (el) {
        el.addEventListener('pointerdown', onPointerDown)
        el.addEventListener('dragstart', onDragStart)
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    unbind(options.container.value)
  })

  return { dragging }
}
