<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Motion } from 'motion-v'

/**
 * Манифест в две колонки: «Чего здесь нет» — пункты зачёркиваются по
 * въезду во вьюпорт (линия рисуется scaleX со стаггером), «Что вместо» —
 * параллельный список без зачёркивания. Клик по зачёркнутому возвращает
 * строку: даже манифест на этой странице редактируется инлайном.
 */

const GAPS = [
  'Спринты, оценки и канбан на сорок колонок',
  'Тарифы, лимиты и «связаться с отделом продаж»',
  'Онбординг на семь экранов и модальные подсказки',
  'Регистрация для того, кто просто сообщил о баге',
  'Кнопка «Сохранить»',
]

const INSTEAD = [
  'Открытый код и self-host на Supabase',
  'Права решает база (RLS), а не интерфейс',
  'Ссылка репортёру — и вход по коду с почты',
  'Монохром, инлайн-правки и откаты',
  'Мягкое удаление с окном восстановления',
]

/** Состояние «зачёркнуто»: по умолчанию false, въезд во вьюпорт ставит true со стаггером */
const struck = ref(GAPS.map(() => false))
const rootRef = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined

function strikeAll() {
  GAPS.forEach((_, i) => {
    setTimeout(() => (struck.value[i] = true), 250 + i * 180)
  })
}

function toggle(i: number) {
  struck.value[i] = !struck.value[i]
}

onMounted(() => {
  const el = rootRef.value
  if (!el) return
  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry?.isIntersecting) {
        strikeAll()
        observer?.disconnect()
        observer = undefined
      }
    },
    { threshold: 0.5 },
  )
  observer.observe(el)
})

onBeforeUnmount(() => observer?.disconnect())

const easeOut = [0.22, 1, 0.36, 1] as const
</script>

<template>
  <div ref="rootRef" class="grid gap-10 md:grid-cols-2 md:gap-14">
    <!-- Чего здесь нет -->
    <div>
      <p class="font-pixel text-sm tracking-widest text-muted-foreground">NOT FOR ENTERPRISE</p>
      <h3 class="mt-2 text-lg font-medium">Чего здесь нет</h3>
      <ul class="mt-5 space-y-4">
        <li v-for="(gap, i) in GAPS" :key="gap">
          <button
            type="button"
            class="group relative text-left text-base text-muted-foreground transition-colors duration-300 hover:text-foreground"
            :class="struck[i] ? '' : 'text-foreground'"
            :aria-pressed="struck[i]"
            @click="toggle(i)"
          >
            <span>{{ gap }}</span>
            <!-- Линия зачёркивания: рисуется слева направо -->
            <span
              class="pointer-events-none absolute top-1/2 -left-1 h-px w-[calc(100%+8px)] origin-left bg-foreground/60 transition-transform duration-500 ease-out"
              :class="struck[i] ? 'scale-x-100' : 'scale-x-0'"
              aria-hidden="true"
            />
          </button>
          <Motion
            class="mt-1 block font-pixel text-[11px] text-muted-foreground/60"
            :initial="{ opacity: 0 }"
            :whileInView="{ opacity: 1 }"
            :viewport="{ once: true, amount: 0.6 }"
            :transition="{ duration: 0.4, delay: 0.3 + i * 0.18, ease: easeOut }"
          >
            {{ struck[i] ? 'клик — вернуть' : '✓ вернули' }}
          </Motion>
        </li>
      </ul>
    </div>

    <!-- Что вместо -->
    <div>
      <p class="font-pixel text-sm tracking-widest text-muted-foreground">WHAT INSTEAD</p>
      <h3 class="mt-2 text-lg font-medium">Что вместо</h3>
      <ul class="mt-5 space-y-4">
        <li v-for="(item, i) in INSTEAD" :key="item">
          <Motion
            class="flex items-baseline gap-3 text-base"
            :initial="{ opacity: 0, x: -12 }"
            :whileInView="{ opacity: 1, x: 0 }"
            :viewport="{ once: true, amount: 0.6 }"
            :transition="{ duration: 0.5, delay: 0.15 + i * 0.12, ease: easeOut }"
          >
            <span class="font-pixel text-sm text-muted-foreground/60">→</span>
            <span>{{ item }}</span>
          </Motion>
        </li>
      </ul>
    </div>
  </div>
</template>
