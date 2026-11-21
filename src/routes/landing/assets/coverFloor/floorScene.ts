import * as THREE from 'three'
import type { SceneFactory } from '../../hook/useThreeScene'
import { DELAY_COLORS, PALETTE } from '../landing.content'
import { FLOOR_RESTING_SECONDS, buildFloor, type FloorPalette } from '../three/floorModel'
import { disposeTree, orbitPosition } from '../three/sceneKit'

/*  LA SALA DE LA PORTADA A
 *
 *  La sala en maqueta (floorModel) vestida con la tierra de los informes, vista en isométrico bajo un sol cálido.
 *  La sala solo se mece un poco de lado a lado.
 */

// VIEW_HEIGHT = «cuánto de la sala cabe en vertical con la cámara isométrica»
const VIEW_HEIGHT = 13.6
// VIEW_MIN_WIDTH = «el ancho que tiene que caber siempre, para que la sala no se corte en pantallas estrechas»
const VIEW_MIN_WIDTH = 20.5

// FLOOR_EARTH = «la sala con los colores de los informes: marfil, madera clara, chocolate y ocre»
const FLOOR_EARTH: FloorPalette = {
  floor: '#efe5cf',
  joints: '#e0d3b6',
  wall: '#f8f2e4',
  tableTop: '#eadbbd',
  tableLeg: '#6b5a45',
  chair: '#c8a476',
  counter: '#e2d7c3',
  steel: '#cdc7bb',
  plate: '#fffdf7',
  barBody: '#7a4a2e',
  barTop: '#a3724c',
  shelf: '#6b4128',
  bottles: [PALETTE.ochre, '#3f7d2a', PALETTE.clay, '#f3ead6', PALETTE.orange],
  pot: PALETTE.clay,
  foliage: '#7d9a62',
  delayColors: DELAY_COLORS,
}

export const createFloorScene: SceneFactory = (renderer, width, height) => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.02

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 140)
  const target = new THREE.Vector3(0.2, 0.2, 0.2)

  /* La luz: un cielo cálido y un sol bajo por la izquierda, que tira las sombras hacia el fondo de la sala */
  scene.add(new THREE.HemisphereLight('#fffaf0', '#d8c8a6', 1.7))
  const sun = new THREE.DirectionalLight('#fff1d6', 2.3)
  sun.position.set(-7, 16, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -13
  sun.shadow.camera.right = 13
  sun.shadow.camera.top = 13
  sun.shadow.camera.bottom = -13
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 50
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 5
  scene.add(sun)

  const floor = buildFloor(scene, FLOOR_EARTH)

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
    restingSeconds: FLOOR_RESTING_SECONDS,
    renderFrame: elapsed => {
      floor.update(elapsed)
      // La sala se mece apenas: ocho grados a cada lado en unos cuarenta segundos
      const azimuth = Math.PI / 4 + Math.sin(elapsed * 0.16) * 0.14
      camera.position.copy(orbitPosition(target, 40, azimuth, 0.6))
      camera.lookAt(target)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => disposeTree(scene),
  }
}
