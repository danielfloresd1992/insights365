import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useThreeScene, type SceneSlot } from '../../hook/useThreeScene'
import { useMediaQuery } from '../../hook/useStillScene'
import ScenePoster from '../ScenePoster'
import { AMAZONAS_NIGHT, POSTERS } from '../landing.content'
import { createReportScene } from '../coverReport/reportScene'
import { createBranchesScene } from './branchesScene'
import { SLIDE_SECONDS, useHeroSlider } from './useHeroSlider'
import './heroSlides.css'

/*  LAS ESCENAS DEL HERO DE '/', EN CARRUSEL (pedido del usuario: más escenas 3D, 10 segundos cada una, que se deslicen
 *  de una a otra, y más fondo detrás)
 *
 *  Tres escenas sobre un escenario oscuro (los colores de noche del hero) con retícula de puntos: la sala y la semana (la de siempre), las hojas del
 *  informe (la escena de la portada C) y todas las sucursales unidas a Jarvis365 (branchesScene). Cada una dura
 *  SLIDE_SECONDS y la siguiente entra por la derecha. Arriba, el rótulo de la que se ve. Sin controles (pedido del
 *  usuario: ni botón de pausa ni barras): avanza solo, y con movimiento reducido no avanza y se queda en la primera.
 *  La primera escena la monta el controlador, porque su reloj lleva las novedades de la portada: onLiveActive le dice
 *  cuándo se ve, para que la pare mientras se ven las otras. Las otras dos se montan aquí, cada una a mitad de la
 *  anterior, para que al entrar ya esté lista y no cargar las tres al abrir; fuera de su turno, paradas. Cada vez que
 *  una de ellas entra, vuelve a empezar: se ve cómo se arma. El carrusel se para fuera de pantalla, con la pestaña
 *  oculta y con movimiento reducido. Lo que flota sobre la primera escena (la tarjeta de novedades) se aparta en las otras.
 */
type HeroSlidesProps = {
  liveScene: SceneSlot
  liveOverlay?: ReactNode
  // onLiveActive = «avisa si la primera escena pasa a verse (true) o deja de verse (false)»
  onLiveActive?: (active: boolean) => void
}

// SLIDES = «cada escena con su rótulo»
const SLIDES = [
  { id: 'sala', title: 'La sala y la semana', text: 'Cada demora se enciende en su mesa y suma en las barras de la semana.' },
  { id: 'informe', title: 'Del turno al informe', text: 'Las hojas del informe semanal, con las cifras de cada turno.' },
  { id: 'sucursales', title: 'Todas tus sucursales', text: 'Las novedades de cada local, juntas en un solo panel.' },
] as const

// STAGE_STYLE = «el escenario detrás de las escenas»: una retícula de puntos sobre la superficie de noche, un poco más
// clara arriba, con su canto y una sombra larga que lo despega del fondo del hero
const STAGE_STYLE: CSSProperties = {
  backgroundImage: [
    'radial-gradient(circle at 1px 1px, rgba(245, 240, 227, 0.08) 1px, transparent 1.6px)',
    `linear-gradient(160deg, ${AMAZONAS_NIGHT.soft} 0%, ${AMAZONAS_NIGHT.surface} 55%, #211d16 100%)`,
  ].join(', '),
  backgroundSize: '22px 22px, 100% 100%',
  boxShadow: `inset 0 0 0 1px ${AMAZONAS_NIGHT.line}, inset 0 1px 0 rgba(245, 240, 227, 0.06), 0 48px 90px -50px rgba(0, 0, 0, 0.75)`,
}

// CAPTION_STYLE = «el fondo del rótulo»: la página de noche, algo transparente, con su canto
const CAPTION_STYLE: CSSProperties = { background: 'rgba(28, 25, 19, 0.82)', boxShadow: `inset 0 0 0 1px ${AMAZONAS_NIGHT.line}` }

// SLIDE_MOTION = «cómo se desliza una escena: 700 ms, arrancando y frenando suave; con movimiento reducido, de golpe»
const SLIDE_MOTION = 'transition-transform duration-700 ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none'

// MOUNT_NEXT_MS = «cuándo se monta la escena siguiente: a mitad de la que se ve»
const MOUNT_NEXT_MS = (SLIDE_SECONDS * 1000) / 2

export default function HeroSlides({ liveScene, liveOverlay = null, onLiveActive }: HeroSlidesProps) {
  // Sin WebGL (la primera escena ya lo dice), las sucursales, que no tienen póster, se quitan en vez de enseñar un hueco
  const slides = liveScene.failed ? SLIDES.filter(slide => slide.id !== 'sucursales') : SLIDES
  const slider = useHeroSlider(slides.length)
  const activeId = slides[slider.index].id
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // reached = «hasta qué escena ya se montó». Las que no se ven, paradas: no se dibujan ni les corre el reloj
  const [reached, setReached] = useState(0)
  const report = useThreeScene(reached >= 1 ? createReportScene : null, activeId !== 'informe')
  const branches = useThreeScene(reached >= 2 && slides.length > 2 ? createBranchesScene : null, activeId !== 'sucursales')

  // A mitad de cada escena se monta la siguiente
  useEffect(() => {
    const timer = window.setTimeout(() => setReached(current => Math.max(current, Math.min(slider.index + 1, slides.length - 1))), MOUNT_NEXT_MS)
    return () => window.clearTimeout(timer)
  }, [slider.index, slides.length])

  // Cada vez que entra el informe o las sucursales, su escena empieza otra vez (quieta, se queda en su reposo)
  const { clockRef: reportClockRef, still: reportStill } = report
  const { clockRef: branchesClockRef, still: branchesStill } = branches
  useEffect(() => {
    if (activeId === 'informe' && !reportStill) reportClockRef.current = 0
    if (activeId === 'sucursales' && !branchesStill) branchesClockRef.current = 0
  }, [activeId, reportClockRef, reportStill, branchesClockRef, branchesStill])

  // onScreen, pageShown = «el carrusel se ve, y la pestaña está delante»: si no, no avanza
  const stageRef = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(true)
  const [pageShown, setPageShown] = useState(() => !document.hidden)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const observer = new IntersectionObserver(entries => setOnScreen(entries.some(entry => entry.isIntersecting)), { threshold: 0.35 })
    observer.observe(stage)
    const onVisibility = () => setPageShown(!document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  const running = !reducedMotion && onScreen && pageShown

  // Cada SLIDE_SECONDS, la escena siguiente. Si el carrusel deja de verse, la cuenta vuelve a empezar al volver
  const goNext = useEffectEvent(() => {
    const position = (slider.index + 1) % slides.length
    setReached(current => Math.max(current, position))
    onLiveActive?.(slides[position].id === 'sala')
    slider.go(position)
  })
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(goNext, SLIDE_SECONDS * 1000)
    return () => window.clearTimeout(timer)
  }, [running, slider.index])

  const sceneOf = (id: (typeof SLIDES)[number]['id']) => {
    if (id === 'sala')
      return (
        <>
          <ScenePoster poster={POSTERS.d} ready={liveScene.ready} failed={liveScene.failed} />
          <div ref={liveScene.containerRef} className={`absolute inset-0 ${liveScene.failed ? 'invisible' : ''}`} aria-hidden='true' />
        </>
      )
    const scene = id === 'informe' ? report : branches
    return (
      <>
        {id === 'informe' && report.failed && <ScenePoster poster={POSTERS.c} ready={false} failed />}
        <div ref={scene.containerRef} className={`absolute inset-0 ${scene.failed ? 'invisible' : ''}`} aria-hidden='true' />
      </>
    )
  }

  const active = slides[slider.index]
  const count = slides.length

  return (
    <div role='region' aria-roledescription='carrusel' aria-label='Escenas de ejemplo' className='absolute inset-0'>
      {/* el escenario, corrido hacia el centro de la página (pedido del usuario): se mueve el dibujo, no la columna,
          porque una columna más ancha agranda las escenas (la cámara llena el ancho) */}
      <div ref={stageRef} className='absolute inset-0 overflow-hidden rounded-[28px] lg:-translate-x-24' style={STAGE_STYLE}>
        {slides.map((slide, position) => (
          <div
            key={slide.id}
            role='group'
            aria-roledescription='escena'
            aria-label={`${position + 1} de ${count}: ${slide.title}`}
            inert={position !== slider.index}
            className={`absolute inset-0 ${slider.moving(position) ? SLIDE_MOTION : ''}`}
            style={{ transform: `translateX(${slider.offsetOf(position) * 100}%)` }}
          >
            {sceneOf(slide.id)}
          </div>
        ))}

        {/* el rótulo de la escena que se ve; no se anuncia en cada cambio, para no interrumpir cada 10 s */}
        <div className='pointer-events-none absolute left-4 top-4 max-w-[17rem] sm:left-5 sm:top-5'>
          <div
            key={active.id}
            className='hs-caption rounded-2xl px-3.5 py-2.5 backdrop-blur-sm'
            style={CAPTION_STYLE}
          >
            <p className='font-plex-mono text-[11px] font-medium tabular-nums' style={{ color: AMAZONAS_NIGHT.green }}>
              {String(slider.index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
            <p className='mt-0.5 text-sm font-semibold' style={{ color: AMAZONAS_NIGHT.ink }}>
              {active.title}
            </p>
            <p className='mt-0.5 hidden text-xs leading-snug sm:block' style={{ color: AMAZONAS_NIGHT.muted }}>
              {active.text}
            </p>
          </div>
        </div>

      </div>

      {liveOverlay && (
        <div
          inert={activeId !== 'sala'}
          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${activeId === 'sala' ? 'opacity-100' : 'opacity-0'}`}
        >
          {liveOverlay}
        </div>
      )}
    </div>
  )
}
