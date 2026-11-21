import * as THREE from 'three'
import type { SceneFactory } from '../../hook/useThreeScene'
import { REPORT_SHEETS, SHEET_FONTS, SHEET_HEIGHT, SHEET_WIDTH } from './reportSheets'
import { clamp01, disposeTree, easeOutCubic } from '../three/sceneKit'

/*  DEL TURNO AL INFORME, PORTADA C
 *
 *  Las hojas del informe semanal, de verdad dibujadas, empiezan apiladas sobre la mesa y al cargar se reparten en
 *  abanico, como una mano de cartas, con la portada en el centro. Luego flotan muy despacio. La hoja que tiene el
 *  ratón encima se adelanta y sube un poco, para leerla mejor. La cámara no se mueve.
 */

// PAPER_WIDTH, PAPER_HEIGHT = «el tamaño de una hoja en la escena, con la proporción del PDF (1000 × 700)»
const PAPER_WIDTH = 4.0
const PAPER_HEIGHT = (PAPER_WIDTH * SHEET_HEIGHT) / SHEET_WIDTH
// PAPER_THICKNESS = «el grueso del papel, lo justo para que tenga canto»
const PAPER_THICKNESS = 0.025
// TEXTURE_SCALE = «a cuántos píxeles por píxel de hoja se dibuja cada textura»
const TEXTURE_SCALE = 1.6
// fanSpacing = «la distancia entre dos hojas del abanico: abierto en pantalla ancha, cerrado en una estrecha, para
// que las hojas se vean grandes en las dos»
const fanSpacing = (aspect: number) => (aspect >= 1.8 ? 2.05 : aspect >= 1.2 ? 1.6 : 0.72)
// FAN_MARGIN = «lo que se deja a cada lado del abanico, para la sombra y el vaivén»
const FAN_MARGIN = 0.35
// FIELD_OF_VIEW = «la apertura vertical de la cámara, en grados»
const FIELD_OF_VIEW = 28
// DEAL_SECONDS = «lo que tarda una hoja en ir del montón a su sitio»
const DEAL_SECONDS = 1.15

type Sheet = {
  mesh: THREE.Mesh
  stackPosition: THREE.Vector3
  stackRotation: THREE.Quaternion
  fanPosition: THREE.Vector3
  fanRotation: THREE.Quaternion
  delay: number
  hover: number
}

export const createReportScene: SceneFactory = (renderer, width, height) => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.16

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, width / height, 0.1, 100)
  const lookAt = new THREE.Vector3(0, PAPER_HEIGHT / 2 + 0.5, 0)

  scene.add(new THREE.HemisphereLight('#ffffff', '#efe6d4', 2.1))
  const key = new THREE.DirectionalLight('#fffaf0', 1.5)
  key.position.set(2.5, 11, 8)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -10
  key.shadow.camera.right = 10
  key.shadow.camera.top = 10
  key.shadow.camera.bottom = -10
  key.shadow.camera.near = 1
  key.shadow.camera.far = 40
  key.shadow.bias = -0.0003
  key.shadow.radius = 8
  scene.add(key)

  // El suelo no se ve: solo recoge la sombra de las hojas sobre el blanco de la página
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ color: '#5a4a2e', opacity: 0.14 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)

  /* Las texturas de las hojas: se dibujan ya y otra vez cuando carga la letra (mismo tamaño, misma textura) */
  const anisotropy = renderer.capabilities.getMaxAnisotropy()
  const sheetTextures = REPORT_SHEETS.map(sheet => {
    const canvas = document.createElement('canvas')
    canvas.width = SHEET_WIDTH * TEXTURE_SCALE
    canvas.height = SHEET_HEIGHT * TEXTURE_SCALE
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = anisotropy
    const paint = () => {
      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(TEXTURE_SCALE, 0, 0, TEXTURE_SCALE, 0, 0)
      sheet.draw(context)
      texture.needsUpdate = true
    }
    paint()
    return { texture, paint }
  })
  let disposed = false
  if (document.fonts) {
    void Promise.all(SHEET_FONTS.map(sheetFont => document.fonts.load(sheetFont))).then(() => {
      if (disposed) return
      for (const sheetTexture of sheetTextures) sheetTexture.paint()
    })
  }

  /* Las hojas: el frente con su textura, el dorso blanco roto y el canto un poco más oscuro */
  const paperGeometry = new THREE.BoxGeometry(PAPER_WIDTH, PAPER_HEIGHT, PAPER_THICKNESS)
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: '#e7e1d3', roughness: 0.9 })
  const backMaterial = new THREE.MeshStandardMaterial({ color: '#f6f2e9', roughness: 0.92 })
  const middle = (REPORT_SHEETS.length - 1) / 2

  const sheets: Sheet[] = sheetTextures.map(({ texture }, sheetIndex) => {
    const frontMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.88 })
    const mesh = new THREE.Mesh(paperGeometry, [edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, frontMaterial, backMaterial])
    mesh.castShadow = true
    mesh.userData.sheetIndex = sheetIndex
    scene.add(mesh)

    const offset = sheetIndex - middle
    // El montón: tumbadas sobre la mesa, una encima de otra, cada una un poco girada
    const stackPosition = new THREE.Vector3(0, 0.03 + sheetIndex * PAPER_THICKNESS * 1.4, 2.4)
    const stackRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, offset * 0.04))
    // El abanico: de pie e inclinadas hacia atrás, girada cada una hacia el centro. Su x depende del ancho y la
    // pone layoutFan; la portada, en el centro, va delante y las demás se escalonan hacia atrás
    const fanPosition = new THREE.Vector3(0, PAPER_HEIGHT / 2 + 0.5 + (middle - Math.abs(offset)) * 0.06, -Math.abs(offset) * 0.55)
    const fanRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, -offset * 0.15, -offset * 0.025, 'YXZ'))
    return { mesh, stackPosition, stackRotation, fanPosition, fanRotation, delay: 0.3 + sheetIndex * 0.12, hover: 0 }
  })

  // layoutFan = «coloca las hojas a lo ancho con la separación dada y devuelve el medio ancho que ocupa el abanico»
  const layoutFan = (spacing: number) => {
    sheets.forEach((sheet, sheetIndex) => {
      sheet.fanPosition.x = (sheetIndex - middle) * spacing
    })
    return middle * spacing + PAPER_WIDTH / 2 + FAN_MARGIN
  }

  /* El ratón: la hoja que tiene encima se adelanta */
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let hoveredIndex = -1
  const canvas = renderer.domElement
  const onPointerMove = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect()
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(sheets.map(sheet => sheet.mesh), false)[0]
    hoveredIndex = hit ? (hit.object.userData.sheetIndex as number) : -1
  }
  const onPointerLeave = () => {
    hoveredIndex = -1
  }
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)

  const workPosition = new THREE.Vector3()
  const workRotation = new THREE.Quaternion()
  const forward = new THREE.Vector3()
  let previousElapsed = 0

  const updateSheets = (elapsed: number) => {
    const deltaSeconds = Math.min(Math.max(elapsed - previousElapsed, 0), 0.1)
    previousElapsed = elapsed
    for (const sheet of sheets) {
      const progress = easeOutCubic((elapsed - sheet.delay) / DEAL_SECONDS)
      workPosition.lerpVectors(sheet.stackPosition, sheet.fanPosition, progress)
      // Una curva hacia arriba en el viaje, para que la hoja se levante del montón y no lo atraviese
      workPosition.y += Math.sin(progress * Math.PI) * 0.9
      workRotation.slerpQuaternions(sheet.stackRotation, sheet.fanRotation, progress)

      const settled = clamp01((elapsed - sheet.delay - DEAL_SECONDS) / 0.8)
      const sheetIndex = sheet.mesh.userData.sheetIndex as number
      workPosition.y += Math.sin(elapsed * 0.7 + sheetIndex * 0.9) * 0.05 * settled

      const wanted = hoveredIndex === sheetIndex ? 1 : 0
      sheet.hover += (wanted - sheet.hover) * clamp01(deltaSeconds * 9)
      forward.set(0, 0, 1).applyQuaternion(workRotation)
      workPosition.addScaledVector(forward, 0.45 * sheet.hover)
      workPosition.y += 0.18 * sheet.hover

      sheet.mesh.position.copy(workPosition)
      sheet.mesh.quaternion.copy(workRotation)
    }
  }

  const resize = (nextWidth: number, nextHeight: number) => {
    const aspect = nextWidth / nextHeight
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    const halfHeightPerUnit = Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2))
    const fanHalfWidth = layoutFan(fanSpacing(aspect))
    // La cámara se aleja lo justo para que quepa el abanico a lo ancho y una hoja, con su vaivén, a lo alto
    const fitWidth = fanHalfWidth / (halfHeightPerUnit * aspect)
    const fitHeight = (PAPER_HEIGHT / 2 + 0.75) / halfHeightPerUnit
    const distance = Math.max(fitWidth, fitHeight)
    camera.position.set(0, lookAt.y + distance * 0.16, lookAt.z + distance)
    camera.lookAt(lookAt)
  }
  resize(width, height)

  return {
    restingSeconds: 3.2,
    renderFrame: elapsed => {
      updateSheets(elapsed)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => {
      disposed = true
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      disposeTree(scene)
    },
  }
}
