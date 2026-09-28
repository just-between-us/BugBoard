import type { Component } from 'vue'
import {
  Activity,
  CheckCircle,
  Database,
  Eye,
  HelpCircle,
  Loader2,
  Monitor,
  Pin,
  Server,
  Shield,
} from '@lucide/vue'

export const STATUS_VALUES = ['discovered', 'confirmed', 'in_progress', 'fixed'] as const
export const SEVERITY_VALUES = ['critical', 'major', 'minor'] as const
export const AREA_VALUES = ['database', 'ui', 'auth', 'api', 'performance', 'other'] as const

export const statusOptions = [
  { value: 'discovered', label: 'Обнаружен' },
  { value: 'confirmed', label: 'Подтверждён' },
  { value: 'in_progress', label: 'В работе' },
  { value: 'fixed', label: 'Исправлен' },
] as const

export const severityOptions = [
  { value: 'critical', label: 'Критический' },
  { value: 'major', label: 'Мажорный' },
  { value: 'minor', label: 'Минорный' },
] as const

export const areaOptions = [
  { value: 'database', label: 'База данных' },
  { value: 'ui', label: 'UI/Фронтенд' },
  { value: 'auth', label: 'Авторизация' },
  { value: 'api', label: 'API/Бэкенд' },
  { value: 'performance', label: 'Производительность' },
  { value: 'other', label: 'Другое' },
] as const

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
): string {
  return options.find((opt) => opt.value === value)?.label ?? value
}

export const STATUS_BADGE: Record<string, string> = {
  discovered: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  in_progress: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  fixed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
}

export const SEVERITY_BADGE: Record<string, string> = {
  critical: 'bg-severity-critical/15 text-severity-critical',
  major: 'bg-severity-major/15 text-severity-major',
  minor: 'bg-severity-minor/15 text-severity-minor',
}

export const SEVERITY_BG: Record<string, string> = {
  critical: 'bg-severity-critical',
  major: 'bg-severity-major',
  minor: 'bg-severity-minor',
}

export function statusIcon(status: string): Component {
  const icons: Record<string, Component> = {
    discovered: Eye,
    confirmed: Pin,
    in_progress: Loader2,
    fixed: CheckCircle,
  }
  return icons[status] ?? HelpCircle
}

export function areaIcon(area: string): Component {
  const icons: Record<string, Component> = {
    database: Database,
    ui: Monitor,
    auth: Shield,
    api: Server,
    performance: Activity,
    other: HelpCircle,
  }
  return icons[area] ?? HelpCircle
}

export function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
}

export function isNewBug(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 1000 * 60 * 60 * 24
}
