<script setup lang="ts">
import { Motion } from 'motion-v'
import MockReportCard from '@/widgets/landing-tour/parts/MockReportCard.vue'
import { formatDate } from '@/lib/format'

/**
 * Ячейка «Репорты складываются в работу»: карточки реального анатомии
 * ReportCard прилетают штампом по въезду во вьюпорт (как в финале тура),
 * а дропдауны в них настоящие — статус и флаг выбираются прямо в ленте.
 */

const reports = [
  {
    id: '8c4d1f62-3a7b-4e09-b5d8-2f6a91c7e034',
    status: 'new' as const,
    title: 'Кнопка входа',
    name: 'Дмитрий К.',
    initials: 'ДК',
    date: formatDate('2026-09-30T15:48:00'),
  },
  {
    id: 'b2e90a47-6c1d-4f83-9a52-7d3b8e1f6c05',
    status: 'confirmed' as const,
    title: 'Шапка на iPhone',
    name: 'Марина А.',
    initials: 'МА',
    date: formatDate('2026-09-29T11:07:00'),
  },
  {
    id: '5f17c3d8-9e2a-4b60-8c41-a0d6b92e7f13',
    status: 'rejected' as const,
    title: 'Таймаут загрузки',
    name: 'Олег В.',
    initials: 'ОВ',
    date: formatDate('2026-09-27T19:22:00'),
  },
]

const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <div class="space-y-2">
    <!-- Штамп: быстрый слёт сверху с лёгким перелётом — тот же вайб, что в туре -->
    <Motion
      v-for="(report, i) in reports"
      :key="report.id"
      class="origin-top"
      :initial="{ opacity: 0, y: -18, scale: 1.04 }"
      :whileInView="{ opacity: 1, y: 0, scale: 1 }"
      :viewport="{ once: true, amount: 0.4 }"
      :transition="{ duration: 0.45, delay: 0.15 + i * 0.18, ease: easeOut }"
    >
      <MockReportCard
        interactive
        hide-footer
        stack-controls
        :status="report.status"
        :report-id="report.id"
        :report-title="report.title"
        :report-body="''"
        :author-name="report.name"
        :author-initials="report.initials"
        :report-date="report.date"
      />
    </Motion>

    <p class="font-pixel text-[11px] text-muted-foreground">
      откройте меню и смените статус не выходя из списка
    </p>
  </div>
</template>
