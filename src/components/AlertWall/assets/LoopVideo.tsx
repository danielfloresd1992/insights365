import { useEffect, useRef, useState } from 'react'

/*  EL VÍDEO DE UNA ALERTA, EN BUCLE. Solo pinta.
 *
 *  Ocupa el sitio de la foto: sin sonido, sin controles y en bucle, como una foto que se mueve. Para no descargar
 *  todos los vídeos del muro a la vez, solo se pide y se reproduce mientras está a la vista (y un poco antes), y se
 *  pausa al salir. Mientras carga se ve la foto (poster). Si el vídeo no llega (sin sesión, borrado), o la persona
 *  pidió menos movimiento en su sistema, se queda la foto.
 *
 *  @param src        la dirección del vídeo
 *  @param poster     la foto de la alerta, para mientras carga y si falla
 *  @param label      qué muestra, para lectores de pantalla
 *  @param className  el tamaño y la forma del hueco (los mismos de la foto)
 */
type LoopVideoProps = { src: string; poster: string | null; label: string; className: string }

// LOOKAHEAD = «cuánto antes de entrar en pantalla se empieza a pedir el vídeo»
const LOOKAHEAD = '300px 0px'

// prefersReducedMotion = «si la persona pidió menos movimiento en su sistema»
const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function LoopVideo({ src, poster, label, className }: LoopVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  // visible = «está a la vista»: entonces se pide y suena; failed = «no se pudo cargar»: se queda la foto
  const [visible, setVisible] = useState(false)
  // started = «ya estuvo a la vista una vez»: desde entonces el vídeo se queda pedido, aunque salga y vuelva
  const [started, setStarted] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reduced] = useState(prefersReducedMotion)

  useEffect(() => {
    const element = ref.current
    if (!element || failed || reduced) return
    const observer = new IntersectionObserver(
      entries => {
        const inView = entries.some(entry => entry.isIntersecting)
        setVisible(inView)
        if (inView) setStarted(true)
      },
      { rootMargin: LOOKAHEAD },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [failed, reduced])

  useEffect(() => {
    const element = ref.current
    if (!element || !started) return
    if (visible) {
      // Sin sonido, el navegador deja reproducir solo; si aun así lo impide, se queda la primera imagen
      void element.play().catch(() => undefined)
    } else {
      element.pause()
    }
  }, [visible, started])

  if (failed || reduced) {
    return poster ? <img src={poster} alt={label} loading='lazy' decoding='async' className={`object-cover ${className}`} /> : null
  }

  return (
    <video
      ref={ref}
      // El vídeo se pide la primera vez que está a la vista; antes, la foto
      src={started ? src : undefined}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload='none'
      aria-label={label}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  )
}
