import type { Novelty } from '@/ajax/novelty.ajax'

/*  LA NOTA DEL MONITOREO DE UNA ALERTA
 *
 *  La API no trae la nota aparte: va dentro del texto que se mandó al grupo (`menu`), en una línea «Nota: …» que el
 *  equipo de monitoreo escribe al reportar («Nota: continua», «Nota: La orden estuvo dentro de los tiempos…»). Casi
 *  siempre es la última línea. Cuando no lo es, lo de debajo a veces sigue la nota («✅ 2 muebles», «Recomendamos
 *  reiniciar su sistema…») y a veces es otro campo del mensaje («Mesa: 12»): la nota llega hasta el final o hasta la
 *  primera línea con forma de campo. Se quitan las marcas de WhatsApp (*negrita*, _cursiva_, ~tachado~).
 *  Función pura; null si la alerta no trae nota o la trae vacía.
 */

// NOTE_LINE = «la línea que empieza la nota»: «Nota:», con o sin marcas de WhatsApp alrededor
const NOTE_LINE = /^[\s*_~]*nota[\s*_~]*:(.*)$/i
// FIELD_LINE = «una línea con forma de campo del mensaje» («Mesa: 12», «Hora: 09:12:05»): ahí acaba la nota
const FIELD_LINE = /^[\s*_~]*[a-záéíóúüñ][a-záéíóúüñ ]{1,24}:\s/i
// clean = «la línea sin las marcas de WhatsApp de sus bordes ni espacios de más»
const clean = (line: string) => line.replace(/^[\s*_~]+|[\s*_~]+$/g, '').replace(/\s+/g, ' ')

export function noteOf(novelty: Pick<Novelty, 'menu'>): string | null {
  const lines = (novelty.menu ?? '').split(/\r?\n/)
  const start = lines.findIndex(line => NOTE_LINE.test(line))
  if (start < 0) return null
  const rest = lines.slice(start + 1)
  const end = rest.findIndex(line => FIELD_LINE.test(line))
  const text = [lines[start].match(NOTE_LINE)?.[1] ?? '', ...(end < 0 ? rest : rest.slice(0, end))].map(clean).filter(Boolean).join('\n')
  return text || null
}
