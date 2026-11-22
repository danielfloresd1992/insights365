import { http } from '@/libs/http'

/*  LAS NOVEDADES (ALERTAS) CONTRA LA API (api_jarvis365, colección `novelties`)
 *
 *  El muro pide GET /novelties/wall con los ids de los establecimientos del estado global (store/slices/
 *  establishments.slice) y la API devuelve, en una sola llamada por página, las alertas de esos locales que ya
 *  llegaron al grupo del cliente: VALIDADAS y ENVIADAS AL GRUPO. Van de la más nueva a la más vieja, de 30 en 30, ya
 *  recortadas a lo que ve el cliente: sin quién la reportó ni quién la validó, ni la bonificación.
 *
 *  Las páginas van por cursor: cada una trae `next`, el id con el que se pide la siguiente. Pide sesión (401 sin ella).
 *  OJO: la ruta es nueva en la API. Hasta que se despliegue, la de producción contesta 404.
 */

// NoveltyPeriod = «de cuándo a cuándo duró lo que se reporta, como hh:mm:ss» (la API ya unifica sus dos formas)
export type NoveltyPeriod = { start: string; end: string }

// NoveltyImage = «una foto de la secuencia» («Inicio», «Secuencia», «Fin»…)
export type NoveltyImage = { url: string; caption: string | null }

// NoveltyAlert = «qué alerta del catálogo es»: su nombre en español (name) y en inglés (nameEn) y su categoría
// (delay, client, food, protocol…). nameEn puede no venir si la API desplegada es anterior
export type NoveltyAlert = { _id: string; name: string | null; nameEn?: string | null; category: string | null }

// Novelty = «una alerta del muro, tal como la ve el cliente»
export type Novelty = {
  _id: string
  title: string
  // establishment = «el id del local»: con él se busca el local en el estado global
  establishment: string | null
  // place = «el nombre del local copiado en la alerta», por si el local ya no está en el estado global
  place: string | null
  date: string | null
  shift: 'day' | 'night' | null
  table: string | null
  nameDish: string | null
  amount: number | null
  orderTicketNumber: number | null
  period: NoveltyPeriod | null
  // menu = «el texto que se mandó al grupo»
  menu: string | null
  imageToShare: string | null
  images: NoveltyImage[]
  videoUrl: string | null
  alert: NoveltyAlert | null
  validatedAt: string | null
}

// NoveltyPage = «una página del muro» y el cursor de la siguiente (null si no hay más)
export type NoveltyPage = { novelties: Novelty[]; hasMore: boolean; next: string | null }

// NOVELTY_PAGE_SIZE = «cuántas alertas trae cada página»
export const NOVELTY_PAGE_SIZE = 30

/*  Las alertas validadas y enviadas al grupo de esos establecimientos (por id). Sin `before`, la primera página (las
 *  más nuevas); con él, las más viejas que esa alerta. */
export async function getWallNovelties(establishments: string[], before?: string | null): Promise<NoveltyPage> {
  const response = await http.get<NoveltyPage>('/novelties/wall', {
    params: { establishments: establishments.join(','), before: before || undefined, limit: NOVELTY_PAGE_SIZE },
  })
  const body = response.data
  return {
    novelties: Array.isArray(body?.novelties) ? body.novelties : [],
    hasMore: Boolean(body?.hasMore),
    next: body?.next ?? null,
  }
}
