export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export function avatarExtension(type: string): string {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp'
}

/**
 * Клиентская валидация файла аватара — это UX, а не защита: обойти её
 * ничего не стоит. Настоящая граница — RLS-политики storage (см. README).
 */
export function validateAvatarFile(file: File): void {
  if (!AVATAR_TYPES.includes(file.type)) {
    throw new Error('Поддерживаются только JPG, PNG или WebP')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Максимальный размер файла — 2 МБ')
  }
}

/**
 * Публичный URL storage с cache-buster: файл кладётся на один и тот же
 * адрес (upsert), поэтому без ?t= браузер продолжит отдавать старую
 * картинку из кэша после замены.
 */
export function withCacheBust(publicUrl: string): string {
  return `${publicUrl}?t=${Date.now()}`
}
