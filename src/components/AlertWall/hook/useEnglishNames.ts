import { useEffect, useState } from 'react'
import { getAlertNames } from '@/ajax/menu.ajax'

/*  LOS NOMBRES EN INGLÉS DE LAS ALERTAS, CUANDO LA API NO LOS TRAE
 *
 *  /novelties/wall trae el nombre inglés de cada alerta (alert.nameEn) desde que la API lo incluye. Mientras la API
 *  desplegada sea anterior, no llega, y entonces se pide el catálogo una sola vez (ajax/menu.ajax) y se guarda para
 *  toda la página. Solo se pide si hace falta (`active`): en inglés y con alertas sin nameEn.
 *  Devuelve id de la alerta → nombre en inglés, o null mientras no lo hay.
 */

// loaded, loading = «el catálogo ya traído, y la petición en curso»: comunes a todo el portal
let loaded: Map<string, string> | null = null
let loading: Promise<Map<string, string>> | null = null

function loadEnglishNames() {
  loading ??= getAlertNames()
    .then(names => new Map(names.filter(name => name.en).map(name => [name._id, name.en as string])))
    .then(map => {
      loaded = map
      return map
    })
    .catch(() => {
      // Sin catálogo, los títulos quedan en español; se reintenta la próxima vez que haga falta
      loading = null
      return new Map<string, string>()
    })
  return loading
}

export function useEnglishNames(active: boolean) {
  const [names, setNames] = useState<Map<string, string> | null>(loaded)

  useEffect(() => {
    if (!active || names) return
    let cancelled = false
    void loadEnglishNames().then(map => {
      if (!cancelled && map.size > 0) setNames(map)
    })
    return () => {
      cancelled = true
    }
  }, [active, names])

  return names
}
