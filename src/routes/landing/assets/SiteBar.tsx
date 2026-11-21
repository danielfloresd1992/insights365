import { Link } from 'react-router'
import { LOGIN_PATH, PALETTE } from './landing.content'

/*  LA BARRA DE ARRIBA DE LAS PORTADAS: la marca a la izquierda y el acceso a la derecha. Solo pinta.
 *
 *  @param tone     'light' sobre fondo claro, 'dark' sobre el fondo oscuro de la portada B
 *  @param overlay  si va encima del hero en vez de antes de él: así el hero mide justo una pantalla, con la barra
 *                  sobre su borde de arriba (taste-skill)
 *  @param offsetTop  cuánto baja la barra superpuesta, en píxeles: la portada C deja arriba su tira de color
 *  @param markColors los tres colores del símbolo, de la barra baja a la alta; por omisión, verde, ocre y barro
 */
type SiteBarProps = {
  tone: 'light' | 'dark'
  overlay?: boolean
  offsetTop?: number
  markColors?: [string, string, string]
}

// MARK_HEIGHTS, MARK_COLORS = «las tres barras del símbolo, de la baja a la alta, y sus colores por omisión»
const MARK_HEIGHTS = [9, 14, 19]
const MARK_COLORS: [string, string, string] = [PALETTE.green, PALETTE.ochre, PALETTE.clay]

export default function SiteBar({ tone, overlay = false, offsetTop = 0, markColors = MARK_COLORS }: SiteBarProps) {
  const dark = tone === 'dark'
  const placement = overlay ? 'absolute inset-x-0' : 'relative'
  return (
    <header
      className={`${placement} z-20 mx-auto flex h-[72px] w-full max-w-[1288px] items-center justify-between px-6`}
      style={overlay ? { top: offsetTop } : undefined}
    >
      {/* La primera parada del teclado: salta la barra y va derecho a la portada */}
      <a
        href='#contenido'
        className='sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-50 focus:rounded-full focus:bg-[#1c1b17] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-white'
      >
        Saltar al contenido
      </a>
      <Link to='/' className='landing-link flex h-11 items-center gap-2.5 text-[1.05rem] font-semibold tracking-[-0.02em]'>
        <span aria-hidden='true' className='flex h-5 items-end gap-[3px]'>
          {MARK_HEIGHTS.map((barHeight, barIndex) => (
            <span key={barHeight} className='w-[5px] rounded-[2px]' style={{ height: barHeight, background: markColors[barIndex] }} />
          ))}
        </span>
        insights365
      </Link>
      <Link
        to={LOGIN_PATH}
        className={`landing-button inline-flex h-11 items-center rounded-full border px-5 text-sm font-semibold ${
          dark ? 'border-white/20 text-white hover:bg-white/10' : 'border-black/15 hover:bg-black/[0.04]'
        }`}
      >
        Iniciar sesión
      </Link>
    </header>
  )
}
