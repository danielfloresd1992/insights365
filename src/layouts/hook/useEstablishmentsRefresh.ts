import { useEffect, useRef } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { refreshAccess } from '@/store/slices/establishments.slice'

/*  LOS LOCALES DE QUIEN ENTRA, AL DÍA
 *
 *  Un administrador puede asignarle o quitarle locales en Client365 con el portal abierto (el panel en vivo se deja
 *  horas en una pantalla). Para que valga sin recargar, se vuelve a preguntar por la sesión (refreshAccess: /auth/isAuth
 *  trae el acceso leído de la base) al volver a la pestaña o a la ventana, y cada REFRESH_MS mientras se ve; nunca más
 *  de una vez por MIN_GAP_MS. Si el acceso cambió, los establecimientos se vuelven a pedir por detrás (sin «cargando» y
 *  sin errores a la vista); si no, no se pide nada más.
 */

// REFRESH_MS = «cada cuánto se vuelven a pedir con la pestaña a la vista»; MIN_GAP_MS = «lo mínimo entre dos»
const REFRESH_MS = 5 * 60_000
const MIN_GAP_MS = 60_000

export function useEstablishmentsRefresh(enabled: boolean) {
  const dispatch = useAppDispatch()
  // last = «cuándo se pidieron por última vez»: al abrir el portal los acaba de pedir el store, así que cuenta desde ahí
  const last = useRef(0)

  useEffect(() => {
    if (!enabled) return
    last.current = Date.now()
    const refresh = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - last.current < MIN_GAP_MS) return
      last.current = Date.now()
      void dispatch(refreshAccess())
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, REFRESH_MS)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
      window.clearInterval(timer)
    }
  }, [enabled, dispatch])
}
