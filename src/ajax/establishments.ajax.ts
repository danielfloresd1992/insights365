import { http } from '@/libs/http'

/*  LOS ESTABLECIMIENTOS CONTRA LA API (api_jarvis365, colección `locals`)
 *
 *  Una sola llamada trae todos los locales con lo que cuelga de ellos ya poblado: GET /localLigth, con `all=true` para
 *  que vengan también los inactivos y `populate` con las cuatro referencias del local que existen de verdad:
 *  - franchiseReference.franchise → la franquicia (Franchise)
 *  - config_report → la configuración del informe (DocumentConfig): turnos, cuadro general, umbrales, semanales
 *  - timeServices → los umbrales de primera atención y de limpieza (TimeServices)
 *  - dishes → los platos, con su tiempo límite por turno (Dishes)
 *  No se pueblan timeDelays ni shedules: apuntan a modelos que la API no registra. Y /localLigth quita siempre
 *  managers, img y touchs, así que los gerentes no llegan aunque se pidan.
 *
 *  Esa llamada no filtra por franquicia, y la que sí filtra (/franchise/establishments=) solo da nombre, id y estado,
 *  sin poblar nada. Así que se piden todos y se filtra aquí: en la copia local de la base son 118 locales y unos
 *  320 KB, de los que La Francisca son 9 y 36 KB. Pide sesión: sin ella la API contesta 401.
 */

// ApiFranchise = «la franquicia de un local, ya poblada»
export type ApiFranchise = { _id: string; name: string; location?: string }

// TimeServices = «los umbrales del local para primera atención y limpieza, como hh:mm:ss» (los nombres son los de la API)
export type TimeServices = { _id: string; firstAtenttion: string; TableCleaning: string }

// Dish = «un plato del local con su tiempo límite por turno»; category dice si es comida, postre o bebida.
// OJO: timeLimitSeconds llega en milisegundos pese al nombre (00:06:00 viene como 360000)
export type Dish = {
  _id: string
  nameDishe: string
  category: 'food' | 'desserts_and_sweets' | 'drinks'
  allDay?: boolean
  timeLimit?: { day?: string; night?: string }
  timeLimitSeconds?: { day?: number; night?: number }
  requiresTableNumber?: boolean
  showDelaySubtraction?: boolean
}

// ReportConfig = «la configuración del informe del local» (config_report): lo mismo que lee reportes365
export type ReportConfig = {
  _id: string
  activation?: boolean
  numberOfReports: 'single-diary' | 'dual-diary'
  typePageSumary?: 'classic' | 'simplified' | 'dinamic'
  time1Attention?: string
  timeDelayClean?: string
  timeServices?: { active?: boolean; appetize?: string; mainDish?: string; dessert?: string; services?: string; takeOut?: string }
  time?: unknown
  requireBarTable?: boolean
  typeOfManagerToTableApproachEvaluation?: 'single' | 'complete'
  perimeterActivated?: boolean
  weeklyAlerts?: { firstAttention?: string[]; cleaning?: string[]; preparation?: string[]; returns?: string[] }
  weeklyHideManagerTouches?: boolean
  style?: Record<string, string | undefined>
  urlImgFront?: string | null
}

// TypeMonitoring = «qué se vigila en el local»
export type TypeMonitoring = 'analytical' | 'analytical and perimeter' | 'perimeter'

// ApiEstablishment = «el local tal como llega de /localLigth»: una referencia sin poblar llega como id, o no llega
type ApiEstablishment = {
  _id: string
  name: string
  location?: string
  isActive?: boolean
  typeMonitoring?: TypeMonitoring | null
  lang?: string
  image?: string | null
  DST?: { isActive?: boolean; TimeZone?: string }
  franchise?: string
  franchiseReference?: { name_franchise?: string; franchise?: ApiFranchise | string | null }
  timeServices?: TimeServices | string | null
  config_report?: ReportConfig | string | null
  dishes?: (Dish | string)[]
}

// FullEstablishment = «un local con todo lo poblado», con lo que puede faltar ya resuelto a null o a lista vacía.
// Los nombres de campo son los de la API, salvo la franquicia, que queda en franchiseId y franchiseName
export type FullEstablishment = {
  _id: string
  name: string
  location: string | null
  isActive: boolean
  typeMonitoring: TypeMonitoring | null
  lang: string
  image: string | null
  timeZone: string | null
  franchiseId: string | null
  franchiseName: string | null
  config_report: ReportConfig | null
  timeServices: TimeServices | null
  dishes: Dish[]
}

// LA_FRANCISCA = «la franquicia de los Francisca, con el nombre exacto que tiene en la API»
export const LA_FRANCISCA = 'La Francisca'

// POPULATE = «las referencias del local que se traen pobladas, separadas por espacio como las lee Mongoose»
const POPULATE = ['franchiseReference.franchise', 'config_report', 'timeServices', 'dishes'].join(' ')

// populated = «la referencia si llegó poblada; si llegó como id suelto, o no llegó, null»
const populated = <T extends object>(value: T | string | null | undefined): T | null => (value && typeof value === 'object' ? value : null)

// toFullEstablishment = «el local de la API, con lo que falta resuelto»
function toFullEstablishment(raw: ApiEstablishment): FullEstablishment {
  const reference = raw.franchiseReference?.franchise
  const franchise = populated(reference)
  return {
    _id: raw._id,
    name: raw.name,
    location: raw.location || null,
    isActive: raw.isActive !== false,
    typeMonitoring: raw.typeMonitoring ?? null,
    lang: raw.lang || 'es',
    image: raw.image || null,
    timeZone: raw.DST?.TimeZone || null,
    franchiseId: franchise?._id ?? (typeof reference === 'string' ? reference : null),
    // El nombre sale de la franquicia poblada; si no la hay, del nombre copiado en el local, y si no, del campo viejo
    franchiseName: franchise?.name || raw.franchiseReference?.name_franchise || raw.franchise || null,
    config_report: populated(raw.config_report),
    timeServices: populated(raw.timeServices),
    dishes: (raw.dishes ?? []).filter((dish): dish is Dish => typeof dish === 'object' && dish !== null),
  }
}

// belongsTo = «si el local es de alguna de esas franquicias, dichas por su nombre o por su id»
const belongsTo = (establishment: FullEstablishment, franchises: string[]) =>
  franchises.some(franchise => franchise === establishment.franchiseId || franchise === establishment.franchiseName)

// getAllEstablishments = «todos los locales, activos e inactivos, con sus referencias pobladas: una sola llamada»
export async function getAllEstablishments(): Promise<FullEstablishment[]> {
  const response = await http.get<ApiEstablishment[]>('/localLigth', { params: { all: true, populate: POPULATE } })
  return Array.isArray(response.data) ? response.data.map(toFullEstablishment) : []
}

// getFranchisesEstablishments = «los locales de esas franquicias (por nombre o por id), por orden de nombre, en una sola llamada»
export async function getFranchisesEstablishments(franchises: string[]): Promise<FullEstablishment[]> {
  const all = await getAllEstablishments()
  return all.filter(establishment => belongsTo(establishment, franchises)).sort((first, second) => first.name.localeCompare(second.name, 'es'))
}

// getFranciscaEstablishments = «todos los Francisca con todo lo poblado, en una sola llamada»
export function getFranciscaEstablishments(): Promise<FullEstablishment[]> {
  return getFranchisesEstablishments([LA_FRANCISCA])
}
