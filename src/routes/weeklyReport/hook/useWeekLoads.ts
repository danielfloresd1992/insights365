import { useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import type { WeeklyReport } from '@/libs/weekly/weeklyMetrics.js'
import { loadWeek } from '../weekData'

/*  VARIOS REPORTES SEMANALES A LA VEZ
 *
 *  Las tres vistas piden lo mismo con distinta forma: el semanal, una semana de un local; el intersemanal, cuatro
 *  semanas de un local; el global, una semana de muchos locales. Este hook recibe la lista de (local, semana) y va
 *  devolviendo el estado de cada una según llega, de a PARALLEL a la vez (cada una son hasta 28 peticiones, de 6 en
 *  6, ver ajax/documents.ajax). Lo ya pedido sale de la memoria de weekData al instante.
 *
 *  Devuelve { [key]: { status, report?, error? } } y cuántas van listas, para la barra de progreso.
 */
export type WeekRequest = { key: string; establishment: FullEstablishment; monday: string }

export type WeekLoad = { status: 'loading' | 'ready' | 'failed'; report?: WeeklyReport; error?: 'session' | 'network' | 'unknown' }

// PARALLEL = «cuántos reportes se arman a la vez»
const PARALLEL = 2

const failureOf = (error: unknown): WeekLoad['error'] => {
  if (isAxiosError(error)) return error.response?.status === 401 ? 'session' : error.response ? 'unknown' : 'network'
  return 'unknown'
}

export function useWeekLoads(requests: WeekRequest[]) {
  // signature = «qué se pide, dicho en una cadena»: el efecto solo vuelve a correr si cambia lo pedido
  const signature = requests.map(request => request.key).join(',')
  const [state, setState] = useState<{ signature: string; loads: Record<string, WeekLoad> }>({ signature, loads: {} })

  useEffect(() => {
    let alive = true
    const pending = [...requests]

    // put = «anota un resultado»; si lo guardado era de otra petición, se empieza de cero
    const put = (key: string, load: WeekLoad) =>
      setState(current => ({ signature, loads: { ...(current.signature === signature ? current.loads : {}), [key]: load } }))

    const worker = async (): Promise<void> => {
      for (let request = pending.shift(); request && alive; request = pending.shift()) {
        const { key } = request
        try {
          const report = await loadWeek(request.establishment, request.monday)
          if (alive) put(key, { status: 'ready', report })
        } catch (error) {
          if (alive) put(key, { status: 'failed', error: failureOf(error) })
        }
      }
    }
    void Promise.all(Array.from({ length: PARALLEL }, worker))
    return () => {
      alive = false
    }
    // `requests` se rehace en cada render; lo que manda es su firma
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // Si la firma cambió y el efecto aún no corrió, lo anterior ya no vale
  const loads = state.signature === signature ? state.loads : {}
  const done = requests.filter(request => loads[request.key]).length
  return { loads, done, total: requests.length }
}
