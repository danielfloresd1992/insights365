import { useEffect, useState } from 'react'

// REDUCED_MOTION_QUERY = «la preferencia del sistema de quien no quiere animaciones»
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
// PHONE_QUERY = «una pantalla de teléfono: ahí la escena 3D no se anima, para no gastar batería ni distraer al leer»
const PHONE_QUERY = '(max-width: 767px)'

/*  Si se cumple una media query, y se actualiza cuando deja o empieza a cumplirse. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/*  Si la escena 3D debe quedarse quieta: quien mira pidió menos movimiento, o está en un teléfono.
 *  Quieta quiere decir dibujada una vez, ya montada, en su segundo de reposo. */
export function useStillScene() {
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY)
  const phone = useMediaQuery(PHONE_QUERY)
  return reducedMotion || phone
}
