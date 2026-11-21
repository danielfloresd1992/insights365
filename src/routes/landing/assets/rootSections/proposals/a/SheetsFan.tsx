import { useRef, useState } from 'react'
import { clamp01, useScrollFrame } from '../../../../hook/useScrollFrame'
import { useStillScene } from '../../../../hook/useStillScene'
import SheetCanvas from '../../SheetCanvas'

/*  LAS HOJAS DEL PDF, EN ABANICO (propuesta A, segunda sección)
 *
 *  La sección se queda fija mientras se hace scroll: las cinco hojas del semanal (las mismas que dibuja la portada C,
 *  con las cifras de la semana de ejemplo) empiezan apiladas, se abren en abanico y luego se adelantan una a una;
 *  a la izquierda se marca la hoja que está delante. En el teléfono o con movimiento reducido no se fija: las hojas
 *  van en fila, para pasarlas con el dedo. Solo pinta; el movimiento sale de useScrollFrame.
 */

// SHEETS = «las hojas, en el orden del PDF, con lo que enseña cada una»
const SHEETS = [
  { name: 'Portada', label: 'La portada: la sucursal, la semana y los turnos que llegaron' },
  { name: 'Tabla de métrica', label: 'Procesos, tiempo medio y demoras por categoría de plato' },
  { name: 'Demoras por día', label: 'Cuántas demoras hubo cada día, por categoría de plato' },
  { name: 'Porcentaje por día', label: 'Qué parte de los procesos de cada día acabó en demora' },
  { name: 'Toques de gerente', label: 'Primeros toques sobre las rotaciones y otros toques sobre los primeros' },
]

// FAN_OPEN = «qué parte del tramo fijo tarda el abanico en abrirse; el resto es para adelantar las hojas»
const FAN_OPEN = 0.3

export default function SheetsFan() {
  const sectionRef = useRef<HTMLElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const still = useStillScene()
  // active = «la hoja que está delante»
  const [active, setActive] = useState(0)

  useScrollFrame(
    sectionRef,
    (box, viewportHeight) => {
      const stage = stageRef.current
      if (!stage) return
      const progress = clamp01(-box.top / Math.max(1, box.height - viewportHeight))
      const spread = 1 - Math.pow(1 - clamp01(progress / FAN_OPEN), 3)
      const focus = clamp01((progress - FAN_OPEN) / (1 - FAN_OPEN - 0.08)) * (SHEETS.length - 1)
      const middle = (SHEETS.length - 1) / 2
      stage.style.transform = `rotateX(${(12 * spread).toFixed(2)}deg)`
      Array.from(stage.children).forEach((child, index) => {
        const offset = index - middle
        const closeness = Math.max(0, 1 - Math.abs(index - focus))
        const angle = offset * 7 * spread * (1 - 0.75 * closeness)
        // La que se adelanta se acerca también al centro, para que no se salga por el borde
        const shiftX = offset * 92 * spread * (1 - 0.55 * closeness)
        const shiftY = Math.abs(offset) * 26 * spread - 34 * closeness * spread
        // Apiladas, la portada queda arriba: cada hoja un poco más honda que la anterior
        const depth = -Math.abs(offset) * 34 * spread + 120 * closeness * spread + (SHEETS.length - 1 - index) * 1.5
        ;(child as HTMLElement).style.transform = `translate3d(${shiftX.toFixed(1)}px, ${shiftY.toFixed(1)}px, ${depth.toFixed(1)}px) rotateZ(${angle.toFixed(2)}deg)`
      })
      const nextActive = Math.round(focus)
      setActive(current => (current === nextActive ? current : nextActive))
    },
    !still,
  )

  if (still) {
    return (
      <section aria-labelledby='pa-sheets-title' className='bg-[#f4f2ee]'>
        <div className='mx-auto w-full max-w-[1288px] px-6 py-20'>
          <SheetsIntro activeIndex={null} />
          <ul className='-mx-6 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4'>
            {SHEETS.map(sheet => (
              <li key={sheet.name} className='w-[82vw] max-w-[520px] shrink-0 snap-center'>
                <div className='overflow-hidden rounded-xl bg-white shadow-[0_18px_36px_-24px_rgba(47,42,30,0.5)] ring-1 ring-[#ece5d5] [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full'>
                  <SheetCanvas sheetName={sheet.name} label={sheet.label} />
                </div>
                <p className='mt-3 font-semibold text-[#2f2a1e]'>{sheet.name}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} aria-labelledby='pa-sheets-title' className='relative h-[260vh] bg-[#f4f2ee]'>
      <div className='sticky top-0 flex h-svh items-center overflow-hidden'>
        <div className='mx-auto grid w-full max-w-[1288px] items-center gap-10 px-6 lg:grid-cols-12'>
          <div className='relative z-10 lg:col-span-4'>
            <SheetsIntro activeIndex={active} />
          </div>
          <div className='pa-fan relative h-[min(62vh,560px)] lg:col-span-8'>
            <div ref={stageRef} className='pa-fan__stage absolute inset-0'>
              {SHEETS.map(sheet => (
                <div key={sheet.name} className='pa-fan__sheet [&_canvas]:block [&_canvas]:h-auto [&_canvas]:w-full'>
                  <SheetCanvas sheetName={sheet.name} label={sheet.label} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/*  El texto de la sección y la lista de hojas, con la de delante marcada */
function SheetsIntro({ activeIndex }: { activeIndex: number | null }) {
  return (
    <>
      <p className='text-sm font-semibold text-[#177406]'>En PDF</p>
      <h2 id='pa-sheets-title' className='mt-3 text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
        Del turno a la semana, hoja por hoja
      </h2>
      <p className='mt-5 max-w-[30rem] text-[1.075rem] leading-relaxed text-[#564e40] text-pretty'>
        Cada turno cierra con su informe, y el semanal junta los catorce en un PDF listo para imprimir o reenviar.
      </p>
      <ol className='mt-8 grid gap-1'>
        {SHEETS.map((sheet, index) => {
          const isActive = index === activeIndex
          return (
            <li
              key={sheet.name}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-baseline gap-3 rounded-lg px-3 py-2 transition-colors duration-300 ${isActive ? 'bg-white text-[#2f2a1e] shadow-[0_8px_20px_-14px_rgba(47,42,30,0.5)]' : 'text-[#564e40]'}`}
            >
              <span className='w-5 shrink-0 font-plex-mono text-xs tabular-nums'>{String(index + 1).padStart(2, '0')}</span>
              <span>
                <span className='block font-semibold'>{sheet.name}</span>
                {isActive && <span className='mt-0.5 block text-sm text-[#564e40]'>{sheet.label}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </>
  )
}
