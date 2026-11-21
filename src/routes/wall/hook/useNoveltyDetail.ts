import { useEffect, useRef, useState } from 'react'
import { getNoveltyDetail, type NoveltyDetail } from '@/libs/wall.api'

/*  EL CONTENIDO DE UNA NOVEDAD, CUANDO SE VA A VER
 *
 *  El muro trae cada publicación sin su contenido (foto, mesa, plato, turno): se pide aparte, una por una. Para no
 *  pedir cien de golpe, se pide cuando la tarjeta está a punto de entrar en pantalla, y se guarda para no repetirla
 *  si la tarjeta se vuelve a pintar. `detail` es undefined mientras no ha llegado y null si no hay o falló.
 */

// cache, inFlight = «lo ya traído, y lo que está viniendo, por id de novedad»: comunes a todas las tarjetas
const cache = new Map<string, NoveltyDetail | null>()
const inFlight = new Map<string, Promise<NoveltyDetail | null>>()

function load(noveltyId: string) {
  const pending = inFlight.get(noveltyId)
  if (pending) return pending
  const request = getNoveltyDetail(noveltyId)
    .catch(() => null)
    .then(result => {
      cache.set(noveltyId, result)
      inFlight.delete(noveltyId)
      return result
    })
  inFlight.set(noveltyId, request)
  return request
}

// LOOKAHEAD = «cuánto antes de entrar en pantalla se pide»
const LOOKAHEAD = '400px 0px'

export function useNoveltyDetail(noveltyId: string | null | undefined) {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState<{ id: string; detail: NoveltyDetail | null } | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!noveltyId || cache.has(noveltyId) || !element) return
    let cancelled = false
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return
        observer.disconnect()
        void load(noveltyId).then(detail => {
          if (!cancelled) setLoaded({ id: noveltyId, detail })
        })
      },
      { rootMargin: LOOKAHEAD },
    )
    observer.observe(element)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [noveltyId])

  const detail = !noveltyId
    ? null
    : cache.has(noveltyId)
      ? (cache.get(noveltyId) ?? null)
      : loaded?.id === noveltyId
        ? loaded.detail
        : undefined

  return { ref, detail, loading: detail === undefined }
}
