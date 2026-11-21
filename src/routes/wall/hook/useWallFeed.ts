import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { getWallPage, type WallItem } from '@/libs/wall.api'

/*  LAS ALERTAS DEL MURO
 *
 *  La API da el muro de todos los locales, por páginas, de la más nueva a la más vieja, y solo sabe filtrar por un
 *  nombre de local. Así que aquí se piden páginas y se queda con las de los locales elegidos (`scopeIds`). Si con la
 *  elección quedan pocas a la vista, se piden más páginas solas, hasta AUTO_PAGE_LIMIT; a partir de ahí, con el botón.
 *  Cada POLL_MS se pide la primera página y se suman las nuevas arriba (con la pestaña delante).
 *  Si la API dice 401, la sesión caducó: se avisa con `onUnauthorized` y el marco del portal manda a entrar.
 */

// PAGE_SIZE = «cuántas publicaciones trae cada página»
const PAGE_SIZE = 30
// ENOUGH = «cuántas alertas a la vista bastan para dejar de pedir páginas solas»
const ENOUGH = 12
// AUTO_PAGE_LIMIT = «cuántas páginas se piden solas, como mucho, para llenar el muro de una elección»
const AUTO_PAGE_LIMIT = 10
// POLL_MS = «cada cuánto se miran las alertas nuevas»
export const POLL_MS = 30_000

// mergeItems = «las publicaciones de las dos listas, sin repetir, de la más nueva a la más vieja»
function mergeItems(current: WallItem[], incoming: WallItem[]) {
  const byId = new Map<string, WallItem>()
  for (const item of [...current, ...incoming]) if (!byId.has(item._id)) byId.set(item._id, item)
  return [...byId.values()].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime())
}

export function useWallFeed(scopeIds: Set<string> | null | undefined, selectionKey: string, onUnauthorized: () => void) {
  const [items, setItems] = useState<WallItem[]>([])
  const [failed, setFailed] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  // pagesLoaded = «cuántas páginas se han pedido ya»: se usa para saber qué pantalla mostrar mientras llega la primera
  const [pagesLoaded, setPagesLoaded] = useState(0)
  const nextPageRef = useRef(0)
  const busyRef = useRef(false)
  const autoPagesRef = useRef(0)
  const unauthorizedRef = useRef(onUnauthorized)

  useEffect(() => {
    unauthorizedRef.current = onUnauthorized
  }, [onUnauthorized])

  // fetchNextPage = «pide la página siguiente y la suma»; nunca dos a la vez
  const fetchNextPage = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    try {
      const batch = await getWallPage(nextPageRef.current, PAGE_SIZE)
      nextPageRef.current += 1
      setItems(current => mergeItems(current, batch))
      setPagesLoaded(nextPageRef.current)
      if (batch.length < PAGE_SIZE) setExhausted(true)
      setFailed(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) unauthorizedRef.current()
      else setFailed(true)
    } finally {
      busyRef.current = false
    }
  }, [])

  const visible = scopeIds === undefined
    ? []
    : scopeIds === null
      ? items
      : items.filter(item => item.local?.id != null && scopeIds.has(String(item.local.id)))

  // Al cambiar la elección vuelve a haber páginas solas para llenarla
  useEffect(() => {
    autoPagesRef.current = 0
  }, [selectionKey])

  // Mientras haya pocas a la vista, se piden más páginas solas, hasta el límite
  useEffect(() => {
    if (failed || exhausted || scopeIds === undefined) return
    if (pagesLoaded > 0 && visible.length >= ENOUGH) return
    if (pagesLoaded > 0 && autoPagesRef.current >= AUTO_PAGE_LIMIT) return
    autoPagesRef.current += 1
    void fetchNextPage()
  }, [failed, exhausted, scopeIds, pagesLoaded, visible.length, fetchNextPage])

  // Las nuevas, cada POLL_MS, si la pestaña está delante
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || busyRef.current) return
      getWallPage(0, PAGE_SIZE)
        .then(batch => setItems(current => mergeItems(current, batch)))
        .catch(error => {
          if (isAxiosError(error) && error.response?.status === 401) unauthorizedRef.current()
        })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const loadMore = () => {
    setLoadingMore(true)
    void fetchNextPage().finally(() => setLoadingMore(false))
  }

  const retry = () => {
    setFailed(false)
  }

  return {
    visible,
    firstLoad: pagesLoaded === 0 && !failed,
    resolvingScope: scopeIds === undefined,
    failed,
    exhausted,
    loadingMore,
    loadMore,
    retry,
  }
}
