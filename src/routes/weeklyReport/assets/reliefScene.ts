import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SceneFactory } from '@/routes/landing/hook/useThreeScene'
import { disposeTree, easeOutCubic, makeLabelSprite, orbitPosition } from '@/routes/landing/assets/three/sceneKit'

/*  EL RELIEVE DEL INTERSEMANAL (propuesta A del lienzo, elegida por el usuario)
 *
 *  Una maqueta 3D con todos los indicadores a la vez: cada fila es un indicador y cada columna una semana. La altura
 *  de una barra va de 0 al máximo de SU fila (cada indicador tiene su escala: una fila compara semanas, no
 *  indicadores entre sí). La barra de la última semana va en azul si mejoró frente a la anterior y en naranja si
 *  empeoró; la fila elegida se ilumina en ocre y lleva sus cifras encima.
 *
 *  Nada tapa la fila en foco (la que tiene el ratón encima o, si no, la elegida): las barras que en pantalla caen
 *  delante de ella se vuelven translúcidas. Se calcula con lo que se ve, no por número de fila, así que vale para
 *  cualquier giro de la cámara.
 *
 *  Con el ratón: pasar por una barra la ilumina y la cuenta (hover: indicador, semana y cifra); un clic elige su
 *  indicador; arrastrar gira la maqueta (de lado y de arriba abajo, hasta verla en planta, donde nada se tapa) y el
 *  doble clic la devuelve a su sitio. En el teléfono, deslizar de lado la gira y tocar elige.
 *  Lo que enseña la escena también lo dicen, en texto, el panel de al lado, los indicadores de abajo y la tabla.
 */

export type ReliefMetric = {
  id: string
  name: string
  // values = «una cifra por semana, de la más antigua a la última»; null = esa semana no hubo informes
  values: (number | null)[]
  // labels = «cada cifra ya escrita, como se lee» (14,2 %, 1.300, —)
  labels: string[]
  // good = «si la última semana fue mejor (true), peor (false) o igual (null) que la anterior»
  good: boolean | null
}

export type ReliefData = { weeks: string[]; metrics: ReliefMetric[] }

// ReliefHover = «la barra que tiene el ratón encima, para contarla»: qué es y dónde está su techo en la caja (px)
export type ReliefHover = { id: string; name: string; week: string; value: string; selected: boolean; x: number; y: number; width: number }

// ReliefEvents = «lo que la escena cuenta hacia fuera»
type ReliefEvents = {
  pick: (id: string) => void
  hover: (hover: ReliefHover | null) => void
  // viewMoved = «la maqueta está girada (true) o en su vista de siempre (false)»
  viewMoved: (moved: boolean) => void
}

// ReliefControls = «el mando de la escena». Vive fuera de ella para que elegir otro indicador no la rehaga: la escena
// lee la fila elegida en cada fotograma, cuenta lo que pasa por `emit` y deja que de fuera se la devuelva a su sitio
export type ReliefControls = {
  getSelected: () => string
  setSelected: (id: string) => void
  emit: ReliefEvents
  listen: (handlers: Partial<ReliefEvents>) => void
  resetView: () => void
  onResetView: (reset: () => void) => void
}

export function createReliefControls(selected: string): ReliefControls {
  let current = selected
  const handlers: ReliefEvents = { pick: () => {}, hover: () => {}, viewMoved: () => {} }
  let reset = () => {}
  return {
    getSelected: () => current,
    setSelected: id => { current = id },
    emit: {
      pick: id => handlers.pick(id),
      hover: hover => handlers.hover(hover),
      viewMoved: moved => handlers.viewMoved(moved),
    },
    listen: next => { Object.assign(handlers, next) },
    resetView: () => reset(),
    onResetView: next => { reset = next },
  }
}

type ReliefOptions = {
  data: ReliefData
  theme: 'light' | 'dark'
  controls: ReliefControls
}

// Las medidas de la maqueta, en unidades de la escena. Barras algo más finas que el paso, para que se vea entre ellas
const STEP = 1.12
const BAR = 0.56
const MAX_HEIGHT = 2.3
const MIN_HEIGHT = 0.06
const PLINTH = 0.1
// PILL_GAP = «el aire entre la barra y su cifra»
const PILL_GAP = 0.12
// MIN_LABEL_PX, MAX_LABEL_GROW = «el alto mínimo de un rótulo en pantalla (con su relleno: la letra queda en unos
// 12 px), y cuánto se deja crecer para llegar»
const MIN_LABEL_PX = 17
const MAX_LABEL_GROW = 2.4
// COMPACT_WIDTH = «por debajo de este ancho de caja solo se nombra la fila elegida»
const COMPACT_WIDTH = 520
const LABEL_FAMILY = '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif'
const NUMBER_FAMILY = '"IBM Plex Mono", ui-monospace, monospace'

// La cámara: la vista de siempre y hasta dónde se deja girar. Más alta que una isométrica pura, para que las barras
// de delante tapen menos; arriba del todo (ELEVATION_MAX) se ve casi en planta
const BASE_AZIMUTH = Math.PI / 4
const BASE_ELEVATION = 0.74
const AZIMUTH_REACH = 0.62
const ELEVATION_MIN = 0.3
const ELEVATION_MAX = 1.38
// TURN_PER_PX = «cuánto gira la maqueta por píxel arrastrado», de lado y de arriba abajo
const TURN_PER_PX = { azimuth: 0.008, elevation: 0.006 }
// DRAG_THRESHOLD_PX = «lo que hay que mover el puntero para que deje de ser un clic y empiece a girar»
const DRAG_THRESHOLD_PX = 5
// SEE_THROUGH = «la opacidad de una barra que tapa la fila en foco»: deja ver lo de detrás sin que ella desaparezca
const SEE_THROUGH = 0.45
// PILL_HEIGHT, SOFT_PILL_HEIGHT = «el alto de la cifra de la fila elegida y el de las demás» (con su relleno: la
// letra queda como la de los nombres de fila)
const PILL_HEIGHT = 0.34
const SOFT_PILL_HEIGHT = 0.31

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// onTop = «este rótulo se dibuja encima de las barras»: un nombre o una cifra tapados no sirven de nada
function onTop(sprite: THREE.Sprite) {
  sprite.material.depthTest = false
  sprite.renderOrder = 2
  return sprite
}

// COLORS = «los colores de cada tema»; mejor y peor están validados para daltonismo sobre cada fondo
const COLORS = {
  dark: {
    base: '#5b5341', row: '#d9a441', better: '#5b8fe0', worse: '#e0703f', plinth: '#2a251c',
    ink: '#f5f0e3', muted: '#b3aa96', pill: 'rgba(28, 25, 19, 0.88)', softInk: '#ddd4c0', softPill: 'rgba(28, 25, 19, 0.66)', hemiSky: '#fff1da', hemiGround: '#2a2116', hemi: 1.15, key: 2.3, glow: 0.42,
  },
  light: {
    base: '#d9d0bd', row: '#c9962f', better: '#2f63b8', worse: '#c4532a', plinth: '#efe8d8',
    ink: '#2f2a1e', muted: '#564e40', pill: 'rgba(255, 255, 255, 0.92)', softInk: '#453e31', softPill: 'rgba(255, 255, 255, 0.74)', hemiSky: '#ffffff', hemiGround: '#e4dccb', hemi: 1.6, key: 2.0, glow: 0.22,
  },
}

export function createReliefScene({ data, theme, controls }: ReliefOptions): SceneFactory {
  const { getSelected, emit } = controls
  return (renderer, width, height) => {
    const colors = COLORS[theme]
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.05

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200)
    const columns = data.weeks.length
    const rows = data.metrics.length
    const target = new THREE.Vector3(((columns - 1) * STEP) / 2 + 0.8, 0.7, ((rows - 1) * STEP) / 2)

    scene.add(new THREE.HemisphereLight(colors.hemiSky, colors.hemiGround, colors.hemi))
    const key = new THREE.DirectionalLight('#fff4e2', colors.key)
    key.position.set(-4, 12, 8)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 })
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.03
    key.shadow.radius = 5
    key.target.position.copy(target)
    scene.add(key, key.target)

    /* La peana */
    const plinth = new THREE.Mesh(
      new RoundedBoxGeometry(columns * STEP + 0.3, PLINTH, rows * STEP + 0.3, 3, 0.05),
      new THREE.MeshStandardMaterial({ color: colors.plinth, roughness: 0.85 }),
    )
    plinth.position.set(((columns - 1) * STEP) / 2, PLINTH / 2, ((rows - 1) * STEP) / 2)
    plinth.receiveShadow = true
    scene.add(plinth)

    // label = «un rótulo encima de las barras»; recuerda su alto para poder agrandarlo en una pantalla chica
    const labels: THREE.Sprite[] = []
    const label = (text: string, options: Parameters<typeof makeLabelSprite>[1]) => {
      const sprite = onTop(makeLabelSprite(text, options))
      sprite.userData.worldHeight = options.worldHeight
      labels.push(sprite)
      scene.add(sprite)
      return sprite
    }

    /* Las barras: una geometría de alto 1, escalada; un material por barra para que cada una cambie de color, de
     * brillo y de opacidad sola. `rect` es lo que ocupa en pantalla (en unidades de la cámara) y `depth` lo cerca que
     * está de ella: con eso se sabe qué barra tapa a cuál */
    const geometry = new RoundedBoxGeometry(BAR, 1, BAR, 3, 0.05)
    type Rect = { minX: number; maxX: number; minY: number; maxY: number; depth: number }
    type Bar = {
      mesh: THREE.Mesh<RoundedBoxGeometry, THREE.MeshStandardMaterial>
      row: number
      column: number
      height: number
      // label, soft = «su cifra, destacada (fila elegida) o discreta (las demás)»
      label: THREE.Sprite
      soft: THREE.Sprite
      empty: boolean
      // opacity = «lo opaca que está ahora» (1, o SEE_THROUGH si tapa la fila en foco); glow = «lo iluminada por el ratón»
      opacity: number
      glow: number
      rect: Rect
      // pillSlot = «dónde fue su cifra la última vez»: encima de la barra o sobre su cara
      pillSlot: 'top' | 'face'
    }
    const bars: Bar[] = []
    data.metrics.forEach((metric, row) => {
      const present = metric.values.filter((value): value is number => value !== null)
      const top = Math.max(...present, 0)
      metric.values.forEach((value, column) => {
        const empty = value === null
        const share = empty || top <= 0 ? 0 : value / top
        const material = new THREE.MeshStandardMaterial({ color: colors.base, roughness: 0.55, transparent: true, opacity: empty ? 0.35 : 1 })
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(column * STEP, PLINTH, row * STEP)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.userData.bar = bars.length
        scene.add(mesh)
        const text = metric.labels[column] ?? '—'
        const pill = label(text, { color: colors.ink, family: NUMBER_FAMILY, weight: 600, worldHeight: PILL_HEIGHT, background: colors.pill })
        const soft = label(text, { color: colors.softInk, family: NUMBER_FAMILY, weight: 500, worldHeight: SOFT_PILL_HEIGHT, background: colors.softPill })
        // La destacada se dibuja encima de las discretas
        pill.renderOrder = 4
        soft.renderOrder = 3
        pill.visible = false
        soft.visible = false
        bars.push({
          mesh, row, column, height: MIN_HEIGHT + share * (MAX_HEIGHT - MIN_HEIGHT), label: pill, soft, empty, opacity: 1, glow: 0,
          rect: { minX: 0, maxX: 0, minY: 0, maxY: 0, depth: 0 },
          pillSlot: 'top',
        })
      })
    })

    /* Los rótulos: el nombre de cada fila tras su última semana (en tinta si es la elegida o la del ratón) y la semana
     * delante de cada columna. A la derecha ninguna barra los tapa: las de las filas de delante caen a su izquierda */
    const rowLabelX = (columns - 1) * STEP + BAR / 2 + 0.22
    const rowLabels = data.metrics.map((metric, row) => {
      const make = (color: string, weight: number) => {
        const sprite = label(metric.name, { color, family: LABEL_FAMILY, weight, worldHeight: 0.26 })
        sprite.center.set(0, 0.5)
        sprite.position.set(rowLabelX, PLINTH + 0.05, row * STEP)
        return sprite
      }
      return { id: metric.id, on: make(colors.ink, 600), off: make(colors.muted, 500) }
    })
    const weekLabels = data.weeks.map((week, column) => {
      const sprite = label(week, { color: column === columns - 1 ? colors.ink : colors.muted, family: LABEL_FAMILY, weight: column === columns - 1 ? 600 : 500, worldHeight: 0.26 })
      sprite.position.set(column * STEP + 0.15, PLINTH + 0.05, (rows - 1) * STEP + 0.85)
      return sprite
    })

    // colorOf = «el color al que va cada barra según la fila elegida»
    const base = new THREE.Color(colors.base)
    const targetColor = new THREE.Color()
    const colorOf = (bar: Bar, selected: boolean) => {
      const metric = data.metrics[bar.row]
      const isLast = bar.column === columns - 1
      if (isLast && metric.good !== null && !bar.empty) {
        targetColor.set(metric.good ? colors.better : colors.worse)
        if (!selected) targetColor.lerp(base, 0.4)
        return targetColor
      }
      return targetColor.set(selected ? colors.row : colors.base)
    }

    /* El estado de la cámara y del ratón */
    let azimuth = BASE_AZIMUTH
    let elevation = BASE_ELEVATION
    // goal = «hacia dónde vuelve la cámara» (doble clic o el botón de fuera); moved = «la giró la persona»
    let goal: { azimuth: number; elevation: number } | null = null
    let moved = false
    // El vaivén de la vista quieta: se apaga mientras alguien la mira con el ratón o la gira
    let swayClock = 0
    let sway = 1
    // hovered = «la barra bajo el ratón»; focusRow = «la última fila que tocó el ratón»: no se suelta al pasar por un
    // hueco entre barras (si se soltara, las de delante parpadearían), solo al salir de la caja
    let hovered: Bar | null = null
    let focusRow: number | null = null
    let drag: { id: number; startX: number; startY: number; lastX: number; lastY: number; turning: boolean } | null = null

    /* Lo que hay bajo el puntero. De lo que cruza el rayo, se prefiere la primera barra que no esté translúcida: si
     * el ratón pasa por una barra que se ve a través, cuenta la de detrás, que es la que se está mirando */
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const meshes = bars.map(bar => bar.mesh)
    const canvas = renderer.domElement
    const barAt = (event: PointerEvent): Bar | null => {
      const box = canvas.getBoundingClientRect()
      pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(meshes, false).map(hit => bars[hit.object.userData.bar as number])
      return hits.find(bar => bar.opacity > 0.6) ?? hits[0] ?? null
    }

    // requestDraw = «pide un fotograma». Con la escena animada el bucle ya dibuja; quieta (movimiento reducido,
    // teléfono) no hay bucle y la escena se dibuja ella misma, sin que el reloj avance
    let lastDrawAt = 0
    let drawRequest = 0
    const requestDraw = () => {
      if (drawRequest) return
      drawRequest = requestAnimationFrame(() => {
        drawRequest = 0
        if (lastElapsed >= 0 && performance.now() - lastDrawAt > 34) renderFrame(lastElapsed)
      })
    }

    const setHovered = (bar: Bar | null) => {
      hovered = bar
      if (bar) focusRow = bar.row
      canvas.style.cursor = bar ? 'pointer' : 'grab'
      requestDraw()
    }
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, turning: false }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (drag && event.pointerId === drag.id) {
        if (!drag.turning && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < DRAG_THRESHOLD_PX) return
        if (!drag.turning) {
          drag.turning = true
          canvas.setPointerCapture(event.pointerId)
          goal = null
          hovered = null
          if (!moved) {
            moved = true
            emit.viewMoved(true)
          }
        }
        // Arrastrar es como agarrar la maqueta: a la derecha la gira hacia la derecha, hacia abajo la inclina hacia
        // quien mira. Con el dedo solo de lado: de arriba abajo es para mover la página
        azimuth = clamp(azimuth - (event.clientX - drag.lastX) * TURN_PER_PX.azimuth, BASE_AZIMUTH - AZIMUTH_REACH, BASE_AZIMUTH + AZIMUTH_REACH)
        if (event.pointerType !== 'touch') elevation = clamp(elevation + (event.clientY - drag.lastY) * TURN_PER_PX.elevation, ELEVATION_MIN, ELEVATION_MAX)
        drag.lastX = event.clientX
        drag.lastY = event.clientY
        canvas.style.cursor = 'grabbing'
        requestDraw()
        return
      }
      if (event.pointerType !== 'touch') setHovered(barAt(event))
    }
    const onPointerUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return
      const tapped = !drag.turning
      if (drag.turning && canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId)
      drag = null
      const bar = barAt(event)
      if (tapped && bar) emit.pick(data.metrics[bar.row].id)
      if (event.pointerType !== 'touch') setHovered(bar)
      else requestDraw()
    }
    const onPointerCancel = () => {
      drag = null
    }
    const onPointerLeave = () => {
      if (drag?.turning) return
      hovered = null
      focusRow = null
      requestDraw()
    }
    const resetView = () => {
      goal = { azimuth: BASE_AZIMUTH, elevation: BASE_ELEVATION }
      requestDraw()
    }
    controls.onResetView(resetView)
    // pan-y: con el dedo, deslizar de arriba abajo sigue moviendo la página; de lado gira la maqueta
    canvas.style.touchAction = 'pan-y'
    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerCancel)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('dblclick', resetView)

    /* El encuadre: lo que de verdad se dibuja (la peana, las barras ya crecidas con su cifra y los rótulos), proyectado
     * en la cámara, cabe siempre con margen. Una caja entera dejaba vacías sus esquinas. Se rehace en cada fotograma:
     * cambia al girar, y el ancho de los rótulos cambia cuando llega la letra */
    let viewWidth = width
    let viewHeight = height
    // compact = «caja estrecha (teléfono)»: solo se nombra la fila elegida, los seis nombres no caben legibles
    const compact = () => viewWidth < COMPACT_WIDTH
    const projected = new THREE.Vector3()
    const point = new THREE.Vector3()
    let minX = 0, maxX = 0, minY = 0, maxY = 0
    // extend = «la caja crece hasta este punto, más lo que ocupa en pantalla a cada lado»
    const extend = (at: THREE.Vector3, left = 0, right = 0, down = 0, up = 0) => {
      projected.copy(at).applyMatrix4(camera.matrixWorldInverse)
      minX = Math.min(minX, projected.x - left); maxX = Math.max(maxX, projected.x + right)
      minY = Math.min(minY, projected.y - down); maxY = Math.max(maxY, projected.y + up)
    }
    const plinthEdge = { x: [-STEP / 2 - 0.15, (columns - 1) * STEP + STEP / 2 + 0.15], z: [-STEP / 2 - 0.15, (rows - 1) * STEP + STEP / 2 + 0.15] }
    const measure = () => {
      minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity
      for (const x of plinthEdge.x) for (const z of plinthEdge.z) extend(point.set(x, 0, z))
      for (const bar of bars) {
        const top = PLINTH + bar.height
        for (const dx of [-BAR / 2, BAR / 2]) for (const dz of [-BAR / 2, BAR / 2]) extend(point.set(bar.column * STEP + dx, top, bar.row * STEP + dz))
        const pill = bar.label.scale
        extend(point.set(bar.column * STEP, top + PILL_GAP + pill.y / 2, bar.row * STEP), pill.x / 2, pill.x / 2, pill.y / 2, pill.y / 2)
      }
      // En la caja estrecha solo cuenta el nombre que se ve: el de la fila elegida
      const named = compact() ? rowLabels.filter(row => row.id === getSelected()) : rowLabels
      for (const row of named) extend(row.on.position, 0, Math.max(row.on.scale.x, row.off.scale.x), row.on.scale.y / 2, row.on.scale.y / 2)
      for (const sprite of weekLabels) extend(sprite.position, sprite.scale.x / 2, sprite.scale.x / 2, sprite.scale.y / 2, sprite.scale.y / 2)
    }
    // fit = «encuadra lo medido en la caja»; devuelve los píxeles por unidad de la escena
    const fit = () => {
      measure()
      const aspect = viewWidth / viewHeight
      let halfWidth = ((maxX - minX) / 2) * 1.03
      let halfHeight = ((maxY - minY) / 2) * 1.05
      if (halfWidth / halfHeight < aspect) halfWidth = halfHeight * aspect
      else halfHeight = halfWidth / aspect
      const centerX = (minX + maxX) / 2
      const centerY = (minY + maxY) / 2
      Object.assign(camera, { left: centerX - halfWidth, right: centerX + halfWidth, top: centerY + halfHeight, bottom: centerY - halfHeight })
      camera.updateProjectionMatrix()
      return viewHeight / (halfHeight * 2)
    }
    // scaleLabels = «los rótulos, a `grow` veces su alto»; el ancho sale de su lienzo, que cambia al llegar la letra
    const scaleLabels = (grow: number) => {
      for (const sprite of labels) {
        const image = sprite.material.map?.image as { width: number; height: number } | undefined
        if (!image?.height) continue
        const worldHeight = (sprite.userData.worldHeight as number) * grow
        sprite.scale.set(worldHeight * (image.width / image.height), worldHeight, 1)
      }
    }
    const placeCamera = () => {
      camera.position.copy(orbitPosition(target, 30, azimuth + Math.sin(swayClock * 0.12) * 0.05 * sway, elevation))
      camera.lookAt(target)
      camera.updateMatrixWorld()
      // Una caja chica encoge la maqueta y con ella los rótulos: se agrandan hasta MIN_LABEL_PX y se vuelve a encuadrar
      // (dos pasadas bastan: al agrandarlos la maqueta encoge un poco más)
      let pixelsPerUnit = fit()
      for (let pass = 0; pass < 2; pass += 1) {
        scaleLabels(Math.min(MAX_LABEL_GROW, Math.max(1, MIN_LABEL_PX / (0.26 * pixelsPerUnit))))
        pixelsPerUnit = fit()
      }
    }

    // measureBar = «lo que ocupa la barra en pantalla, tal como está ahora, y lo cerca que está de la cámara»
    const measureBar = (bar: Bar) => {
      const rect = bar.rect
      rect.minX = Infinity; rect.maxX = -Infinity; rect.minY = Infinity; rect.maxY = -Infinity
      const x = bar.column * STEP
      const z = bar.row * STEP
      const top = PLINTH + bar.mesh.scale.y
      for (const y of [PLINTH, top]) {
        for (const dx of [-BAR / 2, BAR / 2]) {
          for (const dz of [-BAR / 2, BAR / 2]) {
            projected.set(x + dx, y, z + dz).applyMatrix4(camera.matrixWorldInverse)
            rect.minX = Math.min(rect.minX, projected.x); rect.maxX = Math.max(rect.maxX, projected.x)
            rect.minY = Math.min(rect.minY, projected.y); rect.maxY = Math.max(rect.maxY, projected.y)
          }
        }
      }
      // En la vista de la cámara se mira hacia -z: cuanto mayor la z, más cerca
      rect.depth = projected.set(x, (PLINTH + top) / 2, z).applyMatrix4(camera.matrixWorldInverse).z
    }
    // overlaps = «a y b se pisan en pantalla» (con un margen, para que rozarse no cuente)
    const overlaps = (a: Rect, b: Rect, margin = 0.04) => a.minX < b.maxX - margin && a.maxX > b.minX + margin && a.minY < b.maxY - margin && a.maxY > b.minY + margin
    // covers = «a está delante de b y lo pisa»
    const covers = (a: Rect, b: Rect) => a.depth > b.depth && overlaps(a, b)
    // labelRect = «lo que ocupa en pantalla el nombre de una fila» (va anclado por su izquierda)
    const labelRect = (sprite: THREE.Sprite): Rect => {
      projected.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse)
      return { minX: projected.x, maxX: projected.x + sprite.scale.x, minY: projected.y - sprite.scale.y / 2, maxY: projected.y + sprite.scale.y / 2, depth: 0 }
    }
    // pillRect = «lo que ocupa en pantalla una cifra» (va centrada)
    const pillRect = (sprite: THREE.Sprite): Rect => {
      projected.copy(sprite.position).applyMatrix4(camera.matrixWorldInverse)
      return { minX: projected.x - sprite.scale.x / 2, maxX: projected.x + sprite.scale.x / 2, minY: projected.y - sprite.scale.y / 2, maxY: projected.y + sprite.scale.y / 2, depth: 0 }
    }

    // restingSeconds = «cuando ya crecieron todas»: lo que se dibuja con movimiento reducido
    const growDelay = (bar: Bar) => 0.15 + (bar.row + bar.column) * 0.05
    const restingSeconds = 0.15 + (rows + columns) * 0.05 + 1.1
    let lastElapsed = -1
    let lastHoverKey = ''

    const renderFrame = (elapsed: number) => {
      lastDrawAt = performance.now()
      // Con el reloj quieto (movimiento reducido, o un dibujo pedido) todo salta a su sitio; si corre, se funde
      const delta = lastElapsed < 0 ? 0 : elapsed - lastElapsed
      lastElapsed = elapsed
      const blend = delta > 0 ? 1 - Math.exp(-delta * 10) : 1
      const selectedId = getSelected()
      const selectedRow = data.metrics.findIndex(metric => metric.id === selectedId)
      const focus = focusRow ?? selectedRow

      /* La cámara: vuelve a su sitio si se pidió, y se mece solo si nadie la está mirando con el ratón */
      if (goal) {
        azimuth += (goal.azimuth - azimuth) * blend
        elevation += (goal.elevation - elevation) * blend
        if (Math.abs(goal.azimuth - azimuth) + Math.abs(goal.elevation - elevation) < 0.002) {
          azimuth = goal.azimuth
          elevation = goal.elevation
          goal = null
          moved = false
          emit.viewMoved(false)
        }
      }
      swayClock += delta
      sway += ((moved || drag || focusRow !== null ? 0 : 1) - sway) * blend

      for (const bar of bars) {
        const grown = bar.height * easeOutCubic((elapsed - growDelay(bar)) / 0.9)
        const heightNow = Math.max(0.001, grown)
        bar.mesh.scale.y = heightNow
        bar.mesh.position.y = PLINTH + heightNow / 2
      }
      placeCamera()

      /* Qué tapa la fila en foco: se mide en pantalla, así vale para cualquier giro */
      for (const bar of bars) measureBar(bar)
      const focused = bars.filter(bar => bar.row === focus)
      for (const bar of bars) {
        const selected = bar.row === selectedRow
        const inTheWay = bar.row !== focus && focused.some(other => covers(bar.rect, other.rect))
        bar.opacity += ((inTheWay ? SEE_THROUGH : 1) - bar.opacity) * blend
        const material = bar.mesh.material
        material.opacity = (bar.empty ? 0.35 : 1) * bar.opacity
        // Translúcida no escribe profundidad ni hace sombra: se ve a través de ella lo de detrás, sin manchas
        material.depthWrite = bar.opacity > 0.95
        bar.mesh.castShadow = bar.opacity > 0.6
        material.color.lerp(colorOf(bar, selected), blend)
        bar.glow += ((bar === hovered ? 1 : 0) - bar.glow) * blend
        material.emissive.copy(material.color)
        material.emissiveIntensity = colors.glow * bar.glow
      }

      /* Los rótulos sobre la maqueta. Al girarla (o en una caja chica) pueden caer unos sobre otros: el que pisaría a
       * otro ya puesto se calla. Van por orden: los nombres encendidos (fila elegida y fila del ratón), las cifras y
       * los demás nombres. Todas las barras llevan su cifra, la de la fila elegida destacada y las demás discretas;
       * entre ellas va primero la fila elegida (su última semana delante), luego la del ratón y luego las más cercanas
       * a la cámara. La cifra de una barra translúcida va a media luz, como ella */
      const isLit = (row: number) => row === selectedRow || row === focusRow
      const placed: Rect[] = []
      const place = (sprite: THREE.Sprite, rect: Rect, always = false) => {
        sprite.visible = always || !placed.some(other => overlaps(rect, other, 0))
        if (sprite.visible) placed.push(rect)
      }
      for (const [row, names] of rowLabels.entries()) {
        names.on.visible = false
        names.off.visible = false
        if (isLit(row)) place(names.on, labelRect(names.on), true)
      }
      // Cada cifra tiene dos sitios: encima de su barra o, si ahí choca y la barra es alta, sobre su cara (siempre que
      // ninguna barra opaca de delante tape esa cara). Para que no parpadeen con el vaivén, una cifra que ya se veía
      // aguanta un roce y una oculta necesita algo de hueco para volver, y cada una prueba primero el sitio de antes
      const priority = (bar: Bar) => (bar.row === selectedRow ? (bar.column === columns - 1 ? 0 : 1) : bar.row === focusRow ? 2 : 3)
      for (const bar of [...bars].sort((a, b) => priority(a) - priority(b) || b.rect.depth - a.rect.depth)) {
        const strong = bar.row === selectedRow
        const sprite = strong ? bar.label : bar.soft
        const other = strong ? bar.soft : bar.label
        const wasShown = sprite.visible
        other.visible = false
        sprite.visible = false
        sprite.material.opacity = bar.opacity < 0.9 ? 0.6 : 1
        // Mientras crecen, la cifra sale cuando la barra ya casi llegó
        if (bar.mesh.scale.y < bar.height * 0.6) continue
        const margin = wasShown ? 0.05 : -0.04
        const slots = bar.pillSlot === 'face' ? (['face', 'top'] as const) : (['top', 'face'] as const)
        for (const slot of slots) {
          const height = bar.mesh.scale.y
          if (slot === 'face' && height < sprite.scale.y * 2.6) continue
          sprite.position.set(bar.column * STEP, slot === 'top' ? PLINTH + height + PILL_GAP + sprite.scale.y / 2 : PLINTH + height * 0.55, bar.row * STEP)
          const rect = pillRect(sprite)
          if (placed.some(taken => overlaps(rect, taken, margin))) continue
          if (slot === 'face' && bars.some(front => front !== bar && front.opacity > 0.9 && front.rect.depth > bar.rect.depth && overlaps(rect, front.rect, 0))) continue
          sprite.visible = true
          bar.pillSlot = slot
          placed.push(rect)
          break
        }
      }
      if (!compact()) {
        for (const [row, names] of rowLabels.entries()) if (!isLit(row)) place(names.off, labelRect(names.off))
      }

      /* Lo que se cuenta de la barra bajo el ratón: dónde cae su techo en la caja, para poner ahí el rótulo de fuera */
      if (hovered && !drag?.turning) {
        point.set(hovered.column * STEP, PLINTH + hovered.mesh.scale.y, hovered.row * STEP).project(camera)
        const x = ((point.x + 1) / 2) * viewWidth
        const y = ((1 - point.y) / 2) * viewHeight
        const metric = data.metrics[hovered.row]
        const key = `${metric.id}|${hovered.column}|${Math.round(x)}|${Math.round(y)}|${hovered.row === selectedRow}|${viewWidth}`
        if (key !== lastHoverKey) {
          lastHoverKey = key
          emit.hover({ id: metric.id, name: metric.name, week: data.weeks[hovered.column], value: metric.labels[hovered.column] ?? '—', selected: hovered.row === selectedRow, x, y, width: viewWidth })
        }
      } else if (lastHoverKey) {
        lastHoverKey = ''
        emit.hover(null)
      }

      renderer.render(scene, camera)
    }

    emit.viewMoved(false)

    return {
      restingSeconds,
      renderFrame,
      resize: (nextWidth, nextHeight) => {
        viewWidth = nextWidth
        viewHeight = nextHeight
      },
      dispose: () => {
        cancelAnimationFrame(drawRequest)
        canvas.removeEventListener('pointerdown', onPointerDown)
        canvas.removeEventListener('pointermove', onPointerMove)
        canvas.removeEventListener('pointerup', onPointerUp)
        canvas.removeEventListener('pointercancel', onPointerCancel)
        canvas.removeEventListener('pointerleave', onPointerLeave)
        canvas.removeEventListener('dblclick', resetView)
        controls.onResetView(() => {})
        emit.hover(null)
        disposeTree(scene)
      },
    }
  }
}
