import { useEffect, useState } from 'react'
import { getFloorPlan, type FloorPlan } from '@/ajax/tables.ajax'

/*  LOS CROQUIS DE LOS LOCALES DE QUIEN ENTRA
 *
 *  Uno por local (GET /local/id=:id/floor-plan), todos a la vez. Guardados en memoria mientras dure la página: el
 *  croquis cambia poco y el visor los pide cada vez que se monta.
 *  plans[id] = el croquis, null si el local no tiene, o undefined si su petición falló.
 *  status: 'failed' solo si fallaron TODAS (la ruta no existe en la API desplegada, sin conexión…).
 */

type PlansState = { status: 'loading' | 'ready' | 'failed'; plans: Record<string, FloorPlan | null | undefined> }

// cache = «los croquis ya pedidos», por id de local
const cache = new Map<string, FloorPlan | null>()

const fetchPlan = async (id: string) => {
  if (cache.has(id)) return cache.get(id) ?? null
  const plan = await getFloorPlan(id)
  cache.set(id, plan)
  return plan
}

export function useFloorPlans(ids: string[]): PlansState {
  const key = ids.join(',')
  const [state, setState] = useState<PlansState>({ status: 'loading', plans: {} })

  useEffect(() => {
    let alive = true
    const list = key ? key.split(',') : []
    void Promise.allSettled(list.map(fetchPlan)).then(results => {
      if (!alive) return
      const plans: PlansState['plans'] = {}
      results.forEach((result, index) => {
        plans[list[index]] = result.status === 'fulfilled' ? result.value : undefined
      })
      const allFailed = list.length > 0 && results.every(result => result.status === 'rejected')
      setState({ status: allFailed ? 'failed' : 'ready', plans })
    })
    return () => {
      alive = false
    }
  }, [key])

  return state
}
