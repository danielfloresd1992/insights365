/*  UNA ALERTA DEL MURO, PINTADA (el muro de /muro y su adelanto en la portada de /)
 *
 *  La foto de la cámara arriba, si la hay; debajo el local y cuándo pasó, qué pasó, y la mesa, el plato y el turno.
 *  Con los colores de Amazonas: tarjeta blanca, reglas y etiquetas en marfil, tinta para el texto. Solo pinta.
 *
 *  @param place      el local donde pasó
 *  @param title      qué pasó: el título de la novedad
 *  @param when       cuándo, ya escrito («hace 5 min», «20 nov, 12:41»)
 *  @param table      la mesa, si la novedad la dice
 *  @param dish       el plato, si la novedad lo dice
 *  @param shift      el turno: 'day' o 'night'
 *  @param imageSrc   la foto de la cámara; sin ella la tarjeta no reserva hueco
 *  @param loading    si el contenido de la novedad está llegando: se reserva el hueco de la foto
 *  @param category   la familia de la alerta y su color, con un punto delante; sin ella no se pinta
 */
type AlertCardViewProps = {
  place: string
  title: string
  when: string
  table?: string | null
  dish?: string | null
  shift?: 'day' | 'night' | null
  imageSrc?: string | null
  loading?: boolean
  // category = «la familia de la alerta (Demoras, Clientes…) y su color», si se conoce
  category?: { label: string; color: string } | null
  className?: string
}

// SHIFT_LABEL = «cómo se escribe cada turno»
const SHIFT_LABEL = { day: 'Turno diurno', night: 'Turno nocturno' } as const

export default function AlertCardView({ place, title, when, table, dish, shift, imageSrc, loading = false, category = null, className = '' }: AlertCardViewProps) {
  const details = [table ? `Mesa ${table}` : null, dish || null, shift ? SHIFT_LABEL[shift] : null].filter(Boolean) as string[]

  return (
    <article className={`overflow-hidden rounded-2xl border border-[#ece5d5] bg-white ${className}`}>
      {imageSrc ? (
        <img src={imageSrc} alt={`${title}, ${place}`} loading='lazy' decoding='async' className='aspect-[16/10] w-full bg-[#ebe9e4] object-cover' />
      ) : loading ? (
        <div className='aspect-[16/10] w-full animate-pulse bg-[#f4f2ee]' aria-hidden='true' />
      ) : null}
      <div className='p-4'>
        <div className='flex items-baseline justify-between gap-3'>
          <p className='truncate text-sm font-semibold text-[#2f2a1e]'>{place}</p>
          <p className='shrink-0 text-xs tabular-nums text-[#564e40]'>{when}</p>
        </div>
        {category && (
          <p className='mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>
            <span className='h-2 w-2 rounded-full' style={{ background: category.color }} aria-hidden='true' />
            {category.label}
          </p>
        )}
        <p className='mt-1 text-[0.95rem] font-semibold leading-snug text-[#2f2a1e]'>{title}</p>
        {details.length > 0 && (
          <ul className='mt-3 flex flex-wrap gap-1.5' aria-label='Detalles'>
            {details.map(detail => (
              <li key={detail} className='rounded-full bg-[#fbf8f0] px-2.5 py-1 text-xs font-medium text-[#2f2a1e] ring-1 ring-[#ece5d5]'>
                {detail}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}
