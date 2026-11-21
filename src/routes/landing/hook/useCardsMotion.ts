import { useEffect, type RefObject } from 'react'

/*  EL MOVIMIENTO CON SCROLL DE LAS TARJETAS DE «LO QUE SE VIGILA»
 *
 *  Mientras la sección está cerca de la pantalla, en cada fotograma de scroll mide dónde va y le pasa al movimiento
 *  elegido (cardMotions.ts) esa medida y el sitio de cada tarjeta en la rejilla; el movimiento escribe el transform de
 *  cada una. Va pegado al scroll: si se sube, vuelve atrás. Apagado (teléfono o movimiento reducido), las tarjetas se
 *  quedan quietas en su sitio.
 */

// CardPlace = «una tarjeta y su sitio en la rejilla, medido sin transformaciones»
export type CardPlace = {
  element: HTMLElement
  index: number
  column: number
  row: number
  // offsetX, offsetY = «cuánto hay del centro de la tarjeta al centro de la rejilla»
  offsetX: number
  offsetY: number
  // bottom = «dónde acaba la tarjeta, medido desde arriba de la rejilla»
  bottom: number
}

// CardsLayout = «la rejilla medida: sus tarjetas y cuántas columnas y filas tiene ahora»
export type CardsLayout = {
  cards: CardPlace[]
  columns: number
  rows: number
}

// CardsView = «dónde están ahora, en pantalla, la sección y su rejilla, y cuánto mide la pantalla de alto»
export type CardsView = {
  section: DOMRect
  grid: DOMRect
  viewportHeight: number
}

// CardsMotion = «un movimiento: qué hace con las tarjetas según dónde va la sección»
export type CardsMotion = (view: CardsView, layout: CardsLayout) => void

// NEAR_MARGIN = «a qué distancia de la pantalla empieza a seguir el scroll»
const NEAR_MARGIN = '25% 0px'

/*  Mide la rejilla: cada tarjeta, su columna y su fila (por su posición sin transformar), y su distancia al centro */
function measureLayout(grid: HTMLElement): CardsLayout {
  const elements = Array.from(grid.children) as HTMLElement[]
  const lefts = [...new Set(elements.map(element => element.offsetLeft))].sort((first, second) => first - second)
  const tops = [...new Set(elements.map(element => element.offsetTop))].sort((first, second) => first - second)
  const centerX = grid.clientWidth / 2
  const centerY = grid.clientHeight / 2

  const cards = elements.map((element, index) => ({
    element,
    index,
    column: lefts.indexOf(element.offsetLeft),
    row: tops.indexOf(element.offsetTop),
    offsetX: centerX - (element.offsetLeft + element.offsetWidth / 2),
    offsetY: centerY - (element.offsetTop + element.offsetHeight / 2),
    bottom: element.offsetTop + element.offsetHeight,
  }))

  return { cards, columns: lefts.length, rows: tops.length }
}

/*  Deja cada tarjeta como si no hubiera movimiento */
function resetCards(grid: HTMLElement) {
  for (const element of Array.from(grid.children) as HTMLElement[]) {
    element.style.transform = ''
    element.style.removeProperty('--pop')
  }
}

export function useCardsMotion(
  sectionRef: RefObject<HTMLElement | null>,
  gridRef: RefObject<HTMLElement | null>,
  motion: CardsMotion,
  enabled: boolean,
) {
  useEffect(() => {
    const section = sectionRef.current
    const grid = gridRef.current
    if (!enabled || !section || !grid) return

    let layout = measureLayout(grid)
    let frame = 0
    // near = «la sección está cerca de la pantalla; lejos no se calcula nada»
    let near = true

    const tick = () => {
      frame = 0
      if (!near) return
      const view = { section: section.getBoundingClientRect(), grid: grid.getBoundingClientRect(), viewportHeight: window.innerHeight }
      motion(view, layout)
    }
    const request = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const nearObserver = new IntersectionObserver(
      entries => {
        near = entries[entries.length - 1].isIntersecting
        if (near) request()
      },
      { rootMargin: NEAR_MARGIN },
    )
    // Si cambia el ancho, cambian las columnas: se vuelve a medir
    const sizeObserver = new ResizeObserver(() => {
      layout = measureLayout(grid)
      request()
    })

    nearObserver.observe(section)
    sizeObserver.observe(grid)
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', request)
    request()

    return () => {
      nearObserver.disconnect()
      sizeObserver.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', request)
      if (frame) cancelAnimationFrame(frame)
      resetCards(grid)
    }
  }, [sectionRef, gridRef, motion, enabled])
}
