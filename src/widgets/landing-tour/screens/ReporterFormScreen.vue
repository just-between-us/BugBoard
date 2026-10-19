<script setup lang="ts">
import { ArrowLeft, CircleCheck, Send } from '@lucide/vue'
import { tourState } from '../tourState'
import MockField from '../parts/MockField.vue'

/** Шаг 6: публичная форма репорта — заголовок, описание, почта, OTP, успех. */
const state = tourState
</script>

<template>
  <div class="absolute inset-0 overflow-hidden bg-background">
    <div class="mx-auto w-[640px] px-8 pt-8">
      <p class="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft class="h-3 w-3" />
        На главную
      </p>

      <div
        class="mt-3 rounded-xl border border-border bg-card p-6 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.5)]"
      >
        <!-- Шапка проекта -->
        <div class="flex items-center gap-3">
          <span
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-base font-semibold"
          >
            A
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold">auth-service</p>
            <p class="truncate text-xs text-muted-foreground">
              Сервис авторизации и входа — публичный проект BugBoard
            </p>
          </div>
        </div>

        <!-- Форма -->
        <div v-if="state.reportStep === 'form'" class="mt-5 space-y-3">
          <MockField
            target="report-title"
            label="Заголовок *"
            :value="state.report.title"
            :focused="state.focused === 'report-title'"
            placeholder="Коротко о проблеме"
          />
          <MockField
            target="report-body"
            label="Что произошло *"
            :value="state.report.body"
            :focused="state.focused === 'report-body'"
            placeholder="Шаги воспроизведения, что ожидалось, что получилось..."
            :rows="4"
          />
          <MockField
            target="report-email"
            label="Почта *"
            :value="state.report.email"
            :focused="state.focused === 'report-email'"
            placeholder="you@example.com"
          />
          <p class="text-[11px] text-muted-foreground">
            Пришлём код подтверждения — без пароля. Почта останется вашим аккаунтом на BugBoard.
          </p>
          <button
            type="button"
            data-tour="report-submit"
            class="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
          >
            <Send class="h-4 w-4" />
            Отправить репорт
          </button>
        </div>

        <!-- OTP поверх формы -->
        <div v-else-if="state.reportStep === 'otp'" class="mt-5 space-y-3">
          <MockField
            target="report-otp"
            label="Код из письма"
            :value="state.report.otp"
            :focused="state.focused === 'report-otp'"
            placeholder="123456"
          />
          <p class="text-[11px] text-muted-foreground">
            Мы отправили код на {{ state.report.email }}. Вставьте его, чтобы отправить репорт —
            черновик сохранён.
          </p>
          <div class="rounded-md border border-border bg-muted/40 p-3 text-xs">
            <p class="font-medium">{{ state.report.title }}</p>
            <p class="mt-1 line-clamp-2 text-muted-foreground">{{ state.report.body }}</p>
          </div>
          <button
            type="button"
            data-tour="report-verify"
            class="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground"
          >
            Подтвердить и отправить
          </button>
          <div class="flex justify-between text-xs text-muted-foreground">
            <span>Изменить репорт</span>
            <span>Отправить код ещё раз</span>
          </div>
        </div>

        <!-- Успех -->
        <div v-else class="mt-6 flex flex-col items-center py-4 text-center">
          <CircleCheck class="h-10 w-10 text-emerald-600" />
          <p class="mt-3 text-lg font-semibold tracking-tight">Репорт отправлен</p>
          <p class="mt-1 max-w-sm text-sm text-muted-foreground">
            Команда увидит его во вкладке «Репорты». Ответ придёт на {{ state.report.email }} — по
            той же ссылке.
          </p>
          <div class="mt-5 flex items-center gap-2">
            <button
              type="button"
              class="rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"
            >
              Отправить ещё один
            </button>
            <button type="button" class="rounded-md px-3 py-2 text-sm text-muted-foreground">
              На главную
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
