import { http } from '@/libs/http'

/*  EL CATÁLOGO DE ALERTAS CONTRA LA API (api_jarvis365, colección `menus`)
 *
 *  Cada alerta del catálogo tiene su nombre en español (es) y en inglés (en). GET /menu devuelve el catálogo entero
 *  (unos 300 KB con todo lo de cada alerta; la versión compacta solo trae el español): aquí se queda con el id y los
 *  dos nombres. Pide sesión.
 */

// AlertName = «una alerta del catálogo, con su nombre en los dos idiomas»
export type AlertName = { _id: string; es: string | null; en: string | null }

type ApiMenu = { _id: string; es?: string | null; en?: string | null }

export async function getAlertNames(): Promise<AlertName[]> {
  const response = await http.get<ApiMenu[]>('/menu')
  return Array.isArray(response.data) ? response.data.map(menu => ({ _id: String(menu._id), es: menu.es ?? null, en: menu.en ?? null })) : []
}
