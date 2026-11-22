import { useEffect, useRef, type RefObject } from 'react'

/*  CERRAR UN PANEL ABIERTO al pulsar fuera de él o con Escape
 *
 *  `container` es lo que cuenta como «dentro» (el botón que lo abre y el panel). Con Escape, además, el foco vuelve al
 *  botón (`trigger`), para que quien navega con teclado no se pierda.
 */
export function useDismiss(open: boolean, close: () => void, container: RefObject<HTMLElement | null>, trigger?: RefObject<HTMLElement | null>) {
  const closeRef = useRef(close)

  useEffect(() => {
    closeRef.current = close
  }, [close])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (container.current && !container.current.contains(event.target as Node)) closeRef.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeRef.current()
      trigger?.current?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, container, trigger])
}
