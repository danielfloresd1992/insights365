import { useState } from 'react'
import { Link } from 'react-router'
import AlertCardView from '@/components/AlertCardView'
import { WALL_PATH } from '../../../landing.content'
import { FAMILIES, SAMPLE_ALERTS, alertImage, type SampleAlert } from '../alertSamples'

/*  DETRÁS DE CADA TARJETA (propuesta C, tercera sección)
 *
 *  Seis alertas de muestra, una de cada familia, pintadas como en el muro (AlertCardView). Cada una se da la vuelta
 *  al pasar el ratón, o al tocarla o pulsarla con el teclado, y por detrás enseña lo que guarda la alerta: las fotos
 *  que pidió, el tiempo medido si lo lleva, dónde y en qué turno, y su validación. Al final, el botón al muro. Con
 *  movimiento reducido el giro es instantáneo. Solo pinta.
 */

// Evidence = «lo que hay detrás de una alerta de muestra»
type Evidence = { photos: string[]; measure?: string; validation: string }

// EVIDENCE = «lo de detrás de cada alerta de muestra, por su id: las fotos son las que pide su tipo en el catálogo»
const EVIDENCE: Record<string, Evidence> = {
  a1: { photos: ['Ocupa', 'Primera atención'], measure: '6 min 12 s · umbral del local: 5 min', validation: 'Supervisión de turno · 12:12' },
  a2: { photos: ['Entrada'], validation: 'Supervisión de turno · 12:21' },
  a3: { photos: ['Empleado retira plato', 'Plato en cocina'], validation: 'Supervisión de turno · 13:09' },
  a4: { photos: ['Cava'], measure: '4 min 30 s abierta', validation: 'Supervisión de turno · 13:38' },
  a5: { photos: ['Salón'], validation: 'Supervisión de turno · 14:14' },
  a7: { photos: ['Valet'], validation: 'Supervisión de turno · 19:47' },
}

// SHOWN = «las seis alertas de la rejilla, una por familia»
const SHOWN = SAMPLE_ALERTS.filter(alert => alert.id in EVIDENCE)

function FlipCard({ alert }: { alert: SampleAlert }) {
  // flipped = «se dio la vuelta con un toque o con el teclado (con el ratón basta pasar por encima)»
  const [flipped, setFlipped] = useState(false)
  const evidence = EVIDENCE[alert.id]
  const family = FAMILIES[alert.family]
  const where = [alert.place, alert.table ? `Mesa ${alert.table}` : null, alert.shift === 'day' ? 'Turno diurno' : 'Turno nocturno'].filter(Boolean).join(' · ')

  return (
    <div>
      <div className='pc-flip' data-flipped={flipped}>
        <div className='pc-flip__inner'>
          <div className='pc-flip__face' aria-hidden={flipped}>
            <AlertCardView
              place={alert.place}
              title={alert.title}
              when={alert.when}
              table={alert.table ?? null}
              dish={alert.dish ?? null}
              shift={alert.shift}
              imageSrc={alertImage(alert)}
              category={family}
              className='h-full shadow-[0_18px_36px_-28px_rgba(47,42,30,0.6)]'
            />
          </div>
          <div className='pc-flip__back flex flex-col rounded-2xl bg-[#2f2a1e] p-5 text-white' aria-hidden={!flipped}>
            <p className='inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#f4f2ee]'>
              <span className='h-2 w-2 rounded-full' style={{ background: family.color }} aria-hidden='true' />
              {family.label}
            </p>
            <p className='mt-2 text-lg font-semibold leading-snug'>{alert.title}</p>
            <dl className='mt-4 grid gap-3 text-sm'>
              <div>
                <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ddd3bd]'>{evidence.photos.length > 1 ? `${evidence.photos.length} fotos` : '1 foto'}</dt>
                <dd className='mt-1 flex flex-wrap gap-1.5'>
                  {evidence.photos.map(photo => (
                    <span key={photo} className='rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium'>
                      {photo}
                    </span>
                  ))}
                </dd>
              </div>
              {evidence.measure && (
                <div>
                  <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ddd3bd]'>Tiempo medido</dt>
                  <dd className='mt-0.5 font-plex-mono'>{evidence.measure}</dd>
                </div>
              )}
              <div>
                <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#ddd3bd]'>Dónde</dt>
                <dd className='mt-0.5'>{where}</dd>
              </div>
            </dl>
            <p className='mt-auto inline-flex items-center gap-2 self-start rounded-full bg-[#29c50c] px-3 py-1.5 text-xs font-bold text-[#2f2a1e]'>✓ Aprobada · {evidence.validation}</p>
          </div>
        </div>
      </div>
      <button
        type='button'
        aria-pressed={flipped}
        onClick={() => setFlipped(current => !current)}
        className='landing-link mt-2 inline-flex h-11 items-center gap-2 text-sm font-semibold text-[#177406]'
      >
        <svg viewBox='0 0 16 16' width='14' height='14' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          <path d='M13 6.5A5 5 0 0 0 3.6 5M3 9.5A5 5 0 0 0 12.4 11M3.5 2.5V5H6M12.5 13.5V11H10' />
        </svg>
        {flipped ? 'Ver la tarjeta' : 'Ver la prueba'}
        <span className='sr-only'>de «{alert.title}»</span>
      </button>
    </div>
  )
}

export default function EvidenceWall() {
  return (
    <section aria-labelledby='pc-evidence-title' className='bg-[#f4f2ee]'>
      <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
        <div className='grid gap-6 lg:grid-cols-12 lg:items-end'>
          <div className='lg:col-span-7'>
            <p className='text-sm font-semibold text-[#177406]'>Muro de alertas</p>
            <h2 id='pc-evidence-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
              Detrás de cada tarjeta, su prueba
            </h2>
          </div>
          <p className='text-[1.075rem] leading-relaxed text-[#564e40] text-pretty lg:col-span-5'>
            Cada tarjeta del muro viene de una alerta con sus fotos, su hora y su validación. Pasa el ratón por una, o tócala,
            para ver lo que hay detrás.
          </p>
        </div>

        <div className='mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {SHOWN.map(alert => (
            <FlipCard key={alert.id} alert={alert} />
          ))}
        </div>

        <div className='mt-14 flex flex-col items-start justify-between gap-6 rounded-3xl bg-white px-6 py-8 ring-1 ring-[#ece5d5] sm:flex-row sm:items-center sm:px-10'>
          <div>
            <p className='text-2xl font-semibold tracking-[-0.02em] text-[#2f2a1e]'>Tus alertas, con su prueba, en un solo muro.</p>
            <p className='mt-1 text-[#564e40]'>Las de todas tus franquicias, de la más nueva a la más vieja.</p>
          </div>
          <Link
            to={WALL_PATH}
            className='landing-button inline-flex h-12 shrink-0 items-center rounded-md bg-[#29c50c] px-6 font-semibold text-[#2f2a1e] hover:bg-[#24b00a]'
          >
            Ver mis alertas
          </Link>
        </div>
      </div>
    </section>
  )
}
