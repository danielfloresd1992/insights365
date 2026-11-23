import { useCallback, useState } from 'react'

/*  EL TURNO DE LAS ESCENAS DEL HERO
 *
 *  Qué escena se ve y cuál acaba de salir, para que se deslice hacia la izquierda mientras entra la nueva. El tiempo
 *  no lo cuenta este hook: lo cuenta HeroSlides, que pide la siguiente cada SLIDE_SECONDS.
 */

// SLIDE_SECONDS = «lo que dura cada escena en pantalla» (pedido del usuario: 10 segundos)
export const SLIDE_SECONDS = 10

type SliderState = {
  index: number
  // previous = «la escena que acaba de salir; -1 al cargar»
  previous: number
  // direction = «hacia dónde fue el último cambio: 1 la nueva entró por la derecha, -1 por la izquierda»
  direction: 1 | -1
}

/*  El paso a otra escena. La nueva entra por la derecha y la que se ve sale por la izquierda, también al dar la vuelta.
 *  Solo hay una excepción: volver a la que acaba de salir, que está esperando a la izquierda (pasa cuando solo hay dos
 *  escenas). Esa entra por la izquierda, y la que se ve sale por la derecha, para que nunca se crucen. */
function step(current: SliderState, target: number): SliderState {
  if (target === current.index) return current
  const back = target === current.previous && current.direction === 1
  return { index: target, previous: current.index, direction: back ? -1 : 1 }
}

export function useHeroSlider(count: number) {
  const [state, setState] = useState<SliderState>({ index: 0, previous: -1, direction: 1 })
  const go = useCallback((target: number) => setState(current => step(current, target)), [])

  // Si una escena dejó de poder verse y el carrusel encoge, la que se ve sigue dentro
  const index = state.index % count
  const previous = state.previous < count ? state.previous : -1

  // offsetOf = «dónde está ahora una escena, en anchos del carrusel: 0 la que se ve, -1 a la izquierda, 1 a la derecha»;
  // moving = «si esa escena se está deslizando»: las que esperan fuera cambian de lado sin que se vea
  const offsetOf = (position: number) => (position === index ? 0 : position === previous ? -state.direction : 1)
  const moving = (position: number) => position === index || position === previous

  return { index, go, offsetOf, moving }
}
