export interface DayBucket {
  date: string // YYYY-MM-DD
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
