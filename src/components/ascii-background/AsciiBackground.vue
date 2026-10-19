<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Ширина ячейки сетки в пикселях */
    cellSize?: number
    /** Радиус магнитного свечения вокруг курсора, в ячейках */
    radius?: number
  }>(),
  { cellSize: 30, radius: 6 },
)

/** Набор символов от лёгких к тяжёлым — чем ближе к курсору, тем «плотнее» символ */
const CHARS = ['.', ':', '-', '+', '*', 'x', '#', '%', '@']

const canvasRef = ref<HTMLCanvasElement | null>(null)

type Cell = { char: number; phase: number }

// Сглаженная позиция курсора и сила свечения (расцветает при входе курсора, гаснет при уходе)
const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, glow: 0, targetGlow: 0 }

let ctx: CanvasRenderingContext2D | null = null
let cells: Cell[] = []
let columns = 0
let rows = 0
let width = 0
let height = 0
let rafId = 0
let startedAt = 0
let lastFrameAt = 0
let inView = true
let resizeObserver: ResizeObserver | null = null
let intersectionObserver: IntersectionObserver | null = null
let themeObserver: MutationObserver | null = null
let reduceMotion: MediaQueryList | null = null

function buildGrid() {
  columns = Math.ceil(width / props.cellSize)
  rows = Math.ceil(height / props.cellSize)
  cells = Array.from({ length: columns * rows }, () => ({
    char: Math.floor(Math.random() * 4),
    phase: Math.random() * Math.PI * 2,
  }))
}

function resize() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const rect = canvas.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  width = rect.width
  height = rect.height
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  buildGrid()
  refreshColor() // установка размера canvas сбрасывает состояние контекста
  if (reduceMotion?.matches) drawFrame(0, false)
}

// Цвет берём вычисленным значением, а не currentColor: canvas поддерживает ключевое слово
// не везде, а строка из getComputedStyle разбирается тем же движком гарантированно
function refreshColor() {
  const canvas = canvasRef.value
  if (!canvas || !ctx) return
  const color = getComputedStyle(canvas).color
  if (color) ctx.fillStyle = color
}

function drawFrame(time: number, withPointer: boolean) {
  if (!ctx || columns === 0 || rows === 0) return

  if (withPointer) {
    pointer.x += (pointer.targetX - pointer.x) * 0.12
    pointer.y += (pointer.targetY - pointer.y) * 0.12
    pointer.glow += (pointer.targetGlow - pointer.glow) * 0.08
  }

  const { cellSize, radius } = props
  const radiusPx = radius * cellSize

  ctx.clearRect(0, 0, width, height)
  ctx.font = `${Math.round(cellSize * 0.8)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const cell = cells[row * columns + col]
      if (!cell) continue
      const cx = col * cellSize + cellSize / 2
      const cy = row * cellSize + cellSize / 2

      // Медленная диагональная «волна» — поле дышит без резких вспышек
      const wave = Math.sin(time * 0.7 + col * 0.45 + row * 0.6 + cell.phase)
      let alpha = 0.13 + 0.07 * wave
      let density = 0

      if (withPointer && pointer.glow > 0.01) {
        const dx = cx - pointer.x
        const dy = cy - pointer.y
        const falloff = 1 - Math.min(1, Math.hypot(dx, dy) / radiusPx)
        const magnet = falloff * falloff * pointer.glow
        if (magnet > 0.003) {
          alpha += magnet * 0.72
          density = magnet
        }
      }

      if (alpha <= 0.02) continue

      const index = Math.min(
        CHARS.length - 1,
        cell.char + Math.round(density * (CHARS.length - 1 - cell.char)),
      )
      ctx.globalAlpha = Math.min(1, alpha)
      ctx.fillText(CHARS[index] ?? '?', cx, cy)
    }
  }
  ctx.globalAlpha = 1
}

function tick(now: number) {
  rafId = requestAnimationFrame(tick)
  if (!inView || document.hidden) return
  if (now - lastFrameAt < 1000 / 30) return // фону хватает 30 кадров в секунду
  lastFrameAt = now
  drawFrame((now - startedAt) / 1000, true)
}

function handlePointerMove(event: PointerEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return
  // Первое появление курсора — расцветаем прямо в ней, а не «прилетаем» из угла
  if (pointer.targetGlow === 0) {
    pointer.x = event.clientX - rect.left
    pointer.y = event.clientY - rect.top
  }
  pointer.targetX = event.clientX - rect.left
  pointer.targetY = event.clientY - rect.top
  pointer.targetGlow = 1
}

function handlePointerOut(event: PointerEvent) {
  if (event.relatedTarget === null) pointer.targetGlow = 0
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  ctx = canvas.getContext('2d')
  if (!ctx) return

  reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? true
  })
  intersectionObserver.observe(canvas)
  resize()

  // Смена темы меняет вычисленный цвет элемента — перечитываем его для canvas
  themeObserver = new MutationObserver(refreshColor)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })

  if (reduceMotion.matches) {
    drawFrame(0, false) // статичное поле: без анимации и свечения курсора
    return
  }

  startedAt = performance.now()
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  window.addEventListener('pointerout', handlePointerOut, { passive: true })
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  resizeObserver?.disconnect()
  intersectionObserver?.disconnect()
  themeObserver?.disconnect()
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerout', handlePointerOut)
})
</script>

<template>
  <canvas ref="canvasRef" aria-hidden="true" class="block h-full w-full" />
</template>
