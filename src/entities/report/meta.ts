import type { Component } from 'vue'
import { Ban, Copy, FlagOff } from '@lucide/vue'

export const REPORT_STATUS_VALUES = ['new', 'confirmed', 'rejected'] as const
export const REPORT_FLAG_VALUES = ['none', 'spam', 'duplicate'] as const

export const reportStatusOptions = [
  { value: 'new', label: 'Новый' },
  { value: 'confirmed', label: 'Принят' },
  { value: 'rejected', label: 'Отклонён' },
] as const

export const reportFlagOptions = [
  { value: 'none', label: 'Без флага' },
  { value: 'spam', label: 'Спам' },
  { value: 'duplicate', label: 'Дубликат' },
] as const

export const REPORT_STATUS_BADGE: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
}

export const REPORT_FLAG_BADGE: Record<string, string> = {
  spam: 'bg-severity-critical/15 text-severity-critical',
  duplicate: 'bg-severity-major/15 text-severity-major',
}

export const REPORT_STATUS_DOT: Record<string, string> = {
  new: 'bg-blue-500',
  confirmed: 'bg-green-500',
  rejected: 'bg-red-500',
}

export const REPORT_FLAG_ICON: Record<string, Component> = {
  none: FlagOff,
  spam: Ban,
  duplicate: Copy,
}

export function reportStatusLabel(value: string): string {
  return (
    reportStatusOptions.find((opt) => opt.value === value)?.label ??
    reportFlagOptions.find((opt) => opt.value === value)?.label ??
    value
  )
}
