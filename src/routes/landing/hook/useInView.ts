import { useEffect, useRef, useState } from 'react'

/*  SI UN ELEMENTO YA ENTRÓ EN PANTALLA
 *
 *  Devuelve el ref para ponerle al elemento y si ya se vio, una sola vez: al entrar se queda en true, para que lo que
 *  se arma al llegar (barras que crecen, cifras que cuentan) no se desarme al salir. Con movimiento reducido el CSS
 *  quita las transiciones, así que llega ya armado.
 *
 *  @param threshold   qué parte del elemento tiene que verse para contar como dentro
 */
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || inView) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [inView, threshold])

  return { ref, inView }
}
