import { Link } from 'react-router'
import type { SceneSlot } from '../../hook/useThreeScene'
import MotionToggle, { type MotionControl } from '../MotionToggle'
import SiteBar from '../SiteBar'
import ScenePoster from '../ScenePoster'
import { BRAND_GRADIENT, PALETTE, POSTERS, PRODUCT_FACTS, PORTAL_PATH } from '../landing.content'
import { enterDelay } from '../enterDelay'

/*  PORTADA C, DEL TURNO AL INFORME
 *
 *  Blanco dominante y el degradado de la marca en una tira arriba. El texto va en dos columnas, título a la izquierda
 *  y explicación a la derecha, y debajo, a todo el ancho, las hojas del semanal en abanico (reportScene). Al pie,
 *  una tira fija con tres datos del producto. Solo pinta.
 */
type CoverReportProps = {
  scene: SceneSlot
  motion: MotionControl
}

export default function CoverReport({ scene: { containerRef, ready, failed }, motion }: CoverReportProps) {
  return (
    <div className='relative min-h-dvh bg-white font-manrope text-ink'>
      <div className='absolute inset-x-0 top-0 z-30 h-1' style={{ background: BRAND_GRADIENT }} aria-hidden='true' />
      <SiteBar tone='light' overlay offsetTop={4} />
      <main id='contenido'>
        <section
          aria-labelledby='cover-report-title'
          className='mx-auto flex w-full max-w-[1288px] flex-col px-6 pb-24 pt-[76px] lg:min-h-svh lg:pb-8'
        >
          <div className='grid gap-6 pt-4 lg:grid-cols-12 lg:items-start lg:pt-10'>
            <div className='lg:col-span-7'>
              <p className='landing-enter text-sm font-bold' style={{ color: PALETTE.greenText }}>
                Informes diarios y semanales
              </p>
              <h1
                id='cover-report-title'
                className='landing-enter mt-4 text-[clamp(2.4rem,4.5vw,3.9rem)] font-extrabold leading-[1.02] tracking-[-0.045em] text-balance'
                style={enterDelay(70)}
              >
                Del turno al informe, sin hoja de cálculo.
              </h1>
            </div>
            <div className='landing-enter lg:col-span-5 lg:col-start-8' style={enterDelay(140)}>
              <p className='text-[1.06rem] leading-relaxed text-ink-soft text-pretty'>
                Cada turno de tu restaurante deja su informe diario con demoras, devoluciones y novedades. El semanal toma
                esos informes, calcula cada hoja del PDF y te dice si faltó algún turno.
              </p>
              <div className='mt-6 flex flex-wrap items-center gap-x-5 gap-y-3'>
                <Link to={PORTAL_PATH} className='landing-button inline-flex h-12 items-center rounded-full bg-ink px-6 font-bold text-white hover:bg-[#2f2a1e]'>
                  Entrar al portal
                </Link>
                <MotionToggle motion={motion} tone='light' />
              </div>
            </div>
          </div>

          <div className='relative mt-2 h-[38vh] min-h-[260px] lg:h-auto lg:min-h-[320px] lg:flex-1'>
            <ScenePoster poster={POSTERS.c} ready={ready} failed={failed} />
            <div ref={containerRef} className={`absolute inset-0 ${failed ? 'invisible' : ''}`} aria-hidden='true' />
          </div>

          {/* La tira fija de tres datos; en el teléfono no cabe en la primera pantalla y se esconde */}
          <ul className='landing-enter hidden gap-4 border-t border-black/10 pt-5 sm:grid sm:grid-cols-3' style={enterDelay(320)}>
            {PRODUCT_FACTS.map(fact => (
              <li key={fact.label} className='flex items-baseline gap-3'>
                <span className='text-2xl font-extrabold tracking-[-0.03em]'>{fact.value}</span>
                <span className='text-sm text-ink-soft'>{fact.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
