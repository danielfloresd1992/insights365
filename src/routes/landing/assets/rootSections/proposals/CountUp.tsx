import { useEffect, useRef } from 'react'

/*  UNA CIFRA QUE CUENTA AL APARECER
 *
 *  Cuando se enciende (active) cuenta de 0 a su valor en menos de un segundo; si después cambia el valor, cuenta desde
 *  el que tenía hasta el nuevo. Escribe el número directamente en el texto, sin volver a pintar React en cada
 *  fotograma. Los lectores de pantalla leen siempre el valor final. Con movimiento reducido salta al valor. Los
 *  decimales van con punto, como en el informe. Solo pinta.
 */

type CountUpProps = {
  value: number
  decimals?: number
  suffix?: string
  // active = «ya se ve: empieza a contar»
  active: boolean
}

// DURATION_MS = «lo que tarda en llegar a su valor»
const DURATION_MS = 900

const format = (value: number, decimals: number, suffix: string) => `${value.toFixed(decimals)}${suffix}`

export default function CountUp({ value, decimals = 0, suffix = '', active }: CountUpProps) {
  const numberRef = useRef<HTMLSpanElement>(null)
  // shownRef = «el valor que se ve ahora, para contar desde él si cambia»
  const shownRef = useRef(0)

  useEffect(() => {
    const element = numberRef.current
    if (!element || !active) return
    const from = shownRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === value) {
      element.textContent = format(value, decimals, suffix)
      shownRef.current = value
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / DURATION_MS)
      const current = from + (value - from) * (1 - Math.pow(1 - progress, 3))
      element.textContent = format(current, decimals, suffix)
      shownRef.current = current
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [active, value, decimals, suffix])

  return (
    <>
      <span className='sr-only'>{format(value, decimals, suffix)}</span>
      <span ref={numberRef} aria-hidden='true' className='tabular-nums'>
        {format(0, decimals, suffix)}
      </span>
    </>
  )
}
