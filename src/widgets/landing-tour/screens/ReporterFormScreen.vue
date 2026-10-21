<script setup lang="ts">
import { ArrowLeft, ArrowUpRight, CircleCheck, Mail, Send } from '@lucide/vue'
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

      <!-- Форма и OTP — карточка проекта -->
      <div
        v-if="state.reportStep !== 'success'"
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
      </div>

      <!-- Успех — отдельная карточка с эмблемой, как в ReportPage: сводка отправленного,
           изумрудный блок про аккаунт по почте и три действия -->
      <div
        v-else
        class="mt-3 rounded-xl border border-emerald-500/25 bg-card p-6 shadow-[0_24px_60px_-45px_rgba(0,0,0,0.5)]"
      >
        <div class="flex flex-col items-center gap-1.5 text-center">
          <span
            class="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20"
          >
            <CircleCheck class="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
          </span>
          <div class="space-y-1.5">
            <p class="font-mono text-base font-semibold leading-none">Репорт отправлен</p>
            <p class="mx-auto max-w-md text-balance text-sm text-muted-foreground">
              Команда проекта «auth-service» увидит репорт во вкладке «Репорты» и ответит, как
              только его разберёт.
            </p>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          <!-- Что отправили -->
          <div class="rounded-md border border-border bg-muted/40 p-3 text-left">
            <p class="truncate text-sm font-medium">{{ state.report.title }}</p>
            <p class="mt-1 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
              {{ state.report.body }}
            </p>
          </div>

          <!-- Аккаунт по почте: в этом демо подтверждение было -->
          <div
            class="flex items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-left"
          >
            <Mail class="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p class="text-sm text-muted-foreground">
              Почта
              <span class="font-medium text-foreground">{{ state.report.email }}</span>
              подтверждена — это ваш аккаунт на BugBoard: вход по коду из письма, без пароля.
            </p>
          </div>

          <div class="flex flex-wrap justify-center gap-2">
            <span
              class="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              Открыть репорт
              <ArrowUpRight class="h-4 w-4" />
            </span>
            <span
              class="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md border bg-background px-4 text-sm font-medium shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
            >
              Отправить ещё один
            </span>
            <span
              class="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              На главную
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
