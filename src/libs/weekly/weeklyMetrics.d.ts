/*  LOS TIPOS DE weeklyMetrics.js
 *
 *  weeklyMetrics.js, reportCalendar.js y demoWeek.js son una COPIA de reportes365 (app/lib/weekly/), sin tocar: así el
 *  portal da las mismas cifras que el PDF semanal. Si allí cambian, se vuelven a copiar los tres y sus pruebas
 *  (node src/libs/weekly/weeklyMetrics.bocas.test.mjs). Aquí solo se describe lo que el portal lee del reporte.
 */

// ByShift = «una cifra repartida por turno»: diurno, nocturno, único (un solo informe al día) y el total
export type ByShift<T = number> = { day: T; night: T; all: T; total: T }

export type ShiftKey = 'day' | 'night' | 'all'

export type DayShiftSummary = {
  presente: boolean
  rotaciones: number
  rotacionesSalon: number
  rotacionesBarra: number
  demora1ra: number
  demoraLimpieza: number
  porcentaje1ra: number | null
  porcentajeLimpieza: number | null
}

export type WeeklyDay = { date: string; weekday: string }

export type DishColumn = { procesos: number; demoras: number; promedio: string | null; porcentaje: number | null }

export type TouchBlock = {
  name: string
  cargo: string
  persona: string
  soloTotal: boolean
  porDia: (WeeklyDay & { presente: boolean; primeros: number; otros: number; rotaciones: number; pctPrimeros: number | null; pctOtros: number | null })[]
  promedioSemanal: { pctPrimeros: number | null; pctOtros: number | null }
  totales: { primeros: number; otros: number; rotaciones: number }
  diasConRegistro: number
}

export type MissingShift = { date: string; weekday: string; shift: ShiftKey; estado: string; motivo: string | null }

export type WeeklyReport = {
  meta: {
    establishmentName: string | null
    from: string | null
    to: string | null
    dishes: string[]
    dualShift: boolean
    modo: 'dual' | 'single'
    turnos: ShiftKey[]
    documentosUsados: number
  }
  cobertura: { esperados: number; encontrados: number; faltantes: MissingShift[]; completa: boolean }
  aplica: {
    barra: boolean
    clientesSinUbicar: boolean
    demora1ra: boolean
    demoraLimpieza: boolean
    metrica: boolean
    entregas: boolean
    servicios: boolean
    devoluciones: boolean
    toques: boolean
    toquesSeparados: boolean
  }
  cuadroGeneral: {
    rotacionesSalon: ByShift
    rotacionesBarra: ByShift
    rotaciones: ByShift
    clientesSinUbicar: ByShift
    demora1raSalon: ByShift
    demora1raBarra: ByShift
    demora1ra: ByShift
    porcentaje1ra: ByShift<number | null>
    demoraLimpieza: ByShift
    porcentajeLimpieza: ByShift<number | null>
  }
  porDia: (WeeklyDay & Record<ShiftKey, DayShiftSummary>)[]
  toques: TouchBlock[]
  metrica: {
    procesos: ByShift
    porPlato: ({ dish: string; total: DishColumn } & Record<ShiftKey, DishColumn>)[]
    procesosTotales: number
    demorasTotales: number
    demorasExtra: ByShift
    porcentajeDemora: number | null
  }
  demorasPorDia: (WeeklyDay & { porPlato: Record<string, number>; extra: number; cantidad: number; procesos: number; porcentaje: number | null; day: number; night: number; all: number })[]
  procesosPorDia: (WeeklyDay & Record<ShiftKey, number>)[]
  entregasYServicios: { entregas: ByShift; servicios: ByShift; porcentaje: number | null }
  devoluciones: {
    porTipo: ({ tipo: string; etiqueta: string; visible: boolean } & ByShift)[]
    total: ByShift
    porcentaje: number | null
    porDia: (WeeklyDay & Record<ShiftKey, number>)[]
  }
  incidencias: number
}

export function buildWeeklyReport(input: {
  documents: unknown[]
  establishment: unknown
  from: string
  detalle?: unknown[]
  today?: Date | null
  dualShift?: boolean
}): WeeklyReport

export function buildWeekDays(from: string): WeeklyDay[]
