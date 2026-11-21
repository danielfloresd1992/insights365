import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/*  UN FOTOGRAMA POR CADA MOVIMIENTO DEL SCROLL, MIENTRAS EL ELEMENTO ESTÁ CERCA
 *
 *  Llama a onFrame con la caja del elemento en pantalla y el alto de la pantalla, una vez por fotograma de scroll o
 *  de cambio de tamaño, y solo mientras el elemento está a menos de un cuarto de pantalla de verse. Es la base de lo
 *  que va pegado al scroll (si se sube, vuelve atrás). Apagado, no llama a nada.
 */

// NEAR_MARGIN = «a qué distancia de la pantalla empieza a seguir el scroll»
const NEAR_MARGIN = '25% 0px'

export type ScrollFrame = (box: DOMRect, viewportHeight: number) => void

export function useScrollFrame(targetRef: RefObject<HTMLElement | null>, onFrame: ScrollFrame, enabled: boolean) {
  // frameRef = «el último onFrame recibido, para no volver a enganchar el scroll en cada pintado»
  const frameRef = useRef(onFrame)
  useLayoutEffect(() => {
    frameRef.current = onFrame
  })

  useEffect(() => {
    const target = targetRef.current
    if (!enabled || !target) return

    let frame = 0
    // near = «el elemento está cerca de la pantalla; lejos no se calcula nada»
    let near = true
    const tick = () => {
      frame = 0
      if (near) frameRef.current(target.getBoundingClientRect(), window.innerHeight)
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const observer = new IntersectionObserver(
      entries => {
        near = entries[entries.length - 1].isIntersecting
        if (near) request()
      },
      { rootMargin: NEAR_MARGIN },
    )
    observer.observe(target)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    request()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [targetRef, enabled])
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
