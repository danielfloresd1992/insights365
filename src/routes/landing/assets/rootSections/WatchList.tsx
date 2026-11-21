import { useRef } from 'react'
import { useStillScene } from '../../hook/useStillScene'
import { useCardsMotion, type CardsMotion } from '../../hook/useCardsMotion'
import { dealMotion, depthMotion, riseMotion } from '../../hook/cardMotions'
import type { CardsVariant } from '../landing.content'
import WatchCard from './WatchCard'
import { WATCH_GROUPS } from './watchGroups'

/*  LO QUE SE VIGILA (sección de la portada de '/')
 *
 *  Las seis familias de alertas en seis tarjetas 3D, sin cabecera visible. Se mueven con el scroll de una de tres
 *  maneras (cardMotions.ts), y cada una se inclina bajo el ratón:
 *    a · Se levantan, b · En profundidad, c · Se reparten (esta deja la sección fija mientras reparte la baraja).
 *  En el teléfono o con movimiento reducido se quedan quietas, en su rejilla. Colores de Amazonas. Solo pinta.
 */

// MOTIONS = «el movimiento de cada opción»
const MOTIONS: Record<CardsVariant, CardsMotion> = {
  a: riseMotion,
  b: depthMotion,
  c: dealMotion,
}

type WatchListProps = {
  variant: CardsVariant
}

export default function WatchList({ variant }: WatchListProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLUListElement>(null)
  const still = useStillScene()
  useCardsMotion(sectionRef, gridRef, MOTIONS[variant], !still)
  // pinned = «la sección se queda fija en pantalla mientras dura el reparto (solo la opción C, y con movimiento)»
  const pinned = variant === 'c' && !still

  return (
    <section
      ref={sectionRef}
      id='que-se-vigila'
      aria-labelledby='watch-title'
      // overflow-x-clip: las tarjetas giradas en 3D proyectan su caja más allá del borde y abrían scroll horizontal;
      // clip recorta sin hacer de la sección un contenedor con scroll, así el reparto fijo (sticky) sigue funcionando
      className={pinned ? 'relative h-[260vh] overflow-x-clip bg-white' : 'overflow-x-clip bg-white'}
    >
      <div className={pinned ? 'sticky top-0 flex h-svh items-center' : undefined}>
        <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
          {/* Sin cabecera a la vista: el título queda solo para lectores de pantalla, que así no saltan del h1 al h3 */}
          <h2 id='watch-title' className='sr-only'>
            Lo que se vigila
          </h2>

          <ul ref={gridRef} data-motion={still ? undefined : variant} className='watch-grid relative grid gap-5 sm:grid-cols-2 lg:grid-cols-3'>
            {WATCH_GROUPS.map(group => (
              <WatchCard key={group.id} group={group} withBack={pinned} tilt={!still} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
