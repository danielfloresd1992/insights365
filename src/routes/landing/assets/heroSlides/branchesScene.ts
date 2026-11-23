import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SceneFactory } from '../../hook/useThreeScene'
import { AMAZONAS, AMAZONAS_DELAY_COLORS, type DelayKind } from '../landing.content'
import { TINY_SCALE, clamp01, disposeTree, easeOutBack, makeLabelSprite, orbitPosition, smoothStep } from '../three/sceneKit'

/*  TODAS TUS SUCURSALES (la tercera escena del hero de '/')
 *
 *  Seis locales en maqueta alrededor de la central de Jarvis365, cada uno unido a ella por una línea. Al cargar los
 *  locales suben a su sitio; después, cada poco, sobre uno se levanta una alerta con el color de su demora, late un
 *  anillo en el suelo y un punto viaja por su línea hasta la central: lo que pasa en cada local llega al momento.
 *  Con los colores de Amazonas, bajo la misma luz y la misma cámara isométrica que la sala. Los nombres son de ejemplo.
 */

// BRANCHES = «los locales de ejemplo: nombre y ángulo alrededor de la central». Girados 15° para que la cámara (a 45°)
// mire justo entre dos: así ningún local queda detrás de la central tapando su nombre
const BRANCHES = ['Centro', 'Norte', 'Puerto', 'Playa', 'Plaza', 'Aeropuerto'].map((name, index) => ({
  name,
  angle: (index / 6) * Math.PI * 2 + Math.PI / 12,
}))

// RING_RADIUS = «a qué distancia de la central van los locales»
const RING_RADIUS = 5.1

// ALERTS = «el orden en que se encienden: qué local y qué demora»; se repite
const ALERTS: { branch: number; kind: DelayKind }[] = [
  { branch: 1, kind: 'firstAttention' },
  { branch: 4, kind: 'cleaning' },
  { branch: 0, kind: 'preparation' },
  { branch: 3, kind: 'service' },
  { branch: 5, kind: 'firstAttention' },
  { branch: 2, kind: 'delivery' },
]

// RISE_SECONDS = «lo que tardan los locales en subir al cargar»; ALERT_START, ALERT_EVERY, ALERT_LIFE = «cuándo empieza la
// primera alerta, cada cuánto llega otra y cuánto dura encendida cada una»
const RISE_SECONDS = 1.4
const ALERT_START = 1.6
const ALERT_EVERY = 1.5
const ALERT_LIFE = 3.2
// PACKET_SECONDS = «lo que tarda el punto en ir del local a la central»
const PACKET_SECONDS = 1.1

// VIEW_HEIGHT, VIEW_MIN_WIDTH = «lo que tiene que caber en vertical y a lo ancho»: la plaza entera, con su margen
const VIEW_HEIGHT = 13
const VIEW_MIN_WIDTH = 17.5
// PLAZA_RADIUS = «el radio de la plaza redonda donde están los locales»
const PLAZA_RADIUS = 7.6
// PIN_HEIGHT = «lo que sube del tejado el palo de la alerta»; LABEL_HEIGHT = «a qué altura va el nombre del local,
// por encima de la bola de la alerta, para que nunca se tapen»
const PIN_HEIGHT = 0.55
const LABEL_HEIGHT = 2.75

type Branch = {
  group: THREE.Group
  pin: THREE.Group
  stalk: THREE.Mesh
  head: THREE.Mesh
  pinMaterial: THREE.MeshStandardMaterial
  pulse: THREE.Mesh
  pulseMaterial: THREE.MeshBasicMaterial
  link: THREE.Mesh
  linkMaterial: THREE.MeshBasicMaterial
  curve: THREE.QuadraticBezierCurve3
  packet: THREE.Mesh
  packetMaterial: THREE.MeshBasicMaterial
}

export const createBranchesScene: SceneFactory = (renderer, width, height) => {
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.toneMappingExposure = 1.0

  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 160)
  const target = new THREE.Vector3(0, 0.9, 0)

  // La luz de la sala: un cielo blanco con suelo marfil y un sol por la izquierda
  scene.add(new THREE.HemisphereLight('#ffffff', '#e9e4d8', 1.8))
  const sun = new THREE.DirectionalLight('#ffffff', 2.2)
  sun.position.set(-8, 18, 10)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 })
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.03
  sun.shadow.radius = 5
  scene.add(sun)

  const standard = (color: string, roughness = 0.8) => new THREE.MeshStandardMaterial({ color, roughness })
  // floatOnTop = «que una etiqueta se lea siempre: se dibuja la última y ningún tejado ni torre la tapa. Lleva su
  // píldora clara porque las del fondo flotan sobre el escenario, que es oscuro»
  const floatOnTop = (label: THREE.Sprite) => {
    label.material.depthTest = false
    label.renderOrder = 10
  }

  // La plaza: una losa redonda casi blanca, con su canto, para que destaque sobre el marfil del escenario
  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(PLAZA_RADIUS, PLAZA_RADIUS, 0.4, 96), standard('#fffdf8', 0.95))
  plaza.position.y = -0.2
  plaza.receiveShadow = true
  scene.add(plaza)

  // La central de Jarvis365: una torre blanca con la franja verde de la marca
  const hub = new THREE.Group()
  const hubBase = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.25, 40), standard(AMAZONAS.rule2))
  hubBase.position.y = 0.125
  const hubTower = new THREE.Mesh(new RoundedBoxGeometry(1.4, 2.2, 1.4, 3, 0.18), standard('#ffffff', 0.6))
  hubTower.position.y = 1.35
  const hubBand = new THREE.Mesh(new RoundedBoxGeometry(1.46, 0.3, 1.46, 2, 0.08), standard(AMAZONAS.green, 0.5))
  hubBand.position.y = 2.15
  for (const mesh of [hubBase, hubTower, hubBand]) {
    mesh.castShadow = true
    mesh.receiveShadow = true
  }
  const hubLabel = makeLabelSprite('Jarvis365', { color: AMAZONAS.greenText, family: '"IBM Plex Sans", sans-serif', weight: 700, worldHeight: 0.62, background: '#ffffff' })
  hubLabel.position.y = 3.4
  floatOnTop(hubLabel)
  hub.add(hubBase, hubTower, hubBand, hubLabel)
  scene.add(hub)

  // Lo que comparten todos los locales
  const wallGeometry = new RoundedBoxGeometry(2.2, 1.2, 1.7, 3, 0.12)
  const roofGeometry = new RoundedBoxGeometry(2.45, 0.18, 1.95, 2, 0.06)
  const awningGeometry = new RoundedBoxGeometry(2.2, 0.12, 0.42, 2, 0.04)
  const doorGeometry = new THREE.BoxGeometry(0.42, 0.7, 0.05)
  const windowGeometry = new THREE.BoxGeometry(0.5, 0.38, 0.05)
  const stalkGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1, 8)
  stalkGeometry.translate(0, 0.5, 0)
  const headGeometry = new THREE.SphereGeometry(0.22, 28, 18)
  const pulseGeometry = new THREE.RingGeometry(1.45, 1.6, 48)
  pulseGeometry.rotateX(-Math.PI / 2)
  const packetGeometry = new THREE.SphereGeometry(0.13, 16, 12)
  const wallMaterial = standard('#ffffff', 0.7)
  const roofMaterial = standard(AMAZONAS.rule2, 0.75)
  const awningMaterial = standard(AMAZONAS.green, 0.55)
  const doorMaterial = standard('#5a4d38')
  const windowMaterial = new THREE.MeshStandardMaterial({ color: '#cfd8d6', roughness: 0.2, metalness: 0.1 })

  const branches: Branch[] = BRANCHES.map(({ name, angle }) => {
    const x = Math.cos(angle) * RING_RADIUS
    const z = Math.sin(angle) * RING_RADIUS
    const group = new THREE.Group()
    group.position.set(x, 0, z)
    // Cada local mira a la central
    group.rotation.y = Math.atan2(-x, -z)

    const walls = new THREE.Mesh(wallGeometry, wallMaterial)
    walls.position.y = 0.6
    const roof = new THREE.Mesh(roofGeometry, roofMaterial)
    roof.position.y = 1.29
    const awning = new THREE.Mesh(awningGeometry, awningMaterial)
    awning.position.set(0, 0.98, 1.02)
    awning.rotation.x = 0.35
    const door = new THREE.Mesh(doorGeometry, doorMaterial)
    door.position.set(0, 0.35, 0.86)
    const leftWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    leftWindow.position.set(-0.66, 0.62, 0.86)
    const rightWindow = new THREE.Mesh(windowGeometry, windowMaterial)
    rightWindow.position.set(0.66, 0.62, 0.86)
    for (const mesh of [walls, roof, awning, door]) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    const label = makeLabelSprite(name, { color: AMAZONAS.ink, family: '"IBM Plex Sans", sans-serif', weight: 600, worldHeight: 0.52, background: AMAZONAS.ivory })
    label.position.y = LABEL_HEIGHT
    floatOnTop(label)
    group.add(walls, roof, awning, door, leftWindow, rightWindow, label)

    // La alerta: un palo con su bola, que sube del tejado, y un anillo que late en el suelo alrededor del local
    const pinMaterial = new THREE.MeshStandardMaterial({ color: AMAZONAS.critical, emissive: AMAZONAS.critical, emissiveIntensity: 0.35, roughness: 0.4 })
    const pin = new THREE.Group()
    const stalk = new THREE.Mesh(stalkGeometry, pinMaterial)
    stalk.position.y = 1.38
    const head = new THREE.Mesh(headGeometry, pinMaterial)
    stalk.castShadow = true
    head.castShadow = true
    pin.add(stalk, head)
    const pulseMaterial = new THREE.MeshBasicMaterial({ color: AMAZONAS.critical, transparent: true, opacity: 0, depthWrite: false })
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial)
    pulse.position.y = 0.02
    group.add(pin, pulse)
    scene.add(group)

    // La línea hasta la central: un arco fino sobre la plaza, y el punto que viaja por él
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(x * 0.78, 0.15, z * 0.78),
      new THREE.Vector3(x * 0.45, 1.6, z * 0.45),
      new THREE.Vector3(x * 0.16, 1.2, z * 0.16),
    )
    const linkMaterial = new THREE.MeshBasicMaterial({ color: AMAZONAS.rule2 })
    const link = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.035, 6, false), linkMaterial)
    scene.add(link)
    const packetMaterial = new THREE.MeshBasicMaterial({ color: AMAZONAS.critical })
    const packet = new THREE.Mesh(packetGeometry, packetMaterial)
    packet.visible = false
    scene.add(packet)

    return { group, pin, stalk, head, pinMaterial, pulse, pulseMaterial, link, linkMaterial, curve, packet, packetMaterial }
  })

  const restColor = new THREE.Color(AMAZONAS.rule2)
  const tint = new THREE.Color()

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
    restingSeconds: ALERT_START + ALERT_EVERY * 1.4,
    renderFrame: elapsed => {
      // Los locales suben a su sitio, uno detrás de otro; la central, la primera
      hub.scale.setScalar(Math.max(TINY_SCALE, easeOutBack(elapsed / 0.6)))
      branches.forEach((branch, index) => {
        const rise = easeOutBack((elapsed - 0.15 - index * 0.12) / (RISE_SECONDS - 0.6))
        branch.group.scale.setScalar(Math.max(TINY_SCALE, rise))
        branch.link.visible = elapsed > 0.4 + index * 0.12
      })

      // Las alertas: cuánto está encendido cada local ahora y con qué demora
      const levels = new Array<number>(branches.length).fill(0)
      const kinds = new Array<DelayKind>(branches.length).fill('firstAttention')
      const ages = new Array<number>(branches.length).fill(0)
      const sinceStart = elapsed - ALERT_START
      if (sinceStart > 0) {
        const newest = Math.floor(sinceStart / ALERT_EVERY)
        for (let step = Math.max(0, newest - 3); step <= newest; step += 1) {
          const age = sinceStart - step * ALERT_EVERY
          if (age < 0 || age > ALERT_LIFE) continue
          const alert = ALERTS[step % ALERTS.length]
          const level = smoothStep(0, 0.35, age) * (1 - smoothStep(ALERT_LIFE - 0.5, ALERT_LIFE, age))
          if (level >= levels[alert.branch]) {
            levels[alert.branch] = level
            kinds[alert.branch] = alert.kind
            ages[alert.branch] = age
          }
        }
      }

      branches.forEach((branch, index) => {
        const level = levels[index]
        const color = AMAZONAS_DELAY_COLORS[kinds[index]]
        branch.pin.visible = level > 0.002
        branch.pinMaterial.color.set(color)
        branch.pinMaterial.emissive.set(color)
        branch.stalk.scale.y = Math.max(TINY_SCALE, PIN_HEIGHT * level)
        branch.head.position.y = 1.38 + PIN_HEIGHT * level + 0.16
        branch.head.scale.setScalar(Math.max(TINY_SCALE, level))
        // El anillo late hacia fuera
        const phase = (ages[index] % 1.1) / 1.1
        branch.pulseMaterial.color.set(color)
        branch.pulse.scale.setScalar(1 + phase * 0.35)
        branch.pulseMaterial.opacity = 0.55 * level * (1 - phase)
        // La línea se tiñe y el punto viaja hacia la central
        branch.linkMaterial.color.copy(restColor).lerp(tint.set(color), level)
        const travel = clamp01((ages[index] - 0.2) / PACKET_SECONDS)
        branch.packet.visible = level > 0.05 && travel > 0 && travel < 1
        if (branch.packet.visible) {
          branch.packetMaterial.color.set(color)
          branch.packet.position.copy(branch.curve.getPoint(travel))
        }
      })

      // La plaza se mece apenas
      const azimuth = Math.PI / 4 + Math.sin(elapsed * 0.16) * 0.14
      camera.position.copy(orbitPosition(target, 40, azimuth, 0.62))
      camera.lookAt(target)
      renderer.render(scene, camera)
    },
    resize,
    dispose: () => disposeTree(scene),
  }
}
