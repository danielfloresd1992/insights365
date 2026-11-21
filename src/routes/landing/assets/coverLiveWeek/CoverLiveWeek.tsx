import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { SceneSlot } from '../../hook/useThreeScene'
import SiteBar from '../SiteBar'
import ScenePoster from '../ScenePoster'
import AlertFeed from '../coverFloor/AlertFeed'
import WeekChartTable from '../coverWeek/WeekChartTable'
import { AMAZONAS, AMAZONAS_DELAY_COLORS, AMAZONAS_DELAY_KINDS, DEMO_WEEK, POSTERS } from '../landing.content'
import { enterDelay } from '../enterDelay'
import type { HeroSlots } from './heroExtras/heroTimeline'

/*  PORTADA D, SALA Y SEMANA (las portadas A y B juntas, con los colores de Amazonas). Es la de la ruta raíz '/'.
 *
 *  Un solo hero de una pantalla, en blanco con grises y marfiles, el verde de la marca en los detalles, y en IBM Plex.
 *  Texto en cinco columnas a la izquierda, sin botón: el acceso es «Iniciar sesión», en la barra. Debajo, la leyenda
 *  partida en dos: lo que se enciende en la sala y lo que miden las barras de la semana. En las seis columnas de la
 *  derecha, la escena (liveWeekScene) con una sola tarjeta flotante: las novedades en vivo y, al pie, el resumen de la
 *  semana. La escena va corrida 96 px hacia el centro de la página y la tarjeta va pegada al borde derecho (pedido del
 *  usuario). Por debajo de 1024 se esconde, como toda pieza flotante (taste-skill). Sin botón de pausa (pedido del
 *  usuario): con movimiento reducido la escena ya sale quieta.
 *  En '/' lleva debajo, dentro del mismo <main>, las secciones de la portada (children) y el pie (footer).
 *  Solo pinta: la escena, la vuelta de las novedades y la referencia del <main> llegan del controlador.
 */
type CoverLiveWeekProps = {
  scene: SceneSlot
  alertCycle: number
  // mainRef = «el <main>, donde el controlador monta los momentos de las secciones»
  mainRef?: RefObject<HTMLElement | null>
  children?: ReactNode
  footer?: ReactNode
  // extras = «lo que añade a la portada la propuesta elegida (?principal), en sus huecos; sin quitar nada»
  extras?: HeroSlots
}

// WEEK_LEGEND = «qué es cada color de las barras de la semana»
const WEEK_LEGEND = [
  { label: 'Procesos diurnos', color: AMAZONAS.green },
  { label: 'Procesos nocturnos', color: AMAZONAS.greenBar },
  { label: 'Demoras de preparación', color: AMAZONAS.copper },
]

// WEEK_STATS = «el resumen de la semana al pie de la tarjeta, con las cifras del cuadro general y de la métrica»
const WEEK_STATS = [
  { value: DEMO_WEEK.summary[0].total, label: 'rotaciones' },
  { value: DEMO_WEEK.metricTotal.processes, label: 'procesos' },
  { value: DEMO_WEEK.metricTotal.delayPct, label: 'con demora' },
]

// ROOT_STYLE = «el blanco de fondo, la tinta y el anillo de foco en tinta»
const ROOT_STYLE = { background: AMAZONAS.white, color: AMAZONAS.ink, ['--focus-ring' as string]: AMAZONAS.ink } as CSSProperties

// IVORY_GLOW = «el marfil del panel, transparente»: el borde del halo, para que se funda sin escalón
const IVORY_GLOW = 'rgba(247, 242, 228, 0)'

// HERO_BACKGROUND = «el fondo del hero» (pedido del usuario: un degradado de marfil claro y blanco). Marfil arriba, que
// se funde en blanco abajo, donde empiezan las secciones (blancas): sin costura. Y detrás de la escena, un halo del
// marfil del panel que le da fondo a la mesa y a las barras. Ocupa todo el ancho, también bajo la barra del sitio, que
// va encima sin fondo propio. La escena 3D y su póster son transparentes: el degradado se ve a través.
const HERO_BACKGROUND: CSSProperties = {
  backgroundImage: [
    `radial-gradient(52% 58% at 74% 50%, ${AMAZONAS.ivoryPanel} 0%, ${IVORY_GLOW} 72%)`,
    `linear-gradient(180deg, ${AMAZONAS.ivory} 0%, #fdfbf6 58%, ${AMAZONAS.white} 100%)`,
  ].join(', '),
}

export default function CoverLiveWeek({ scene: { containerRef, ready, failed }, alertCycle, mainRef, children = null, footer = null, extras = {} }: CoverLiveWeekProps) {
  return (
    <div className='relative min-h-dvh font-plex' style={ROOT_STYLE}>
      <SiteBar tone='light' overlay />
      <main id='contenido' ref={mainRef} className='landing-moments'>
        <div className='relative' style={HERO_BACKGROUND}>
          <section
            aria-labelledby='cover-live-week-title'
            className={`mx-auto grid w-full max-w-[1288px] items-center gap-6 px-6 pb-24 pt-[88px] lg:min-h-svh lg:grid-cols-12 lg:pt-[72px] ${extras.bottom ? 'lg:pb-24' : 'lg:pb-8'}`}
          >
            <div className='lg:col-span-5'>
              {extras.top}
              <p className='landing-enter text-sm font-semibold' style={{ color: AMAZONAS.greenText }}>
                Portal de clientes de Jarvis365
              </p>
              <h1
                id='cover-live-week-title'
                className='landing-enter mt-4 text-[clamp(2.4rem,4.2vw,3.85rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-balance'
                style={enterDelay(70)}
              >
                Analítica de restaurantes, del turno a la semana.
              </h1>
              <p className='landing-enter mt-6 max-w-[33rem] text-[1.075rem] leading-relaxed text-pretty' style={{ ...enterDelay(140), color: AMAZONAS.inkSoft }}>
                Nuestros operadores siguen tus restaurantes por cámara y anotan en el momento cada demora, cada devolución
                y cada novedad. El semanal junta todos los turnos y avisa si faltó alguno.
              </p>

              <div className='landing-enter mt-10 grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-x-6' style={enterDelay(210)}>
                <p className='text-xs font-semibold uppercase tracking-[0.12em]' style={{ color: AMAZONAS.inkSoft }}>En la sala</p>
                <ul className='flex flex-wrap gap-x-4 gap-y-2 text-sm' aria-label='Las cinco demoras que se encienden en la sala'>
                  {AMAZONAS_DELAY_KINDS.map(entry => (
                    <li key={entry.kind} className='inline-flex items-center gap-2'>
                      <span className='h-2.5 w-2.5 rounded-full' style={{ background: entry.color }} aria-hidden='true' />
                      {entry.label}
                    </li>
                  ))}
                </ul>
                <p className='text-xs font-semibold uppercase tracking-[0.12em]' style={{ color: AMAZONAS.inkSoft }}>En la semana</p>
                <ul className='flex flex-wrap gap-x-4 gap-y-2 text-sm' aria-label='Qué miden las barras de la semana'>
                  {WEEK_LEGEND.map(entry => (
                    <li key={entry.label} className='inline-flex items-center gap-2'>
                      <span className='h-2.5 w-2.5 rounded-[2px]' style={{ background: entry.color }} aria-hidden='true' />
                      {entry.label}
                    </li>
                  ))}
                </ul>
              </div>
              {extras.belowText}
            </div>

            <div className='relative h-[40vh] min-h-[280px] lg:col-span-6 lg:col-start-7 lg:h-[min(80vh,740px)]'>
              {/* la escena, corrida hacia el centro de la página (pedido del usuario): se mueve el dibujo, no la
                  columna, porque una columna más ancha agranda la escena (la cámara llena el ancho) */}
              <div className='absolute inset-0 lg:-translate-x-24'>
                <ScenePoster poster={POSTERS.d} ready={ready} failed={failed} />
                <div ref={containerRef} className={`absolute inset-0 ${failed ? 'invisible' : ''}`} aria-hidden='true' />
              </div>
              <WeekChartTable />
              <AlertFeed
                cycle={alertCycle}
                rows={2}
                delayColors={AMAZONAS_DELAY_COLORS}
                liveColor={AMAZONAS.green}
                rowClassName='bg-[#fbf8f0]'
                className='landing-enter absolute bottom-4 right-0 hidden w-[300px] lg:block'
                footer={
                  <div className='mt-4 border-t pt-3' style={{ borderColor: AMAZONAS.rule }}>
                    <p className='text-xs font-semibold uppercase tracking-[0.12em]' style={{ color: AMAZONAS.inkSoft }}>
                      Esta semana · {DEMO_WEEK.shiftsFound} de {DEMO_WEEK.shiftsExpected} turnos
                    </p>
                    <dl className='mt-2 grid grid-cols-3 gap-2'>
                      {WEEK_STATS.map(stat => (
                        <div key={stat.label}>
                          <dt className='sr-only'>{stat.label}</dt>
                          <dd className='font-plex-mono text-lg font-medium tabular-nums' style={{ color: AMAZONAS.ink }}>
                            {stat.value}
                          </dd>
                          <dd className='text-xs' style={{ color: AMAZONAS.inkSoft }} aria-hidden='true'>
                            {stat.label}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                }
              />
              {extras.scene}
            </div>
          </section>
          {extras.bottom && <div className='lg:absolute lg:inset-x-0 lg:bottom-0'>{extras.bottom}</div>}
        </div>
        {children}
      </main>
      {footer}
    </div>
  )
}
