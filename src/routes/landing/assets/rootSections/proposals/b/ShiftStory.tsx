import { useRef, useState } from 'react'
import { useScrollFrame } from '../../../../hook/useScrollFrame'
import { useMediaQuery } from '../../../../hook/useStillScene'
import { FAMILIES, FAMILY_ORDER, stepImage, type PhotoStep } from '../alertSamples'
import FloorPlan from './FloorPlan'
import { SHIFT_END, SHIFT_EVENTS, SHIFT_MINUTES, SHIFT_START, type Measure, type ShiftEvent } from './shiftEvents'

/*  UN TURNO, MINUTO A MINUTO (propuesta B, primera sección)
 *
 *  Un almuerzo de ejemplo contado alerta por alerta. A la derecha, una tarjeta por alerta con sus fotos de cámara
 *  (una por paso, como las pide el catálogo), el tiempo medido contra el umbral del local y su validación; al final,
 *  el cierre del turno. A la izquierda, fija en pantalla ancha, la consola del turno: el reloj, la regla de 12:00 a
 *  16:00, los contadores y el plano de la sala, que siguen a la alerta que está en el centro de la pantalla. En
 *  pantalla estrecha la consola no sale y las tarjetas se leen una tras otra. Solo pinta.
 */

// WIDE_QUERY = «pantalla ancha: la consola va fija al lado de las alertas»
const WIDE_QUERY = '(min-width: 1024px)'
// HOURS = «las horas que marca la regla del turno»
const HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00']

const toSeconds = (time: string) => time.split(':').map(Number).reduce((total, part) => total * 60 + part, 0)

/*  Lo que pasó entre dos fotos, escrito como en la tarjeta: «12 min 35 s» */
function elapsed(from: string, to: string) {
  const seconds = toSeconds(to) - toSeconds(from)
  const minutes = Math.floor(seconds / 60)
  return minutes > 0 ? `${minutes} min ${seconds % 60} s` : `${seconds} s`
}

export default function ShiftStory() {
  const wide = useMediaQuery(WIDE_QUERY)
  const listRef = useRef<HTMLOListElement>(null)
  // active = «la alerta que está en el centro de la pantalla; la última posición es el cierre del turno»
  const [active, setActive] = useState(0)

  useScrollFrame(
    listRef,
    (_box, viewportHeight) => {
      const list = listRef.current
      if (!list) return
      let nearest = 0
      let nearestDistance = Number.POSITIVE_INFINITY
      Array.from(list.children).forEach((child, index) => {
        const box = child.getBoundingClientRect()
        const distance = Math.abs(box.top + box.height / 2 - viewportHeight * 0.5)
        if (distance < nearestDistance) {
          nearest = index
          nearestDistance = distance
        }
      })
      setActive(current => (current === nearest ? current : nearest))
    },
    wide,
  )

  return (
    <section aria-labelledby='pb-shift-title' className='bg-white'>
      <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
        <div className='grid gap-6 lg:grid-cols-12 lg:items-end'>
          <div className='lg:col-span-7'>
            <p className='text-sm font-semibold text-[#177406]'>Un turno, minuto a minuto</p>
            <h2 id='pb-shift-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
              Así se ve un almuerzo desde la cámara
            </h2>
          </div>
          <p className='text-[1.075rem] leading-relaxed text-[#564e40] text-pretty lg:col-span-5'>
            Un turno de ejemplo, de 12:00 a 16:00. Cada alerta llega con las fotos que pide su tipo, el tiempo medido y
            quién la validó; el reloj y el plano de la sala van con ella.
          </p>
        </div>

        <div className='mt-14 grid gap-10 lg:grid-cols-12'>
          <aside className='hidden lg:col-span-5 lg:block' aria-label='El turno, en vivo'>
            <div className='sticky top-24'>
              <ShiftConsole activeIndex={active} />
            </div>
          </aside>
          <ol ref={listRef} className='grid gap-6 lg:col-span-7 lg:gap-0'>
            {SHIFT_EVENTS.map((event, index) => (
              <li key={event.id} className='pb-event lg:flex lg:min-h-[86vh] lg:items-center' data-active={index === active}>
                <EventCard event={event} />
              </li>
            ))}
            <li className='pb-event lg:flex lg:min-h-[86vh] lg:items-center' data-active={active === SHIFT_EVENTS.length}>
              <ClosingCard />
            </li>
          </ol>
        </div>
      </div>
    </section>
  )
}

/*  La consola del turno: reloj, regla, contadores y plano, al paso de la alerta activa */
function ShiftConsole({ activeIndex }: { activeIndex: number }) {
  const closed = activeIndex >= SHIFT_EVENTS.length
  const current: ShiftEvent | undefined = SHIFT_EVENTS[activeIndex]
  const seen = SHIFT_EVENTS.slice(0, Math.min(activeIndex + 1, SHIFT_EVENTS.length))
  const minute = closed ? SHIFT_MINUTES : (current?.minute ?? 0)
  const counters = [
    { label: 'Alertas', value: seen.length },
    { label: 'Demoras', value: seen.filter(event => event.family === 'demoras').length },
    { label: 'Devoluciones', value: seen.filter(event => event.family === 'comida').length },
    { label: 'Validadas', value: seen.length },
  ]

  return (
    <div data-ui className='rounded-3xl border border-[#ece5d5] bg-white p-6 shadow-[0_30px_60px_-44px_rgba(47,42,30,0.55)]'>
      <div className='flex items-center justify-between gap-3'>
        <p className='font-semibold text-[#2f2a1e]'>Sucursal de ejemplo</p>
        <p className='inline-flex items-center gap-2 text-sm text-[#564e40]'>
          <span className={`h-2 w-2 rounded-full ${closed ? 'bg-[#88847f]' : 'landing-live-dot bg-[#29c50c]'}`} aria-hidden='true' />
          {closed ? 'Turno cerrado' : 'Turno diurno'}
        </p>
      </div>
      <p className='mt-0.5 text-sm text-[#564e40]'>Lunes 24 de agosto de 2026</p>

      <p key={closed ? SHIFT_END : current?.time} className='pb-tick mt-5 font-plex-mono text-[4.25rem] font-semibold leading-none tracking-[-0.04em] text-[#2f2a1e]' aria-live='polite'>
        {closed ? SHIFT_END : current?.time}
      </p>

      <div className='relative mt-5'>
        <div className='h-2 overflow-hidden rounded-full bg-[#f4f2ee]'>
          <div className='h-full rounded-full bg-[#29c50c] transition-[width] duration-700 ease-out' style={{ width: `${(minute / SHIFT_MINUTES) * 100}%` }} />
        </div>
        {SHIFT_EVENTS.map((event, index) => (
          <span
            key={event.id}
            className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white transition-transform duration-300 ${index === activeIndex ? 'scale-125' : ''}`}
            style={{ left: `${(event.minute / SHIFT_MINUTES) * 100}%`, background: index <= activeIndex ? FAMILIES[event.family].color : '#ddd3bd' }}
            aria-hidden='true'
          />
        ))}
      </div>
      <div className='mt-2 flex justify-between font-plex-mono text-[11px] text-[#564e40]' aria-hidden='true'>
        {HOURS.map(hour => (
          <span key={hour}>{hour}</span>
        ))}
      </div>

      <dl className='mt-6 grid grid-cols-4 gap-2'>
        {counters.map(counter => (
          <div key={counter.label} className='rounded-xl bg-[#fbf8f0] px-3 py-2.5'>
            <dt className='text-xs text-[#564e40]'>{counter.label}</dt>
            <dd key={counter.value} className='pb-tick text-2xl font-semibold tabular-nums text-[#2f2a1e]'>
              {counter.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className='mt-6'>
        <FloorPlan events={SHIFT_EVENTS} activeIndex={closed ? SHIFT_EVENTS.length : activeIndex} />
      </div>
      <p className='mt-2 text-xs text-[#564e40]'>
        {SHIFT_START} a {SHIFT_END} · el anillo marca dónde pasó la alerta
      </p>
    </div>
  )
}

/*  Una alerta del turno, como llega: sus fotos, su tiempo y su validación */
function EventCard({ event }: { event: ShiftEvent }) {
  const family = FAMILIES[event.family]
  const columns = event.steps.length === 1 ? 'max-w-[560px]' : 'grid-cols-2'

  return (
    <article className='pb-card w-full rounded-3xl border border-[#ece5d5] bg-white p-5 shadow-[0_30px_60px_-46px_rgba(47,42,30,0.6)] sm:p-7'>
      <header className='flex flex-wrap items-center gap-2'>
        <span className='rounded-full bg-[#2f2a1e] px-3 py-1 font-plex-mono text-sm font-semibold text-white'>{event.time}</span>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-[#fbf8f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#2f2a1e] ring-1 ring-[#ece5d5]'>
          <span className='h-2 w-2 rounded-full' style={{ background: family.color }} aria-hidden='true' />
          {family.label}
        </span>
        <span className='text-sm text-[#564e40]'>{event.place}</span>
      </header>
      <h3 className='mt-4 text-[1.55rem] font-semibold leading-tight tracking-[-0.02em] text-[#2f2a1e]'>{event.title}</h3>
      <p className='mt-2 text-[1.02rem] leading-relaxed text-[#564e40]'>{event.detail}</p>

      <div className={`mt-5 grid gap-3 ${columns}`}>
        {event.steps.map((step, index) => (
          <StepPhoto key={step.caption + step.time} step={step} previous={event.steps[index - 1]} image={stepImage(step, event.family, event.markLabel)} />
        ))}
      </div>

      {event.measure && <MeasureBar measure={event.measure} color={family.color} />}

      <footer className='mt-5 flex flex-wrap gap-2 text-sm'>
        <span className='inline-flex items-center gap-1.5 rounded-full bg-[#f2fbee] px-3 py-1.5 font-medium text-[#177406] ring-1 ring-[#29c50c]/40'>
          <svg viewBox='0 0 16 16' width='14' height='14' aria-hidden='true'>
            <path d='M3.5 8.5l3 3 6-6.5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
          </svg>
          {event.validation}
        </span>
        <span className='inline-flex items-center rounded-full bg-[#fbf8f0] px-3 py-1.5 font-medium text-[#2f2a1e] ring-1 ring-[#ece5d5]'>Ya en tu muro</span>
      </footer>
    </article>
  )
}

/*  Una foto de la secuencia, con su nombre, su hora y lo que pasó desde la anterior */
function StepPhoto({ step, previous, image }: { step: PhotoStep; previous?: PhotoStep; image: string }) {
  return (
    <figure>
      <img src={image} alt={`${step.caption}, ${step.time}`} loading='lazy' decoding='async' className='aspect-[16/10] w-full rounded-xl bg-[#ebe9e4] object-cover' />
      <figcaption className='mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2 text-sm'>
        <span className='font-semibold text-[#2f2a1e]'>{step.caption}</span>
        <span className='font-plex-mono text-xs text-[#564e40]'>
          {step.time}
          {previous ? ` · +${elapsed(previous.time, step.time)}` : ''}
        </span>
      </figcaption>
    </figure>
  )
}

/*  El tiempo medido, en una barra, con la marca del umbral del local si la alerta lo tiene */
function MeasureBar({ measure, color }: { measure: Measure; color: string }) {
  const scale = Math.max(measure.minutes, measure.thresholdMinutes ?? 0) * 1.15
  return (
    <div className='mt-5 rounded-2xl bg-[#fbf8f0] p-4'>
      <div className='flex items-baseline justify-between gap-3'>
        <p className='text-sm text-[#564e40]'>Tiempo medido</p>
        <p className='font-plex-mono text-lg font-semibold text-[#2f2a1e]'>{measure.label}</p>
      </div>
      <div className='relative mt-3 h-3 rounded-full bg-[#ece5d5]'>
        <div className='h-full rounded-full' style={{ width: `${(measure.minutes / scale) * 100}%`, background: color }} />
        {measure.thresholdMinutes !== undefined && (
          <span className='absolute -top-1.5 h-6 w-[3px] -translate-x-1/2 rounded-full bg-[#2f2a1e]' style={{ left: `${(measure.thresholdMinutes / scale) * 100}%` }} aria-hidden='true' />
        )}
      </div>
      {measure.thresholdLabel && <p className='mt-2 text-sm text-[#564e40]'>La raya es el {measure.thresholdLabel}: pasarla cuenta como demora.</p>}
    </div>
  )
}

/*  El cierre del turno: lo que entra al informe */
function ClosingCard() {
  const counts = FAMILY_ORDER.map(family => ({ family, count: SHIFT_EVENTS.filter(event => event.family === family).length })).filter(entry => entry.count > 0)
  return (
    <article className='pb-card w-full rounded-3xl border border-[#ddd3bd] bg-[#f7f2e4] p-5 sm:p-7'>
      <header className='flex flex-wrap items-center gap-2'>
        <span className='rounded-full bg-[#2f2a1e] px-3 py-1 font-plex-mono text-sm font-semibold text-white'>{SHIFT_END}</span>
        <span className='text-sm font-semibold text-[#2f2a1e]'>Cierre del turno</span>
      </header>
      <h3 className='mt-4 text-[1.55rem] font-semibold leading-tight tracking-[-0.02em] text-[#2f2a1e]'>El turno cierra con su informe</h3>
      <p className='mt-2 text-[1.02rem] leading-relaxed text-[#564e40]'>
        Las {SHIFT_EVENTS.length} alertas, con sus fotos y sus tiempos, entran al informe del turno diurno y cuentan en el semanal.
      </p>
      <div data-ui className='mt-6 rounded-xl bg-white p-5 shadow-[0_18px_36px_-26px_rgba(47,42,30,0.5)] ring-1 ring-[#ece5d5]'>
        <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a5a28]'>Informe del turno</p>
        <p className='mt-1 font-semibold text-[#2f2a1e]'>Lunes 24 · turno diurno · Sucursal de ejemplo</p>
        <div className='mt-3 h-[3px] rounded-full bg-[linear-gradient(90deg,#29c50c,#d9a441_55%,#b5763b)]' aria-hidden='true' />
        <ul className='mt-4 grid gap-2 sm:grid-cols-2'>
          {counts.map(entry => (
            <li key={entry.family} className='flex items-center justify-between gap-3 rounded-lg bg-[#fbf8f0] px-3 py-2'>
              <span className='inline-flex items-center gap-2 text-sm text-[#2f2a1e]'>
                <span className='h-2.5 w-2.5 rounded-full' style={{ background: FAMILIES[entry.family].color }} aria-hidden='true' />
                {FAMILIES[entry.family].label}
              </span>
              <span className='font-semibold tabular-nums text-[#2f2a1e]'>{entry.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
