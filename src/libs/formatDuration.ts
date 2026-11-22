/*  CUÁNTO DURÓ ALGO, ENTRE DOS HORAS DEL RELOJ
 *
 *  Las alertas de tiempo traen de qué hora a qué hora duró lo reportado («15:58:04» → «16:15:45»), sin fecha: si la
 *  segunda es menor, pasó la medianoche. Se escribe corto: «17 min 41 s», «1 h 05 min», «45 s».
 */

// toSeconds = «la hora del reloj en segundos desde medianoche, o null si no es una hora»
function toSeconds(clock: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(clock.trim())
  if (!match) return null
  const [hours, minutes, seconds = 0] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
  if (hours > 23 || minutes > 59 || seconds > 59) return null
  return hours * 3600 + minutes * 60 + seconds
}

// formatDuration = «lo que va de `start` a `end`, escrito corto; null si alguna no es una hora o no duró nada»
export function formatDuration(start: string, end: string): string | null {
  const from = toSeconds(start)
  const to = toSeconds(end)
  if (from === null || to === null) return null
  const total = (to - from + 86_400) % 86_400
  if (total === 0) return null
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  if (hours > 0) return `${hours} h ${String(minutes).padStart(2, '0')} min`
  if (minutes > 0) return seconds > 0 ? `${minutes} min ${seconds} s` : `${minutes} min`
  return `${seconds} s`
}
