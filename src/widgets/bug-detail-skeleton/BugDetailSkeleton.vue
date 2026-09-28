<template>
  <div class="space-y-6" role="status" aria-label="Загрузка бага">
    <div class="flex animate-pulse items-start gap-4">
      <div class="h-12 w-12 shrink-0 rounded-xl bg-muted" />
      <div class="min-w-0 flex-1 space-y-3">
        <div class="h-7 w-2/3 rounded bg-muted" />
        <div class="flex gap-2">
          <div class="h-5 w-24 rounded-full bg-muted" />
          <div class="h-5 w-20 rounded-full bg-muted" />
          <div class="h-5 w-28 rounded-full bg-muted" />
        </div>
        <div class="h-3 w-44 rounded bg-muted" />
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <Card class="gap-3">
          <CardContent class="space-y-3">
            <div class="h-4 w-24 rounded bg-muted" />
            <div class="h-4 w-full rounded bg-muted" />
            <div class="h-4 w-5/6 rounded bg-muted" />
            <div class="h-4 w-2/3 rounded bg-muted" />
          </CardContent>
        </Card>

        <Card class="gap-3">
          <CardContent class="space-y-4">
            <div class="h-4 w-32 rounded bg-muted" />
            <div v-for="i in 2" :key="i" class="flex gap-3">
              <div class="h-8 w-8 shrink-0 rounded-full bg-muted" />
              <div class="flex-1 space-y-2">
                <div class="h-3 w-40 rounded bg-muted" />
                <div class="h-3 w-full rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-6">
        <Card class="gap-4">
          <CardContent class="space-y-4">
            <div class="h-4 w-24 rounded bg-muted" />
            <div class="h-9 w-full rounded-md bg-muted" />
            <div class="h-9 w-full rounded-md bg-muted" />
            <div class="h-9 w-full rounded-md bg-muted" />
          </CardContent>
        </Card>

        <Card class="gap-4">
          <CardContent class="space-y-3">
            <div class="h-4 w-20 rounded bg-muted" />
            <div class="h-3 w-full rounded bg-muted" />
            <div class="h-3 w-3/4 rounded bg-muted" />
            <div class="h-3 w-1/2 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    </div>

    <span class="sr-only">Загрузка бага…</span>
  </div>
</template>

<script setup lang="ts">
import { Card, CardContent } from '@/components/ui/card'
</script>
