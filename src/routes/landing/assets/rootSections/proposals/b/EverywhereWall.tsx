import { Link } from 'react-router'
import AlertCardView from '@/components/AlertCardView'
import { useInView } from '../../../../hook/useInView'
import { useMediaQuery } from '../../../../hook/useStillScene'
import { useTicker } from '../../../../hook/useTicker'
import { WALL_PATH } from '../../../landing.content'
import { FAMILIES, SAMPLE_ALERTS, alertImage, type SampleAlert } from '../alertSamples'

/*  TU MURO, DONDE ESTÉS (propuesta B, tercera sección)
 *
 *  El muro de alertas dibujado dos veces, en la computadora y en el teléfono, con las mismas alertas de muestra. Cada
 *  pocos segundos llega una nueva arriba en los dos y las demás bajan un sitio, como en el muro de verdad, que se
 *  actualiza solo. Solo corre mientras se ve y nunca con movimiento reducido. Las tarjetas son las del muro
 *  (AlertCardView). Solo pinta.
 */

// ARRIVAL_MS = «cada cuánto llega una alerta nueva en la maqueta»
const ARRIVAL_MS = 3600
// SLOT_WHEN = «cuándo pasó la alerta de cada sitio, de arriba abajo»
const SLOT_WHEN = ['ahora', 'hace 2 min', 'hace 5 min', 'hace 9 min']

/*  Las alertas que se ven tras «arrivals» llegadas: la más nueva arriba */
function visibleAlerts(arrivals: number, count: number) {
  return Array.from({ length: count }, (_, slot) => {
    const index = (((arrivals - slot) % SAMPLE_ALERTS.length) + SAMPLE_ALERTS.length) % SAMPLE_ALERTS.length
    return { alert: SAMPLE_ALERTS[index], when: SLOT_WHEN[slot], fresh: slot === 0 && arrivals > 0, key: `${SAMPLE_ALERTS[index].id}-${arrivals - slot}` }
  })
}

function LiveCard({ alert, when, fresh, compact = false }: { alert: SampleAlert; when: string; fresh: boolean; compact?: boolean }) {
  return (
    <div className={`relative ${fresh ? 'pb-arrive' : ''}`}>
      {fresh && <span className='absolute -top-2.5 left-4 z-10 rounded-full bg-[#29c50c] px-2 py-0.5 text-[10px] font-bold text-[#2f2a1e]'>Nueva</span>}
      <AlertCardView
        place={alert.place}
        title={alert.title}
        when={when}
        table={compact ? null : (alert.table ?? null)}
        dish={compact ? null : (alert.dish ?? null)}
        shift={alert.shift}
        imageSrc={compact ? null : alertImage(alert)}
        category={FAMILIES[alert.family]}
        className={fresh ? 'ring-2 ring-[#29c50c]/60' : ''}
      />
    </div>
  )
}

export default function EverywhereWall() {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { ref: stageRef, inView } = useInView<HTMLDivElement>(0.3)
  const arrivals = useTicker(ARRIVAL_MS, inView && !reducedMotion)
  const desktop = visibleAlerts(arrivals, 4)
  const phone = visibleAlerts(arrivals, 3)

  return (
    <section aria-labelledby='pb-wall-title' className='overflow-hidden bg-white'>
      <div className='mx-auto grid w-full max-w-[1288px] items-center gap-12 px-6 py-24 lg:grid-cols-12 lg:gap-x-6'>
        <div className='lg:col-span-4'>
          <p className='text-sm font-semibold text-[#177406]'>Muro de alertas</p>
          <h2 id='pb-wall-title' className='mt-3 text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
            Tu muro, en la oficina o en el teléfono
          </h2>
          <p className='mt-5 text-[1.075rem] leading-relaxed text-[#564e40] text-pretty'>
            Se abre en el navegador de la computadora o del teléfono, con las alertas de tus franquicias de la más nueva a la
            más vieja y su foto. Se actualiza solo cada 30 segundos.
          </p>
          <Link
            to={WALL_PATH}
            className='landing-button mt-8 inline-flex h-12 items-center rounded-md bg-[#29c50c] px-6 font-semibold text-[#2f2a1e] hover:bg-[#24b00a]'
          >
            Ver mis alertas
          </Link>
        </div>

        <div ref={stageRef} data-ui className='relative lg:col-span-8'>
          <div className='overflow-hidden rounded-2xl border border-[#ddd3bd] bg-[#fbf8f0] shadow-[0_40px_80px_-48px_rgba(47,42,30,0.55)] lg:mr-24'>
            <div className='flex items-center gap-3 border-b border-[#ece5d5] bg-[#f7f2e4] px-4 py-3'>
              <span className='flex gap-1.5' aria-hidden='true'>
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
                <span className='h-3 w-3 rounded-full bg-[#ddd3bd]' />
              </span>
              <span className='mx-auto rounded-md bg-white px-4 py-1 text-xs text-[#564e40] ring-1 ring-[#ece5d5]'>insights365 · Muro de alertas</span>
            </div>
            <div className='flex items-center gap-3 border-b border-[#ece5d5] bg-white px-5 py-3.5'>
              <p className='font-semibold text-[#2f2a1e]'>Muro de alertas</p>
              <span className='inline-flex items-center gap-1.5 text-xs text-[#564e40]'>
                <span className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
                Se actualiza solo
              </span>
            </div>
            <div className='grid grid-cols-2 gap-3 p-4'>
              {desktop.map(entry => (
                <LiveCard key={entry.key} alert={entry.alert} when={entry.when} fresh={entry.fresh} />
              ))}
            </div>
          </div>

          <div className='pb-phone absolute -bottom-10 right-0 hidden w-[260px] rounded-[2.4rem] border-[10px] border-[#2f2a1e] bg-[#fbf8f0] shadow-[0_40px_70px_-30px_rgba(47,42,30,0.7)] md:block'>
            <div className='mx-auto mt-2 h-5 w-24 rounded-full bg-[#2f2a1e]' aria-hidden='true' />
            <div className='flex items-center justify-between px-4 pb-2 pt-3'>
              <p className='text-sm font-semibold text-[#2f2a1e]'>Muro de alertas</p>
              <span className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
            </div>
            <div className='grid gap-2 px-3 pb-5'>
              {phone.map(entry => (
                <LiveCard key={entry.key} alert={entry.alert} when={entry.when} fresh={entry.fresh} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
