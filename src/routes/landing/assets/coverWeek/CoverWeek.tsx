import { Link } from 'react-router'
import type { SceneSlot } from '../../hook/useThreeScene'
import MotionToggle, { type MotionControl } from '../MotionToggle'
import SiteBar from '../SiteBar'
import ScenePoster from '../ScenePoster'
import SummaryCard from './SummaryCard'
import WeekChartTable from './WeekChartTable'
import { PALETTE, POSTERS, PORTAL_PATH } from '../landing.content'
import { enterDelay } from '../enterDelay'

/*  PORTADA B, LA SEMANA EN RELIEVE
 *
 *  Fondo oscuro. En pantallas anchas la gráfica 3D (weekScene) es una capa detrás de todo el hero y se corre a la
 *  derecha; un velo oscuro a la izquierda deja leer el texto, y el cuadro general flota abajo a la derecha. En el
 *  móvil va en columna, texto y luego gráfica, y el cuadro se esconde como toda pieza flotante por debajo de 1024
 *  (taste-skill). Solo pinta.
 */
type CoverWeekProps = {
  scene: SceneSlot
  motion: MotionControl
}

// LEGEND = «qué es cada color de las barras»
const LEGEND = [
  { label: 'Procesos del turno diurno', color: PALETTE.ochre },
  { label: 'Procesos del turno nocturno', color: '#8f4f2c' },
  { label: 'Demoras de preparación', color: '#e8690c' },
]

export default function CoverWeek({ scene: { containerRef, ready, failed }, motion }: CoverWeekProps) {
  return (
    <div className='relative min-h-dvh overflow-hidden font-geist text-[#f4ecdc]' style={{ background: PALETTE.night, ['--focus-ring' as string]: '#f4ecdc' }}>
      <SiteBar tone='dark' overlay />

      <main id='contenido'>
        <section aria-labelledby='cover-week-title' className='relative flex flex-col pb-24 pt-[72px] lg:block lg:min-h-svh lg:pb-0 lg:pt-0'>
          <div className='relative order-2 h-[36vh] min-h-[260px] [mask-image:linear-gradient(to_bottom,transparent,black_14%,black_72%,transparent)] lg:absolute lg:inset-0 lg:h-auto lg:[mask-image:none]'>
            <ScenePoster poster={POSTERS.b} ready={ready} failed={failed} fit='cover' className='object-right' />
            <div ref={containerRef} className={`absolute inset-0 ${failed ? 'invisible' : ''}`} aria-hidden='true' />
            <WeekChartTable />
          </div>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute inset-0 hidden lg:block'
            style={{ background: 'linear-gradient(90deg, #15120d 0%, rgba(21,18,13,0.94) 30%, rgba(21,18,13,0) 56%)' }}
          />

          <div className='relative z-10 order-1 mx-auto w-full max-w-[1288px] px-6 pt-4 lg:flex lg:min-h-svh lg:items-center lg:pb-36 lg:pt-[72px]'>
            <div className='max-w-[33rem]'>
              <p className='landing-enter font-geist-mono text-[13px] tracking-wide text-[#ffb47e]'>Informe semanal · 14 turnos</p>
              <h1
                id='cover-week-title'
                className='landing-enter mt-4 text-[clamp(2.4rem,4.4vw,3.9rem)] font-semibold leading-[1.03] tracking-[-0.04em]'
                style={enterDelay(70)}
              >
                La semana de tu restaurante, de un vistazo.
              </h1>
              <p className='landing-enter mt-6 text-[1.06rem] leading-relaxed text-[#cfc4b1] text-pretty' style={enterDelay(140)}>
                El semanal junta lunes a domingo, diurno y nocturno, y avisa si faltó algún turno. Cada gráfica
                suma lo mismo que su tabla.
              </p>
              <div className='landing-enter mt-8' style={enterDelay(210)}>
                <Link to={PORTAL_PATH} className='landing-button inline-flex h-12 items-center rounded-full bg-[#f4ecdc] px-6 font-semibold text-[#15120d] hover:bg-white'>
                  Entrar al portal
                </Link>
              </div>
              <ul className='landing-enter mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#cfc4b1] lg:mt-10 lg:grid' style={enterDelay(280)}>
                {LEGEND.map(entry => (
                  <li key={entry.label} className='flex items-center gap-2.5'>
                    <span className='h-3 w-3 rounded-[3px]' style={{ background: entry.color }} aria-hidden='true' />
                    {entry.label}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className='relative z-10 order-3 hidden lg:absolute lg:inset-x-0 lg:bottom-10 lg:block'>
            <div className='mx-auto flex w-full max-w-[1288px] items-end justify-end gap-4 px-6'>
              <MotionToggle motion={motion} tone='dark' className='mr-auto' />
              <SummaryCard className='landing-enter' />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
