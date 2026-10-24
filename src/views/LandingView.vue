<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import HeroSection from '@/widgets/landing-hero/HeroSection.vue'

const ProductTour = defineAsyncComponent(() => import('@/widgets/landing-tour/ProductTour.vue'))
const LandingHow = defineAsyncComponent(() => import('@/widgets/landing-how/LandingHow.vue'))
const LandingAudience = defineAsyncComponent(
  () => import('@/widgets/landing-audience/LandingAudience.vue'),
)
</script>

<template>
  <div class="min-h-screen bg-background font-sans text-foreground">
    <AppHeader />

    <main>
      <HeroSection />

      <!-- Product Tour: туториал сразу после героя -->
      <ProductTour />

      <!-- How it works: бенто живых микро-демо -->
      <LandingHow />

      <!-- Философия и аудитории -->
      <LandingAudience />
    </main>

    <footer class="border-t border-border">
      <div class="mx-auto max-w-6xl px-6 py-8 text-xs text-muted-foreground">
        BugBoard — учебный проект.
      </div>
    </footer>
  </div>
</template>
