import type { ReactNode } from 'react'
import { useInView } from '../../../../hook/useInView'
import { DEMO_WEEK } from '../../../landing.content'
import CountUp from '../CountUp'
import { DelayPctChart, DelaysByDishChart, PercentRing, ProcessesChart, ShiftIcon } from './reportCharts'
import { CHART_COLORS } from './chartColors'

/*  TU SEMANA, CIFRA POR CIFRA (propuesta A, primera sección)
 *
 *  Sobre marfil: arriba, en una tira, cómo llega cada cifra (se detecta, se valida, te llega, se cuenta); debajo, en
 *  un mosaico de tarjetas blancas, lo que trae el informe semanal con las cifras reales de la semana de ejemplo:
 *  demoras por día y por plato, el porcentaje por día, el cuadro general, los toques del gerente, la desviación por
 *  categoría, la cobertura de turnos y los procesos evaluados. Las gráficas se arman al llegar a ellas. Solo pinta.
 */

// PROCESS_STEPS = «el recorrido de una alerta hasta el informe, en cuatro pasos»
const PROCESS_STEPS = [
  { title: 'Se detecta', text: 'El operador la ve por cámara y la anota con su foto.' },
  { title: 'Se valida', text: 'Alguien del equipo la revisa: la aprueba o la rechaza.' },
  { title: 'Te llega', text: 'Sale en tu muro de alertas, con la foto y la mesa.' },
  { title: 'Se cuenta', text: 'Entra al informe del turno y al semanal.' },
]

// DISH_DEVIATION = «la desviación de cada categoría de plato: procesos con demora sobre procesos evaluados, de la
// tabla de métrica del semanal»
const DISH_DEVIATION = DEMO_WEEK.metric.map((row, index) => {
  const processes = Number(row.processes)
  const delays = Number(row.delays)
  const [hours, minutes, seconds] = row.average.split(':').map(Number)
  return {
    dish: row.dish,
    processes,
    delays,
    pct: (delays / processes) * 100,
    average: `${hours * 60 + minutes} min ${seconds} s`,
    color: index === 0 ? CHART_COLORS.lunch : CHART_COLORS.mainCourse,
  }
})

// DEVIATION_SCALE = «hasta qué porcentaje llega la barra entera»
const DEVIATION_SCALE = 30

type TileProps = {
  // sheet = «de qué hoja del semanal sale»
  sheet: string
  title: string
  className?: string
  children: ReactNode
}

function Tile({ sheet, title, className = '', children }: TileProps) {
  return (
    <article className={`pa-tile flex min-w-0 flex-col rounded-[22px] border border-[#ece5d5] bg-white p-5 sm:p-6 ${className}`}>
      <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a5a28]'>{sheet}</p>
      <h3 className='mt-1 text-lg font-semibold tracking-[-0.01em] text-[#2f2a1e]'>{title}</h3>
      {children}
    </article>
  )
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className='mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-sm text-[#564e40]'>
      {items.map(item => (
        <li key={item.label} className='inline-flex items-center gap-2'>
          <span className='h-2.5 w-2.5 rounded-[3px]' style={{ background: item.color }} aria-hidden='true' />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export default function ReportBento() {
  const { ref: stripRef, inView: stripIn } = useInView<HTMLOListElement>(0.2)
  const { ref: gridRef, inView: gridIn } = useInView<HTMLDivElement>(0.12)
  const coverage = DEMO_WEEK.days.flatMap(day => [
    { day, shift: 'day' as const },
    { day, shift: 'night' as const },
  ])

  return (
    <section aria-labelledby='pa-report-title' className='bg-[#fbf8f0]'>
      <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
        <div className='grid gap-6 lg:grid-cols-12 lg:items-end'>
          <div className='lg:col-span-7'>
            <p className='text-sm font-semibold text-[#177406]'>El informe semanal</p>
            <h2 id='pa-report-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
              Tu semana, cifra por cifra
            </h2>
          </div>
          <p className='text-[1.075rem] leading-relaxed text-[#564e40] text-pretty lg:col-span-5'>
            Una semana real de una sucursal, del 24 al 30 de agosto de 2026: catorce turnos de catorce. Son las gráficas y
            las tablas del semanal, con el nombre del restaurante quitado.
          </p>
        </div>

        <ol ref={stripRef} data-in={stripIn} className='pa-steps relative mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          <span className='pa-steps__line absolute left-5 right-[12%] top-5 hidden h-[2px] bg-[#29c50c] lg:block' aria-hidden='true' />
          {PROCESS_STEPS.map((step, index) => (
            <li key={step.title} className='pa-fade relative' style={{ ['--delay' as string]: `${0.15 + index * 0.18}s` }}>
              <span className='relative grid h-10 w-10 place-items-center rounded-full border-2 border-[#29c50c] bg-white text-sm font-bold text-[#2f2a1e]'>
                {index + 1}
              </span>
              <p className='mt-3 font-semibold text-[#2f2a1e]'>{step.title}</p>
              <p className='mt-1 max-w-[16rem] text-[#564e40]'>{step.text}</p>
            </li>
          ))}
        </ol>

        <div ref={gridRef} data-in={gridIn} className='mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12'>
          <Tile sheet='Hoja de demoras' title='Cantidad de demoras por día' className='sm:col-span-2 lg:col-span-7'>
            <div className='-mx-1 mt-4 overflow-x-auto px-1'>
              <div className='min-w-[480px]'>
                <DelaysByDishChart />
              </div>
            </div>
            <Legend
              items={[
                { label: 'Lunch', color: CHART_COLORS.lunch },
                { label: 'Plato fuerte', color: CHART_COLORS.mainCourse },
              ]}
            />
          </Tile>

          <Tile sheet='Hoja de porcentajes' title='Porcentaje de demoras por día' className='sm:col-span-2 lg:col-span-5'>
            <div className='-mx-1 mt-4 overflow-x-auto px-1'>
              <div className='min-w-[380px]'>
                <DelayPctChart />
              </div>
            </div>
            <p className='mt-auto pt-3 text-sm text-[#564e40]'>Demoras de preparación sobre los procesos de cada día.</p>
          </Tile>

          <Tile sheet='Hoja 2' title='Cuadro general' className='sm:col-span-2 lg:col-span-5'>
            <table className='mt-4 w-full text-left text-sm'>
              <thead>
                <tr className='border-b border-[#ece5d5] text-[11px] uppercase tracking-[0.1em] text-[#564e40]'>
                  <th scope='col' className='py-2 pr-2 font-semibold'>
                    <span className='sr-only'>Concepto</span>
                  </th>
                  <th scope='col' className='py-2 pr-2 text-right font-semibold'>
                    Diurno
                  </th>
                  <th scope='col' className='py-2 pr-2 text-right font-semibold'>
                    Nocturno
                  </th>
                  <th scope='col' className='py-2 text-right font-semibold'>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {DEMO_WEEK.summary.map((row, index) => (
                  <tr key={row.label} className='pa-fade border-b border-[#f4f2ee] last:border-0' style={{ ['--delay' as string]: `${0.1 + index * 0.08}s` }}>
                    <th scope='row' className='py-2.5 pr-3 font-medium text-[#2f2a1e]'>
                      {row.label}
                    </th>
                    <td className='py-2.5 pr-2 text-right tabular-nums text-[#564e40]'>{row.day}</td>
                    <td className='py-2.5 pr-2 text-right tabular-nums text-[#564e40]'>{row.night}</td>
                    <td className='py-2.5 text-right font-semibold tabular-nums text-[#2f2a1e]'>{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Tile>

          <Tile sheet='Hoja de toques' title='Toques del gerente' className='lg:col-span-3'>
            <div className='mt-4 grid grid-cols-2 gap-3'>
              <figure className='flex flex-col items-center text-center'>
                <PercentRing value={DEMO_WEEK.touches.first} color={CHART_COLORS.mainCourse} label='Primeros toques sobre las rotaciones' />
                <figcaption className='mt-2 text-sm leading-snug text-[#564e40]'>Primeros, sobre las rotaciones</figcaption>
              </figure>
              <figure className='flex flex-col items-center text-center'>
                <PercentRing value={DEMO_WEEK.touches.others} color={CHART_COLORS.lunch} label='Otros toques sobre los primeros' />
                <figcaption className='mt-2 text-sm leading-snug text-[#564e40]'>Otros, sobre los primeros</figcaption>
              </figure>
            </div>
            <p className='mt-auto pt-3 text-sm text-[#564e40]'>Los otros se miden sobre los primeros: pueden pasar del 100%.</p>
          </Tile>

          <Tile sheet='Tabla de métrica' title='Desviación por categoría' className='lg:col-span-4'>
            <ul className='mt-5 grid gap-5'>
              {DISH_DEVIATION.map((row, index) => (
                <li key={row.dish}>
                  <div className='flex items-baseline justify-between gap-3'>
                    <p className='font-semibold text-[#2f2a1e]'>{row.dish}</p>
                    <p className='text-xl font-semibold tabular-nums text-[#2f2a1e]'>
                      <CountUp value={row.pct} decimals={1} suffix='%' active={gridIn} />
                    </p>
                  </div>
                  <div className='mt-2 h-2.5 overflow-hidden rounded-full bg-[#f4f2ee]'>
                    <div
                      className='pa-grow h-full rounded-full'
                      style={{ width: `${(row.pct / DEVIATION_SCALE) * 100}%`, background: row.color, ['--delay' as string]: `${0.2 + index * 0.15}s` }}
                    />
                  </div>
                  <p className='mt-2 text-sm text-[#564e40]'>
                    {row.delays} de {row.processes} procesos con demora · {row.average} de media
                  </p>
                </li>
              ))}
            </ul>
          </Tile>

          <Tile sheet='Portada' title='Cobertura de la semana' className='sm:col-span-2 lg:col-span-4'>
            <p className='mt-3 text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-[#2f2a1e]'>
              <CountUp value={DEMO_WEEK.shiftsFound} active={gridIn} />
              <span className='text-[1.25rem] font-medium text-[#564e40]'> de {DEMO_WEEK.shiftsExpected} turnos</span>
            </p>
            <ul className='mt-4 grid grid-cols-7 gap-1.5' aria-label='Turnos de la semana que llegaron'>
              {coverage.map((entry, index) => (
                <li
                  key={`${entry.day}-${entry.shift}`}
                  className='pa-pop grid aspect-square place-items-center rounded-lg bg-[#f2fbee] text-[#177406] ring-1 ring-[#29c50c]/40'
                  style={{ ['--delay' as string]: `${0.1 + (index % 2) * 0.35 + Math.floor(index / 2) * 0.06}s`, gridRow: entry.shift === 'day' ? 1 : 2 }}
                  title={`${entry.day}, turno ${entry.shift === 'day' ? 'diurno' : 'nocturno'}`}
                >
                  <ShiftIcon shift={entry.shift} />
                  <span className='sr-only'>
                    {entry.day}, turno {entry.shift === 'day' ? 'diurno' : 'nocturno'}: llegó
                  </span>
                </li>
              ))}
            </ul>
            <div className='mt-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-[#564e40]' aria-hidden='true'>
              {DEMO_WEEK.days.map(day => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <p className='mt-4 inline-flex items-center gap-2 self-start rounded-full bg-[#f2fbee] px-3 py-1.5 text-sm font-medium text-[#177406] ring-1 ring-[#29c50c]/40'>
              <svg viewBox='0 0 16 16' width='14' height='14' aria-hidden='true'>
                <path d='M3.5 8.5l3 3 6-6.5' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' />
              </svg>
              No faltó ningún turno
            </p>
            <p className='mt-auto pt-3 text-sm text-[#564e40]'>Si falta un turno, el semanal lo dice en la portada y en el cuadro general.</p>
          </Tile>

          <Tile sheet='Tabla de métrica' title='Procesos evaluados' className='sm:col-span-2 lg:col-span-8'>
            <dl className='mt-3 grid grid-cols-3 gap-4'>
              <div>
                <dt className='text-sm text-[#564e40]'>Procesos evaluados</dt>
                <dd className='text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[#2f2a1e]'>
                  <CountUp value={Number(DEMO_WEEK.metricTotal.processes)} active={gridIn} />
                </dd>
              </div>
              <div>
                <dt className='text-sm text-[#564e40]'>Con demora de preparación</dt>
                <dd className='text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[#2f2a1e]'>
                  <CountUp value={Number(DEMO_WEEK.metricTotal.delays)} active={gridIn} />
                </dd>
              </div>
              <div>
                <dt className='text-sm text-[#564e40]'>Desviación de la semana</dt>
                <dd className='text-[2rem] font-semibold leading-tight tracking-[-0.02em] text-[#bf3330]'>
                  <CountUp value={Number.parseFloat(DEMO_WEEK.metricTotal.delayPct)} suffix='%' active={gridIn} />
                </dd>
              </div>
            </dl>
            <div className='-mx-1 mt-4 overflow-x-auto px-1'>
              <div className='min-w-[480px]'>
                <ProcessesChart />
              </div>
            </div>
            <Legend
              items={[
                { label: 'Turno diurno', color: CHART_COLORS.dayShift },
                { label: 'Turno nocturno', color: CHART_COLORS.nightShift },
              ]}
            />
          </Tile>
        </div>
      </div>
    </section>
  )
}
