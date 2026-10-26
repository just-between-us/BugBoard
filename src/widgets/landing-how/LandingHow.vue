<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { CodeXml } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import BentoCell from './parts/BentoCell.vue'
import ReportFlowCell from './parts/ReportFlowCell.vue'
import OtpMailCell from './parts/OtpMailCell.vue'
import InlineEditCell from './parts/InlineEditCell.vue'
import UndoCell from './parts/UndoCell.vue'
import ReportsFeedCell from './parts/ReportsFeedCell.vue'
import MonoScaleCell from './parts/MonoScaleCell.vue'
import SelfHostCell from './parts/SelfHostCell.vue'

/**
 * «Как это работает» — бенто-сетка живых микро-демо вместо сухих шагов.
 * Асимметричная сетка 3×6 (1fr, gap 8px) с явными координатами ячеек:
 *   ряд 1–2: 01 (cols 1–2) | 02 (col 3)
 *   ряд 3–4: 05 (col 1, ряды 3–5) | 04 (cols 2–3)
 *   ряд 5:   03 (cols 2–3)
 *   ряд 6:   06 (col 1) | 07 (cols 2–3)
 * Ниже lg — обычная колонка в порядке номеров. Демо кликабельны —
 * форма с OTP правится руками, отсчёт отката настоящий. ASCII-фон этой
 * секции не нужен — он остаётся «фирменным» у героя и философского
 * блока; здесь работает прожектор под курсором.
 */
</script>

<template>
  <section id="how" class="border-t border-border">
    <div class="mx-auto max-w-6xl px-6 py-20">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p class="font-pixel text-sm tracking-widest text-muted-foreground">HOW IT WORKS</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Как это работает</h2>
          <p class="mt-3 max-w-2xl text-sm text-muted-foreground">
            Репорт делается быстро и подтверждается кодом с почты, проект заводится за минуту, баги
            пишутся без церемоний. Ниже — не скриншоты, а живые мини-версии: трогайте.
          </p>
        </div>
      </div>

      <!-- Ряды auto (без 1fr): высота идёт за контентом, а не за самым тяжёлым рядом -->
      <div class="mt-10 grid gap-2 lg:grid-cols-3">
        <!-- 01 — крупная ячейка сверху слева: живая форма репортёра -->
        <BentoCell
          class="lg:col-span-2 lg:col-start-1 lg:row-span-2 lg:row-start-1"
          num="01"
          title="Репорт — это ссылка"
          description="Публичный проект выдаёт адрес вида /report/:id. Три поля и почта — заявка уходит, черновик не пропадает, пока летит письмо."
          :delay="0"
        >
          <ReportFlowCell />
        </BentoCell>

        <!-- 02 — письмо с кодом: правая колонка первых двух рядов -->
        <BentoCell
          class="lg:col-start-3 lg:row-span-2 lg:row-start-1"
          num="02"
          title="Код с почты вместо регистрации"
          description="Шесть цифр из письма вместо пароля. Аккаунт заводится молча — позже добавите человека в команду, и его данные уже на месте."
          :delay="0.08"
        >
          <OtpMailCell />
        </BentoCell>

        <!-- 03 — инлайн-редактирование (div7: ряд 5, cols 2–3) -->
        <BentoCell
          class="lg:col-span-2 lg:col-start-2 lg:row-start-5"
          num="03"
          title="Правки улетают сами"
          description="Заголовок, описание, статус — правится прямо в тексте. Ни режима редактирования, ни кнопки «Сохранить»."
          :delay="0"
        >
          <InlineEditCell />
        </BentoCell>

        <!-- 04 — откат опасного (div6: ряды 3–4, cols 2–3) -->
        <BentoCell
          class="lg:col-span-2 lg:col-start-2 lg:row-span-2 lg:row-start-3"
          num="04"
          title="Опасное — с откатом и подтверждением"
          description="Удаление идёт отсчётом с «Восстановить», выход — кольцом на кнопке. Подтверждения — спокойные и понятные, без навязчивых модалок."
          :delay="0.08"
        >
          <UndoCell />
        </BentoCell>

        <!-- 05 — лента репортов (div5: высокая левая колонка, ряды 3–5) -->
        <BentoCell
          class="lg:col-start-1 lg:row-span-3 lg:row-start-3"
          num="05"
          title="Репорты складываются в работу"
          description="Статусы, флаги, ответ репортёру и привязка к багу — прямо в карточке. Дубликаты помечаются, находка становится багом."
          :delay="0.16"
        >
          <ReportsFeedCell />
        </BentoCell>

        <!-- 06 — монохром (нижний ряд, левая колонка) -->
        <BentoCell
          class="lg:col-start-1 lg:row-start-6"
          num="06"
          title="Цвет — это сигнал"
          description="Шесть ступеней серого во всём интерфейсе. Цвет появляется, только когда различает: статус, важность, «Скопировано»."
          :delay="0"
        >
          <MonoScaleCell />
        </BentoCell>

        <!-- 07 — self-host (нижний ряд, cols 2–3) -->
        <BentoCell
          class="lg:col-span-2 lg:col-start-2 lg:row-start-6"
          num="07"
          title="Свой хостинг, открытый код"
          description="Supabase вместо своего бэкенда: две переменные окружения — и проект живёт у вас. Права решает база (RLS), а не интерфейс: чужой проект не отдаст даже ID."
          :delay="0.08"
        >
          <SelfHostCell class="mb-4" />
          <div class="mt-auto flex flex-wrap items-center gap-3">
            <Button as-child size="sm" variant="outline">
              <a
                href="https://github.com/just-between-us/BugBoard"
                target="_blank"
                rel="noopener noreferrer"
              >
                <CodeXml class="mr-1.5 h-4 w-4" />
                Код на GitHub
              </a>
            </Button>
            <RouterLink
              to="/auth?mode=signup"
              class="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              или сразу создать команду →
            </RouterLink>
          </div>
        </BentoCell>
      </div>
    </div>
  </section>
</template>
