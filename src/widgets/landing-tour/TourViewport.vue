<script setup lang="ts">
import { VIEW_H, VIEW_W, tourState } from './tourState'
import type { TourController } from './useTour'
import TourCursorLayer from './TourCursorLayer.vue'
import TourNarration from './parts/TourNarration.vue'
import AuthScreen from './screens/AuthScreen.vue'
import ProjectsScreen from './screens/ProjectsScreen.vue'
import AppShellScreen from './screens/AppShellScreen.vue'
import BugPageScreen from './screens/BugPageScreen.vue'
import ReporterFormScreen from './screens/ReporterFormScreen.vue'
import ReportDetailScreen from './screens/ReportDetailScreen.vue'

/** Логический вьюпорт приложения: фиксированные VIEW_W×VIEW_H, масштабируется целиком.
 *  Экраны лежат стопкой; неактивные уходят вглубь (translateZ + blur + opacity). */
const props = defineProps<{
  scale: number
  controller: TourController
}>()
</script>

<template>
  <div
    :ref="props.controller.viewportRef"
    class="absolute top-0 left-0 origin-top-left bg-background will-change-transform"
    :style="{
      width: `${VIEW_W}px`,
      height: `${VIEW_H}px`,
      transform: `scale(${props.scale})`,
      perspective: '1500px',
    }"
  >
    <div class="tour-screen" :class="tourState.screen === 'auth' && 'is-active'">
      <AuthScreen />
    </div>
    <div class="tour-screen" :class="tourState.screen === 'projects' && 'is-active'">
      <ProjectsScreen />
    </div>
    <div class="tour-screen" :class="tourState.screen === 'shell' && 'is-active'">
      <AppShellScreen />
    </div>
    <div class="tour-screen" :class="tourState.screen === 'bug' && 'is-active'">
      <BugPageScreen />
    </div>
    <div class="tour-screen" :class="tourState.screen === 'reporter' && 'is-active'">
      <ReporterFormScreen />
    </div>
    <div class="tour-screen" :class="tourState.screen === 'report-page' && 'is-active'">
      <ReportDetailScreen />
    </div>

    <TourNarration
      :viewport-ref="props.controller.viewportRef"
      :x="props.controller.cursorX"
      :y="props.controller.cursorY"
    />

    <TourCursorLayer
      :x="props.controller.cursorX"
      :y="props.controller.cursorY"
      :opacity="props.controller.cursorOpacity"
      :scale="props.controller.cursorScale"
      :rot="props.controller.cursorRot"
      :ripple-key="props.controller.rippleKey.value"
      :ripple-at="props.controller.rippleAt.value"
    />
  </div>
</template>
