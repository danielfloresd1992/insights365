import { http } from '@/libs/http'

/*  EL CROQUIS DE MESAS Y LAS ROTACIONES, CONTRA LA API (api_jarvis365)
 *
 *  - Los croquis (colección floorplans), que dibuja Client365; aquí solo se leen:
 *      GET /local/floor-plans → { data: [croquis…] }  todos los de los locales que puede ver quien entra, de una vez
 *                               (la API filtra por su acceso); un local que no sale no tiene croquis
 *  - Las rotaciones de un local (colección rotations), que anota el operador en Mesas de Jarvis-express365:
 *      GET /rotation?establishment=:id&status=open                → las ABIERTAS (en vivo), de cualquier día
 *      GET /rotation?establishment=:id&from=AAAA-MM-DD&to=AAAA-MM-DD → las GUARDADAS de esos días operativos
 *    Las dos responden { …, documents }; la de un local que no puede ver, 403.
 *  Todo pide sesión.
 */

// FloorPlanZone = «una zona del croquis» y FloorPlanPiece = «una pieza»: una mesa, un puesto de barra o un mueble.
// Las medidas van en las unidades del plano (board), con el origen arriba a la izquierda
export type FloorPlanZone = { id: string; label: string }
export type FloorPlanPiece = { id: string; zona: string; kind: string; label: string; x: number; y: number; w: number; h: number; cap: number }

// FloorPlan = «el croquis de un local»
export type FloorPlan = {
  establishment: string
  version: number
  board: { w: number; h: number; grid: number }
  zonas: FloorPlanZone[]
  piezas: FloorPlanPiece[]
  updatedAt: string | null
}

// RotationTouch = «un toque de gerente», RotationProcess = «un pedido de la mesa» y Rotation = «una mesa desde que
// se ocupa hasta que se limpia», con lo que el visor usa de ella. Las horas van como texto 'HH:MM:SS', como las anota
// el operador; '' es «todavía no pasó»
// (createdAt = el momento real del clic; los toques de antes de existir el campo lo traen null)
export type RotationTouch = { _id?: string; name: string; hourTouch: string; createdAt?: string | null }
export type RotationProcess = { _id?: string; dishType: string; orderTaking: string; markedReadyOnTablet: string; readyInTheKitchen: string; dishDelivery: string }
export type Rotation = {
  _id: string
  clientId: string
  tableNumber: string
  status: 'open' | 'closed'
  takeOut: boolean
  date: string
  operationalDate: string
  hourOccupies: string        // Ocupa
  hourFirstAttention: string  // Primera atención
  breakUp: string             // Desocupa
  tableCleaning: string       // Limpieza
  process: RotationProcess[]
  touch: RotationTouch[]
}

type RotationList = { documents?: Rotation[] }

/** Todos los croquis de los locales que puede ver quien entra, en una sola petición. */
export async function getFloorPlans(): Promise<FloorPlan[]> {
  const response = await http.get<{ data?: FloorPlan[] }>('/local/floor-plans')
  return Array.isArray(response.data?.data) ? response.data.data : []
}

/** Las rotaciones abiertas de un local (las que siguen en Mesas: en vivo). */
export async function getOpenRotations(establishmentId: string): Promise<Rotation[]> {
  const response = await http.get<RotationList>('/rotation', { params: { establishment: establishmentId, status: 'open' } })
  return response.data?.documents ?? []
}

/** Las rotaciones guardadas de un local en un día operativo (AAAA-MM-DD). */
export async function getSavedRotations(establishmentId: string, day: string): Promise<Rotation[]> {
  const response = await http.get<RotationList>('/rotation', { params: { establishment: establishmentId, from: day, to: day } })
  return response.data?.documents ?? []
}
