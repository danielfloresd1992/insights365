import type { PointerEvent } from 'react'

/*  LA INCLINACIÓN DE UNA TARJETA BAJO EL RATÓN (los manejadores del puntero; no guarda estado, no es un hook)
 *
 *  Con ratón, la tarjeta se hunde por el lado al que apunta, se acerca un poco y una luz del color de su grupo sigue
 *  al puntero. Solo escribe variables CSS en el <li> (--tilt-x, --tilt-y, --glare-x, --glare-y, --hover); el CSS de
 *  watch-card hace el resto. Con el dedo, o apagada (teléfono o movimiento reducido), no hace nada.
 */

// TILT_DEGREES = «cuánto se inclina de borde a borde»
const TILT_DEGREES = 14
// TILT_PROPERTIES = «las variables que escribe, para borrarlas al salir»
const TILT_PROPERTIES = ['--tilt-x', '--tilt-y', '--glare-x', '--glare-y', '--hover']

export function cardTiltHandlers(enabled: boolean) {
  if (!enabled) return {}

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'mouse') return
    const card = event.currentTarget
    const box = card.getBoundingClientRect()
    // across, down = «dónde está el puntero, de -0,5 (izquierda, arriba) a 0,5 (derecha, abajo)»
    const across = clampHalf((event.clientX - box.left) / box.width - 0.5)
    const down = clampHalf((event.clientY - box.top) / box.height - 0.5)
    card.style.setProperty('--tilt-x', `${(-down * TILT_DEGREES).toFixed(2)}deg`)
    card.style.setProperty('--tilt-y', `${(across * TILT_DEGREES).toFixed(2)}deg`)
    card.style.setProperty('--glare-x', `${((across + 0.5) * 100).toFixed(1)}%`)
    card.style.setProperty('--glare-y', `${((down + 0.5) * 100).toFixed(1)}%`)
    card.style.setProperty('--hover', '1')
  }

  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    for (const property of TILT_PROPERTIES) event.currentTarget.style.removeProperty(property)
  }

  return { onPointerMove, onPointerLeave }
}

const clampHalf = (value: number) => Math.min(0.5, Math.max(-0.5, value))
