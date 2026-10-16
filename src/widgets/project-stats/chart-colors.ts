// Монохромная палитра графиков статистики: шкала серого от тёмного к светлому.
// Токены объявлены в main.css и инвертируются в .dark, поэтому здесь — строки var().
// Unovis пишет цвет через style="fill", а не атрибут, поэтому var() резолвится.

/** Основной акцент (самый контрастный оттенок) */
export const ACCENT = 'var(--mono-1)'
/** Второй акцент (промежуточный оттенок) */
export const ACCENT_DEEP = 'var(--mono-4)'

/** Резервный цвет, если значение не найдено в палитре */
export const FALLBACK_COLOR = 'var(--mono-4)'

export const SEVERITY_CHART_COLOR: Record<string, string> = {
  critical: 'var(--mono-1)',
  major: 'var(--mono-3)',
  minor: 'var(--mono-5)',
}

export const STATUS_CHART_COLOR: Record<string, string> = {
  discovered: 'var(--mono-5)',
  confirmed: 'var(--mono-4)',
  in_progress: 'var(--mono-2)',
  fixed: 'var(--mono-1)',
}

export const AREA_CHART_COLOR: Record<string, string> = {
  database: 'var(--mono-1)',
  ui: 'var(--mono-2)',
  auth: 'var(--mono-3)',
  api: 'var(--mono-4)',
  performance: 'var(--mono-5)',
  other: 'var(--mono-6)',
}

/** Прозрачность поверх любого CSS-цвета, включая var() и oklch */
export function withAlpha(color: string, alpha: number): string {
  const percent = Math.round(Math.max(0, Math.min(1, alpha)) * 100)
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`
}

/** Интерполяция между двумя CSS-цветами (t: 0..1) */
export function mixColors(from: string, to: string, t: number): string {
  const ratio = Math.round(Math.max(0, Math.min(1, t)) * 100)
  return `color-mix(in srgb, ${to} ${ratio}%, ${from})`
}

/** Прогресс лимита: от светлого (мало) к самому контрастному (предел) */
export const LIMIT_PROGRESS_MIN = 'var(--mono-5)'
export const LIMIT_PROGRESS_MAX = ACCENT
