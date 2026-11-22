import { SpeakerIcon, StopIcon } from './PortalIcons'

/*  UNA ALERTA DEL MURO, PINTADA (el muro del panel en vivo, /en-vivo, y su adelanto en la portada de /)
 *
 *  La foto de la cámara arriba, si la hay; debajo el local y cuándo pasó, qué pasó, y la mesa, el plato y el turno.
 *  Con los colores del portal (bg-portal-*, text-portal-*): fuera del portal valen lo claro de siempre, y dentro
 *  cambian con el tema. Solo pinta.
 *
 *  @param place        el local donde pasó
 *  @param title        qué pasó: el título de la novedad
 *  @param when         cuándo, ya escrito («hace 5 min», «20 nov, 12:41»)
 *  @param table        la mesa, si la novedad la dice
 *  @param dish         el plato, si la novedad lo dice
 *  @param shift        el turno: 'day' o 'night'
 *  @param duration     cuánto duró lo reportado, ya escrito («17 min 41 s»), si la alerta lo dice
 *  @param details      los detalles ya escritos, en el idioma de quien la usa; si llegan, mandan sobre table, dish,
 *                      duration y shift (que se escriben en español)
 *  @param detailsLabel el nombre de la lista de detalles para lectores de pantalla
 *  @param imageSrc     la foto de la cámara; sin ella la tarjeta no reserva hueco
 *  @param loading      si el contenido de la novedad está llegando: se reserva el hueco de la foto
 *  @param category     la familia de la alerta y su color, con un punto delante; sin ella no se pinta
 *  @param listen       el botón para oírla en voz alta: su nombre, si está sonando y qué hacer al pulsarlo
 */
type AlertCardViewProps = {
  place: string
  title: string
  when: string
  table?: string | null
  dish?: string | null
  shift?: 'day' | 'night' | null
  duration?: string | null
  details?: string[]
  detailsLabel?: string
  imageSrc?: string | null
  loading?: boolean
  // category = «la familia de la alerta (Demoras, Clientes…) y su color», si se conoce
  category?: { label: string; color: string } | null
  listen?: { label: string; speaking: boolean; onToggle: () => void } | null
  className?: string
}

// SHIFT_LABEL = «cómo se escribe cada turno» (en español, para quien no pasa `details`)
const SHIFT_LABEL = { day: 'Turno diurno', night: 'Turno nocturno' } as const

export default function AlertCardView({
  place,
  title,
  when,
  table,
  dish,
  shift,
  duration,
  details,
  detailsLabel = 'Detalles',
  imageSrc,
  loading = false,
  category = null,
  listen = null,
  className = '',
}: AlertCardViewProps) {
  const chips =
    details ??
    ([table ? `Mesa ${table}` : null, dish || null, duration ? `Duró ${duration}` : null, shift ? SHIFT_LABEL[shift] : null].filter(Boolean) as string[])
  const speaking = Boolean(listen?.speaking)

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-portal-surface transition-colors ${speaking ? 'border-[#29c50c]' : 'border-portal-line'} ${className}`}
    >
      {imageSrc ? (
        <img src={imageSrc} alt={`${title}, ${place}`} loading='lazy' decoding='async' className='aspect-[16/10] w-full bg-portal-soft object-cover' />
      ) : loading ? (
        <div className='aspect-[16/10] w-full animate-pulse bg-portal-soft' aria-hidden='true' />
      ) : null}
      <div className='p-4'>
        <div className='flex items-baseline justify-between gap-3'>
          <p className='truncate text-sm font-semibold text-portal-ink'>{place}</p>
          <p className='shrink-0 text-xs tabular-nums text-portal-muted'>{when}</p>
        </div>
        {category && (
          <p className='mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>
            <span className='h-2 w-2 rounded-full' style={{ background: category.color }} aria-hidden='true' />
            {category.label}
          </p>
        )}
        <p className='mt-1 text-[0.95rem] font-semibold leading-snug text-portal-ink'>{title}</p>
        {(chips.length > 0 || listen) && (
          <div className='mt-3 flex items-end justify-between gap-3'>
            {chips.length > 0 ? (
              <ul className='flex flex-wrap gap-1.5' aria-label={detailsLabel}>
                {chips.map(detail => (
                  <li key={detail} className='rounded-full bg-portal-ctl px-2.5 py-1 text-xs font-medium text-portal-ink ring-1 ring-portal-line'>
                    {detail}
                  </li>
                ))}
              </ul>
            ) : (
              <span />
            )}
            {listen && (
              <button
                type='button'
                aria-pressed={speaking}
                aria-label={listen.label}
                title={listen.label}
                onClick={listen.onToggle}
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${
                  speaking ? 'bg-[#29c50c] text-[#2f2a1e] ring-[#29c50c]' : 'text-portal-ink ring-portal-ring hover:bg-portal-ctl'
                }`}
              >
                {speaking ? <StopIcon size={16} /> : <SpeakerIcon size={18} />}
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
