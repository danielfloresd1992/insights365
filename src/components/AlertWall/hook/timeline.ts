import type { Novelty } from '@/ajax/novelty.ajax'

/*  LA LÍNEA DE TIEMPO DEL MURO: agrupar por día y escribir las horas
 *
 *  Las alertas llegan de la más nueva a la más vieja; aquí se juntan por día (en la hora de quien mira) con su
 *  rótulo: «Hoy · domingo, 22 de noviembre», «Ayer · …» y, para lo de antes, la fecha sola («Lunes, 31 de agosto»,
 *  con el año si no es este). Funciones puras: el idioma y «hoy» los pasa quien llama.
 */

type TimelineLocale = 'es' | 'en'

// TimelineDay = «un día del muro, con sus alertas en el orden en que llegaron»; `when` dice si es hoy, ayer o antes
// (las fotos de las alertas de ayer llevan la marca «Ayer»: WallTimeline)
export type TimelineWhen = 'today' | 'yesterday' | 'earlier'
export type TimelineDay = { key: string; label: string; when: TimelineWhen; items: Novelty[] }

// dayKey = «el día de una fecha, en la hora local»
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

const capitalize = (text: string) => (text ? text[0].toLocaleUpperCase() + text.slice(1) : text)

// validDate = «la fecha de la alerta, o null si no trae una que sirva»
function validDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/*  Junta las alertas por día. Si dos alertas del mismo día no llegan seguidas (una validada tarde), van igual a su
 *  día: el día aparece donde salió su primera alerta. `words` son «Hoy» y «Ayer» en el idioma del portal. */
export function groupByDay(items: Novelty[], now: number, locale: TimelineLocale, words: { today: string; yesterday: string }): TimelineDay[] {
  const today = new Date(now)
  const yesterday = new Date(now)
  yesterday.setDate(today.getDate() - 1)
  const withWeekday = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const withYear = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const labelOf = (date: Date | null) => {
    if (!date) return ''
    const key = dayKey(date)
    if (key === dayKey(today)) return `${words.today} · ${withWeekday.format(date)}`
    if (key === dayKey(yesterday)) return `${words.yesterday} · ${withWeekday.format(date)}`
    return capitalize((date.getFullYear() === today.getFullYear() ? withWeekday : withYear).format(date))
  }

  const whenOf = (date: Date | null): TimelineWhen => {
    if (!date) return 'earlier'
    const key = dayKey(date)
    return key === dayKey(today) ? 'today' : key === dayKey(yesterday) ? 'yesterday' : 'earlier'
  }

  const days = new Map<string, TimelineDay>()
  for (const item of items) {
    const date = validDate(item.date)
    const key = date ? dayKey(date) : 'sin-fecha'
    const day = days.get(key) ?? { key, label: labelOf(date), when: whenOf(date), items: [] }
    day.items.push(item)
    days.set(key, day)
  }
  return [...days.values()]
}

/*  El título de la alerta en el idioma del portal. En español, el de la novedad, que el operador puede haber
 *  concretado («Demora de entrada» en vez de «Demora en preparación de plato»). En inglés, el nombre inglés de la
 *  alerta en el catálogo (Menu.en): el que trae la API o, si no lo trae, el de `englishNames` (id → nombre, de
 *  useEnglishNames); si tampoco, el español. `fallback` es para la que no trae ninguno. */
export function titleOf(novelty: Novelty, locale: TimelineLocale, fallback: string, englishNames?: ReadonlyMap<string, string> | null) {
  const english = locale === 'en' ? (novelty.alert?.nameEn ?? (novelty.alert ? englishNames?.get(novelty.alert._id) : undefined))?.trim() : ''
  if (english) return capitalize(english)
  return novelty.title || novelty.alert?.name || fallback
}

// clockOf = «la hora de la alerta, 23:03», en la hora local; vacía si no trae fecha
export function clockOf(value: string | null | undefined, locale: TimelineLocale) {
  const date = validDate(value)
  return date ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date) : ''
}

// fullDateOf = «la fecha y la hora enteras», para el aviso al pasar por encima de la hora
export function fullDateOf(value: string | null | undefined, locale: TimelineLocale) {
  const date = validDate(value)
  return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }).format(date) : ''
}
