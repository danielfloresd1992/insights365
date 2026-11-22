import type { ReactNode } from 'react'
import { Link } from 'react-router'
import BrandMark from './BrandMark'
import LoginShowcase from './LoginShowcase'
import { ArrowLeftIcon } from './accessUi'
import './login.css'

/*  EL MARCO DE LAS PANTALLAS DE /acceso. Colores de Amazonas, en IBM Plex. Solo pinta.
 *
 *  Partido en dos en pantalla ancha: a la izquierda, sobre marfil, la marca y una muestra del muro (LoginShowcase); a
 *  la derecha, el formulario que toque sobre la tinta de Amazonas (#2f2a1e), con la letra en marfil y un brillo verde
 *  en la esquina. Arriba, la vuelta (a la portada, o a entrar desde las pantallas de la contraseña); en móvil, la
 *  marca arriba y el © abajo, porque el lado de marfil no se enseña.
 */

// BackLink = «a dónde lleva la vuelta de arriba y qué dice»
export type BackLink = { to: string; label: string }

// BACK_TO_COVER = «la vuelta por defecto: a la portada»
const BACK_TO_COVER: BackLink = { to: '/', label: 'Volver a la portada' }

export default function AccessShell({ children, back = BACK_TO_COVER }: { children: ReactNode; back?: BackLink }) {
  return (
    <div className='grid min-h-dvh bg-white font-plex text-[#2f2a1e] lg:grid-cols-2' style={{ ['--focus-ring' as string]: '#2f2a1e' }}>
      <LoginShowcase />

      {/* Fondo en la tinta de Amazonas (#2f2a1e, pedido del usuario); el anillo de foco pasa a marfil para verse sobre ella */}
      <main
        id='contenido'
        className='relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#2f2a1e] px-6 py-6 text-[#fbf8f0] sm:px-10 lg:py-10'
        style={{ ['--focus-ring' as string]: '#fbf8f0' }}
      >
        <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(44rem_26rem_at_100%_0%,rgba(41,197,12,0.13),transparent_70%),radial-gradient(30rem_20rem_at_0%_100%,rgba(217,164,65,0.08),transparent_70%)]' />

        <div className='flex items-center justify-between gap-4'>
          <Link to='/' className='landing-link inline-flex h-11 items-center gap-2.5 text-[1.05rem] font-semibold lg:hidden'>
            <BrandMark />
            insights365
          </Link>
          <Link to={back.to} className='landing-link ml-auto inline-flex h-11 items-center gap-2 text-sm font-medium text-[#ddd3bd]'>
            <ArrowLeftIcon />
            {back.label}
          </Link>
        </div>

        <div className='flex flex-1 items-center justify-center py-10'>{children}</div>

        <p className='text-center text-xs text-[#b3aa96] lg:hidden'>© 2026 Amazonas365</p>
      </main>
    </div>
  )
}
