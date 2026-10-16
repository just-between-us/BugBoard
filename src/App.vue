<script setup lang="ts">
import { MotionConfig } from 'motion-v'
import { TooltipProvider } from '@/components/ui/tooltip'
</script>

<template>
  <MotionConfig reduced-motion="user">
    <TooltipProvider>
      <RouterView />
    </TooltipProvider>
  </MotionConfig>
</template>
