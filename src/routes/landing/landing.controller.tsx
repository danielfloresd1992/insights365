import { useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useThreeScene, type SceneFactory } from './hook/useThreeScene'
import { useCycleIndex } from './hook/useCycleIndex'
import { useDocumentTitle } from './hook/useDocumentTitle'
import { useMoments } from './hook/useMoments'
import LandingIndex from './assets/LandingIndex'
import PrototypeSwitcher from './assets/PrototypeSwitcher'
import CoverFloor from './assets/coverFloor/CoverFloor'
import CoverWeek from './assets/coverWeek/CoverWeek'
import CoverReport from './assets/coverReport/CoverReport'
import CoverLiveWeek from './assets/coverLiveWeek/CoverLiveWeek'
import RootSections from './assets/rootSections/RootSections'
import SiteFooter from './assets/rootSections/SiteFooter'
import PreviewSwitcher from './assets/rootSections/PreviewSwitcher'
import { buildHeroExtras } from './assets/coverLiveWeek/heroExtras/buildHeroExtras'
import { createFloorScene } from './assets/coverFloor/floorScene'
import { createWeekScene } from './assets/coverWeek/weekScene'
import { createReportScene } from './assets/coverReport/reportScene'
import { createLiveWeekScene } from './assets/coverLiveWeek/liveWeekScene'
import {
  CARDS_VARIANTS,
  COVERS,
  FLOOR_ALERT_SECONDS,
  FLOOR_ALERT_START_SECONDS,
  SECTIONS_VARIANTS,
  isCardsVariant,
  isCoverId,
  isSectionsVariant,
  type CardsVariant,
  type CoverId,
  type SectionsVariant,
} from './assets/landing.content'

/*  LAS PORTADAS DE PRUEBA (/portadas y /portadas/:variant)
 *
 *  Los prototipos de la página principal, para elegir uno (D junta A y B con los colores de Amazonas365). El controlador monta la escena 3D del prototipo abierto,
 *  lleva la pausa y el reloj de las novedades, y lo reparte; las portadas solo pintan. Sin letra, o con una que no
 *  existe, enseña la página que los reúne. La elegida, D, se sirve también en la ruta raíz '/' (RootLanding).
 */

// SCENES = «la escena 3D de cada prototipo»
const SCENES: Record<CoverId, SceneFactory> = {
  a: createFloorScene,
  b: createWeekScene,
  c: createReportScene,
  d: createLiveWeekScene,
}

// HOME_COVER = «la portada elegida para la ruta raíz '/'»
const HOME_COVER: CoverId = 'd'

/*  La ruta raíz: la portada elegida, sola, sin el selector de prototipos */
export function RootLanding() {
  return <LandingController fixedCover={HOME_COVER} />
}

type LandingControllerProps = {
  // fixedCover = «una portada fija, para la ruta raíz; sin ella, la portada sale de la dirección (/portadas/a…)»
  fixedCover?: CoverId
}

export default function LandingController({ fixedCover }: LandingControllerProps) {
  const { variant } = useParams()
  const cover = fixedCover ?? (isCoverId(variant) ? variant : null)
  // pausedCover = «qué prototipo se pausó; al cambiar de prototipo deja de coincidir y el nuevo arranca en marcha»
  const [pausedCover, setPausedCover] = useState<CoverId | null>(null)
  const paused = cover !== null && pausedCover === cover

  const scene = useThreeScene(cover ? SCENES[cover] : null, paused)
  const alertCycle = useCycleIndex(scene.clockRef, FLOOR_ALERT_SECONDS, FLOOR_ALERT_START_SECONDS, cover === 'a' || cover === 'd')
  const coverName = COVERS.find(entry => entry.id === cover)?.name
  useDocumentTitle(fixedCover ? 'insights365 · La analítica de tus restaurantes' : coverName ? `${coverName} · insights365` : 'Portadas · insights365')

  // cardsParam, sectionsParam = «las opciones pedidas en la dirección (?tarjetas y ?secciones, a, b o c);
  // sin ellas va la A de cada una y no sale el selector, que es solo para comparar»
  const [searchParams, setSearchParams] = useSearchParams()
  const cardsParam = searchParams.get('tarjetas')
  const sectionsParam = searchParams.get('secciones')
  const cardsVariant: CardsVariant = isCardsVariant(cardsParam) ? cardsParam : 'a'
  const sectionsVariant: SectionsVariant = isSectionsVariant(sectionsParam) ? sectionsParam : 'a'
  // Cambia una opción y conserva la otra
  const selectOption = (param: 'tarjetas' | 'secciones', value: string) =>
    setSearchParams(
      previous => {
        const next = new URLSearchParams(previous)
        next.set(param, value)
        return next
      },
      { replace: true, preventScrollReset: true },
    )
  const switcherGroups = [
    { label: 'Tarjetas', options: CARDS_VARIANTS, active: cardsVariant, onSelect: (id: string) => selectOption('tarjetas', id) },
    { label: 'Secciones', options: SECTIONS_VARIANTS, active: sectionsVariant, onSelect: (id: string) => selectOption('secciones', id) },
  ]

  // mainRef = «el <main> de la portada de '/', donde se montan los momentos de sus secciones; al cambiar de
  // propuesta de secciones se vuelven a montar, porque cambian las secciones que los llevan»
  const mainRef = useRef<HTMLElement>(null)
  const withSections = fixedCover !== undefined
  useMoments(mainRef, withSections, sectionsVariant)

  const sceneSlot = { containerRef: scene.containerRef, ready: scene.ready, failed: scene.failed }
  const motion = {
    paused,
    still: scene.still,
    onToggle: () => setPausedCover(current => (current === cover ? null : cover)),
  }

  return (
    <>
      {cover === 'a' && <CoverFloor scene={sceneSlot} motion={motion} alertCycle={alertCycle} />}
      {cover === 'b' && <CoverWeek scene={sceneSlot} motion={motion} />}
      {cover === 'c' && <CoverReport scene={sceneSlot} motion={motion} />}
      {cover === 'd' && (
        <CoverLiveWeek
          scene={sceneSlot}
          alertCycle={alertCycle}
          mainRef={mainRef}
          footer={withSections ? <SiteFooter /> : null}
          extras={withSections ? buildHeroExtras(alertCycle) : undefined}
        >
          {withSections ? <RootSections cardsVariant={cardsVariant} sectionsVariant={sectionsVariant} /> : null}
        </CoverLiveWeek>
      )}
      {cover === null && <LandingIndex />}
      {!fixedCover && <PrototypeSwitcher />}
      {withSections && (cardsParam !== null || sectionsParam !== null) && <PreviewSwitcher groups={switcherGroups} />}
    </>
  )
}
