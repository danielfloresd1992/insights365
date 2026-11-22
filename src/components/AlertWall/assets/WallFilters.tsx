import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'

/*  LOS ESTABLECIMIENTOS DEL MURO. Solo pinta.
 *
 *  Una sola fila de botones que se desliza de lado (en cualquier ancho, para no robar altura al muro): «Todos» y uno
 *  por establecimiento del estado global. Se pueden marcar varios, y sin ninguno marcado se ven todos. Los inactivos
 *  lo dicen. Cada botón dice si está marcado (aria-pressed). El final de la fila se desvanece si hay más.
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

const chipClasses = (active: boolean) =>
  `landing-button inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 ring-inset ${
    active ? 'bg-[#29c50c] text-[#2f2a1e] ring-[#29c50c]' : 'bg-portal-surface text-portal-ink ring-portal-ring hover:bg-portal-ctl'
  }`

export default function WallFilters({ establishments, selected, onToggle, onClear }: WallFiltersProps) {
  const { t } = useTranslation()
  return (
    <div
      role='group'
      aria-label={t('wall.filtersLabel')}
      className='-mx-6 flex gap-2 overflow-x-auto px-6 py-1 [mask-image:linear-gradient(to_right,#000_92%,transparent)] sm:mx-0 sm:px-0'
    >
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
  )
}
