<script setup lang="ts">
import { ref } from 'vue'
import { Motion } from 'motion-v'
import MockReportCard from '@/widgets/landing-tour/parts/MockReportCard.vue'
import type { REPORT_STATUS_VALUES } from '@/entities/report/meta'

/**
 * Ячейка «Репорты складываются в работу»: карточки реального анатомии
 * ReportCard прилетают штампом по въезду во вьюпорт (как в финале тура),
 * а клик по статусу перещёлкивает new → confirmed → rejected циклом —
 * тот же дропдаун, только живой.
 */

type Status = (typeof REPORT_STATUS_VALUES)[number]

const CYCLE: Record<Status, Status> = { new: 'confirmed', confirmed: 'rejected', rejected: 'new' }

const reports = ref([
  { id: 1, status: 'new' as Status },
  { id: 2, status: 'confirmed' as Status },
  { id: 3, status: 'rejected' as Status },
])

function cycle(report: { status: Status }) {
  report.status = CYCLE[report.status]
}

const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <div class="space-y-2.5">
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
        hide-footer
        :status="report.status"
        :report-title="['Кнопка входа', 'Шапка на iPhone', 'Таймаут загрузки'][i]"
        :report-body="[
          'После клика «Войти через GitHub» окно закрывается.',
          'Навигация наезжает на логотип при ширине до 380px.',
          'Больше 20 файлов обрываются на 30-й секунде.',
        ][i]"
        :author-name="['Дмитрий К.', 'Марина А.', 'Олег В.'][i]"
        :author-initials="['ДК', 'МА', 'ОВ'][i]"
        :report-date="['2 мин назад', '18 мин назад', 'вчера'][i]"
        @status-click="cycle(report)"
      />
    </Motion>

    <p class="font-pixel text-[11px] text-muted-foreground">
      кликните по статусу — команда разбирает поток, не выходя из списка
    </p>
  </div>
</template>
