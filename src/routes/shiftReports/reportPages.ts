import { imageUrl } from '@/libs/imageUrl'
import type { ReportPage } from '@/ajax/shiftReports.ajax'

/*  LEER LAS PÁGINAS DE UN INFORME POR TURNO. Funciones puras, sin React.
 *
 *  Las páginas son las que guarda reportes365 (ver su app/components/page/seletedPage.jsx). Cada `type` guarda su
 *  `data` con su forma, y no siempre limpia: los tiempos pueden venir como { init, end } o como ese objeto en texto
 *  JSON; los de punto de venta hechos a mano como { tomaOrden, listoTablet, … }; y las fotos como lista de
 *  { url, caption, index }, como una sola dirección (imageToShare) o como lista de direcciones (toques). Aquí se
 *  leen todas igual, sin fallar con lo que falte.
 */

export type Dict = Record<string, unknown>

// rec, list, text = «leer sin fallar»: un objeto (o vacío), una lista (o vacía), un texto (o null)
export const rec = (value: unknown): Dict => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Dict) : {})
export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
export const text = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() === '' ? null : value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return null
}

// PAGE_ORDER = «cómo se ordenan las páginas»: el orden que quiere reportes365 al crear el informe (la lista guardada
// puede llegar en otro, porque se crean a la vez). Las novedades guardan entre ellas el orden en que llegaron
export const PAGE_ORDER = ['front', 'summary', 'perimeter', 'delay1ra', 'delayToastPostAndServise', 'delayClear', 'touchPageData', 'blocked&novelty']

export function orderedPages(pages: ReportPage[]): ReportPage[] {
  const rank = (type: string) => (PAGE_ORDER.includes(type) ? PAGE_ORDER.indexOf(type) : PAGE_ORDER.length)
  return pages.map((page, index) => ({ page, index })).sort((a, b) => rank(a.page.type) - rank(b.page.type) || a.index - b.index).map(item => item.page)
}

// ── Tiempos ──

const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/

// secondsOf = «una hora o duración HH:MM(:SS) en segundos»; null si no es una
export function secondsOf(value: unknown): number | null {
  const match = typeof value === 'string' ? CLOCK.exec(value.trim()) : null
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)
}

// clock = «segundos como HH:MM:SS»
export function clock(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null
  const whole = Math.max(0, Math.round(seconds))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}`
}

// cleanClock = «una hora tal cual si lo es, si no null»
export const cleanClock = (value: unknown): string | null => (secondsOf(value) === null ? null : String(value).trim())

// Period = «desde y hasta de una fila»
export type Period = { init: string | null; end: string | null }

// periodOf = «el desde y el hasta de una fila», venga como venga: objeto, texto JSON o los nombres de punto de venta
// (tomaOrden → desde, listoTablet → hasta, como hace reportes365 al ordenarlas)
export function periodOf(row: unknown): Period {
  let raw: unknown = rec(row).timePeriod
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw) } catch { raw = null }
  }
  const period = rec(raw)
  return {
    init: cleanClock(period.tomaOrden ?? period.init),
    end: cleanClock(period.listoTablet ?? period.end),
  }
}

// spanSeconds = «cuánto va de una hora a otra»; si cruza la medianoche, al día siguiente (el PDF lo da negativo)
export function spanSeconds(init: string | null, end: string | null): number | null {
  const from = secondsOf(init)
  const to = secondsOf(end)
  if (from === null || to === null) return null
  const span = to - from
  return span < 0 ? span + 86_400 : span
}

// durationOf = «la duración de una fila»: la guardada si la hay (duration, timeTotal), si no la de su periodo
export function durationOf(row: unknown): string | null {
  const data = rec(row)
  const saved = cleanClock(data.duration) ?? cleanClock(data.timeTotal) ?? cleanClock(rec(data.timePeriod).timeTotal)
  if (saved) return saved
  const { init, end } = periodOf(row)
  return clock(spanSeconds(init, end))
}

// longestFirst = «las filas de la que más tardó a la que menos» (las que no tienen duración, al final)
export function longestFirst<T>(rows: T[]): T[] {
  const value = (row: T) => secondsOf(durationOf(row)) ?? -1
  return [...rows].sort((a, b) => value(b) - value(a))
}

// thresholdLabel = «un umbral de la configuración, dicho corto»: '00:05:00' → '5 min', '01:30:00' → '1 h 30 min'
export function thresholdLabel(value: unknown): string | null {
  const seconds = secondsOf(value)
  if (seconds === null || seconds === 0) return null
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const rest = seconds % 60
  const parts = [hours ? `${hours} h` : null, minutes || (!hours && rest) ? `${minutes}${rest ? `:${String(rest).padStart(2, '0')}` : ''} min` : null]
  return parts.filter(Boolean).join(' ')
}

// isBar = «la fila es de barra»: su mesa no es un número
export const isBar = (row: unknown) => {
  const table = text(rec(row).table)
  return table !== null && Number.isNaN(Number(table))
}

// ── Fotos ──

export type Photo = { src: string; caption: string | null }

// photosOf = «las fotos de una fila»: su lista imageUrl ({ url, caption }), con los rótulos de respaldo por posición
export function photosOf(row: unknown, fallbackCaptions: (string | null)[] = []): Photo[] {
  return list(rec(row).imageUrl).flatMap((item, index) => {
    const entry = rec(item)
    const src = imageUrl(text(entry.url))
    const position = typeof entry.index === 'number' ? entry.index : index
    return src ? [{ src, caption: text(entry.caption) ?? fallbackCaptions[position] ?? null }] : []
  })
}

// sharedPhoto = «la foto que se compartió de una fila» (imageToShare, una dirección)
export function sharedPhoto(row: unknown, caption: string | null): Photo[] {
  const src = imageUrl(text(rec(row).imageToShare))
  return src ? [{ src, caption }] : []
}

// urlPhotos = «fotos dadas como lista de direcciones» (la página de toques)
export const urlPhotos = (urls: unknown): Photo[] =>
  list(urls).flatMap(url => {
    const src = imageUrl(text(url))
    return src ? [{ src, caption: null }] : []
  })
