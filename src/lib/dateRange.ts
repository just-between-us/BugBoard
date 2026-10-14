export interface DateRange {
  from: string | null
  to: string | null
}

function localMidnight(iso: string): Date {
  const [y = 1970, m = 1, d = 1] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function rangeStartMs(range: DateRange): number | null {
  return range.from ? localMidnight(range.from).getTime() : null
}

export function rangeEndMs(range: DateRange): number | null {
  if (!range.to) return null
  const [y = 1970, m = 1, d = 1] = range.to.split('-').map(Number)
  return new Date(y, m - 1, d + 1).getTime()
}

export function isInRange(iso: string, range: DateRange): boolean {
  const ts = new Date(iso).getTime()
  const start = rangeStartMs(range)
  const end = rangeEndMs(range)
  if (start !== null && ts < start) return false
  if (end !== null && ts >= end) return false
  return true
}

export function formatIsoDate(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(localMidnight(iso))
}

export function dateRangeLabel(range: DateRange): string | null {
  const { from, to } = range
  if (from && to) return `${formatIsoDate(from)} — ${formatIsoDate(to)}`
  if (from) return `с ${formatIsoDate(from)}`
  if (to) return `по ${formatIsoDate(to)}`
  return null
}

export function rangeIsEmpty(range: DateRange): boolean {
  return range.from === null && range.to === null
}
