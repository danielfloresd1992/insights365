import { useRef, useState, type ReactNode } from 'react'
import { clamp01, useScrollFrame } from '../../../../hook/useScrollFrame'
import { useStillScene } from '../../../../hook/useStillScene'
import { FAMILIES, PREP_DELAY_STEPS, stepImage } from '../alertSamples'

/*  ANATOMÍA DE UNA DEMORA (propuesta C, segunda sección)
 *
 *  Una «Demora en preparación de plato» desarmada en sus capas, como un despiece. La sección se queda fija mientras
 *  se hace scroll: la tarjeta de la alerta gira hasta verse en perspectiva y sus capas se separan (la alerta, las
 *  cuatro fotos que pide el catálogo, el tiempo medido entre foto y foto contra el umbral del local, la validación y a
 *  dónde va); después se adelanta una capa tras otra y a la izquierda se explica la que está delante. En el teléfono
 *  o con movimiento reducido no se fija: las capas van en plano, cada una con su explicación. Solo pinta.
 */

// LAYERS = «las capas, de arriba abajo, con lo que dice de cada una la lista»
const LAYERS = [
  { title: 'La alerta', text: 'Qué pasó, dónde y en qué turno. La anota el operador en cuanto lo ve.' },
  { title: 'Cuatro fotos, una por paso', text: 'Toma de orden, listo en tablet, listo en cocina y entrega de plato: las pide el catálogo para esta demora.' },
  { title: 'El tiempo, entre foto y foto', text: 'De la primera foto a la última, 21 min 26 s. El umbral del local es de 18 minutos: cuenta como demora.' },
  { title: 'La validación', text: 'Alguien del equipo la revisa con las fotos delante y la aprueba.' },
  { title: 'A dónde va', text: 'A tu muro de alertas, al informe del turno y a «Cantidad de demoras por día» del semanal.' },
]

// TILT_SHARE, SPLIT_SHARE = «qué parte del tramo fijo tarda el despiece en girar y en separarse; el resto es para
// adelantar las capas»
const TILT_SHARE = 0.22
const SPLIT_SHARE = 0.38
// LAYER_GAP = «la separación entre capas, en píxeles, con el despiece abierto»
const LAYER_GAP = 92

const DELAY_COLOR = FAMILIES.demoras.color

export default function DelayAnatomy() {
  const sectionRef = useRef<HTMLElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const still = useStillScene()
  // active = «la capa que está delante»
  const [active, setActive] = useState(0)

  useScrollFrame(
    sectionRef,
    (box, viewportHeight) => {
      const stack = stackRef.current
      if (!stack) return
      const progress = clamp01(-box.top / Math.max(1, box.height - viewportHeight))
      const tilt = 1 - Math.pow(1 - clamp01(progress / TILT_SHARE), 3)
      const split = 1 - Math.pow(1 - clamp01((progress - 0.06) / (SPLIT_SHARE - 0.06)), 3)
      const focus = clamp01((progress - SPLIT_SHARE) / (1 - SPLIT_SHARE - 0.06)) * (LAYERS.length - 1)
      stack.style.transform = `rotateX(${(54 * tilt).toFixed(2)}deg) rotateZ(${(-34 * tilt).toFixed(2)}deg)`
      Array.from(stack.children).forEach((child, index) => {
        const closeness = Math.max(0, 1 - Math.abs(index - focus))
        // Cerrado el despiece, la alerta queda arriba: cada capa un poco más honda que la anterior
        const depth = ((LAYERS.length - 1) / 2 - index) * LAYER_GAP * split + 46 * closeness * split + (LAYERS.length - 1 - index) * 1.2
        // Las capas que quedan por encima de la que se explica se vuelven casi transparentes, para verla entera
        // (empieza a desvanecerse cuando el foco ya va camino de la siguiente, no antes)
        const above = clamp01((focus - index - 0.35) / 0.5)
        const layer = child as HTMLElement
        layer.style.transform = `translate3d(0, 0, ${depth.toFixed(1)}px)`
        layer.style.opacity = (1 - 0.88 * split * above).toFixed(3)
      })
      const nextActive = Math.round(focus)
      setActive(current => (current === nextActive ? current : nextActive))
    },
    !still,
  )

  const intro = (
    <>
      <p className='text-sm font-semibold text-[#177406]'>Anatomía de una alerta</p>
      <h2 id='pc-anatomy-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
        Cada alerta, con su prueba
      </h2>
    </>
  )

  if (still) {
    return (
      <section aria-labelledby='pc-anatomy-title' className='bg-white'>
        <div className='mx-auto w-full max-w-[1288px] px-6 py-20'>
          {intro}
          <ol className='mt-10 grid gap-10'>
            {LAYERS.map((layer, index) => (
              <li key={layer.title}>
                <LayerText index={index} title={layer.title} text={layer.text} active />
                <div className='mt-4 w-full max-w-[520px]'>
                  <LayerPlate index={index} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} aria-labelledby='pc-anatomy-title' className='relative h-[320vh] bg-white'>
      <div className='sticky top-0 flex h-svh items-center overflow-hidden'>
        <div className='mx-auto grid w-full max-w-[1288px] items-center gap-10 px-6 lg:grid-cols-12'>
          <div className='lg:col-span-5'>
            {intro}
            <ol className='mt-8 grid gap-1.5'>
              {LAYERS.map((layer, index) => (
                <li key={layer.title} aria-current={index === active ? 'step' : undefined}>
                  <LayerText index={index} title={layer.title} text={layer.text} active={index === active} />
                </li>
              ))}
            </ol>
          </div>
          <div className='pc-anatomy relative h-[min(72vh,640px)] lg:col-span-7' aria-hidden='true'>
            <div ref={stackRef} className='pc-anatomy__stack absolute inset-0'>
              {LAYERS.map((layer, index) => (
                <div key={layer.title} className='pc-anatomy__layer'>
                  <LayerPlate index={index} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/*  El renglón de la lista: número, título y, si es la capa de delante, su explicación */
function LayerText({ index, title, text, active }: { index: number; title: string; text: string; active: boolean }) {
  return (
    <div className={`flex gap-4 rounded-xl px-4 py-3 transition-colors duration-300 ${active ? 'bg-[#fbf8f0] ring-1 ring-[#ece5d5]' : ''}`}>
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold transition-colors duration-300 ${active ? 'bg-[#29c50c] text-[#2f2a1e]' : 'bg-[#f4f2ee] text-[#564e40]'}`}
      >
        {index + 1}
      </span>
      <div>
        <p className={`font-semibold ${active ? 'text-[#2f2a1e]' : 'text-[#564e40]'}`}>{title}</p>
        {active && <p className='mt-1 leading-relaxed text-[#564e40]'>{text}</p>}
      </div>
    </div>
  )
}

/*  Una placa del despiece, del mismo tamaño todas, con su número en la esquina */
function Plate({ index, children, tone = 'white' }: { index: number; children: ReactNode; tone?: 'white' | 'ivory' }) {
  return (
    <div
      className={`relative aspect-[16/11] w-full rounded-2xl p-4 ring-1 ring-[#ddd3bd] shadow-[0_30px_50px_-30px_rgba(47,42,30,0.55)] sm:p-5 ${tone === 'white' ? 'bg-white' : 'bg-[#fbf8f0]'}`}
    >
      <span className='absolute -left-3 -top-3 grid h-8 w-8 place-items-center rounded-full bg-[#2f2a1e] text-sm font-bold text-white'>{index + 1}</span>
      {children}
    </div>
  )
}

const toSeconds = (time: string) => time.split(':').map(Number).reduce((total, part) => total * 60 + part, 0)

/*  El contenido de cada capa */
function LayerPlate({ index }: { index: number }) {
  if (index === 0) {
    return (
      <Plate index={index}>
        <div className='grid h-full grid-cols-[1.1fr_1fr] gap-4'>
          <img src={stepImage(PREP_DELAY_STEPS[3], 'demoras', 'MESA 8')} alt='' className='h-full w-full rounded-xl object-cover' />
          <div className='flex flex-col'>
            <div className='flex items-baseline justify-between gap-2'>
              <p className='text-sm font-semibold text-[#2f2a1e]'>Sucursal Centro</p>
              <p className='text-xs text-[#564e40]'>12:58</p>
            </div>
            <p className='mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>
              <span className='h-2 w-2 rounded-full' style={{ background: DELAY_COLOR }} />
              Demoras
            </p>
            <p className='mt-1 text-lg font-semibold leading-snug text-[#2f2a1e]'>Demora en preparación de plato</p>
            <div className='mt-auto flex flex-wrap gap-1.5'>
              {['Mesa 8', 'Plato fuerte', 'Turno diurno'].map(detail => (
                <span key={detail} className='rounded-full bg-[#fbf8f0] px-2.5 py-1 text-xs font-medium text-[#2f2a1e] ring-1 ring-[#ece5d5]'>
                  {detail}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Plate>
    )
  }

  if (index === 1) {
    return (
      <Plate index={index} tone='ivory'>
        <div className='grid h-full grid-cols-2 grid-rows-2 gap-2.5'>
          {PREP_DELAY_STEPS.map(step => (
            <figure key={step.caption} className='relative overflow-hidden rounded-lg'>
              <img src={stepImage(step, 'demoras', 'MESA 8')} alt='' className='h-full w-full object-cover' />
              <figcaption className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[11px] font-semibold text-white'>{step.caption}</figcaption>
            </figure>
          ))}
        </div>
      </Plate>
    )
  }

  if (index === 2) {
    const start = toSeconds(PREP_DELAY_STEPS[0].time)
    const total = toSeconds(PREP_DELAY_STEPS[PREP_DELAY_STEPS.length - 1].time) - start
    const threshold = 18 * 60
    const scale = total * 1.08
    return (
      <Plate index={index}>
        <div className='flex h-full flex-col'>
          <div className='flex items-baseline justify-between gap-3'>
            <p className='text-sm font-semibold text-[#2f2a1e]'>Tiempo medido</p>
            <p className='font-plex-mono text-2xl font-semibold text-[#2f2a1e]'>21 min 26 s</p>
          </div>
          <div className='relative mt-auto mb-12'>
            <div className='h-3 overflow-hidden rounded-full bg-[#ece5d5]'>
              <div className='flex h-full' style={{ width: `${(total / scale) * 100}%` }}>
                <div className='h-full bg-[#d9a441]' style={{ width: `${(threshold / total) * 100}%` }} />
                <div className='h-full flex-1' style={{ background: DELAY_COLOR }} />
              </div>
            </div>
            <span className='absolute -top-2 h-7 w-[3px] -translate-x-1/2 rounded-full bg-[#2f2a1e]' style={{ left: `${(threshold / scale) * 100}%` }} />
            <span className='absolute -top-7 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-[#2f2a1e]' style={{ left: `${(threshold / scale) * 100}%` }}>
              Umbral 18 min
            </span>
            {PREP_DELAY_STEPS.map(step => {
              const at = ((toSeconds(step.time) - start) / scale) * 100
              return (
                <span key={step.caption} className='absolute top-1.5 -translate-x-1/2' style={{ left: `${at}%` }}>
                  <span className='block h-4 w-4 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#2f2a1e] shadow' />
                  <span className='mt-1.5 block whitespace-nowrap font-plex-mono text-[10px] text-[#564e40]'>{step.time.slice(0, 5)}</span>
                </span>
              )
            })}
          </div>
          <p className='text-sm text-[#564e40]'>De la toma de orden a la entrega de plato, medido entre las fotos.</p>
        </div>
      </Plate>
    )
  }

  if (index === 3) {
    return (
      <Plate index={index} tone='ivory'>
        <div className='flex h-full items-center gap-6'>
          <div className='grid h-28 w-28 shrink-0 -rotate-12 place-items-center rounded-full border-4 border-[#29c50c] text-center'>
            <span className='text-sm font-extrabold uppercase tracking-[0.14em] text-[#177406]'>Aprobada</span>
          </div>
          <dl className='grid gap-3 text-sm'>
            <div>
              <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Revisó</dt>
              <dd className='font-semibold text-[#2f2a1e]'>Supervisión de turno</dd>
            </div>
            <div>
              <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Hora</dt>
              <dd className='font-semibold text-[#2f2a1e]'>13:01</dd>
            </div>
            <div>
              <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Nota</dt>
              <dd className='text-[#2f2a1e]'>Se ve la espera en las cuatro fotos.</dd>
            </div>
          </dl>
        </div>
      </Plate>
    )
  }

  return (
    <Plate index={index}>
      <ul className='grid h-full content-center gap-3'>
        {[
          { title: 'Muro de alertas', detail: 'Con su foto, la mesa y el turno' },
          { title: 'Informe del turno', detail: 'Lunes 24 · turno diurno' },
          { title: 'Semanal', detail: '«Cantidad de demoras por día», en Plato fuerte' },
        ].map(destination => (
          <li key={destination.title} className='flex items-center gap-3 rounded-xl bg-[#fbf8f0] px-4 py-3 ring-1 ring-[#ece5d5]'>
            <span className='grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#29c50c] text-[#2f2a1e]'>
              <svg viewBox='0 0 16 16' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <path d='M3 8h9M8.5 4.5L12 8l-3.5 3.5' />
              </svg>
            </span>
            <span>
              <span className='block font-semibold text-[#2f2a1e]'>{destination.title}</span>
              <span className='block text-sm text-[#564e40]'>{destination.detail}</span>
            </span>
          </li>
        ))}
      </ul>
    </Plate>
  )
}
