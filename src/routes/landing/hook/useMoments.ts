import { useLayoutEffect, type RefObject } from 'react'
import * as momentLib from '../moments/lib.js'
import mountPinnedChapters from '../moments/pinned-chapters/moment.js'
import mountLettersAssemble from '../moments/letters-assemble/moment.js'
import '../moments/pinned-chapters/moment.css'
import '../moments/letters-assemble/moment.css'

/*  LOS MOMENTOS DE TASTE-SKILL, MONTADOS DESDE REACT
 *
 *  Los momentos (../moments) son el código de la skill copiado tal cual: su librería y, de cada momento, su JS y su
 *  CSS; solo se les añadieron sus tipos (.d.ts). Se importan como cualquier módulo, así que el empaquetador los incluye
 *  en el trozo de las portadas. El cargador de la skill (moments.js) no se usa: los busca por una ruta que se arma en
 *  tiempo de ejecución, y eso Vite no lo sirve ni lo empaqueta. Aquí se hace lo mismo que él al montar uno:
 *  - lee sus opciones de data-moment-opts;
 *  - lo deja quieto en el teléfono, con movimiento reducido o dentro de una tarjeta (ninguno de estos dos declara que
 *    aguante un teléfono), y lo apunta en data-moment-still;
 *  - si falla, lo marca (mo-safe, is-done) para que su CSS lo enseñe entero, en su estado final.
 *  Los momentos cambian el DOM de su sección (parten letras, mueven figuras), así que se sueltan en la limpieza de un
 *  efecto de maquetación, antes de que React quite la sección.
 */

type MomentMount = (root: HTMLElement, opts: Record<string, unknown>, lib: Record<string, unknown>) => { destroy?: () => void } | undefined

// MOMENTS = «los momentos que sabe montar este portal, por su nombre en data-moment»
const MOMENTS: Record<string, MomentMount> = {
  'pinned-chapters': mountPinnedChapters,
  'letters-assemble': mountLettersAssemble,
}

// version = «lo que, al cambiar, cambia las secciones de la página: los momentos se sueltan y se vuelven a montar»
export function useMoments(rootRef: RefObject<HTMLElement | null>, enabled: boolean, version = '') {
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || !enabled) return

    document.documentElement.classList.add('mo-js')
    const mounted: { element: HTMLElement; destroy?: () => void }[] = []

    for (const element of root.querySelectorAll<HTMLElement>('[data-moment]')) {
      const id = element.dataset.moment ?? ''
      const mount = MOMENTS[id]
      if (!mount) continue

      let opts: Record<string, unknown> = {}
      try {
        opts = JSON.parse(element.dataset.momentOpts || '{}')
      } catch {
        // Unas opciones mal escritas no impiden el momento: se monta con las de por omisión
      }

      const card = momentLib.inCard(element)
      const why = card ? 'card' : momentLib.stillWhy()
      if (why) element.dataset.momentStill = why
      const lib = { ...momentLib, reduced: () => card || momentLib.still() }

      try {
        const api = mount(element, opts, lib) ?? {}
        element.dataset.momentMounted = '1'
        mounted.push({ element, destroy: api.destroy })
      } catch (error) {
        element.dataset.momentFailed = error instanceof Error ? error.message : 'error'
        element.classList.add('mo-safe', 'is-done')
        element.classList.remove('is-live')
      }
    }

    return () => {
      for (const { element, destroy } of mounted) {
        try {
          destroy?.()
        } catch {
          // Un momento que no se deja soltar no impide soltar los demás
        }
        delete element.dataset.momentMounted
        delete element.dataset.momentStill
      }
    }
  }, [rootRef, enabled, version])
}
