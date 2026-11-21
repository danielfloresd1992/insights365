import { Link } from 'react-router'
import type { SceneSlot } from '../../hook/useThreeScene'
import MotionToggle, { type MotionControl } from '../MotionToggle'
import SiteBar from '../SiteBar'
import ScenePoster from '../ScenePoster'
import AlertFeed from './AlertFeed'
import { DELAY_KINDS, PALETTE, POSTERS, PORTAL_PATH } from '../landing.content'
import { enterDelay } from '../enterDelay'

/*  PORTADA A, SALA EN VIVO
 *
 *  Un solo hero de una pantalla. Texto en cinco columnas a la izquierda; en las seis de la derecha la sala en 3D (floorScene) con la tarjeta de
 *  novedades flotando sobre su esquina de abajo a la izquierda, que enseña lo mismo que se enciende en la maqueta.
 *  Debajo del botón, las cinco demoras con el color que usan en la sala. Por debajo de 1024 la tarjeta se esconde,
 *  como toda pieza flotante (taste-skill), y en el teléfono la sala va debajo del texto, sola.
 *  Solo pinta: la escena, la pausa y la vuelta de las novedades llegan del controlador.
 */
type CoverFloorProps = {
  scene: SceneSlot
  motion: MotionControl
  alertCycle: number
}

export default function CoverFloor({ scene: { containerRef, ready, failed }, motion, alertCycle }: CoverFloorProps) {
  return (
    <div className='relative min-h-dvh bg-ivory font-familjen text-ink'>
      <SiteBar tone='light' overlay />
      <main id='contenido'>
        <section
          aria-labelledby='cover-floor-title'
          className='mx-auto grid w-full max-w-[1288px] items-center gap-6 px-6 pb-24 pt-[88px] lg:min-h-svh lg:grid-cols-12 lg:pb-8 lg:pt-[72px]'
        >
          <div className='lg:col-span-5'>
            <p className='landing-enter text-sm font-semibold' style={{ color: PALETTE.greenText }}>
              Portal de clientes de Jarvis365
            </p>
            <h1
              id='cover-floor-title'
              className='landing-enter mt-4 text-[clamp(2.4rem,4.4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-balance'
              style={enterDelay(70)}
            >
              La analítica de tus restaurantes, mesa por mesa.
            </h1>
            <p className='landing-enter mt-6 max-w-[33rem] text-[1.075rem] leading-relaxed text-ink-soft text-pretty' style={enterDelay(140)}>
              Nuestros operadores siguen la sala y la cocina por cámara y anotan cada demora en el momento. Aquí lo ves
              por turno y por sucursal, con los umbrales de cada una.
            </p>
            <div className='landing-enter mt-8' style={enterDelay(210)}>
              <Link to={PORTAL_PATH} className='landing-button inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-white hover:bg-[#2f2a1e]'>
                Entrar al portal
              </Link>
            </div>
            <ul className='landing-enter mt-10 flex flex-wrap gap-2' aria-label='Las cinco demoras que se miden' style={enterDelay(280)}>
              {DELAY_KINDS.map(entry => (
                <li key={entry.kind} className='inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ background: entry.color }} aria-hidden='true' />
                  {entry.label}
                </li>
              ))}
            </ul>
          </div>

          <div className='relative h-[34vh] min-h-[240px] lg:col-span-6 lg:col-start-7 lg:h-[min(80vh,720px)]'>
            <ScenePoster poster={POSTERS.a} ready={ready} failed={failed} />
            <div ref={containerRef} className={`absolute inset-0 ${failed ? 'invisible' : ''}`} aria-hidden='true' />
            <AlertFeed cycle={alertCycle} className='landing-enter absolute bottom-6 left-0 hidden w-[330px] lg:block' />
            <MotionToggle motion={motion} tone='light' className='absolute right-0 top-0' />
          </div>
        </section>
      </main>
    </div>
  )
}
