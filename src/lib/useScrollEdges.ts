import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Горизонтальный скролл с краевыми маркерами: scrolledStart/scrolledEnd
 * нужны, чтобы CSS-классы могли включать маски-затемнения у краёв
 * (см. `.scroll-x-fade` в main.css).
 */
export function useScrollEdges() {
  const scroller = ref<HTMLElement | null>(null)
  const scrolledStart = ref(false)
  const scrolledEnd = ref(false)

  let observer: ResizeObserver | null = null

  function updateEdges() {
    const el = scroller.value
    if (!el) return
    scrolledStart.value = el.scrollLeft > 0
    scrolledEnd.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
  }

  onMounted(() => {
    updateEdges()
    window.addEventListener('resize', updateEdges)
    if (scroller.value && 'ResizeObserver' in window) {
      observer = new ResizeObserver(updateEdges)
      observer.observe(scroller.value)
      if (scroller.value.firstElementChild) observer.observe(scroller.value.firstElementChild)
    }
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', updateEdges)
    observer?.disconnect()
  })

  return { scroller, scrolledStart, scrolledEnd, updateEdges }
}
