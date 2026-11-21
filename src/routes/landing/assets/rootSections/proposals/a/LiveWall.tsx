import { Link } from 'react-router'
import AlertCardView from '@/components/AlertCardView'
import { WALL_PATH } from '../../../landing.content'
import { FAMILIES, SAMPLE_ALERTS, alertImage, type SampleAlert } from '../alertSamples'

/*  EL MURO, EN MARCHA (propuesta A, tercera sección)
 *
 *  A la izquierda qué es el muro y el botón para verlo; a la derecha, el muro dibujado en una ventana del navegador:
 *  la cabecera del portal, los filtros y tres columnas de alertas de muestra, con su foto de cámara, que suben solas
 *  a distinto ritmo, como un muro que no para. Se detienen al pasar el ratón y, con movimiento reducido, no se
 *  mueven. Las tarjetas son las mismas del muro de verdad (AlertCardView). Solo pinta.
 */

// COLUMNS = «las alertas de muestra repartidas en tres columnas, y lo que tarda cada una en dar la vuelta»
const COLUMNS = [0, 1, 2].map(column => ({
  alerts: SAMPLE_ALERTS.filter((_, index) => index % 3 === column),
  seconds: [52, 64, 58][column],
  reverse: column === 1,
}))

// FEATURES = «lo que trae el muro, en tres líneas»
const FEATURES = [
  'Las alertas de tus franquicias, de la más nueva a la más vieja.',
  'Con la foto de la cámara, el local, la mesa y el turno.',
  'Se actualiza solo cada 30 segundos.',
]

function WallCard({ alert }: { alert: SampleAlert }) {
  return (
    <AlertCardView
      place={alert.place}
      title={alert.title}
      when={alert.when}
      table={alert.table ?? null}
      dish={alert.dish ?? null}
      shift={alert.shift}
      imageSrc={alertImage(alert)}
      category={FAMILIES[alert.family]}
      className='shadow-[0_10px_24px_-20px_rgba(47,42,30,0.6)]'
    />
  )
}

export default function LiveWall() {
  return (
    <section aria-labelledby='pa-wall-title' className='bg-white'>
      <div className='mx-auto grid w-full max-w-[1288px] items-center gap-12 px-6 py-24 lg:grid-cols-12 lg:gap-x-6'>
        <div className='lg:col-span-4'>
          <p className='text-sm font-semibold text-[#177406]'>Muro de alertas</p>
          <h2 id='pa-wall-title' className='mt-3 text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
            Tus alertas, según llegan
          </h2>
          <ul className='mt-6 grid gap-3'>
            {FEATURES.map(feature => (
              <li key={feature} className='flex gap-3 text-[1.05rem] leading-relaxed text-[#564e40]'>
                <svg viewBox='0 0 20 20' width='20' height='20' className='mt-1 shrink-0' aria-hidden='true'>
                  <circle cx='10' cy='10' r='10' fill='#29c50c' />
                  <path d='M6 10.5l2.6 2.6L14 7.6' fill='none' stroke='#2f2a1e' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            to={WALL_PATH}
            className='landing-button mt-8 inline-flex h-12 items-center rounded-md bg-[#29c50c] px-6 font-semibold text-[#2f2a1e] hover:bg-[#24b00a]'
          >
            Ver mis alertas
          </Link>
        </div>

        <div data-ui className='lg:col-span-8'>
          <div className='overflow-hidden rounded-2xl border border-[#ddd3bd] bg-[#fbf8f0] shadow-[0_40px_80px_-48px_rgba(47,42,30,0.55)]'>
            <div className='flex items-center gap-3 border-b border-[#ece5d5] bg-[#f7f2e4] px-4 py-3'>
              <span className='flex gap-1.5' aria-hidden='true'>
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
              </span>
              <span className='mx-auto rounded-md bg-white px-4 py-1 text-xs text-[#564e40] ring-1 ring-[#ece5d5]'>insights365 · Muro de alertas</span>
            </div>
            <div className='flex flex-wrap items-center gap-3 border-b border-[#ece5d5] bg-white px-5 py-4'>
              <p className='font-semibold text-[#2f2a1e]'>Muro de alertas</p>
              <span className='inline-flex items-center gap-1.5 text-xs text-[#564e40]'>
                <span className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
                En vivo
              </span>
              <span className='ml-auto rounded-full bg-[#fbf8f0] px-3 py-1.5 text-xs font-medium text-[#2f2a1e] ring-1 ring-[#ece5d5]'>Todas tus franquicias ▾</span>
            </div>
            <div className='pa-wall relative grid h-[560px] grid-cols-2 gap-3 overflow-hidden px-4 sm:grid-cols-3'>
              {COLUMNS.map((column, columnIndex) => (
                <div key={columnIndex} className={columnIndex === 2 ? 'hidden sm:block' : undefined}>
                  <div
                    className={`pa-wall__track ${column.reverse ? 'pa-wall__track--reverse' : ''}`}
                    style={{ ['--duration' as string]: `${column.seconds}s` }}
                  >
                    <div className='[&>*]:mb-3'>
                      {column.alerts.map(alert => (
                        <WallCard key={alert.id} alert={alert} />
                      ))}
                    </div>
                    <div className='[&>*]:mb-3' aria-hidden='true'>
                      {column.alerts.map(alert => (
                        <WallCard key={alert.id} alert={alert} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <span className='pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#fbf8f0] to-transparent' aria-hidden='true' />
              <span className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#fbf8f0] to-transparent' aria-hidden='true' />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
