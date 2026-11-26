import { http } from '@/libs/http'

/*  EL CROQUIS DE MESAS Y LAS ROTACIONES, CONTRA LA API (api_jarvis365)
 *
 *  - El croquis de un local (colección floorplans): GET /local/id=:id/floor-plan → { data: croquis | null }. null es
 *    «este local no tiene croquis». Lo dibuja Client365; aquí solo se lee.
 *  - Las rotaciones de un local (colección rotations), que anota el operador en Mesas de Jarvis-express365:
 *      GET /rotation?establishment=:id&status=open                → las ABIERTAS (en vivo), de cualquier día
 *      GET /rotation?establishment=:id&from=AAAA-MM-DD&to=AAAA-MM-DD → las GUARDADAS de esos días operativos
 *    Las dos responden { …, documents }.
 *  Las dos piden sesión. OJO: la ruta del croquis es nueva en la API; hasta que se despliegue, contesta 404.
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
export type RotationTouch = { _id?: string; name: string; hourTouch: string }
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

/** El croquis de un local, o null si no tiene. */
export async function getFloorPlan(establishmentId: string): Promise<FloorPlan | null> {
  const response = await http.get<{ data: FloorPlan | null }>(`/local/id=${establishmentId}/floor-plan`)
  return response.data?.data ?? null
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
