import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'

/*  LOS ESTABLECIMIENTOS DEL MURO
 *
 *  Una sola fila de botones que se desliza de lado (en cualquier ancho, para no robar altura al muro): «Todos» y uno
 *  por establecimiento del estado global. Se pueden marcar varios, y sin ninguno marcado se ven todos. Los inactivos
 *  lo dicen. Cada botón dice si está marcado (aria-pressed).
 *  Sin barra de desplazamiento (propuesta C del lienzo «Scroll de los establecimientos del muro», elegida por el
 *  usuario): la fila se desvanece por el lado donde queda más, y debajo una pastilla corta dice qué parte de la fila
 *  se ve (el tramo verde mide lo que cabe y se mueve con ella). La rueda del ratón también la desliza de lado, hasta
 *  su final; ahí vuelve a mover la página. Sin nada que deslizar, ni se desvanece ni hay pastilla.
 *
 *  @param establishments  los establecimientos de quien entra
 *  @param selected        los ids marcados
 *  @param onToggle        marcar o desmarcar uno
 *  @param onClear         volver a «Todos»
 */
type WallFiltersProps = {
  establishments: FullEstablishment[]
  selected: string[]
  onToggle: (id: string) => void
  onClear: () => void
}

// RowView = «qué parte de la fila se ve»: si está al principio o al final, dónde va (0–1) y cuánto cabe (0–1)
type RowView = { start: boolean; end: boolean; pos: number; part: number }

const chipClasses = (active: boolean) =>
  `landing-button inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 ring-inset ${
    active ? 'bg-[#29c50c] text-[#2f2a1e] ring-[#29c50c]' : 'bg-portal-surface text-portal-ink ring-portal-ring hover:bg-portal-ctl'
  }`

// viewOf = «qué parte se ve de una fila que se desliza»
function viewOf(row: HTMLElement): RowView {
  const max = row.scrollWidth - row.clientWidth
  return {
    start: row.scrollLeft <= 2,
    end: row.scrollLeft >= max - 2,
    pos: max > 0 ? row.scrollLeft / max : 0,
    part: row.scrollWidth ? Math.min(1, row.clientWidth / row.scrollWidth) : 1,
  }
}

// fadeOf = «la máscara que desvanece la fila por el lado donde queda más»
function fadeOf({ start, end }: RowView): CSSProperties {
  if (start && end) return {}
  const mask = start
    ? 'linear-gradient(to right, #000 88%, transparent)'
    : end
      ? 'linear-gradient(to right, transparent, #000 12%)'
      : 'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)'
  return { maskImage: mask, WebkitMaskImage: mask }
}

export default function WallFilters({ establishments, selected, onToggle, onClear }: WallFiltersProps) {
  const { t } = useTranslation()
  const row = useRef<HTMLDivElement>(null)
  const chips = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<RowView>({ start: true, end: true, pos: 0, part: 1 })

  // Se vuelve a medir cuando cambia el ancho de la fila o el de sus botones (llegan los establecimientos, uno se
  // marca inactivo…); el ResizeObserver mide también nada más empezar
  useLayoutEffect(() => {
    const element = row.current
    if (!element) return
    const observer = new ResizeObserver(() => setView(viewOf(element)))
    observer.observe(element)
    if (chips.current) observer.observe(chips.current)
    return () => observer.disconnect()
  }, [])

  // La rueda (de arriba abajo) desliza la fila de lado mientras le quede recorrido; al final, la página sigue con ella.
  // Va a mano, y no con onWheel, porque React escucha la rueda en modo pasivo y no deja frenar el desplazamiento de
  // la página
  useEffect(() => {
    const element = row.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const max = element.scrollWidth - element.clientWidth
      const canMove = event.deltaY > 0 ? element.scrollLeft < max - 1 : element.scrollLeft > 1
      if (!canMove) return
      event.preventDefault()
      element.scrollLeft += event.deltaY
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  return (
    <div className='flex flex-col gap-2'>
      <div
        ref={row}
        role='group'
        aria-label={t('wall.filtersLabel')}
        onScroll={event => setView(viewOf(event.currentTarget))}
        className='-mx-6 overflow-x-auto px-6 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden'
        style={fadeOf(view)}
      >
        <div ref={chips} className='flex w-max gap-2'>
          <button type='button' aria-pressed={selected.length === 0} onClick={onClear} className={chipClasses(selected.length === 0)}>
            {t('wall.all')}
          </button>
          {establishments.map(establishment => {
            const active = selected.includes(establishment._id)
            return (
              <button key={establishment._id} type='button' aria-pressed={active} onClick={() => onToggle(establishment._id)} className={chipClasses(active)}>
                {establishment.name}
                {!establishment.isActive && <span className='text-xs font-medium opacity-70'>· {t('wall.inactive')}</span>}
              </button>
            )
          })}
        </div>
      </div>
      {view.part < 1 && (
        <div aria-hidden='true' className='relative mx-auto h-1 w-[72px] overflow-hidden rounded-full bg-portal-line'>
          <span
            className='absolute inset-y-0 rounded-full bg-[#29c50c]'
            style={{ width: `${Math.max(15, view.part * 100)}%`, left: `${view.pos * (100 - Math.max(15, view.part * 100))}%` }}
          />
        </div>
      )}
    </div>
  )
}
