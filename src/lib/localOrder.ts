/** Local (localStorage) id order for lists that support manual drag reordering. */

export function loadIdOrder(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const ids = parsed.filter((id): id is string => typeof id === 'string')
    return ids.length > 0 ? ids : null
  } catch {
    return null
  }
}

export function saveIdOrder(key: string, ids: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids))
  } catch {
    // Недоступный storage — порядок просто не переживёт перезагрузку
  }
}

/**
 * Applies a stored order to the current list: known ids follow the stored
 * positions, items missing from the stored order (e.g. brand-new ones) are
 * prepended as a block in their natural order.
 */
export function applyIdOrder<T>(
  items: T[],
  stored: string[] | null,
  idOf: (item: T) => string,
): T[] {
  if (!stored || stored.length === 0) return items

  const pos = new Map(stored.map((id, index) => [id, index]))
  const known: T[] = []
  const fresh: T[] = []
  for (const item of items) {
    if (pos.has(idOf(item))) known.push(item)
    else fresh.push(item)
  }
  known.sort((a, b) => (pos.get(idOf(a)) ?? 0) - (pos.get(idOf(b)) ?? 0))
  return [...fresh, ...known]
}

/** Returns a copy of `ids` with `draggedId` moved in front of `beforeId` (or to the end when null). */
export function moveId(ids: string[], draggedId: string, beforeId: string | null): string[] {
  const from = ids.indexOf(draggedId)
  if (from === -1) return [...ids]
  const without = [...ids.slice(0, from), ...ids.slice(from + 1)]
  const to = beforeId === null ? without.length : without.indexOf(beforeId)
  if (to === -1) {
    without.push(draggedId)
    return without
  }
  without.splice(to, 0, draggedId)
  return without
}
