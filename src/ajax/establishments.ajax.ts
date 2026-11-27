import { http } from '@/libs/http'

/*  LOS ESTABLECIMIENTOS CONTRA LA API (api_jarvis365, colección `locals`)
 *
 *  Una sola llamada trae los locales QUE PUEDE VER QUIEN ENTRA, con lo que cuelga de ellos ya poblado:
 *  GET /insights/establishments. La API mira la sesión de la cookie y el acceso de ese usuario (user.access):
 *  - con locales asignados ('only'): los de sus franquicias enteras y sus locales sueltos; si se le quitó todo, ninguno
 *  - sin nada asignado: ninguno, salvo que sea del equipo de Jarvis365 (admin o super), que ve todos para soporte
 *  `scope` dice cuál de los tres casos es (InsightsScope).
 *  Los accesos los asigna un administrador en Client365 (/clients&manasgement, pestaña Accesos de cada local), y valen
 *  en la petición siguiente. El filtro es de la API, no de aquí: lo que no puede ver ni siquiera llega.
 *
 *  Vienen pobladas las cuatro referencias del local que existen de verdad:
 *  - franchiseReference.franchise → la franquicia (Franchise)
 *  - config_report → la configuración del informe (DocumentConfig): turnos, cuadro general, umbrales, semanales
 *  - timeServices → los umbrales de primera atención y de limpieza (TimeServices)
 *  - dishes → los platos, con su tiempo límite por turno (Dishes)
 *  No llegan managers, img ni touchs. Pide sesión: sin ella la API contesta 401. Un 404 es que la API todavía no
 *  tiene la ruta (falta desplegarla).
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

// ApiEstablishment = «el local tal como llega de la API»: una referencia sin poblar llega como id, o no llega
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

// InsightsAccess = «qué ve quien entra, según la API»: todo, o solo esas franquicias y esos locales sueltos (ids)
export type InsightsAccess = { mode: 'all' | 'only'; franchises: string[]; locals: string[] }

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

// InsightsScope = «por qué ve lo que ve», según la API (insightsScope en api_jarvis365):
//   'assigned'  tiene locales asignados: solo esos
//   'staff'     es del equipo de Jarvis365 (administrador) sin restricción: todos, para soporte
//   'none'      todavía nadie le asignó locales: ninguno
export type InsightsScope = 'assigned' | 'staff' | 'none'

// MyEstablishments = «los locales de quien entra, por orden de nombre, y con qué acceso los eligió la API»
export type MyEstablishments = { access: InsightsAccess; scope: InsightsScope; items: FullEstablishment[] }

const SCOPES: InsightsScope[] = ['assigned', 'staff', 'none']

// toAccess = «el acceso como llega, con lo que falte resuelto»: sin él, la API no restringió nada
function toAccess(raw: Partial<InsightsAccess> | null | undefined): InsightsAccess {
  if (raw?.mode !== 'only') return { mode: 'all', franchises: [], locals: [] }
  return { mode: 'only', franchises: raw.franchises ?? [], locals: raw.locals ?? [] }
}

// getMyEstablishments = «los locales que puede ver quien entra, con todo lo poblado: una sola llamada»
export async function getMyEstablishments(): Promise<MyEstablishments> {
  const response = await http.get<{ access?: Partial<InsightsAccess>; scope?: InsightsScope; establishments?: ApiEstablishment[] }>('/insights/establishments')
  const establishments = Array.isArray(response.data?.establishments) ? response.data.establishments : []
  const access = toAccess(response.data?.access)
  const raw = response.data?.scope
  return {
    access,
    // Sin scope (una API de antes): se deduce del acceso
    scope: raw && SCOPES.includes(raw) ? raw : access.mode === 'only' ? 'assigned' : 'staff',
    items: establishments.map(toFullEstablishment).sort((first, second) => first.name.localeCompare(second.name, 'es')),
  }
}
