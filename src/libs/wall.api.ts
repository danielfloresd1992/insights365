import { http } from './http'

/*  EL MURO DE ALERTAS CONTRA LA API (api_jarvis365)
 *
 *  Es el mismo muro de novedades de Client365: /user/publisher devuelve las publicaciones de la más nueva a la más
 *  vieja, por páginas, con su fecha, su título y su local, pero sin el contenido de la novedad: ese se pide aparte,
 *  una por una, a /novelties/img. Las franquicias y sus locales salen de /franchise.
 *  Todas piden sesión: sin ella la API contesta 401.
 */

// WallItem = «una publicación del muro»: una novedad (noveltie) o una alerta suelta (alert), con su local
export type WallItem = {
  _id: string
  date: string
  title?: string
  local?: { id?: string; localName?: string }
  noveltie?: string | null
  alert?: string | null
}

// NoveltyDetail = «el contenido de una novedad»: lo que el portal enseña de ella
export type NoveltyDetail = {
  _id: string
  title?: string
  table?: string
  nameDish?: string
  menu?: string
  shift?: 'day' | 'night' | null
  imageToShare?: string
  imageUrl?: { index?: number; url?: string; caption?: string }[]
  videoUrl?: string
}

// Franchise, Establishment = «una franquicia» y «uno de sus locales»
export type Franchise = { _id: string; name: string; location?: string }
export type Establishment = { _id: string; name: string; status?: unknown }

// getWallPage = «una página del muro: `items` publicaciones a partir de la página `page` (0 es la más nueva)»
export async function getWallPage(page: number, items: number): Promise<WallItem[]> {
  const response = await http.get<WallItem[]>(`/user/publisher/paginate=${page}/items=${items}`)
  return Array.isArray(response.data) ? response.data : []
}

// getNoveltyDetail = «el contenido de una novedad; la API lo devuelve dentro de una lista de uno»
export async function getNoveltyDetail(id: string): Promise<NoveltyDetail | null> {
  const response = await http.get<NoveltyDetail[]>(`/novelties/img/id=${id}`)
  return Array.isArray(response.data) ? (response.data[0] ?? null) : null
}

// getFranchises = «todas las franquicias»
export async function getFranchises(): Promise<Franchise[]> {
  const response = await http.get<Franchise[]>('/franchise')
  return Array.isArray(response.data) ? response.data : []
}

// getFranchiseEstablishments = «los locales de una franquicia, buscada por su nombre»
export async function getFranchiseEstablishments(franchiseName: string): Promise<Establishment[]> {
  const response = await http.get<{ establishments?: Establishment[] }>(`/franchise/establishments=${encodeURIComponent(franchiseName)}`)
  return response.data?.establishments ?? []
}
