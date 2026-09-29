export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024

export function avatarExtension(type: string): string {
  return type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : 'webp'
}

export function validateAvatarFile(file: File): void {
  if (!AVATAR_TYPES.includes(file.type)) {
    throw new Error('Поддерживаются только JPG, PNG или WebP')
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Максимальный размер файла — 2 МБ')
  }
}

export function withCacheBust(publicUrl: string): string {
  return `${publicUrl}?t=${Date.now()}`
}
