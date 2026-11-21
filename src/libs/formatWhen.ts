/*  CUÁNDO PASÓ ALGO, ESCRITO PARA LEERLO DE UN VISTAZO
 *
 *  Lo reciente, en minutos u horas («hace 5 min», «hace 2 h»); lo de antes, con su fecha y hora («20 nov, 12:41»).
 */

// DATE_TIME = «fecha corta y hora, en español»
const DATE_TIME = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function formatWhen(value: string | number | Date, now = Date.now()): string {
  const time = new Date(value).getTime()
  if (Number.isNaN(time)) return ''
  const minutes = Math.floor((now - time) / 60_000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 12) return `hace ${hours} h`
  return DATE_TIME.format(time)
}
