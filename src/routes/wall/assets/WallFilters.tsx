import type { Franchise } from '@/libs/wall.api'

/*  LAS FRANQUICIAS DEL MURO. Solo pinta.
 *
 *  Si la sesión trae las franquicias del dueño, se nombran y no se puede elegir otras. Si no, una fila de botones:
 *  «Todas» y una por franquicia; se pueden marcar varias. Cada botón dice si está marcado (aria-pressed).
 *
 *  @param owned       las franquicias del dueño, si la API las da; null si no
 *  @param franchises  todas las franquicias, para elegir
 *  @param selected    las franquicias marcadas
 *  @param onToggle    marcar o desmarcar una
 *  @param onClear     volver a «Todas»
 */
type WallFiltersProps = {
  owned: string[] | null
  franchises: Franchise[]
  selected: string[]
  onToggle: (name: string) => void
  onClear: () => void
}

const chipClasses = (active: boolean) =>
  `landing-button inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ${
    active ? 'bg-[#29c50c] text-[#2f2a1e] ring-[#29c50c]' : 'bg-white text-[#2f2a1e] ring-[#ddd3bd] hover:bg-[#fbf8f0]'
  }`

export default function WallFilters({ owned, franchises, selected, onToggle, onClear }: WallFiltersProps) {
  if (owned) {
    return (
      <p className='text-sm text-[#564e40]'>
        Tus franquicias: <span className='font-semibold text-[#2f2a1e]'>{owned.join(', ')}</span>
      </p>
    )
  }

  return (
    <div role='group' aria-label='Franquicias que se ven en el muro' className='flex flex-wrap gap-2'>
      <button type='button' aria-pressed={selected.length === 0} onClick={onClear} className={chipClasses(selected.length === 0)}>
        Todas
      </button>
      {franchises.map(franchise => {
        const active = selected.includes(franchise.name)
        return (
          <button key={franchise._id} type='button' aria-pressed={active} onClick={() => onToggle(franchise.name)} className={chipClasses(active)}>
            {franchise.name}
          </button>
        )
      })}
    </div>
  )
}
