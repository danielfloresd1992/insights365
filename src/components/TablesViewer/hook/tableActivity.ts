import type { FloorPlan, FloorPlanPiece, Rotation } from '@/ajax/tables.ajax'

/*  LO QUE PASA HOY EN LAS MESAS, MESA POR MESA. Funciones puras.
 *
 *  Con las mismas reglas que la API y que el informe:
 *  - en vivo = rotación ABIERTA (status 'open': sigue en Mesas de Jarvis-express365); guardada = cerrada;
 *  - el estado de una mesa sale de su rotación abierta: OCUPADA hasta el Desocupa, POR LIMPIAR del Desocupa a la
 *    Limpieza, y LIBRE con la Limpieza anotada (aunque la rotación siga abierta hasta que se guarde) o sin rotación;
 *  - para pintarla, la OCUPADA se parte en tres fases (phaseOf): ESPERA sin la Primera atención, OCUPADA con ella y
 *    SERVIDA (por irse) cuando todo lo pedido está entregado: algún pedido tomado y todos los tomados con su Entrega.
 *    Si pide algo más, vuelve a OCUPADA hasta que se lo entreguen. Las cifras no cambian: las tres son ocupadas;
 *  - primer toque = rotación con algún toque de gerente; otros toques = los que vienen después del primero en la misma
 *    rotación (por eso «otros» se mide sobre los primeros y puede pasar del 100 %);
 *  - los pedidos para llevar (takeOut, mesa «#110») no son una mesa: no cuentan;
 *  - una rotación es de la pieza cuya etiqueta coincide con su mesa, sin espacios a los lados y en mayúsculas
 *    (tableKey, como floorPlan.schema.js de la API); las barras y los muebles se dibujan pero no son mesas.
 */

// TableState = «cómo está una mesa ahora»
export type TableState = 'ocupada' | 'limpieza' | 'libre'

// TablePhase = «en qué punto del ciclo está una mesa», para pintarla (las cifras siguen con TableState)
export type TablePhase = 'espera' | 'ocupada' | 'servida' | 'limpieza' | 'libre'

// TableDay = «lo de hoy de una mesa»: rotaciones en vivo (y de ellas, ocupadas y por limpiar) y guardadas, y toques
export type TableDay = { live: number; occupied: number; cleaning: number; saved: number; rotations: number; firsts: number; others: number }

export const EMPTY_DAY: TableDay = { live: 0, occupied: 0, cleaning: 0, saved: 0, rotations: 0, firsts: 0, others: 0 }

// TableCycle = «la rotación que enseña la tarjeta de una mesa»: la abierta si la hay y, si no, la última guardada de hoy
export type TableCycle = { rotation: Rotation; current: boolean }

// FURNITURE_KINDS = «las formas que no son mesas» (las mismas de la API)
const FURNITURE_KINDS = ['barra', 'mueble']

export const isTable = (piece: FloorPlanPiece) => !FURNITURE_KINDS.includes(piece.kind)

// tableKey = «la etiqueta con que se comparan dos mesas»
export const tableKey = (label: string | null | undefined) => String(label ?? '').trim().toUpperCase()

/** El estado de una rotación: ocupada, por limpiar o libre (ya limpia, o guardada). */
export function stateOf(rotation: Rotation | null | undefined): TableState {
  if (!rotation || rotation.status !== 'open') return 'libre'
  if (!rotation.breakUp) return 'ocupada'
  return rotation.tableCleaning ? 'libre' : 'limpieza'
}

/** Todo lo pedido está entregado: algún pedido tomado y todos los tomados con su hora de Entrega. */
export function allDelivered(rotation: Rotation): boolean {
  const orders = (rotation.process ?? []).filter(process => process.orderTaking)
  return orders.length > 0 && orders.every(process => process.dishDelivery)
}

/** La fase de una rotación: espera la primera atención, ocupada, servida (por irse), por limpiar o libre. */
export function phaseOf(rotation: Rotation | null | undefined): TablePhase {
  const state = stateOf(rotation)
  if (state !== 'ocupada' || !rotation) return state
  if (!rotation.hourFirstAttention) return 'espera'
  return allDelivered(rotation) ? 'servida' : 'ocupada'
}

/** Junta las abiertas y las guardadas sin repetir: si una aparece en las dos (se guardó entre una petición y otra),
 *  manda la guardada. */
export function mergeRotations(open: Rotation[], saved: Rotation[]): Rotation[] {
  const byId = new Map<string, Rotation>()
  for (const rotation of open) byId.set(rotation._id, rotation)
  for (const rotation of saved) byId.set(rotation._id, rotation)
  return [...byId.values()]
}

/** Lo de hoy de cada mesa, por su tableKey. Sin los pedidos para llevar. */
export function activityByTable(rotations: Rotation[]): Map<string, TableDay> {
  const byTable = new Map<string, TableDay>()
  for (const rotation of rotations) {
    if (rotation.takeOut) continue
    const key = tableKey(rotation.tableNumber)
    if (!key) continue
    const day = { ...(byTable.get(key) ?? EMPTY_DAY) }
    if (rotation.status === 'open') {
      day.live += 1
      const state = stateOf(rotation)
      if (state === 'ocupada') day.occupied += 1
      if (state === 'limpieza') day.cleaning += 1
    } else day.saved += 1
    day.rotations += 1
    const touches = rotation.touch?.length ?? 0
    if (touches > 0) {
      day.firsts += 1
      day.others += touches - 1
    }
    byTable.set(key, day)
  }
  return byTable
}

// newest = «la más reciente de dos rotaciones», por cuándo empezó
const newest = (a: Rotation | undefined, b: Rotation) => (!a || Date.parse(b.date) >= Date.parse(a.date) ? b : a)

/** La rotación de cada mesa que enseña su tarjeta: la abierta (la más reciente, si hubiera dos) o, si no hay, la
 *  última guardada de hoy. */
export function cyclesByTable(rotations: Rotation[]): Map<string, TableCycle> {
  const open = new Map<string, Rotation>()
  const saved = new Map<string, Rotation>()
  for (const rotation of rotations) {
    if (rotation.takeOut) continue
    const key = tableKey(rotation.tableNumber)
    if (!key) continue
    const target = rotation.status === 'open' ? open : saved
    target.set(key, newest(target.get(key), rotation))
  }
  const cycles = new Map<string, TableCycle>()
  for (const [key, rotation] of saved) cycles.set(key, { rotation, current: false })
  for (const [key, rotation] of open) cycles.set(key, { rotation, current: true })
  return cycles
}

/** La suma de varios días de mesa. */
export function sumDays(days: Iterable<TableDay>): TableDay {
  const total = { ...EMPTY_DAY }
  for (const day of days) {
    total.live += day.live
    total.occupied += day.occupied
    total.cleaning += day.cleaning
    total.saved += day.saved
    total.rotations += day.rotations
    total.firsts += day.firsts
    total.others += day.others
  }
  return total
}

/** Las mesas del croquis (sin barras ni muebles) de una zona, o de todas con zone = null. */
export function tablesOf(plan: FloorPlan, zone: string | null): FloorPlanPiece[] {
  return plan.piezas.filter(piece => isTable(piece) && (zone === null || piece.zona === zone))
}

/** Cuántas rotaciones de hoy son de mesas que no están en el croquis (para avisarlo: no se ven en el plano). */
export function unplacedRotations(plan: FloorPlan, byTable: Map<string, TableDay>): number {
  const placed = new Set(tablesOf(plan, null).map(piece => tableKey(piece.label)))
  let count = 0
  for (const [key, day] of byTable) if (!placed.has(key)) count += day.rotations
  return count
}

// seconds = «una hora 'HH:MM:SS' (o 'HH:MM') en segundos», o null si no es una hora
const seconds = (hour: string | null | undefined) => {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(hour ?? '').trim())
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0) : null
}

/** Los minutos de una hora a otra, redondeados; si la segunda es menor, pasó la medianoche. null si falta alguna. */
export function minutesBetween(from: string | null | undefined, to: string | null | undefined): number | null {
  const a = seconds(from)
  const b = seconds(to)
  if (a === null || b === null) return null
  const diff = b >= a ? b - a : b + 24 * 3600 - a
  return Math.round(diff / 60)
}

/** 'HH:MM:SS' → 'HH:MM' para enseñarla; '' si no hay hora. */
export function shortHour(hour: string | null | undefined): string {
  const value = seconds(hour)
  if (value === null) return ''
  return `${String(Math.floor(value / 3600)).padStart(2, '0')}:${String(Math.floor((value % 3600) / 60)).padStart(2, '0')}`
}

/** El día operativo de un instante, AAAA-MM-DD: de 08:00 a 07:59 en America/Caracas, como operationalDateOf en la
 *  API (dvrFailure.lib.ts). Una mesa de las 02:00 es del día anterior. */
export function operationalDay(now: Date | number = Date.now()): string {
  const shifted = new Date(new Date(now).getTime() - 8 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit' }).format(shifted)
}

/** El porcentaje redondeado, o null si no hay sobre qué medirlo. */
export function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null
}
