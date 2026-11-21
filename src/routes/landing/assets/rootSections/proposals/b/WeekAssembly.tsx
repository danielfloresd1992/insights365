import { useRef, useState } from 'react'
import { useInView } from '../../../../hook/useInView'
import { clamp01, useScrollFrame } from '../../../../hook/useScrollFrame'
import { useStillScene } from '../../../../hook/useStillScene'
import { DEMO_WEEK } from '../../../landing.content'
import CountUp from '../CountUp'
import { ShiftIcon } from '../a/reportCharts'

/*  LA SEMANA SE JUNTA (propuesta B, segunda sección)
 *
 *  Los catorce turnos de la semana de ejemplo, cada uno en su ficha con su desviación (demoras de preparación sobre
 *  procesos evaluados) y un color según lo alta que sea. Al llegar con el scroll, las fichas vienen sueltas y se
 *  colocan en su sitio, día por día y turno por turno. Debajo, las cifras de la semana. Un botón enseña qué pasa si
 *  falta un turno: la ficha queda vacía, las cifras se hacen con los trece que llegaron y el aviso lo dice, como hace
 *  el semanal en su portada y en el cuadro general. Solo pinta.
 */

// MISSING_TILE = «el turno que falta en el ejemplo de cobertura incompleta: sábado nocturno»
const MISSING_TILE = 'Sáb-night'

// TILES = «los catorce turnos, con sus procesos, sus demoras de preparación y su desviación»
const TILES = DEMO_WEEK.days.flatMap((day, dayIndex) =>
  (['day', 'night'] as const).map(shift => {
    const processes = DEMO_WEEK.processes[shift][dayIndex]
    const delays = DEMO_WEEK.prepDelays[shift][dayIndex]
    return { id: `${day}-${shift}`, day, dayIndex, shift, processes, delays, pct: (delays / processes) * 100 }
  }),
)

// heat = «el color de una ficha según su desviación: verde por debajo del 5%, ocre hasta el 10, cobre hasta el 20 y
// rojo por encima»
function heat(pct: number) {
  if (pct < 5) return { background: '#f2fbee', accent: '#29c50c' }
  if (pct < 10) return { background: '#fbf5e3', accent: '#d9a441' }
  if (pct < 20) return { background: '#f8ead9', accent: '#b5763b' }
  return { background: '#fae3e0', accent: '#d03b3b' }
}

// HEAT_LEGEND = «la leyenda de los colores»
const HEAT_LEGEND = [
  { label: 'Menos del 5%', pct: 0 },
  { label: '5 a 10%', pct: 7 },
  { label: '10 a 20%', pct: 15 },
  { label: 'Más del 20%', pct: 25 },
]

export default function WeekAssembly() {
  const still = useStillScene()
  const gridRef = useRef<HTMLDivElement>(null)
  const { ref: statsRef, inView: statsIn } = useInView<HTMLDListElement>(0.4)
  // missing = «se enseña la semana con un turno de menos»
  const [missing, setMissing] = useState(false)

  useScrollFrame(
    gridRef,
    (box, viewportHeight) => {
      const grid = gridRef.current
      if (!grid) return
      const progress = clamp01((viewportHeight - box.top) / (viewportHeight * 0.75))
      grid.querySelectorAll<HTMLElement>('[data-tile]').forEach(tile => {
        const index = Number(tile.dataset.tile)
        const order = (index * 5) % TILES.length
        const local = clamp01((progress - order * 0.022) / 0.6)
        const settle = 1 - Math.pow(1 - local, 3)
        const away = 1 - settle
        if (local >= 1) {
          tile.style.transform = ''
          tile.style.opacity = ''
          return
        }
        const shiftX = (((index * 73) % 11) - 5) * 46 * away
        const shiftY = (140 + ((index * 41) % 7) * 30) * away
        const turn = (((index * 29) % 9) - 4) * 6 * away
        tile.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, 0) rotate(${turn.toFixed(1)}deg)`
        tile.style.opacity = (0.25 + 0.75 * settle).toFixed(3)
      })
    },
    !still,
  )

  const counted = TILES.filter(tile => !(missing && tile.id === MISSING_TILE))
  const processes = counted.reduce((total, tile) => total + tile.processes, 0)
  const delays = counted.reduce((total, tile) => total + tile.delays, 0)

  return (
    <section aria-labelledby='pb-week-title' className='bg-[#fbf8f0]'>
      <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
        <div className='grid gap-6 lg:grid-cols-12 lg:items-end'>
          <div className='lg:col-span-7'>
            <p className='text-sm font-semibold text-[#177406]'>El semanal</p>
            <h2 id='pb-week-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
              Catorce turnos, una semana
            </h2>
            <p className='mt-5 max-w-[34rem] text-[1.075rem] leading-relaxed text-[#564e40] text-pretty'>
              Cada turno cierra con su informe. El semanal junta los catorce de la semana de ejemplo y, si falta alguno, lo
              dice en vez de callarlo.
            </p>
          </div>
          <div className='lg:col-span-5 lg:justify-self-end'>
            <div role='group' aria-label='Qué semana enseñar' className='inline-flex rounded-full bg-white p-1 ring-1 ring-[#ddd3bd]'>
              {[
                { value: false, label: 'Semana completa' },
                { value: true, label: 'Si falta un turno' },
              ].map(option => (
                <button
                  key={option.label}
                  type='button'
                  aria-pressed={missing === option.value}
                  onClick={() => setMissing(option.value)}
                  className={`landing-button h-11 rounded-full px-5 text-sm font-semibold ${missing === option.value ? 'bg-[#2f2a1e] text-white' : 'text-[#2f2a1e] hover:bg-black/[0.05]'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div ref={gridRef} className='mt-12 grid grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5 sm:gap-2.5'>
          <span aria-hidden='true' />
          {DEMO_WEEK.days.map(day => (
            <span key={day} className='pb-1 text-center text-xs font-semibold text-[#564e40] sm:text-sm'>
              {day}
            </span>
          ))}
          {(['day', 'night'] as const).map(shift => (
            <div key={shift} className='contents'>
              <span className='flex items-center gap-1.5 pr-1 text-sm font-medium text-[#564e40] sm:pr-3'>
                <ShiftIcon shift={shift} />
                <span className='hidden sm:inline'>{shift === 'day' ? 'Diurno' : 'Nocturno'}</span>
              </span>
              {TILES.filter(tile => tile.shift === shift).map(tile => {
                const index = TILES.indexOf(tile)
                const isMissing = missing && tile.id === MISSING_TILE
                const colors = heat(tile.pct)
                const label = `${tile.day}, turno ${shift === 'day' ? 'diurno' : 'nocturno'}`
                return (
                  <div
                    key={tile.id}
                    data-tile={index}
                    className={`pb-tile relative flex aspect-[4/5] flex-col justify-between rounded-xl p-1.5 sm:aspect-[5/4] sm:p-3 ${isMissing ? 'border-2 border-dashed border-[#d9a441] bg-white' : ''}`}
                    style={isMissing ? undefined : { background: colors.background, boxShadow: `inset 0 -3px 0 ${colors.accent}` }}
                    aria-label={isMissing ? `${label}: sin informe` : `${label}: ${tile.pct.toFixed(1)}% de desviación, ${tile.delays} de ${tile.processes} procesos con demora`}
                    role='img'
                  >
                    {isMissing ? (
                      <span className='m-auto text-center text-[10px] font-semibold leading-tight text-[#7d621b] sm:text-sm'>Sin informe</span>
                    ) : (
                      <>
                        <span className='text-[11px] font-semibold tabular-nums text-[#2f2a1e] sm:text-xl sm:tracking-[-0.02em]'>{tile.pct.toFixed(1)}%</span>
                        <span className='hidden text-xs tabular-nums text-[#564e40] sm:block'>
                          {tile.delays} de {tile.processes}
                        </span>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <ul className='mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#564e40]'>
          {HEAT_LEGEND.map(entry => (
            <li key={entry.label} className='inline-flex items-center gap-2'>
              <span className='h-3 w-3 rounded-[4px]' style={{ background: heat(entry.pct).background, boxShadow: `inset 0 -2px 0 ${heat(entry.pct).accent}` }} aria-hidden='true' />
              {entry.label}
            </li>
          ))}
          <li className='text-[#564e40]'>· Demoras de preparación sobre procesos evaluados</li>
        </ul>

        <div
          role='status'
          className={`mt-10 flex items-start gap-3 rounded-2xl px-5 py-4 ring-1 ${missing ? 'bg-[#fbf5e3] text-[#7d621b] ring-[#d9a441]/60' : 'bg-[#f2fbee] text-[#177406] ring-[#29c50c]/40'}`}
        >
          <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${missing ? 'bg-[#d9a441] text-[#2f2a1e]' : 'bg-[#29c50c] text-[#2f2a1e]'}`} aria-hidden='true'>
            {missing ? '!' : '✓'}
          </span>
          <p className='font-medium'>
            {missing
              ? 'Falta 1 turno: sábado nocturno. El semanal lo dice en la portada y en el cuadro general, y sus cifras son de los 13 turnos que llegaron.'
              : 'Llegaron los 14 turnos de la semana: el informe está completo.'}
          </p>
        </div>

        <dl ref={statsRef} className='mt-8 grid grid-cols-2 gap-6 border-t border-[#ddd3bd] pt-8 lg:grid-cols-4'>
          {[
            { label: `de ${DEMO_WEEK.shiftsExpected} turnos llegaron`, value: counted.length, decimals: 0, suffix: '' },
            { label: 'procesos evaluados', value: processes, decimals: 0, suffix: '' },
            { label: 'con demora de preparación', value: delays, decimals: 0, suffix: '' },
            { label: 'de desviación en la semana', value: (delays / processes) * 100, decimals: 1, suffix: '%' },
          ].map(stat => (
            <div key={stat.label} className='flex flex-col-reverse justify-end'>
              <dt className='mt-2 text-[#564e40]'>{stat.label}</dt>
              <dd className='text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-[#2f2a1e]'>
                <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} active={statsIn} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
