import { Link, NavLink } from 'react-router'

/*  LA BARRA DEL PORTAL (con sesión): la marca, el muro, quién está dentro y salir. Colores de Amazonas. Solo pinta.
 *
 *  @param userName   el nombre de quien tiene la sesión
 *  @param onSignOut  qué hacer al pulsar «Cerrar sesión»
 *  @param signingOut si la salida está en curso
 */
type PortalHeaderProps = {
  userName: string
  onSignOut: () => void
  signingOut: boolean
}

// MARK_BARS = «las tres barras del símbolo»
const MARK_BARS = [
  { height: 9, color: '#29c50c' },
  { height: 14, color: '#d9a441' },
  { height: 19, color: '#b5763b' },
]

const navClasses = ({ isActive }: { isActive: boolean }) =>
  `landing-link inline-flex h-11 items-center border-b-2 px-1 text-sm font-semibold ${
    isActive ? 'border-[#29c50c] text-[#2f2a1e]' : 'border-transparent text-[#564e40]'
  }`

export default function PortalHeader({ userName, onSignOut, signingOut }: PortalHeaderProps) {
  return (
    <header className='border-b border-[#ece5d5] bg-white'>
      <div className='mx-auto flex h-[72px] w-full max-w-[1288px] items-center gap-6 px-6'>
        <a
          href='#contenido'
          className='sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-50 focus:rounded-full focus:bg-[#2f2a1e] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white'
        >
          Saltar al contenido
        </a>
        <Link to='/' className='landing-link flex h-11 items-center gap-2.5 text-[1.05rem] font-semibold tracking-[-0.02em] text-[#2f2a1e]'>
          <span aria-hidden='true' className='flex h-5 items-end gap-[3px]'>
            {MARK_BARS.map(bar => (
              <span key={bar.height} className='w-[5px] rounded-[2px]' style={{ height: bar.height, background: bar.color }} />
            ))}
          </span>
          insights365
        </Link>
        <nav aria-label='Portal' className='hidden sm:block'>
          <NavLink to='/muro' className={navClasses}>
            Muro de alertas
          </NavLink>
        </nav>
        <div className='ml-auto flex items-center gap-4'>
          <p className='hidden text-sm text-[#564e40] md:block'>{userName}</p>
          <button
            type='button'
            onClick={onSignOut}
            disabled={signingOut}
            className='landing-button inline-flex h-11 items-center rounded-full border border-[#ddd3bd] px-5 text-sm font-semibold text-[#2f2a1e] hover:bg-[#fbf8f0] disabled:opacity-60'
          >
            {signingOut ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </header>
  )
}
