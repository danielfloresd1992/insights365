import { useEffect, useState, type RefObject } from 'react'

// POLL_MS = «cada cuánto se mira el reloj de la escena»
const POLL_MS = 200

/*  En qué vuelta va una lista que se repite cada `periodSeconds`, leída del reloj de la escena 3D.
 *  Devuelve -1 antes de `startSeconds`. Así la tarjeta de novedades y la sala van siempre a la par,
 *  también en pausa. Con `enabled` en falso no mira nada.
 */
export function useCycleIndex(clockRef: RefObject<number>, periodSeconds: number, startSeconds: number, enabled: boolean) {
  const [cycle, setCycle] = useState(-1)

  useEffect(() => {
    if (!enabled) return
    const timer = window.setInterval(() => {
      const elapsed = clockRef.current - startSeconds
      const next = elapsed < 0 ? -1 : Math.floor(elapsed / periodSeconds)
      setCycle(previous => (previous === next ? previous : next))
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [clockRef, periodSeconds, startSeconds, enabled])

  return cycle
}
