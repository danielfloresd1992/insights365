import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { FLOOR_ALERTS, FLOOR_ALERT_SECONDS, FLOOR_ALERT_START_SECONDS, type DelayKind } from '../landing.content'
import { TINY_SCALE, easeOutBack, smoothStep } from './sceneKit'

/*  LA SALA EN MAQUETA, LISTA PARA PONER EN UNA ESCENA (portadas A y D)
 *
 *  Un comedor: nueve mesas con sus sillas, la cocina al fondo y la barra a la derecha, con dos paredes para dar
 *  fondo. Al cargar, los muebles caen en su sitio. Después, cada pocos segundos se levanta una novedad sobre una mesa,
 *  la cocina o la barra, con el color de su demora y un anillo que late en el suelo; la mesa se tiñe de ese color
 *  mientras dura. El orden es FLOOR_ALERTS, el mismo de la tarjeta de novedades.
 *
 *  No trae luces ni cámara: eso es de cada escena. Los colores llegan en una paleta, para vestir la sala con la
 *  tierra de los informes o con el azul de Amazonas sin tocar la forma.
 */

// FLOOR_WIDTH, FLOOR_DEPTH = «el tamaño de la sala, en unidades de la escena»
export const FLOOR_WIDTH = 16
export const FLOOR_DEPTH = 11
// TABLE_HEIGHT = «a qué altura está el tablero de una mesa»
const TABLE_HEIGHT = 0.78
// TABLE_SCALE = «cuánto se agrandan mesas y sillas: grandes, para que se lean como mesas y no como puntos»
const TABLE_SCALE = 1.3
// PIN_RISE = «cuánto sube la marca de una novedad sobre su mesa»
const PIN_RISE = 1.3
// PIECE_SECONDS = «lo que tarda un mueble en caer en su sitio»
const PIECE_SECONDS = 0.8

// TABLE_POSITIONS = «x y z de cada mesa del salón, en el orden de su número (Mesa 1, Mesa 2…)»
const TABLE_POSITIONS: [number, number][] = [
  [-5.2, -1.3], [-1.9, -1.3], [1.4, -1.3],
  [-5.2, 1.4], [-1.9, 1.4], [1.4, 1.4],
  [-5.2, 4.05], [-1.9, 4.05], [1.4, 4.05],
]
// KITCHEN_POSITION, BAR_POSITION = «dónde se levantan las novedades de la cocina y de la barra»
const KITCHEN_POSITION: [number, number] = [-4.4, -4.5]
const BAR_POSITION: [number, number] = [5.9, 0]

// FLOOR_RESTING_SECONDS = «el segundo en que la sala ya está montada y han salido tres novedades: la tarjeta enseña
// las tres y la sala las dos que siguen encendidas»
export const FLOOR_RESTING_SECONDS = FLOOR_ALERT_START_SECONDS + FLOOR_ALERT_SECONDS * 2 + 1.1

// FloorPalette = «los colores de la sala: superficies, muebles y el color de cada demora»
export type FloorPalette = {
  floor: string
  joints: string
  wall: string
  tableTop: string
  tableLeg: string
  chair: string
  counter: string
  steel: string
  plate: string
  barBody: string
  barTop: string
  shelf: string
  bottles: string[]
  pot: string
  foliage: string
  delayColors: Record<DelayKind, string>
}

type Pin = {
  group: THREE.Group
  stalk: THREE.Mesh
  head: THREE.Mesh
  pinMaterial: THREE.MeshStandardMaterial
  ringMaterial: THREE.MeshBasicMaterial
  pulse: THREE.Mesh
  pulseMaterial: THREE.MeshBasicMaterial
  baseHeight: number
}

// Piece = «un mueble que cae en su sitio al cargar: su grupo, el segundo en que empieza a caer y su escala final»
type Piece = { object: THREE.Object3D; delay: number; onlyHeight?: boolean; finalScale?: number }

/*  Arma la sala dentro de `parent` y devuelve cómo moverla: `update(elapsed)` coloca los muebles y las novedades del
 *  segundo `elapsed`. La limpieza la hace quien suelta la escena entera (disposeTree). */
export function buildFloor(parent: THREE.Object3D, palette: FloorPalette) {
  const matte = (color: string, roughness = 0.86) => new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 })
  const pieces: Piece[] = []
  const shade = (mesh: THREE.Mesh) => {
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  /* El suelo, con las juntas de las baldosas */
  const floor = new THREE.Mesh(new RoundedBoxGeometry(FLOOR_WIDTH, 0.5, FLOOR_DEPTH, 4, 0.2), matte(palette.floor))
  floor.position.y = -0.25
  floor.receiveShadow = true
  parent.add(floor)

  const jointPoints: number[] = []
  for (let column = -7; column <= 7; column += 1) {
    jointPoints.push(column, 0.004, -FLOOR_DEPTH / 2 + 0.25, column, 0.004, FLOOR_DEPTH / 2 - 0.25)
  }
  for (let row = -5; row <= 5; row += 1) {
    jointPoints.push(-FLOOR_WIDTH / 2 + 0.25, 0.004, row, FLOOR_WIDTH / 2 - 0.25, 0.004, row)
  }
  const jointGeometry = new THREE.BufferGeometry()
  jointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(jointPoints, 3))
  parent.add(new THREE.LineSegments(jointGeometry, new THREE.LineBasicMaterial({ color: palette.joints })))

  /* Las dos paredes del fondo, que suben al cargar */
  const wallMaterial = matte(palette.wall)
  const backWall = shade(new THREE.Mesh(new THREE.BoxGeometry(FLOOR_WIDTH, 1.6, 0.24), wallMaterial))
  backWall.geometry.translate(0, 0.8, 0)
  backWall.position.set(0, 0, -FLOOR_DEPTH / 2 + 0.12)
  const sideWall = shade(new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.6, FLOOR_DEPTH), wallMaterial))
  sideWall.geometry.translate(0, 0.8, 0)
  sideWall.position.set(-FLOOR_WIDTH / 2 + 0.12, 0, 0)
  parent.add(backWall, sideWall)
  pieces.push({ object: backWall, delay: 0, onlyHeight: true }, { object: sideWall, delay: 0.05, onlyHeight: true })

  /* Las mesas, con sus cuatro sillas. Cada tablero tiene su material: se tiñe cuando su mesa tiene novedad */
  const tableBaseColor = new THREE.Color(palette.tableTop)
  const tableTopGeometry = new THREE.CylinderGeometry(0.62, 0.62, 0.07, 40)
  const tableLegGeometry = new THREE.CylinderGeometry(0.07, 0.07, TABLE_HEIGHT, 12)
  const tableFootGeometry = new THREE.CylinderGeometry(0.3, 0.32, 0.04, 28)
  const seatGeometry = new RoundedBoxGeometry(0.44, 0.08, 0.42, 2, 0.03)
  const backrestGeometry = new RoundedBoxGeometry(0.44, 0.44, 0.07, 2, 0.03)
  const legMaterial = matte(palette.tableLeg, 0.6)
  const chairMaterial = matte(palette.chair)
  const tableMaterials: THREE.MeshStandardMaterial[] = []

  TABLE_POSITIONS.forEach(([positionX, positionZ], tableIndex) => {
    const table = new THREE.Group()
    table.position.set(positionX, 0, positionZ)
    const topMaterial = matte(palette.tableTop, 0.7)
    tableMaterials.push(topMaterial)

    const top = shade(new THREE.Mesh(tableTopGeometry, topMaterial))
    top.position.y = TABLE_HEIGHT
    const leg = shade(new THREE.Mesh(tableLegGeometry, legMaterial))
    leg.position.y = TABLE_HEIGHT / 2
    const foot = shade(new THREE.Mesh(tableFootGeometry, legMaterial))
    foot.position.y = 0.02
    table.add(top, leg, foot)

    for (let chairIndex = 0; chairIndex < 4; chairIndex += 1) {
      const angle = (chairIndex * Math.PI) / 2 + Math.PI / 4
      const chair = new THREE.Group()
      chair.position.set(Math.sin(angle) * 0.92, 0, Math.cos(angle) * 0.92)
      chair.rotation.y = angle
      const seat = shade(new THREE.Mesh(seatGeometry, chairMaterial))
      seat.position.y = 0.46
      const backrest = shade(new THREE.Mesh(backrestGeometry, chairMaterial))
      backrest.position.set(0, 0.7, 0.2)
      chair.add(seat, backrest)
      table.add(chair)
    }

    parent.add(table)
    pieces.push({ object: table, delay: 0.15 + tableIndex * 0.07, finalScale: TABLE_SCALE })
  })

  /* La cocina al fondo: el pase con sus platos */
  const kitchen = new THREE.Group()
  kitchen.position.set(KITCHEN_POSITION[0], 0, KITCHEN_POSITION[1])
  const counter = shade(new THREE.Mesh(new RoundedBoxGeometry(4.8, 0.95, 1.1, 2, 0.05), matte(palette.counter)))
  counter.position.y = 0.475
  const steel = shade(new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.05, 1.16), matte(palette.steel, 0.35)))
  steel.position.y = 0.975
  kitchen.add(counter, steel)
  const plateGeometry = new THREE.CylinderGeometry(0.2, 0.17, 0.04, 24)
  const plateMaterial = matte(palette.plate, 0.5)
  for (let plateIndex = 0; plateIndex < 5; plateIndex += 1) {
    const plate = shade(new THREE.Mesh(plateGeometry, plateMaterial))
    plate.position.set(-1.7 + plateIndex * 0.85, 1.02, 0.15)
    kitchen.add(plate)
  }
  parent.add(kitchen)
  pieces.push({ object: kitchen, delay: 0.35 })

  /* La barra a la derecha, con sus taburetes y la estantería de botellas */
  const bar = new THREE.Group()
  bar.position.set(BAR_POSITION[0], 0, BAR_POSITION[1])
  const barBody = shade(new THREE.Mesh(new RoundedBoxGeometry(1.1, 1.05, 6.2, 2, 0.06), matte(palette.barBody, 0.7)))
  barBody.position.y = 0.525
  const barTop = shade(new THREE.Mesh(new RoundedBoxGeometry(1.35, 0.07, 6.45, 2, 0.03), matte(palette.barTop, 0.55)))
  barTop.position.y = 1.08
  bar.add(barBody, barTop)
  const stoolSeatGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.07, 24)
  const stoolPoleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.78, 10)
  for (let stoolIndex = 0; stoolIndex < 5; stoolIndex += 1) {
    const stoolSeat = shade(new THREE.Mesh(stoolSeatGeometry, chairMaterial))
    stoolSeat.position.set(-1.05, 0.8, -2.4 + stoolIndex * 1.2)
    const stoolPole = shade(new THREE.Mesh(stoolPoleGeometry, legMaterial))
    stoolPole.position.set(-1.05, 0.39, -2.4 + stoolIndex * 1.2)
    bar.add(stoolSeat, stoolPole)
  }
  const shelf = shade(new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.45, 5.0), matte(palette.shelf)))
  shelf.position.set(1.55, 0.725, 0)
  bar.add(shelf)
  const bottleGeometry = new THREE.CylinderGeometry(0.07, 0.08, 0.34, 12)
  for (let bottleIndex = 0; bottleIndex < 12; bottleIndex += 1) {
    const bottle = shade(new THREE.Mesh(bottleGeometry, matte(palette.bottles[bottleIndex % palette.bottles.length], 0.35)))
    bottle.position.set(1.55, 1.62, -2.2 + bottleIndex * 0.4)
    bar.add(bottle)
  }
  parent.add(bar)
  pieces.push({ object: bar, delay: 0.5 })

  /* Dos plantas en las esquinas libres */
  const potGeometry = new THREE.CylinderGeometry(0.26, 0.2, 0.42, 20)
  const foliageGeometry = new THREE.IcosahedronGeometry(0.46, 1)
  const plantSpots: [number, number][] = [[-7.2, -2.7], [4.3, 4.7]]
  plantSpots.forEach(([positionX, positionZ], plantIndex) => {
    const plant = new THREE.Group()
    plant.position.set(positionX, 0, positionZ)
    const pot = shade(new THREE.Mesh(potGeometry, matte(palette.pot)))
    pot.position.y = 0.21
    const foliage = shade(new THREE.Mesh(foliageGeometry, matte(palette.foliage, 0.9)))
    foliage.position.y = 0.78
    plant.add(pot, foliage)
    parent.add(plant)
    pieces.push({ object: plant, delay: 0.7 + plantIndex * 0.08 })
  })

  /* Las marcas de novedad: una por mesa, otra para la cocina y otra para la barra, apagadas hasta que les toca */
  const spots: { position: [number, number]; baseHeight: number }[] = [
    ...TABLE_POSITIONS.map(position => ({ position, baseHeight: TABLE_HEIGHT * TABLE_SCALE })),
    { position: KITCHEN_POSITION, baseHeight: 1.0 },
    { position: BAR_POSITION, baseHeight: 1.12 },
  ]
  const stalkGeometry = new THREE.CylinderGeometry(0.035, 0.035, 1, 8)
  stalkGeometry.translate(0, 0.5, 0)
  const headGeometry = new THREE.SphereGeometry(0.2, 28, 18)
  const ringGeometry = new THREE.RingGeometry(1.5, 1.66, 64)
  ringGeometry.rotateX(-Math.PI / 2)
  const firstColor = Object.values(palette.delayColors)[0]

  const pins: Pin[] = spots.map(({ position, baseHeight }) => {
    const group = new THREE.Group()
    group.position.set(position[0], 0, position[1])
    group.visible = false
    const pinMaterial = new THREE.MeshStandardMaterial({ color: firstColor, emissive: firstColor, emissiveIntensity: 0.35, roughness: 0.4 })
    const stalk = new THREE.Mesh(stalkGeometry, pinMaterial)
    stalk.position.y = baseHeight
    stalk.castShadow = true
    const head = new THREE.Mesh(headGeometry, pinMaterial)
    head.castShadow = true
    const ringMaterial = new THREE.MeshBasicMaterial({ color: firstColor, transparent: true, opacity: 0, depthWrite: false })
    const ring = new THREE.Mesh(ringGeometry, ringMaterial)
    ring.position.y = 0.012
    const pulseMaterial = new THREE.MeshBasicMaterial({ color: firstColor, transparent: true, opacity: 0, depthWrite: false })
    const pulse = new THREE.Mesh(ringGeometry, pulseMaterial)
    pulse.position.y = 0.01
    group.add(stalk, head, ring, pulse)
    parent.add(group)
    return { group, stalk, head, pinMaterial, ringMaterial, pulse, pulseMaterial, baseHeight }
  })

  const kindColors = Object.fromEntries(
    Object.entries(palette.delayColors).map(([kind, color]) => [kind, new THREE.Color(color)]),
  ) as Record<DelayKind, THREE.Color>
  // levels, kinds, locals = «por cada sitio: cuánto está encendido, de qué demora y cuántos segundos lleva»
  const levels = new Array<number>(pins.length).fill(0)
  const kinds = new Array<DelayKind>(pins.length).fill('firstAttention')
  const locals = new Array<number>(pins.length).fill(0)

  const updateAlerts = (elapsed: number) => {
    levels.fill(0)
    const alertClock = elapsed - FLOOR_ALERT_START_SECONDS
    if (alertClock >= 0) {
      const cycle = Math.floor(alertClock / FLOOR_ALERT_SECONDS)
      // Cada novedad dura dos vueltas: la nueva y la anterior se ven a la vez, como en la tarjeta
      for (let back = 0; back < 2; back += 1) {
        const alertNumber = cycle - back
        if (alertNumber < 0) continue
        const alert = FLOOR_ALERTS[alertNumber % FLOOR_ALERTS.length]
        const local = alertClock - alertNumber * FLOOR_ALERT_SECONDS
        const lifetime = FLOOR_ALERT_SECONDS * 2
        const level = smoothStep(0, 0.5, local) * (1 - smoothStep(lifetime - 0.7, lifetime, local))
        if (level > levels[alert.spot]) {
          levels[alert.spot] = level
          kinds[alert.spot] = alert.kind
          locals[alert.spot] = local
        }
      }
    }

    pins.forEach((pin, spotIndex) => {
      const level = levels[spotIndex]
      pin.group.visible = level > 0.002
      if (spotIndex < tableMaterials.length) {
        tableMaterials[spotIndex].color.copy(tableBaseColor).lerp(kindColors[kinds[spotIndex]], 0.5 * level)
      }
      if (!pin.group.visible) return
      const color = kindColors[kinds[spotIndex]]
      pin.pinMaterial.color.copy(color)
      pin.pinMaterial.emissive.copy(color)
      pin.ringMaterial.color.copy(color)
      pin.pulseMaterial.color.copy(color)

      const rise = easeOutBack(level)
      pin.stalk.scale.y = Math.max(TINY_SCALE, PIN_RISE * rise)
      pin.head.position.y = pin.baseHeight + PIN_RISE * rise + 0.14
      pin.head.scale.setScalar(Math.max(TINY_SCALE, level))
      pin.ringMaterial.opacity = 0.9 * level
      const phase = (locals[spotIndex] % 1.3) / 1.3
      pin.pulse.scale.setScalar(1 + phase * 0.9)
      pin.pulseMaterial.opacity = 0.55 * level * (1 - phase)
    })
  }

  const updatePieces = (elapsed: number) => {
    for (const piece of pieces) {
      const growth = Math.max(TINY_SCALE, easeOutBack((elapsed - piece.delay) / PIECE_SECONDS))
      if (piece.onlyHeight) piece.object.scale.set(1, growth, 1)
      else piece.object.scale.setScalar(growth * (piece.finalScale ?? 1))
    }
  }

  return {
    update: (elapsed: number) => {
      updatePieces(elapsed)
      updateAlerts(elapsed)
    },
  }
}
