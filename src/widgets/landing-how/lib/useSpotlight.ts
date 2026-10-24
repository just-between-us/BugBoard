import { ref } from 'vue'

/**
 * Прожектор под курсором для карточки бенто: пишет позицию указателя
 * в CSS-переменные --mx/--my (px от левого верхнего угла карточки).
 * Стиль (радиальный блик на ::before) задаётся в самой карточке —
 * композабл не знает о DOM-дереве и не тянет rAF: на каждый pointermove
 * обновляется одна строка инлайн-стиля, браузер сам сглаживает остаток.
 */
export function useSpotlight() {
  const style = ref<Record<string, string>>({})

  function onPointerMove(event: PointerEvent) {
    const el = event.currentTarget as HTMLElement
    const rect = el.getBoundingClientRect()
    style.value = {
      '--mx': `${event.clientX - rect.left}px`,
      '--my': `${event.clientY - rect.top}px`,
    }
  }

  return { style, onPointerMove }
}
