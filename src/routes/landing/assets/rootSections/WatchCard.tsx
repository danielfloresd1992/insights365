import { cardTiltHandlers } from '../../hook/cardTilt'
import { PALETTE } from '../landing.content'
import { ICON_PATHS, type WatchGroup } from './watchGroups'

/*  UNA TARJETA 3D DE «LO QUE SE VIGILA»
 *
 *  Una ficha con grosor: la cara blanca delante y, detrás, un canto del color de su grupo que asoma por abajo y se
 *  ve de lado cuando la tarjeta gira. El icono y el título flotan sobre la cara (más cuanto más --pop, que pone el
 *  movimiento con scroll, y al pasar el ratón). Con dorso, lleva detrás la marca, para la baraja de la opción C.
 *  Las capas y la profundidad están en el CSS de watch-card (index.css). Solo pinta.
 */

// BACK_BARS = «las tres barras de la marca, en el dorso»
const BACK_BARS = [
  { height: 16, color: PALETTE.green },
  { height: 26, color: PALETTE.ochre },
  { height: 36, color: PALETTE.clay },
]

type WatchCardProps = {
  group: WatchGroup
  // withBack = «lleva dorso: la tarjeta empieza boca abajo en la baraja»
  withBack: boolean
  // tilt = «se inclina bajo el ratón; apagado en el teléfono y con movimiento reducido»
  tilt: boolean
}

export default function WatchCard({ group, withBack, tilt }: WatchCardProps) {
  return (
    <li className='watch-slot' style={{ ['--group-color' as string]: group.color }} {...cardTiltHandlers(tilt)}>
      <div className='watch-card'>
        <span className='watch-card__edge' aria-hidden='true' />
        {withBack && (
          <span className='watch-card__back' aria-hidden='true'>
            <span className='flex h-9 items-end gap-1'>
              {BACK_BARS.map(bar => (
                <span key={bar.height} className='w-2 rounded-[3px]' style={{ height: bar.height, background: bar.color }} />
              ))}
            </span>
          </span>
        )}
        <div className='watch-card__face grid grid-cols-[auto_1fr] gap-x-4 p-5 sm:block sm:p-6'>
          <span className='watch-card__glare' aria-hidden='true' />
          <span className='watch-card__icon row-span-2' aria-hidden='true'>
            <svg width='22' height='22' viewBox='0 0 24 24' fill='none' stroke={group.color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
              <path d={ICON_PATHS[group.icon]} />
            </svg>
          </span>
          <h3 className='watch-card__title self-center text-lg font-semibold tracking-[-0.01em] text-[#2f2a1e] sm:mt-5'>{group.name}</h3>
          <p className='relative mt-1 leading-relaxed text-[#564e40] sm:mt-2'>{group.examples}</p>
        </div>
      </div>
    </li>
  )
}
