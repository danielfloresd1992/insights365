import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import { getShiftDocument, getShiftDocuments, type ShiftDocument, type ShiftDocumentSummary } from '@/ajax/shiftReports.ajax'
import { useAppDispatch } from '@/store/hooks'
import { signedOut } from '@/store/slices/session.slice'

/*  TRAER LA LISTA DEL MES Y EL INFORME ABIERTO
 *
 *  Cada uno cancela su petición si cambia lo que se pide (otro local, otro mes, otro informe) antes de que llegue, y un
 *  401 cierra la sesión. `failure` dice por qué no llegó, para enseñarlo tal cual.
 */

type Load<T> = { key: string | null; status: 'loading' | 'ready' | 'failed'; data: T | null; failure: 'session' | 'forbidden' | 'missing' | 'network' | 'server' | null }

const failureOf = (error: unknown): Load<never>['failure'] => {
  if (!isAxiosError(error)) return 'server'
  if (!error.response) return 'network'
  if (error.response.status === 401) return 'session'
  if (error.response.status === 403) return 'forbidden'
  if (error.response.status === 404) return 'missing'
  return 'server'
}

function useLoad<T>(key: string | null, fetcher: (signal: AbortSignal) => Promise<T>): Load<T> {
  const dispatch = useAppDispatch()
  const [state, setState] = useState<Load<T>>({ key: null, status: 'loading', data: null, failure: null })

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    fetcher(controller.signal)
      .then(data => setState({ key, status: 'ready', data, failure: null }))
      .catch(error => {
        if (controller.signal.aborted) return
        const failure = failureOf(error)
        if (failure === 'session') dispatch(signedOut())
        setState({ key, status: 'failed', data: null, failure })
      })
    return () => controller.abort()
    // fetcher cambia en cada render; lo que se pide lo dice key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, dispatch])

  // Lo que hay es de otra petición: todavía llega la nueva
  if (!key) return { key: null, status: 'ready', data: null, failure: null }
  return state.key === key ? state : { key, status: 'loading', data: null, failure: null }
}

// useShiftDocuments = «los informes de un local entre dos fechas» (la lista del mes)
export function useShiftDocuments(establishmentId: string | null, range: { from: string; to: string } | null) {
  const key = establishmentId && range ? `${establishmentId}|${range.from}|${range.to}` : null
  return useLoad<ShiftDocumentSummary[]>(key, signal => getShiftDocuments(establishmentId as string, range!.from, range!.to, signal))
}

// useShiftDocument = «un informe con sus páginas»
export function useShiftDocument(id: string | null) {
  return useLoad<ShiftDocument>(id, signal => getShiftDocument(id as string, signal))
}
