<script setup lang="ts">
import { FolderKanban, Globe, Lock } from '@lucide/vue'
import type { Component } from 'vue'

/**
 * Мок-карточка проекта — повторяет реальный ProjectCard:
 * Card (rounded-xl, shadow-sm) с плиткой-аватаром и meta-строкой. Плитка по
 * умолчанию — FolderKanban на primary/10; публичные проекты получают свои
 * иконку и цветной тон (AVATARS в ProjectsScreen).
 * Режим морфинга (assembling): щит прозрачен, части скрыты — карточка «собирается»
 * под прибывающей панелью формы; assembled включает проявление частей с задержками
 * (CSS-хореография .tour-morph-card в ProductTour).
 */
withDefaults(
  defineProps<{
    name: string
    description?: string
    /** Строка «Создан: …» — как в реальной карточке. */
    date?: string
    isPublic?: boolean
    /** «Вы владелец» — только у своих проектов. */
    owner?: boolean
    /** Карточка собирается из формы — щит и части скрыты до команды. */
    assembling?: boolean
    /** Части собраны — проявляются с задержками, щит обретает карточные цвета. */
    assembled?: boolean
    /** Иконка аватара (по умолчанию — FolderKanban). */
    avatarIcon?: Component
    /** Цветной тон аватара: классы светлой и тёмной темы для плитки. */
    avatarTone?: string
  }>(),
  {
    description: '',
    date: 'Создан: 14 октября 2026 г.',
    isPublic: false,
    owner: false,
    assembling: false,
    assembled: false,
  },
)
</script>

<template>
  <article
    class="rounded-xl border border-border bg-card py-6 shadow-sm"
    :class="[assembling && 'tour-morph-card', assembled && 'is-done']"
  >
    <div class="flex items-start gap-4 px-6">
      <span
        data-tour-card="icon"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        :class="avatarTone ?? 'bg-primary/10 text-primary'"
      >
        <component :is="avatarIcon ?? FolderKanban" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <h4 data-tour-card="title" class="min-w-0 truncate text-base font-medium">
            {{ name }}
          </h4>
          <Lock
            v-if="!isPublic"
            data-tour-card="globe"
            class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          />
          <Globe v-else data-tour-card="globe" class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </div>
        <p
          v-if="description"
          data-tour-card="desc"
          class="mt-1 line-clamp-2 text-sm text-muted-foreground"
        >
          {{ description }}
        </p>
        <div class="mt-3 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          <span data-tour-card="meta-date">{{ date }}</span>
          <span v-if="owner" data-tour-card="meta-owner" class="font-mono text-primary">
            Вы владелец
          </span>
        </div>
      </div>
    </div>
  </article>
</template>
