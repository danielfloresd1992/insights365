import type { FullEstablishment } from '@/ajax/establishments.ajax'
import { getWeekDocuments, type ShiftName } from '@/ajax/documents.ajax'
import { buildWeeklyReport, type WeeklyReport } from '@/libs/weekly/weeklyMetrics.js'

/*  LAS SEMANAS Y SUS REPORTES (sin React)
 *
 *  - Las semanas van de lunes a domingo y se nombran por su lunes, 'AAAA-MM-DD', como en reportes365. El número de
 *    semana es el ISO (la semana 1 es la del primer jueves del año).
 *  - loadWeek trae los informes diarios de un local en una semana y arma su reporte con buildWeeklyReport, el mismo
 *    cálculo del PDF. Lo pedido queda en memoria mientras el portal esté abierto: volver a una semana ya vista, o
 *    pasar del semanal al intersemanal, no vuelve a pedir nada. La semana en curso no se guarda, porque cambia.
 *  - summarize reduce un reporte a los indicadores que se comparan entre semanas y entre locales (METRICS).
 */

const DAY_MS = 86_400_000

const pad = (value: number) => String(value).padStart(2, '0')
const toIso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
const fromIso = (iso: string) => new Date(`${iso}T00:00:00Z`)

// mondayOf = «el lunes de la semana de esa fecha» (la fecha local de quien mira, sin horas)
export function mondayOf(date: Date | string): string {
  const utc = typeof date === 'string' ? fromIso(date) : new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = (utc.getUTCDay() + 6) % 7
  return toIso(new Date(utc.getTime() - weekday * DAY_MS))
}

export const addWeeks = (monday: string, weeks: number) => toIso(new Date(fromIso(monday).getTime() + weeks * 7 * DAY_MS))

export const weekDates = (monday: string) => Array.from({ length: 7 }, (_, index) => toIso(new Date(fromIso(monday).getTime() + index * DAY_MS)))

// isoWeekOf = «el año y el número ISO de la semana de ese lunes»
export function isoWeekOf(monday: string): { year: number; week: number } {
  const thursday = new Date(fromIso(monday).getTime() + 3 * DAY_MS)
  const year = thursday.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  const firstMonday = fromIso(mondayOf(toIso(firstThursday)))
  return { year, week: Math.round((fromIso(monday).getTime() - firstMonday.getTime()) / (7 * DAY_MS)) + 1 }
}

// weeksOfYear = «los lunes de todas las semanas ISO de ese año»
export function weeksOfYear(year: number): string[] {
  const weeks: string[] = []
  for (let monday = mondayOf(`${year}-01-04`); isoWeekOf(monday).year === year; monday = addWeeks(monday, 1)) weeks.push(monday)
  return weeks
}

// weekRangeLabel = «24 – 30 ago 2026», en el idioma del portal
export function weekRangeLabel(monday: string, lang: string): string {
  const sunday = new Date(fromIso(monday).getTime() + 6 * DAY_MS)
  const format = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', timeZone: 'UTC' })
  return `${format.format(fromIso(monday))} – ${format.format(sunday)} ${sunday.getUTCFullYear()}`
}

// shiftsOf = «los turnos que entrega el local»: uno al día ('all') o dos (diurno y nocturno)
export const shiftsOf = (establishment: FullEstablishment): ShiftName[] =>
  establishment.config_report?.numberOfReports === 'single-diary' ? ['all'] : ['day', 'night']

const cache = new Map<string, Promise<WeeklyReport>>()

// loadWeek = «el reporte semanal de ese local en la semana de ese lunes»
export function loadWeek(establishment: FullEstablishment, monday: string): Promise<WeeklyReport> {
  const key = `${establishment._id}|${monday}`
  const cached = cache.get(key)
  if (cached) return cached

  const promise = getWeekDocuments(establishment.name, weekDates(monday), shiftsOf(establishment)).then(({ documents, detalle }) =>
    buildWeeklyReport({ documents, establishment, from: monday, detalle }),
  )
  // La semana en curso (o una que falló) no se guarda: la siguiente consulta la vuelve a pedir
  if (monday < mondayOf(new Date())) cache.set(key, promise)
  promise.catch(() => cache.delete(key))
  return promise
}

// Summary = «los indicadores de una semana de un local», lo que se compara
export type Summary = {
  rotaciones: number
  demora1ra: number
  pct1ra: number | null
  demoraLimpieza: number
  pctLimpieza: number | null
  procesos: number
  demorasPrep: number
  pctPrep: number | null
  devoluciones: number
  pctDevoluciones: number | null
  turnosEncontrados: number
  turnosEsperados: number
}

export function summarize(report: WeeklyReport): Summary {
  return {
    rotaciones: report.cuadroGeneral.rotaciones.total,
    demora1ra: report.cuadroGeneral.demora1ra.total,
    pct1ra: report.cuadroGeneral.porcentaje1ra.total,
    demoraLimpieza: report.cuadroGeneral.demoraLimpieza.total,
    pctLimpieza: report.cuadroGeneral.porcentajeLimpieza.total,
    procesos: report.metrica.procesosTotales,
    demorasPrep: report.metrica.demorasTotales,
    pctPrep: report.metrica.porcentajeDemora,
    devoluciones: report.devoluciones.total.total,
    pctDevoluciones: report.devoluciones.porcentaje,
    turnosEncontrados: report.cobertura.encontrados,
    turnosEsperados: report.cobertura.esperados,
  }
}

// Metric = «un indicador comparable»: `better` dice hacia dónde es mejor, para pintar la tendencia
export type MetricId = 'rotaciones' | 'pct1ra' | 'pctLimpieza' | 'procesos' | 'pctPrep' | 'devoluciones'
export type Metric = { id: MetricId; kind: 'count' | 'percent'; better: 'higher' | 'lower'; value: (summary: Summary) => number | null }

export const METRICS: Metric[] = [
  { id: 'rotaciones', kind: 'count', better: 'higher', value: summary => summary.rotaciones },
  { id: 'pct1ra', kind: 'percent', better: 'lower', value: summary => summary.pct1ra },
  { id: 'pctLimpieza', kind: 'percent', better: 'lower', value: summary => summary.pctLimpieza },
  { id: 'procesos', kind: 'count', better: 'higher', value: summary => summary.procesos },
  { id: 'pctPrep', kind: 'percent', better: 'lower', value: summary => summary.pctPrep },
  { id: 'devoluciones', kind: 'count', better: 'lower', value: summary => summary.devoluciones },
]

// formatMetric = «la cifra como se lee»: 1.234, 14,2 % o — si no hay sobre qué calcularla
export function formatMetric(value: number | null, kind: Metric['kind'], lang: string): string {
  if (value === null || !Number.isFinite(value)) return '—'
  const number = new Intl.NumberFormat(lang, { maximumFractionDigits: kind === 'percent' ? 1 : 0 }).format(value)
  return kind === 'percent' ? `${number} %` : number
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null)

// combine = «varias semanas (o varios locales) como una sola»: las cuentas se suman y los porcentajes se recalculan
// sobre esas sumas, no se promedian
export function combine(summaries: Summary[]): Summary {
  const sum = (pick: (summary: Summary) => number) => summaries.reduce((total, summary) => total + pick(summary), 0)
  const rotaciones = sum(summary => summary.rotaciones)
  const procesos = sum(summary => summary.procesos)
  const demora1ra = sum(summary => summary.demora1ra)
  const demoraLimpieza = sum(summary => summary.demoraLimpieza)
  const demorasPrep = sum(summary => summary.demorasPrep)
  const devoluciones = sum(summary => summary.devoluciones)
  return {
    rotaciones,
    demora1ra,
    pct1ra: percent(demora1ra, rotaciones),
    demoraLimpieza,
    pctLimpieza: percent(demoraLimpieza, rotaciones),
    procesos,
    demorasPrep,
    pctPrep: percent(demorasPrep, procesos),
    devoluciones,
    pctDevoluciones: percent(devoluciones, procesos),
    turnosEncontrados: sum(summary => summary.turnosEncontrados),
    turnosEsperados: sum(summary => summary.turnosEsperados),
  }
}

// trendOf = «hacia dónde va una serie de semanas»: la pendiente de su recta, frente a su media. Menos de un 5 % de la
// media por semana se da por estable; con menos de tres semanas con dato no se dice nada
export function trendOf(values: (number | null)[]): 'up' | 'down' | 'flat' | null {
  const points = values.map((value, index) => ({ value, index })).filter((point): point is { value: number; index: number } => point.value !== null)
  if (points.length < 3) return null
  const meanX = points.reduce((total, point) => total + point.index, 0) / points.length
  const meanY = points.reduce((total, point) => total + point.value, 0) / points.length
  const slope = points.reduce((total, point) => total + (point.index - meanX) * (point.value - meanY), 0) / points.reduce((total, point) => total + (point.index - meanX) ** 2, 0)
  if (meanY === 0 || Math.abs(slope) < Math.abs(meanY) * 0.05) return 'flat'
  return slope > 0 ? 'up' : 'down'
}
