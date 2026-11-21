import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SceneFactory } from '../../hook/useThreeScene'
import { AMAZONAS, AMAZONAS_DELAY_COLORS, DEMO_WEEK } from '../landing.content'
import { FLOOR_DEPTH, FLOOR_RESTING_SECONDS, buildFloor, type FloorPalette } from '../three/floorModel'
import { buildWeekBars, type WeekBarsPalette } from '../three/weekBarsModel'
import { disposeTree, orbitPosition } from '../three/sceneKit'

/*  SALA Y SEMANA, PORTADA D
 *
 *  Las portadas A y B en una sola escena, con los colores de Amazonas (la paleta de la casa). Delante, la sala en maqueta (floorModel)
 *  con sus novedades encendiéndose mesa por mesa. Detrás de su pared del fondo, sobre una tarima, las barras de la
 *  semana (weekBarsModel): lo que pasa en cada turno se suma en la semana. El remate cobre de las barras cuenta las
 *  demoras de preparación, que en la sala se encienden en cobre sobre la cocina.
 *
 *  Vista casi de frente, bajo una luz blanca y cálida. Al cargar caen los muebles y crecen las barras; luego la escena
 *  solo se mece un poco de lado a lado.
 */

// VIEW_HEIGHT, VIEW_MIN_WIDTH = «lo que tiene que caber en vertical y a lo ancho: la sala delante y la semana detrás,
// con margen. Medido en proyección con la cámara de AZIMUTH: de -8,8 a 8,7 a lo ancho y de -3,7 a 11,3 a lo alto»
const VIEW_HEIGHT = 16.5
const VIEW_MIN_WIDTH = 19
// AZIMUTH = «hacia dónde mira la cámara: casi de frente, desde la izquierda, girada 8 grados, para que la semana quede
// encima de la sala y la escena llene una columna alta. En diagonal, a 45 grados, sería demasiado ancha y quedaría
// pequeña»
const AZIMUTH = -0.14
// WEEK_Z = «a qué distancia detrás del centro de la sala va la tarima de la semana»
const WEEK_Z = -FLOOR_DEPTH / 2 - 3.6
// STAGE_HEIGHT = «el alto de la tarima: lo justo para que los nombres de los días asomen por encima de la pared»
const STAGE_HEIGHT = 1.3
// DAY_SPACING, ROW_OFFSET, BAR_WIDTH = «la forma de las barras: separación entre días, entre filas y su grueso»
const DAY_SPACING = 1.95
const ROW_OFFSET = 0.8
const BAR_WIDTH = 1.05

// FLOOR_AMAZONAS = «la sala con los colores de la casa: suelo gris claro, paredes y mesas blancas, sillas marfil y la
// barra en verde, el único mueble con el color de la marca»
const FLOOR_AMAZONAS: FloorPalette = {
  floor: AMAZONAS.grayPanel,
  joints: AMAZONAS.grayRule,
  wall: AMAZONAS.white,
  tableTop: AMAZONAS.white,
  tableLeg: AMAZONAS.ink,
  chair: AMAZONAS.rule2,
  counter: AMAZONAS.graySunk,
  steel: AMAZONAS.grayRule,
  plate: AMAZONAS.white,
  barBody: AMAZONAS.greenBar,
  barTop: AMAZONAS.green,
  shelf: AMAZONAS.ink,
  bottles: [AMAZONAS.ochre, AMAZONAS.green, AMAZONAS.copper, AMAZONAS.white, AMAZONAS.greenBar],
  pot: AMAZONAS.copper,
  foliage: '#3f8f3a',
  delayColors: AMAZONAS_DELAY_COLORS,
}

// BARS_AMAZONAS = «las barras con los colores de la casa: diurno en el verde de la marca, nocturno en su verde
// oscuro y las demoras en cobre»
const BARS_AMAZONAS: WeekBarsPalette = {
  day: AMAZONAS.green,
  night: AMAZONAS.greenBar,
  cap: AMAZONAS.copper,
  capEmissive: AMAZONAS.copper,
  capEmissiveIntensity: 0.1,
  countLabel: AMAZONAS.ochreText,
  dayLabel: AMAZONAS.inkSoft,
}

export const createLiveWeekScene: SceneFactory = (renderer, width, height) => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160)
  // target = «el punto al que mira la cámara: el que cae en el centro de la sala más la semana, en proyección»
  const target = new THREE.Vector3(0.705, 1.15, -5)

  /* La luz: un cielo blanco con suelo marfil y un sol por la izquierda, que tira las sombras hacia atrás */
  scene.add(new THREE.HemisphereLight('#ffffff', '#e9e4d8', 1.8))
  const sun = new THREE.DirectionalLight('#ffffff', 2.2)
  sun.position.set(-8, 18, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -17
  sun.shadow.camera.right = 17
  sun.shadow.camera.top = 17
  sun.shadow.camera.bottom = -17
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 60
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 5
  scene.add(sun)

  /* Delante, la sala, en espejo: las mesas a la derecha y la barra a la izquierda, que es donde flota la tarjeta de
     novedades; así la tarjeta tapa la barra y no las mesas. La semana no va en espejo: se lee de lunes a domingo */
  const room = new THREE.Group()
  room.scale.x = -1
  scene.add(room)
  const floor = buildFloor(room, FLOOR_AMAZONAS)

  /* Detrás, la tarima con la semana */
  const week = new THREE.Group()
  week.position.set(0, 0, WEEK_Z)
  scene.add(week)
  const stageWidth = DEMO_WEEK.days.length * DAY_SPACING + 0.9
  const stageDepth = ROW_OFFSET * 2 + BAR_WIDTH + 2.6
  const stage = new THREE.Mesh(
    new RoundedBoxGeometry(stageWidth, STAGE_HEIGHT, stageDepth, 3, 0.12),
    new THREE.MeshStandardMaterial({ color: AMAZONAS.ivory, roughness: 0.8 }),
  )
  stage.position.set(0, STAGE_HEIGHT / 2, 0.55)
  stage.castShadow = true
  stage.receiveShadow = true
  week.add(stage)
  // Un filo verde en el borde de la tarima: el verde de la marca, en una tira fina
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(stageWidth - 0.3, 0.06, 0.06),
    new THREE.MeshStandardMaterial({ color: AMAZONAS.green, emissive: AMAZONAS.green, emissiveIntensity: 0.2 }),
  )
  edge.position.set(0, STAGE_HEIGHT + 0.03, 0.55 + stageDepth / 2 - 0.12)
  week.add(edge)

  const bars = buildWeekBars(week, BARS_AMAZONAS, {
    daySpacing: DAY_SPACING,
    rowOffset: ROW_OFFSET,
    barWidth: BAR_WIDTH,
    maxBarHeight: 5.2,
    baseY: STAGE_HEIGHT,
    labelFamily: '"IBM Plex Mono", ui-monospace, monospace',
    countLabelHeight: 0.52,
    dayLabelHeight: 0.5,
    startDelay: 0.6,
  })

  const resize = (nextWidth: number, nextHeight: number) => {
    const aspect = nextWidth / nextHeight
    const viewHeight = Math.max(VIEW_HEIGHT, VIEW_MIN_WIDTH / aspect)
    camera.left = (-viewHeight * aspect) / 2
    camera.right = (viewHeight * aspect) / 2
    camera.top = viewHeight / 2
    camera.bottom = -viewHeight / 2
    camera.updateProjectionMatrix()
  }
  resize(width, height)

  return {
    restingSeconds: Math.max(FLOOR_RESTING_SECONDS, bars.restingSeconds),
    renderFrame: elapsed => {
      floor.update(elapsed)
      bars.update(elapsed)
      // La escena se mece apenas: tres grados y medio a cada lado en unos cuarenta segundos
      const azimuth = AZIMUTH + Math.sin(elapsed * 0.16) * 0.06
      camera.position.copy(orbitPosition(target, 50, azimuth, 0.6))
      camera.lookAt(target)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => disposeTree(scene),
  }
}
