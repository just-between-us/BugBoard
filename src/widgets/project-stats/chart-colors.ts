// Цвета графиков статистики. Акцент — голубой-синий.
// HEX: SVG-атрибуты Unovis не резолвят Tailwind-токены, поэтому значения здесь плоские.

/** Основной акцент (голубой) */
export const ACCENT = '#0ea5e9'
/** Второй акцент (синий) */
export const ACCENT_DEEP = '#2563eb'

/** Резервный цвет, если значение не найдено в палитре */
export const FALLBACK_COLOR = '#94a3b8'

export const SEVERITY_CHART_COLOR: Record<string, string> = {
  critical: '#2563eb',
  major: '#0ea5e9',
  minor: '#7dd3fc',
}

export const STATUS_CHART_COLOR: Record<string, string> = {
  discovered: '#38bdf8',
  confirmed: '#0ea5e9',
  in_progress: '#0284c7',
  fixed: '#1d4ed8',
}

export const AREA_CHART_COLOR: Record<string, string> = {
  database: '#0369a1',
  ui: '#0ea5e9',
  auth: '#38bdf8',
  api: '#2563eb',
  performance: '#60a5fa',
  other: '#94a3b8',
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  if (value.length !== 6) return hex
  const r = Number.parseInt(value.slice(0, 2), 16)
  const g = Number.parseInt(value.slice(2, 4), 16)
  const b = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}

/** Линейная интерполяция между двумя hex-цветами (t: 0..1) */
export function mixHex(from: string, to: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const value = hex.replace('#', '')
    return [
      Number.parseInt(value.slice(0, 2), 16),
      Number.parseInt(value.slice(2, 4), 16),
      Number.parseInt(value.slice(4, 6), 16),
    ]
  }
  const ratio = Math.max(0, Math.min(1, t))
  const [r1, g1, b1] = parse(from)
  const [r2, g2, b2] = parse(to)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio)
  return `rgb(${mix(r1, r2)}, ${mix(g1, g2)}, ${mix(b1, b2)})`
}

/** Прогресс репортов: от ярко-синего (мало) к красному (предел) */
export const REPORTS_PROGRESS_MIN = ACCENT
export const REPORTS_PROGRESS_MAX = '#ef4444'
