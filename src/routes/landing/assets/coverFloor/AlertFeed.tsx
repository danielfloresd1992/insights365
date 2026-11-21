import type { ReactNode } from 'react'
import { DELAY_COLORS, DELAY_LABELS, DEMO_WEEK, FLOOR_ALERTS, FLOOR_ALERT_SECONDS, PALETTE, type DelayKind } from '../landing.content'

/*  LA TARJETA DE NOVEDADES (portadas A y D): las últimas que se encendieron en la sala, la más nueva arriba.
 *  Es la interfaz del portal tal cual, en pequeño. Solo pinta.
 *
 *  @param cycle        en qué vuelta va la lista de novedades (FLOOR_ALERTS), o -1 antes de la primera
 *  @param rows         cuántas novedades enseña (tres en A, dos en D, que debajo lleva la semana)
 *  @param delayColors  el color de cada demora: la tierra de los informes o el azul de Amazonas
 *  @param liveColor    el punto que late junto al turno
 *  @param rowClassName el fondo de cada fila
 *  @param footer       lo que va debajo de las novedades, si algo
 */
type AlertFeedProps = {
  cycle: number
  rows?: number
  delayColors?: Record<DelayKind, string>
  liveColor?: string
  rowClassName?: string
  footer?: ReactNode
  className?: string
}

// ROW_REM, GAP_REM = «el alto de una fila y el hueco entre filas, para reservar el sitio de todas desde el principio»
const ROW_REM = 3.5
const GAP_REM = 0.5

export default function AlertFeed({
  cycle,
  rows = 3,
  delayColors = DELAY_COLORS,
  liveColor = PALETTE.green,
  rowClassName = 'bg-ivory',
  footer = null,
  className = '',
}: AlertFeedProps) {
  const alertNumbers = Array.from({ length: rows }, (_unused, back) => cycle - back).filter(alertNumber => alertNumber >= 0)

  return (
    <div data-ui className={`rounded-2xl border border-black/10 bg-white p-4 shadow-[0_24px_48px_-28px_rgba(31,27,20,0.5)] ${className}`}>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-base font-semibold tracking-[-0.01em]'>Novedades en vivo</p>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${rowClassName}`}>
          <span className='landing-live-dot h-2 w-2 rounded-full' style={{ background: liveColor }} aria-hidden='true' />
          Diurno
        </span>
      </div>
      <p className='mt-0.5 text-sm'>{DEMO_WEEK.branch}</p>

      <ol className='mt-3 grid content-start gap-2' style={{ minHeight: `${rows * ROW_REM + (rows - 1) * GAP_REM}rem` }}>
        {alertNumbers.length === 0 && <li className='px-1 py-2 text-sm opacity-80'>Esperando la primera novedad del turno…</li>}
        {alertNumbers.map((alertNumber, position) => {
          const alert = FLOOR_ALERTS[alertNumber % FLOOR_ALERTS.length]
          return (
            <li key={alertNumber} className={`landing-feed-row flex items-center gap-3 rounded-xl px-3 py-2.5 ${rowClassName}`}>
              <span className='h-8 w-1.5 shrink-0 rounded-full' style={{ background: delayColors[alert.kind] }} aria-hidden='true' />
              <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-semibold'>{alert.place}</span>
                <span className='block truncate text-xs opacity-80'>Demora de {DELAY_LABELS[alert.kind].toLowerCase()}</span>
              </span>
              <span className='shrink-0 text-xs font-medium tabular-nums opacity-80'>
                {position === 0 ? 'ahora' : `hace ${Math.round(position * FLOOR_ALERT_SECONDS)} s`}
              </span>
            </li>
          )
        })}
      </ol>
      {footer}
    </div>
  )
}
