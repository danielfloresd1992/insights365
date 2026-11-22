import { useLayoutEffect } from 'react'
import type { Theme } from '@/store/slices/preferences.slice'

/*  EL TEMA Y EL IDIOMA, PUESTOS EN EL DOCUMENTO MIENTRAS EL PORTAL ESTÁ ABIERTO
 *
 *  Pone la clase dark en <html> (los colores del portal y la variante dark: de Tailwind cambian con ella) y su lang,
 *  y al salir del portal los deja como estaban: la portada y /acceso siguen claras y en español. Va antes de pintar
 *  (useLayoutEffect) para que al recargar en oscuro no se vea un destello claro.
 */
export function usePortalDocument(theme: Theme, language: string) {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previousLang = root.lang
    root.classList.toggle('dark', theme === 'dark')
    root.lang = language
    return () => {
      root.classList.remove('dark')
      root.lang = previousLang || 'es'
    }
  }, [theme, language])
}
