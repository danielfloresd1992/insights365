import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SceneFactory } from '../../hook/useThreeScene'
import { DEMO_WEEK, PALETTE } from '../landing.content'
import { disposeTree, orbitPosition } from '../three/sceneKit'
import { buildWeekBars, type WeekBarsPalette } from '../three/weekBarsModel'

/*  LA SEMANA EN RELIEVE, PORTADA B
 *
 *  Las barras de la semana (weekBarsModel) en ocre, chocolate y naranja sobre un suelo oscuro con retícula; qué fila
 *  es cuál lo dice la leyenda de la portada, y la tabla oculta para lectores de pantalla. Al cargar las barras crecen
 *  día a día; luego la cámara solo se mece. En pantallas anchas la gráfica se corre a la derecha para dejar sitio al
 *  texto.
 */

// DAY_SPACING = «la distancia entre dos días»
const DAY_SPACING = 1.5
// ROW_OFFSET = «a qué distancia del centro va cada fila: nocturno delante, diurno detrás»
const ROW_OFFSET = 0.72
// BAR_WIDTH = «el grueso de una barra»
const BAR_WIDTH = 0.92
// PLINTH_HEIGHT = «el alto de la peana sobre la que se levantan las barras»
const PLINTH_HEIGHT = 0.12
// MAX_BAR_HEIGHT = «lo que mide el turno con más procesos de la semana»
const MAX_BAR_HEIGHT = 3.8
// ELEVATION = «cuánto mira la cámara desde arriba: lo bastante para leer las dos filas sin que las barras parezcan torres»
const ELEVATION = 0.5
// CHART_HALF_WIDTH = «medio ancho de la gráfica con sus rótulos, para que quepa siempre en pantalla»
const CHART_HALF_WIDTH = 6.6
// WIDE_ASPECT, WIDE_MIN_WIDTH = «cuándo la gráfica se corre a la derecha del texto: proporción apaisada y pantalla de
// escritorio; la caja del teléfono también es apaisada, pero allí la gráfica va sola y centrada»
const WIDE_ASPECT = 1.15
const WIDE_MIN_WIDTH = 1024
// WIDE_ZOOM_OUT = «en ancho, cuánto más se aleja la cámara: la gráfica ocupa algo más de la mitad derecha, no todo»
const WIDE_ZOOM_OUT = 2.85
// FIELD_OF_VIEW = «la apertura vertical de la cámara, en grados»
const FIELD_OF_VIEW = 30
// LABEL_FAMILY = «la letra de los rótulos de la escena: la misma mono de la portada»
const LABEL_FAMILY = '"Geist Mono", ui-monospace, monospace'

// BARS_EARTH = «las barras con los colores de los informes: diurno ocre, nocturno chocolate claro y demoras en
// naranja encendido, bien separados entre sí sobre el fondo oscuro»
const BARS_EARTH: WeekBarsPalette = {
  day: '#d9ab45',
  night: '#8f4f2c',
  cap: '#e8690c',
  capEmissive: PALETTE.orange,
  capEmissiveIntensity: 0.45,
  countLabel: '#ffb47e',
  dayLabel: '#bfb39c',
}

export const createWeekScene: SceneFactory = (renderer, width, height) => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.12

  const scene = new THREE.Scene()
  // La niebla tiene el color del fondo de la página: el suelo se funde con él en vez de acabar en un borde
  scene.fog = new THREE.Fog(PALETTE.night, 26, 60)
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, width / height, 0.1, 160)
  const target = new THREE.Vector3(0, 2.0, 0)
  let radius = 17

  scene.add(new THREE.HemisphereLight('#fff1da', '#2a2116', 1.1))
  // Una luz de frente, suave: sin ella el ocre de las caras que miran a la cámara se ensucia hacia el oliva
  const fill = new THREE.DirectionalLight('#fff4e0', 0.9)
  fill.position.set(-2, 5, 14)
  scene.add(fill)
  const key = new THREE.DirectionalLight('#ffe2b8', 2.8)
  key.position.set(4, 13, 9)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -10
  key.shadow.camera.right = 10
  key.shadow.camera.top = 10
  key.shadow.camera.bottom = -10
  key.shadow.camera.near = 1
  key.shadow.camera.far = 40
  key.shadow.bias = -0.0005
  key.shadow.normalBias = 0.03
  key.shadow.radius = 6
  scene.add(key)
  // Un contraluz naranja por detrás, que recorta el canto de las barras contra el fondo oscuro
  const rim = new THREE.DirectionalLight(PALETTE.orange, 0.6)
  rim.position.set(-8, 5, -9)
  scene.add(rim)

  /* El suelo oscuro con su retícula, y la peana */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: '#1a160f', roughness: 0.95 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  const gridPoints: number[] = []
  for (let line = -16; line <= 16; line += 1) {
    const offset = line * (DAY_SPACING / 2)
    gridPoints.push(offset, 0.003, -14, offset, 0.003, 14)
    gridPoints.push(-14, 0.003, offset, 14, 0.003, offset)
  }
  const gridGeometry = new THREE.BufferGeometry()
  gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPoints, 3))
  scene.add(new THREE.LineSegments(gridGeometry, new THREE.LineBasicMaterial({ color: '#2b241a' })))

  const plinth = new THREE.Mesh(
    new RoundedBoxGeometry(DEMO_WEEK.days.length * DAY_SPACING + 0.5, PLINTH_HEIGHT, ROW_OFFSET * 2 + BAR_WIDTH + 0.5, 3, 0.05),
    new THREE.MeshStandardMaterial({ color: '#241e15', roughness: 0.8 }),
  )
  plinth.position.y = PLINTH_HEIGHT / 2
  plinth.receiveShadow = true
  plinth.castShadow = true
  scene.add(plinth)

  /* Las barras */
  const bars = buildWeekBars(scene, BARS_EARTH, {
    daySpacing: DAY_SPACING,
    rowOffset: ROW_OFFSET,
    barWidth: BAR_WIDTH,
    maxBarHeight: MAX_BAR_HEIGHT,
    baseY: PLINTH_HEIGHT,
    labelFamily: LABEL_FAMILY,
    countLabelHeight: 0.42,
    dayLabelHeight: 0.38,
    startDelay: 0.25,
  })

  const resize = (nextWidth: number, nextHeight: number) => {
    const aspect = nextWidth / nextHeight
    camera.aspect = aspect
    const wide = aspect > WIDE_ASPECT && nextWidth >= WIDE_MIN_WIDTH
    // En ancho, el encuadre se agranda por la izquierda: el centro de la gráfica queda a un 66 % del ancho
    if (wide) camera.setViewOffset(nextWidth * 1.32, nextHeight, 0, 0, nextWidth, nextHeight)
    else camera.clearViewOffset()
    const visibleAspect = wide ? aspect * 1.32 : aspect
    const halfHeightPerUnit = Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2))
    const neededHalfWidth = wide ? CHART_HALF_WIDTH * WIDE_ZOOM_OUT : CHART_HALF_WIDTH
    radius = Math.max(16.5, neededHalfWidth / (halfHeightPerUnit * visibleAspect))
    // En ancho la cámara mira por debajo de la gráfica, que así sube y deja abajo sitio al cuadro general
    target.y = wide ? -1.6 : 1.4
    camera.updateProjectionMatrix()
  }
  resize(width, height)

  return {
    restingSeconds: bars.restingSeconds,
    renderFrame: elapsed => {
      bars.update(elapsed)
      const azimuth = -0.52 + Math.sin(elapsed * 0.09) * 0.2
      camera.position.copy(orbitPosition(target, radius, azimuth, ELEVATION))
      camera.lookAt(target)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => disposeTree(scene),
  }
}
