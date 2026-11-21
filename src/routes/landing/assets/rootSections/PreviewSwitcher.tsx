/*  EL SELECTOR DE OPCIONES DE LA PORTADA DE '/': una píldora fija abajo con un grupo por cosa que se compara (las
 *  tarjetas de «Lo que se vigila» y las secciones que siguen), para cambiar sin salir de la página. Sale solo con
 *  ?tarjetas o ?secciones en la dirección; desaparece cuando se elija. Solo pinta.
 */

// SwitcherGroup = «un grupo del selector: su nombre, sus opciones, la que está puesta y qué hacer al elegir otra»
export type SwitcherGroup = {
  label: string
  options: { id: string; name: string }[]
  active: string
  onSelect: (id: string) => void
}

type PreviewSwitcherProps = {
  groups: SwitcherGroup[]
}

export default function PreviewSwitcher({ groups }: PreviewSwitcherProps) {
  return (
    <nav aria-label='Opciones de la portada' className='pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4'>
      <div
        style={{ ['--focus-ring' as string]: '#2f2a1e' }}
        className='pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[#ddd3bd] bg-white/92 p-1 text-[13px] shadow-[0_12px_32px_-12px_rgba(47,42,30,0.4)] backdrop-blur'
      >
        {groups.map((group, groupIndex) => {
          const activeName = group.options.find(option => option.id === group.active)?.name
          return (
            <div key={group.label} role='group' aria-label={group.label} className='flex shrink-0 items-center gap-1'>
              {groupIndex > 0 && <span className='mx-1 h-6 w-px bg-[#ddd3bd]' aria-hidden='true' />}
              <span className='pl-2 pr-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>{group.label}</span>
              {group.options.map(option => {
                const isActive = option.id === group.active
                return (
                  <button
                    key={option.id}
                    type='button'
                    aria-pressed={isActive}
                    title={option.name}
                    onClick={() => group.onSelect(option.id)}
                    className={`landing-button inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 font-semibold ${
                      isActive ? 'bg-[#2f2a1e] text-white' : 'text-[#2f2a1e] hover:bg-black/[0.05]'
                    }`}
                  >
                    {option.id.toUpperCase()}
                  </button>
                )
              })}
              <span className='hidden pl-1 pr-2 text-[#2f2a1e] xl:inline'>{activeName}</span>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
