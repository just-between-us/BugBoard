// Параллакс-наклон карточки под курсором: pointer-позиция -> сглаженный rotateX/rotateY через spring.
// API motion-v: useMotionValue/useTransform/useSpring зеркалят Motion for React.
import { useMotionValue, useSpring, useTransform } from 'motion-v'

export function useCardTilt(maxTilt = 8) {
  // -0.5..0.5 — нормализованная позиция курсора внутри карточки, (0,0) — центр
  const px = useMotionValue(0)
  const py = useMotionValue(0)

  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 300,
    damping: 28,
    mass: 0.5,
  })
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 300,
    damping: 28,
    mass: 0.5,
  })

  // лёгкий встречный сдвиг — усиливает ощущение объёма без лишнего цвета/эффектов
  const translateY = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), {
    stiffness: 300,
    damping: 28,
  })

  function onPointerMove(e: PointerEvent) {
    const target = e.currentTarget as HTMLElement
    const rect = target.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  function onPointerLeave() {
    px.set(0)
    py.set(0)
  }

  return { rotateX, rotateY, translateY, onPointerMove, onPointerLeave }
}
