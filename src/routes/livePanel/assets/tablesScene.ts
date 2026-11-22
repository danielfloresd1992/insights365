import * as THREE from 'three'
import type { SceneFactory } from '@/routes/landing/hook/useThreeScene'
import { DELAY_COLORS, PALETTE } from '@/routes/landing/assets/landing.content'
import { FLOOR_RESTING_SECONDS, buildFloor, type FloorPalette } from '@/routes/landing/assets/three/floorModel'
import { disposeTree, orbitPosition } from '@/routes/landing/assets/three/sceneKit'

/*  LA SALA DEL VISOR DE MESAS (Panel en vivo, de momento una muestra)
 *
 *  La misma maqueta de la portada (floorModel: nueve mesas, la cocina con su pase, la cava y la barra, y alertas que
 *  se levantan sobre las mesas con el color de su demora), en isométrico y meciéndose apenas. Dos vestidos: claro,
 *  con la tierra de los informes, y oscuro, con la tinta del portal. Es una sala de ejemplo: cuando el visor exista,
 *  la forma saldrá del croquis de cada local.
 */

// VIEW_HEIGHT, VIEW_MIN_WIDTH = «cuánto de la sala cabe en vertical, y el ancho que tiene que caber siempre»
const VIEW_HEIGHT = 15
const VIEW_MIN_WIDTH = 20.5

// LIGHT_FLOOR = «la sala en claro: marfil, madera clara, chocolate y ocre» (la de la portada)
const LIGHT_FLOOR: FloorPalette = {
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

// DARK_FLOOR = «la sala en oscuro: el suelo y las paredes en la tinta del portal, la madera más honda»
const DARK_FLOOR: FloorPalette = {
  floor: '#2f2a21',
  joints: '#3a342a',
  wall: '#3d372c',
  tableTop: '#5a4d38',
  tableLeg: '#1c1913',
  chair: '#7d6243',
  counter: '#4a4336',
  steel: '#6b665c',
  plate: '#e6dcc6',
  barBody: '#5a3622',
  barTop: '#7d5638',
  shelf: '#3d2616',
  bottles: [PALETTE.ochre, '#4f8f38', PALETTE.clay, '#e6dcc6', PALETTE.orange],
  pot: PALETTE.clay,
  foliage: '#5d7448',
  delayColors: DELAY_COLORS,
}

type Lighting = { sky: string; ground: string; skyIntensity: number; sun: string; sunIntensity: number; exposure: number }

// makeTablesScene = «la escena con un vestido y una luz»
function makeTablesScene(palette: FloorPalette, light: Lighting): SceneFactory {
  return (renderer, width, height) => {
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = light.exposure

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 140)
    const target = new THREE.Vector3(0.2, 0.2, 0.2)

    // Un cielo y un sol bajo por la izquierda, que tira las sombras hacia el fondo de la sala
    scene.add(new THREE.HemisphereLight(light.sky, light.ground, light.skyIntensity))
    const sun = new THREE.DirectionalLight(light.sun, light.sunIntensity)
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

    const floor = buildFloor(scene, palette)

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
        // La sala se mece apenas: unos ocho grados a cada lado en unos cuarenta segundos
        const azimuth = Math.PI / 4 + Math.sin(elapsed * 0.16) * 0.14
        camera.position.copy(orbitPosition(target, 40, azimuth, 0.6))
        camera.lookAt(target)
        renderer.render(scene, camera)
      },
      resize,
      dispose: () => disposeTree(scene),
    }
  }
}

export const createTablesSceneLight = makeTablesScene(LIGHT_FLOOR, {
  sky: '#fffaf0',
  ground: '#d8c8a6',
  skyIntensity: 1.7,
  sun: '#fff1d6',
  sunIntensity: 2.3,
  exposure: 1.02,
})

export const createTablesSceneDark = makeTablesScene(DARK_FLOOR, {
  sky: '#f5ead2',
  ground: '#2a251c',
  skyIntensity: 1.1,
  sun: '#ffe2b0',
  sunIntensity: 1.9,
  exposure: 0.95,
})
