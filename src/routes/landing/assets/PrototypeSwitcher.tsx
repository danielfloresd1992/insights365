import { NavLink } from 'react-router'
import { COVERS } from './landing.content'

/*  EL SELECTOR DE PROTOTIPOS: una píldora fija para saltar entre las tres portadas y volver a la lista. En pantalla
 *  ancha va arriba, en el hueco del centro de la barra, para no tapar nada de la portada; en el teléfono, abajo.
 *  Es solo para comparar; desaparece cuando se elija la portada. Solo pinta.
 */

const itemClasses = ({ isActive }: { isActive: boolean }) =>
  `landing-button inline-flex h-11 items-center gap-1.5 rounded-full px-4 ${
    isActive ? 'bg-ink text-white' : 'text-ink hover:bg-black/[0.05]'
  }`

export default function PrototypeSwitcher() {
  return (
    <nav aria-label='Prototipos de portada' className='pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 md:bottom-auto md:top-[10px]'>
      <div style={{ ['--focus-ring' as string]: '#1c1b17' }} className='pointer-events-auto flex items-center gap-1 rounded-full border border-black/10 bg-white/90 p-1 font-sans text-[13px] shadow-[0_12px_32px_-12px_rgba(31,27,20,0.35)] backdrop-blur'>
        <NavLink to='/portadas' end className={itemClasses}>
          Todas
        </NavLink>
        {COVERS.map(cover => (
          <NavLink key={cover.id} to={`/portadas/${cover.id}`} className={itemClasses}>
            <span className='font-semibold'>{cover.id.toUpperCase()}</span>
            <span className='hidden lg:inline'>{cover.name}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
