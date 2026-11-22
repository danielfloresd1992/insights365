import { useEffect } from 'react'
import { fetchSession } from '@/ajax/user.ajax'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signedIn, signedOut, toSessionUser } from '@/store/slices/session.slice'

/*  ¿HAY SESIÓN ABIERTA?
 *
 *  Al abrir el portal la sesión está «sin comprobar»: se le pregunta a la API una vez (la cookie viaja sola) y queda
 *  abierta o cerrada en el store. Lo usan el marco del portal, para dejar pasar o mandar a entrar, y la pantalla de
 *  entrar, para saltarse el formulario si ya hay sesión.
 */
export function useSessionCheck() {
  const status = useAppSelector(state => state.session.status)
  const user = useAppSelector(state => state.session.user)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (status !== 'unknown') return
    let cancelled = false
    fetchSession()
      .then(apiUser => {
        if (!cancelled) dispatch(signedIn(toSessionUser(apiUser)))
      })
      .catch(() => {
        if (!cancelled) dispatch(signedOut())
      })
    return () => {
      cancelled = true
    }
  }, [status, dispatch])

  return { status, user }
}

// safeReturnPath = «a dónde volver tras entrar: solo una ruta de este portal; cualquier otra cosa lleva al muro»
export function safeReturnPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}
