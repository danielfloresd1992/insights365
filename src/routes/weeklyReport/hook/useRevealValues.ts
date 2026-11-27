import { useEffect, useRef, useState } from 'react'

/*  LAS CIFRAS DE UNA GRÁFICA, CON MOVIMIENTO (pedido del usuario: «que permanezcan en 0 y se actualicen con los datos la
 *  primera vez que aparezcan en el viewport»)
 *
 *  Devuelve el ref para la gráfica y, por cada clave, el valor que se ve ahora:
 *  - En 0 hasta que la gráfica entra en pantalla por primera vez (una parte, `threshold`).
 *  - Entonces crece hasta su dato en DURATION_MS, frenando al final.
 *  - Si los datos cambian después (otra semana, otra comparación, un local que llega), pasa de lo que se ve a lo nuevo.
 *    Va por clave y no por posición: si un ranking se reordena, cada barra sigue siendo la de su local.
 *  - Con movimiento reducido llega sin transición, en cuanto se ve.
 *  La escala de la gráfica (su tope) se calcula con los datos de verdad, no con estos: así las barras crecen dentro de un
 *  eje quieto.
 *
 *  @param entries    [clave, dato] por cada valor que se dibuja
 *  @param threshold  qué parte de la gráfica tiene que verse para que arranque
 */

const DURATION_MS = 900

// easeOutCubic = «rápido al empezar, suave al llegar»
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3

export function useRevealValues<T extends Element>(entries: [string, number][], threshold = 0.25) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  const [shown, setShown] = useState<Record<string, number>>({})
  // current = «lo que se ve ahora», para que una animación nueva salga de donde se quedó la anterior
  const current = useRef<Record<string, number>>({})
  // signature = «los datos, escritos»: el efecto se rehace solo cuando cambian de verdad, no en cada render
  const signature = JSON.stringify(entries)

  useEffect(() => {
    const element = ref.current
    if (!element || seen) return
    const observer = new IntersectionObserver(
      observed => {
        if (observed.some(entry => entry.isIntersecting)) {
          setSeen(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [seen, threshold])

  useEffect(() => {
    if (!seen) return
    const targets = (JSON.parse(signature) as [string, number | null][]).map(([key, value]): [string, number] => [key, Number.isFinite(value) ? (value as number) : 0])
    const from = Object.fromEntries(targets.map(([key]) => [key, current.current[key] ?? 0]))
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : DURATION_MS
    let start = -1
    let frame = 0
    const step = (now: number) => {
      if (start < 0) start = now
      const progress = duration === 0 ? 1 : Math.min(1, (now - start) / duration)
      const eased = easeOutCubic(progress)
      const next = Object.fromEntries(targets.map(([key, value]) => [key, from[key] + (value - from[key]) * eased]))
      current.current = next
      setShown(next)
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [seen, signature])

  // valueOf = «el valor de esa clave tal como se ve»
  const valueOf = (key: string) => (seen ? (shown[key] ?? 0) : 0)
  return { ref, seen, valueOf }
}

// tweenLabel = «la cifra que se escribe mientras crece»: un dato entero cuenta de uno en uno (sin decimales a medio
// camino); uno con decimales, tal cual
export function tweenLabel(shown: number, target: number) {
  return Number.isInteger(target) ? Math.round(shown) : shown
}
