import { useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { getWallNovelties, type Novelty, type NoveltyPage } from '@/ajax/novelty.ajax'

/*  LAS ALERTAS DEL MURO
 *
 *  Pide a la API las alertas validadas y enviadas al grupo de los establecimientos dados (ajax/novelty.ajax), de la
 *  más nueva a la más vieja, de 30 en 30: el filtro lo hace la API, aquí no se descarta nada. Al cambiar los
 *  establecimientos, se empieza de cero. «Ver más antiguas» pide la página siguiente con el cursor de la anterior.
 *
 *  Cada POLL_MS, con la pestaña delante, se vuelve a pedir la primera página y se suman arriba las que no estaban:
 *  así entran las nuevas y también las que se validaron tarde. Si entre medias llegó más de una página (la pestaña
 *  estuvo un rato detrás), se queda con la primera página entera para no dejar un hueco.
 *
 *  `establishmentIds` null es «todavía no se sabe cuáles» (el estado global no ha llegado): no se pide nada.
 *  Si la API dice 401, la sesión caducó: se avisa con `onUnauthorized`.
 */

// POLL_MS = «cada cuánto se miran las alertas nuevas»
export const POLL_MS = 30_000

type FeedState = {
  // token = «para qué establecimientos y qué intento son estas alertas»: si no es el actual, están llegando otras
  token: string | null
  items: Novelty[]
  next: string | null
  hasMore: boolean
  failed: boolean
}

const EMPTY: FeedState = { token: null, items: [], next: null, hasMore: false, failed: false }

// newestFirst = «de la más nueva a la más vieja»: el _id empieza por la fecha de creación, así que se ordena como texto
const newestFirst = (first: Novelty, second: Novelty) => (first._id < second._id ? 1 : first._id > second._id ? -1 : 0)

const isUnauthorized = (error: unknown) => isAxiosError(error) && error.response?.status === 401

// fromPage = «el muro con solo esa página»
const fromPage = (token: string, page: NoveltyPage): FeedState => ({ token, items: page.novelties, next: page.next, hasMore: page.hasMore, failed: false })

// withTopPage = «el muro con la primera página recién pedida sumada arriba»
function withTopPage(current: FeedState, page: NoveltyPage): FeedState {
  const known = new Set(current.items.map(item => item._id))
  const fresh = page.novelties.filter(item => !known.has(item._id))
  if (fresh.length === 0) return current
  // Ninguna de la página estaba y hay más detrás: entre lo nuevo y lo que había queda un hueco
  if (page.hasMore && fresh.length === page.novelties.length) return { ...current, items: page.novelties, next: page.next, hasMore: page.hasMore }
  return { ...current, items: [...fresh, ...current.items].sort(newestFirst) }
}

/*  `onNew` recibe las alertas que la revisión de cada POLL_MS trae y no estaban en el muro (de la más nueva a la más
 *  vieja). Solo avisa con el muro ya cargado: ni la primera página ni «ver más antiguas» cuentan como nuevas. */
export function useWallFeed(establishmentIds: string[] | null, onUnauthorized: () => void, onNew?: (items: Novelty[]) => void) {
  // key = «qué establecimientos», sin importar el orden; null si aún no se saben o no hay ninguno
  const key = establishmentIds && establishmentIds.length > 0 ? [...establishmentIds].sort().join(',') : null
  const [attempt, setAttempt] = useState(0)
  const token = key ? `${key}#${attempt}` : null
  const [feed, setFeed] = useState<FeedState>(EMPTY)
  const [loadingMore, setLoadingMore] = useState(false)
  const [moreFailed, setMoreFailed] = useState(false)
  const unauthorizedRef = useRef(onUnauthorized)
  const onNewRef = useRef(onNew)
  // shownRef = «lo que el muro enseña ahora»: para qué establecimientos y qué alertas
  const shownRef = useRef<{ token: string | null; ids: Set<string>; ready: boolean }>({ token: null, ids: new Set(), ready: false })

  useEffect(() => {
    unauthorizedRef.current = onUnauthorized
    onNewRef.current = onNew
  }, [onUnauthorized, onNew])

  useEffect(() => {
    shownRef.current = { token: feed.token, ids: new Set(feed.items.map(item => item._id)), ready: !feed.failed && feed.items.length > 0 }
  }, [feed])

  // La primera página, al cambiar los establecimientos o al reintentar
  useEffect(() => {
    if (!key || !token) return
    let cancelled = false
    getWallNovelties(key.split(','))
      .then(page => {
        if (!cancelled) setFeed(fromPage(token, page))
      })
      .catch(error => {
        if (cancelled) return
        if (isUnauthorized(error)) unauthorizedRef.current()
        else setFeed({ ...EMPTY, token, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [key, token])

  // Las nuevas, cada POLL_MS, si la pestaña está delante. Si la primera había fallado, esto la recupera
  useEffect(() => {
    if (!key || !token) return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      getWallNovelties(key.split(','))
        .then(page => {
          const shown = shownRef.current
          if (shown.token === token && shown.ready) {
            const fresh = page.novelties.filter(item => !shown.ids.has(item._id))
            if (fresh.length > 0) onNewRef.current?.(fresh)
          }
          setFeed(current => (current.token !== token ? current : current.failed ? fromPage(token, page) : withTopPage(current, page)))
        })
        .catch(error => {
          if (isUnauthorized(error)) unauthorizedRef.current()
        })
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [key, token])

  const current = feed.token === token
  const items = current ? feed.items : []

  const loadMore = () => {
    if (!key || !current || !feed.next || loadingMore) return
    const forToken = token
    setLoadingMore(true)
    setMoreFailed(false)
    getWallNovelties(key.split(','), feed.next)
      .then(page =>
        setFeed(state => {
          if (state.token !== forToken) return state
          const known = new Set(state.items.map(item => item._id))
          return { ...state, items: [...state.items, ...page.novelties.filter(item => !known.has(item._id))], next: page.next, hasMore: page.hasMore }
        }),
      )
      .catch(error => {
        if (isUnauthorized(error)) unauthorizedRef.current()
        else setMoreFailed(true)
      })
      .finally(() => setLoadingMore(false))
  }

  return {
    items,
    // loading = «la primera página de estos establecimientos está llegando»
    loading: Boolean(token) && !current,
    failed: current && feed.failed,
    hasMore: current && feed.hasMore,
    loadingMore,
    moreFailed,
    loadMore,
    retry: () => setAttempt(value => value + 1),
  }
}
