import { useEffect, useMemo, useState } from 'react'
import { getFloorPlans, type FloorPlan } from '@/ajax/tables.ajax'

/*  LOS CROQUIS DE LOS LOCALES DE QUIEN ENTRA
 *
 *  Todos en una sola petición (GET /local/floor-plans), que la API ya filtra por el acceso de quien entra: no llega el
 *  croquis de un local que no puede ver. Antes era una petición por local, y con los 122 locales del equipo eran 122.
 *  Se guardan en memoria mientras dure la página (el croquis cambia poco y el visor los pide cada vez que se monta), y
 *  se vuelven a pedir si cambian los locales de quien entra (un administrador le asignó otros).
 *
 *  plans[id] = el croquis, o null si el local no tiene. Solo los de `ids`: lo que no sea de los locales de quien entra
 *  no se enseña aunque llegara.
 */

type PlansState = { status: 'loading' | 'ready' | 'failed'; plans: Record<string, FloorPlan | null> }

// Fetched = «lo que contestó la API para esa lista de locales»: byId null es que falló
type Fetched = { key: string; byId: Map<string, FloorPlan> | null }

// cache = «los croquis traídos y para qué locales se pidieron»: con la misma lista no se vuelven a pedir
let cache: { key: string; byId: Map<string, FloorPlan> } | null = null

export function useFloorPlans(ids: string[]): PlansState {
  const key = useMemo(() => [...ids].sort().join(','), [ids])
  const [fetched, setFetched] = useState<Fetched | null>(null)

  useEffect(() => {
    if (!key || cache?.key === key) return
    let alive = true
    getFloorPlans()
      .then(plans => {
        const byId = new Map(plans.filter(plan => plan?.establishment).map(plan => [String(plan.establishment), plan]))
        cache = { key, byId }
        if (alive) setFetched({ key, byId })
      })
      .catch(() => {
        if (alive) setFetched({ key, byId: null })
      })
    return () => {
      alive = false
    }
  }, [key])

  // El estado sale de lo que hay para esta lista: la caché, o lo que contestó la API; si no, todavía llega
  const byId = cache?.key === key ? cache.byId : fetched?.key === key ? fetched.byId : undefined
  return useMemo<PlansState>(() => {
    const list = key ? key.split(',') : []
    if (list.length === 0) return { status: 'ready', plans: {} }
    if (byId === undefined) return { status: 'loading', plans: {} }
    if (byId === null) return { status: 'failed', plans: {} }
    return { status: 'ready', plans: Object.fromEntries(list.map(id => [id, byId.get(id) ?? null])) }
  }, [key, byId])
}
