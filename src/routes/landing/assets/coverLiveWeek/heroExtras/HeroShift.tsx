import { enterDelay } from '../../enterDelay'
import { AMAZONAS_DELAY_COLORS, DELAY_LABELS, FLOOR_ALERTS } from '../../landing.content'
import { SHIFT_END_MINUTES, SHIFT_START_MINUTES, alertMinute, floorAlert, formatClock } from './heroTimeline'

/*  PROPUESTA C PARA LA PORTADA · EL TURNO
 *
 *  La portada con su hora: arriba del texto, la píldora del turno con el reloj de la última novedad; debajo de la
 *  leyenda, la regla del turno de 12:00 a 16:00, donde cada novedad que se enciende en la sala queda marcada en su
 *  hora con el color de su demora (la última late); y al pie, la invitación a bajar a «Lo que se vigila». Todo va al
 *  paso de la tarjeta de novedades. Solo pinta.
 */

// SHIFT_SPAN = «lo que dura el turno de ejemplo, en minutos»
const SHIFT_SPAN = SHIFT_END_MINUTES - SHIFT_START_MINUTES
// HOURS = «las horas que marca la regla»
const HOURS = [12, 13, 14, 15, 16]

export function ShiftPill({ cycle }: { cycle: number }) {
  const clock = cycle >= 0 ? formatClock(alertMinute(cycle)) : formatClock(SHIFT_START_MINUTES)
  return (
    <p className='landing-enter mb-6 inline-flex items-center gap-2.5 rounded-full bg-white/85 py-1.5 pl-2 pr-3.5 text-sm text-[#2f2a1e] ring-1 ring-[#ece5d5]'>
      <span className='inline-flex items-center gap-1.5 rounded-full bg-[#f2fbee] px-2 py-0.5 text-xs font-semibold text-[#177406]'>
        <span className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
        En vivo
      </span>
      Lunes 24 · turno diurno ·
      <span key={clock} className='hx-tick font-plex-mono font-semibold tabular-nums'>
        {clock}
      </span>
    </p>
  )
}

export function ShiftRuler({ cycle }: { cycle: number }) {
  // marked = «las novedades de esta vuelta que ya se encendieron, de la primera a la última»
  const loopStart = cycle >= 0 ? cycle - (cycle % FLOOR_ALERTS.length) : 0
  const marked = cycle >= 0 ? Array.from({ length: (cycle % FLOOR_ALERTS.length) + 1 }, (_, index) => loopStart + index) : []
  const latest = marked[marked.length - 1]

  return (
    // Fondo en la tinta de Amazonas (#2f2a1e, pedido del usuario); letra en marfil para que se lea sobre ella
    <div className='landing-enter mt-8 max-w-[33rem] rounded-2xl bg-[#2f2a1e] p-4 shadow-[0_24px_48px_-30px_rgba(31,27,20,0.7)]' style={enterDelay(280)}>
      <div className='flex items-baseline justify-between gap-3'>
        <p className='text-xs font-semibold uppercase tracking-[0.12em] text-[#f4f2ee]'>El turno, alerta por alerta</p>
        <p className='text-xs text-[#ddd3bd]'>
          {marked.length} {marked.length === 1 ? 'novedad' : 'novedades'}
        </p>
      </div>
      <div className='relative mt-5 h-6'>
        <div className='absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/15' />
        {latest !== undefined && (
          <div
            className='absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-[#29c50c]/70 transition-[width] duration-700 ease-out'
            style={{ width: `${((alertMinute(latest) - SHIFT_START_MINUTES) / SHIFT_SPAN) * 100}%` }}
          />
        )}
        {marked.map(alertNumber => {
          const alert = floorAlert(alertNumber)
          const isLatest = alertNumber === latest
          return (
            <span
              key={alertNumber}
              className={`hx-mark absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${isLatest ? 'hx-mark--latest' : ''}`}
              style={{ left: `${((alertMinute(alertNumber) - SHIFT_START_MINUTES) / SHIFT_SPAN) * 100}%`, background: AMAZONAS_DELAY_COLORS[alert.kind] }}
              title={`${formatClock(alertMinute(alertNumber))} · ${alert.place} · Demora de ${DELAY_LABELS[alert.kind].toLowerCase()}`}
            />
          )
        })}
      </div>
      <div className='mt-1.5 flex justify-between font-plex-mono text-[11px] text-[#ddd3bd]' aria-hidden='true'>
        {HOURS.map(hour => (
          <span key={hour}>{hour}:00</span>
        ))}
      </div>
      <p className='sr-only' aria-live='polite'>
        {latest !== undefined ? `${formatClock(alertMinute(latest))}: ${floorAlert(latest).place}, demora de ${DELAY_LABELS[floorAlert(latest).kind].toLowerCase()}` : ''}
      </p>
    </div>
  )
}

export function ScrollCue() {
  return (
    <div className='hidden justify-center pb-6 lg:flex'>
      <a href='#que-se-vigila' className='landing-link group inline-flex flex-col items-center gap-1 text-sm font-medium text-[#564e40]'>
        Lo que vigilamos
        <svg viewBox='0 0 24 24' width='22' height='22' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='hx-cue' aria-hidden='true'>
          <path d='M6 9l6 6 6-6' />
        </svg>
      </a>
    </div>
  )
}
