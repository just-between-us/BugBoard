export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDateOnly(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const result = parts.map((p) => p.charAt(0).toUpperCase()).join('')
  return result || '?'
}

export function toUserError(e: unknown): string {
  const code =
    typeof e === 'object' && e !== null && 'code' in e ? (e as { code?: unknown }).code : undefined
  const message = e instanceof Error ? e.message : ''
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return 'Недостаточно прав: вы не участник проекта.'
  }
  return message || 'Произошла ошибка. Попробуйте ещё раз.'
}
