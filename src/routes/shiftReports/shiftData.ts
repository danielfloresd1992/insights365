import type { ShiftName } from '@/ajax/documents.ajax'
import type { ReportConfig } from '@/ajax/establishments.ajax'
import type { ShiftDocumentSummary } from '@/ajax/shiftReports.ajax'

/*  LA LISTA DE INFORMES POR TURNO: meses, días y turnos. Funciones puras, sin React ni peticiones. */

const pad = (value: number) => String(value).padStart(2, '0')

// monthOf = «el mes AAAA-MM de una fecha» (en la hora del navegador: el día que ve quien mira)
export const monthOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`

// todayOf = «el día AAAA-MM-DD de una fecha», también en la hora del navegador
export const todayOf = (date: Date) => `${monthOf(date)}-${pad(date.getDate())}`

// monthLabel = «noviembre 2026» en el idioma del portal
export function monthLabel(month: string, lang: string) {
  const [year, number] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, number - 1, 1)))
}

// dayLabel = «jue 27 nov» (o, con `long`, «jueves, 27 de noviembre de 2026») en el idioma del portal
export function dayLabel(date: string, lang: string, long = false) {
  return new Intl.DateTimeFormat(lang, long
    ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

// isMonth = «un mes AAAA-MM válido»
export const isMonth = (value: string | null): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)

// addMonths = «el mes que queda a `delta` meses de ese»
export function addMonths(month: string, delta: number): string {
  const [year, number] = month.split('-').map(Number)
  const index = year * 12 + (number - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

// monthRange = «el primer y el último día de un mes», sin pasar de `today` (los días futuros no tienen informes)
export function monthRange(month: string, today: string): { from: string; to: string } | null {
  const [year, number] = month.split('-').map(Number)
  const last = new Date(Date.UTC(year, number, 0)).getUTCDate()
  const from = `${month}-01`
  const end = `${month}-${pad(last)}`
  if (from > today) return null
  return { from, to: end < today ? end : today }
}

// daysDescending = «los días de un rango, del más nuevo al más viejo»
export function daysDescending(from: string, to: string): string[] {
  const days: string[] = []
  for (let time = Date.parse(`${to}T00:00:00Z`); time >= Date.parse(`${from}T00:00:00Z`); time -= 86_400_000) {
    days.push(new Date(time).toISOString().slice(0, 10))
  }
  return days
}

// SHIFT_ORDER = «cómo se ordenan los turnos de un día»: diurno, nocturno y, si el local da uno solo, el único
const SHIFT_ORDER: ShiftName[] = ['day', 'night', 'all']

// expectedShifts = «los turnos que el local entrega cada día», según su configuración (numberOfReports)
export function expectedShifts(config: ReportConfig | null): ShiftName[] {
  return config?.numberOfReports === 'single-diary' ? ['all'] : ['day', 'night']
}

// DayRow = «un día de la lista»: cada turno con su informe (el más nuevo si hay dos) o null si no llegó
export type DayRow = { date: string; shifts: { shift: ShiftName; document: ShiftDocumentSummary | null }[] }

// dayRows = «la lista por día»: los turnos esperados y, además, los que hubiera con otro nombre (un informe de cuando
// el local daba otro número de turnos). Los días sin ningún informe salen igual, con sus turnos vacíos
export function dayRows(days: string[], documents: ShiftDocumentSummary[], expected: ShiftName[]): DayRow[] {
  return days.map(date => {
    const ofDay = documents.filter(document => document.date === date)
    const shifts = [...new Set([...expected, ...ofDay.map(document => document.shift)])]
      .sort((first, second) => SHIFT_ORDER.indexOf(first) - SHIFT_ORDER.indexOf(second))
    return {
      date,
      // La API los manda del más nuevo al más viejo: el primero que coincide es el último que se hizo
      shifts: shifts.map(shift => ({ shift, document: ofDay.find(document => document.shift === shift) ?? null })),
    }
  })
}
