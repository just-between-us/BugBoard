export interface DayBucket {
  date: string // YYYY-MM-DD
  count: number
}

export interface WeekBucket {
  weekStart: string // YYYY-MM-DD, Monday
  count: number
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10)
}

/** Groups ISO timestamps into the last `days` calendar days (oldest first). */
export function bucketByDay(dates: string[], days: number): DayBucket[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const counts = new Map<string, number>()
  for (const iso of dates) {
    const key = toDayKey(iso)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const result: DayBucket[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return result
}

function startOfWeek(d: Date): Date {
  const date = new Date(d)
  const day = (date.getDay() + 6) % 7 // Monday = 0
  date.setDate(date.getDate() - day)
  date.setHours(0, 0, 0, 0)
  return date
}

/** Groups ISO timestamps into the last `weeks` calendar weeks (oldest first). */
export function bucketByWeek(dates: string[], weeks: number): WeekBucket[] {
  const thisWeekStart = startOfWeek(new Date())

  const counts = new Map<string, number>()
  for (const iso of dates) {
    const weekStart = startOfWeek(new Date(iso)).toISOString().slice(0, 10)
    counts.set(weekStart, (counts.get(weekStart) ?? 0) + 1)
  }

  const result: WeekBucket[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(thisWeekStart)
    d.setDate(d.getDate() - i * 7)
    const key = d.toISOString().slice(0, 10)
    result.push({ weekStart: key, count: counts.get(key) ?? 0 })
  }
  return result
}
