import type { CSSProperties, ReactNode, RefObject } from 'react'
import type { SceneSlot } from '../../hook/useThreeScene'
import SiteBar from '../SiteBar'
import AlertFeed from '../coverFloor/AlertFeed'
import WeekChartTable from '../coverWeek/WeekChartTable'
import HeroSlides from '../heroSlides/HeroSlides'
import { AMAZONAS, AMAZONAS_DELAY_COLORS, AMAZONAS_DELAY_KINDS, AMAZONAS_NIGHT, DEMO_WEEK } from '../landing.content'
import { enterDelay } from '../enterDelay'
import type { HeroSlots } from './heroExtras/heroTimeline'

/*  PORTADA D, SALA Y SEMANA (las portadas A y B juntas, con los colores de Amazonas). Es la de la ruta raíz '/'.
 *
 *  Un solo hero de una pantalla, en los colores del modo oscuro del portal (AMAZONAS_NIGHT, pedido del usuario: solo
 *  el hero; las secciones de abajo siguen en blanco), el verde de la marca en los detalles, y en IBM Plex.
 *  Texto en cinco columnas a la izquierda, sin botón: el acceso es «Iniciar sesión», en la barra. Debajo, la leyenda
 *  partida en dos: lo que se enciende en la sala y lo que miden las barras de la semana. En las seis columnas de la
 *  derecha, un carrusel de tres escenas 3D sobre un escenario marfil (heroSlides/HeroSlides, pedido del usuario): la
 *  sala y la semana (liveWeekScene), las hojas del informe y todas las sucursales, 10 segundos cada una. Sobre la
 *  primera, una sola tarjeta flotante: las novedades en vivo y, al pie, el resumen de la semana. El escenario va corrido
 *  96 px hacia el centro de la página y la tarjeta va pegada al borde derecho (pedido del usuario). Por debajo de 1024
 *  la tarjeta se esconde, como toda pieza flotante (taste-skill). Las escenas no llevan botón de pausa (pedido del
 *  usuario; con movimiento reducido ya salen quietas), pero el carrusel sí: avanza solo, y eso hay que poder pararlo.
 *  En '/' lleva debajo, dentro del mismo <main>, las secciones de la portada (children) y el pie (footer).
 *  Solo pinta: la primera escena, la vuelta de las novedades y la referencia del <main> llegan del controlador.
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
  // onLiveActive = «avisa al controlador de si la escena de la sala se ve en el carrusel, para pararla si no»
  onLiveActive?: (active: boolean) => void
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

// HERO_BACKGROUND = «el fondo del hero» (pedido del usuario: más oscuro, con el color del modo oscuro, solo aquí).
// La página de noche del portal, con un halo algo más claro detrás del escenario de las escenas y, arriba a la derecha,
// un velo suave del verde de la marca. Ocupa todo el ancho, también bajo la barra del sitio, que va encima sin fondo
// propio. Las secciones de abajo empiezan en blanco, con su borde: un degradado de la tinta al blanco saldría pardo.
const HERO_BACKGROUND: CSSProperties = {
  backgroundColor: AMAZONAS_NIGHT.page,
  backgroundImage: [
    'radial-gradient(38% 46% at 86% 12%, rgba(41, 197, 12, 0.11) 0%, rgba(41, 197, 12, 0) 72%)',
    `radial-gradient(56% 64% at 70% 52%, ${AMAZONAS_NIGHT.soft} 0%, rgba(47, 42, 33, 0) 74%)`,
  ].join(', '),
}

// HERO_TEXT = «la letra del hero y su anillo de foco, en marfil, para que se vean sobre el fondo oscuro»
const HERO_TEXT = { color: AMAZONAS_NIGHT.ink, ['--focus-ring' as string]: AMAZONAS_NIGHT.ink } as CSSProperties

// LEGEND_EDGE = «el canto marfil de los puntos de la leyenda»: la entrega es de tinta y sin él no se vería en el hero
const LEGEND_EDGE = '0 0 0 1px rgba(245, 240, 227, 0.45)'

// HERO_DOTS_MASK, HERO_DOTS = «la retícula de puntos del escenario, también en el fondo»: se ve alrededor del
// escenario y se desvanece antes de llegar al texto y al pie
const HERO_DOTS_MASK = 'radial-gradient(46% 58% at 70% 50%, #000 0%, rgba(0, 0, 0, 0.35) 55%, transparent 85%)'
const HERO_DOTS: CSSProperties = {
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245, 240, 227, 0.09) 1px, transparent 1.6px)',
  backgroundSize: '22px 22px',
  maskImage: HERO_DOTS_MASK,
  WebkitMaskImage: HERO_DOTS_MASK,
}

export default function CoverLiveWeek({ scene, alertCycle, mainRef, children = null, footer = null, extras = {}, onLiveActive }: CoverLiveWeekProps) {
  return (
    <div className='relative min-h-dvh font-plex' style={ROOT_STYLE}>
      {/* la barra va sobre el hero oscuro: su letra en marfil (el envoltorio no se posiciona, así que no la mueve) */}
      <div style={HERO_TEXT}>
        <SiteBar tone='dark' overlay />
      </div>
      <main id='contenido' ref={mainRef} className='landing-moments'>
        <div className='relative' style={{ ...HERO_BACKGROUND, ...HERO_TEXT }}>
          <div className='pointer-events-none absolute inset-0 hidden lg:block' style={HERO_DOTS} aria-hidden='true' />
          <section
            aria-labelledby='cover-live-week-title'
            className={`relative mx-auto grid w-full max-w-[1288px] items-center gap-6 px-6 pb-24 pt-[88px] lg:min-h-svh lg:grid-cols-12 lg:pt-[72px] ${extras.bottom ? 'lg:pb-24' : 'lg:pb-8'}`}
          >
            <div className='lg:col-span-5'>
              {extras.top}
              <p className='landing-enter text-sm font-semibold' style={{ color: AMAZONAS_NIGHT.green }}>
                Portal de clientes de Jarvis365
              </p>
              <h1
                id='cover-live-week-title'
                className='landing-enter mt-4 text-[clamp(2.4rem,4.2vw,3.85rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-balance'
                style={enterDelay(70)}
              >
                Analítica de restaurantes, del turno a la semana.
              </h1>
              <p className='landing-enter mt-6 max-w-[33rem] text-[1.075rem] leading-relaxed text-pretty' style={{ ...enterDelay(140), color: AMAZONAS_NIGHT.muted }}>
                Nuestros operadores siguen tus restaurantes por cámara y anotan en el momento cada demora, cada devolución
                y cada novedad. El semanal junta todos los turnos y avisa si faltó alguno.
              </p>

              <div className='landing-enter mt-10 grid gap-5 sm:grid-cols-[auto_1fr] sm:gap-x-6' style={enterDelay(210)}>
                <p className='text-xs font-semibold uppercase tracking-[0.12em]' style={{ color: AMAZONAS_NIGHT.muted }}>En la sala</p>
                <ul className='flex flex-wrap gap-x-4 gap-y-2 text-sm' aria-label='Las cinco demoras que se encienden en la sala'>
                  {AMAZONAS_DELAY_KINDS.map(entry => (
                    <li key={entry.kind} className='inline-flex items-center gap-2'>
                      <span className='h-2.5 w-2.5 rounded-full' style={{ background: entry.color, boxShadow: LEGEND_EDGE }} aria-hidden='true' />
                      {entry.label}
                    </li>
                  ))}
                </ul>
                <p className='text-xs font-semibold uppercase tracking-[0.12em]' style={{ color: AMAZONAS_NIGHT.muted }}>En la semana</p>
                <ul className='flex flex-wrap gap-x-4 gap-y-2 text-sm' aria-label='Qué miden las barras de la semana'>
                  {WEEK_LEGEND.map(entry => (
                    <li key={entry.label} className='inline-flex items-center gap-2'>
                      <span className='h-2.5 w-2.5 rounded-[2px]' style={{ background: entry.color, boxShadow: LEGEND_EDGE }} aria-hidden='true' />
                      {entry.label}
                    </li>
                  ))}
                </ul>
              </div>
              {extras.belowText}
            </div>

            <div className='landing-enter relative h-[44vh] min-h-[300px] lg:col-span-6 lg:col-start-7 lg:h-[min(80vh,740px)]' style={enterDelay(120)}>
              <WeekChartTable />
              <HeroSlides
                liveScene={scene}
                onLiveActive={onLiveActive}
                // la tarjeta es blanca: su letra en la tinta, no en el marfil del hero
                liveOverlay={
                  <AlertFeed
                    cycle={alertCycle}
                    rows={2}
                    delayColors={AMAZONAS_DELAY_COLORS}
                    liveColor={AMAZONAS.green}
                    rowClassName='bg-[#fbf8f0]'
                    className='landing-enter absolute bottom-4 right-0 hidden w-[300px] text-[#2f2a1e] lg:block'
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
