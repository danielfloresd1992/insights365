import { useCallback, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { FloorPlan } from '@/ajax/tables.ajax'
import { PathIcon } from '@/components/PortalIcons'
import { EMPTY_DAY, isTable, phaseOf, tableKey, type LastTouch, type TableCycle, type TableDay, type TablePhase } from '../hook/tableActivity'
import { BROOM_ICON, SERVED_ICON } from './icons'
import ManagerWalker, { type ManagerSpot } from './ManagerWalker'
import RotationCard from './RotationCard'

/*  EL CROQUIS, VISTO DESDE ARRIBA. Solo pinta.
 *
 *  Propuesta A del lienzo «Croquis en la columna del panel en vivo»: el plano ocupa todo el hueco (se escala para
 *  caber, sin deformarse), cada zona es una placa en el suelo con su nombre, y cada mesa un bloque con algo de altura
 *  (una sombra hacia abajo a la derecha). El color dice en qué punto del ciclo está la mesa (hook/tableActivity,
 *  phaseOf), y lo que espera algo titila con el blanco (.table-blink, en index.css):
 *    ESPERA    ocupada sin primera atención: titila entre verde y blanco
 *    OCUPADA   con la primera atención: verde
 *    SERVIDA   todo lo pedido entregado, por irse: amarillo
 *    LIMPIEZA  desocupada, por limpiar: titila entre amarillo y blanco, con una escoba
 *    LIBRE     limpia, o sin rotación abierta: blanco
 *  En la esquina, las rotaciones de hoy.
 *  Al pasar el ratón por una mesa (o al enfocarla con el teclado) sale su tarjeta con el ciclo de la rotación
 *  (RotationCard), al lado de la mesa; al pulsarla, la tarjeta se queda hasta pulsarla otra vez.
 *  Las barras y los muebles se dibujan, pero no se pueden pulsar ni llevan cifras; los grandes, con su nombre.
 *  Al lado de la mesa del último toque de gerente del día, mientras siga ocupada, está el gerente en píxeles
 *  (ManagerWalker): a su izquierda, a su derecha, debajo o encima, en el primer sitio libre. Con cada toque nuevo camina
 *  a la mesa; su cartel sale al pasarle el ratón.
 *
 *  @param plan      el croquis
 *  @param byTable   lo de hoy de cada mesa, por su tableKey
 *  @param cycles    la rotación de cada mesa que enseña su tarjeta, por su tableKey
 *  @param zone      la zona elegida, o null para todas: las demás mesas se apagan
 *  @param selected  el tableKey de la mesa elegida (su tarjeta fija), o null
 *  @param onSelect  elegir una mesa (o soltarla, con null)
 *  @param topRoom   la franja de arriba que se deja libre para la leyenda del visor, en píxeles de pantalla (la mide
 *                   el visor: crece si la leyenda pasa a dos líneas)
 *  @param lastTouch  el último toque de gerente del día (la mesa, quién y a qué hora), o null si no hubo
 *  @param autoLayout  repartir las zonas solas para que las mesas salgan más grandes (en el móvil): cada zona se
 *                     mueve entera, en filas y en el orden en que se leen, sin tocar cómo están sus mesas
 *                     (packedLayouts). Solo si así crecen bastante (PACK_GAIN), o si el croquis tal cual está
 *                     apretado (crowded: nombres que pisan otra zona) y repartido apenas encogen (PACK_KEEP)
 */
type FloorPlanStageProps = {
  plan: FloorPlan
  byTable: Map<string, TableDay>
  cycles: Map<string, TableCycle>
  zone: string | null
  selected: string | null
  onSelect: (key: string | null) => void
  topRoom: number
  lastTouch: LastTouch | null
  autoLayout?: boolean
}

// MANAGER_GAP = «la separación entre el gerente y su mesa», en unidades del croquis; MANAGER_RATIO = «su ancho frente
// a su alto» (el muñeco es de 16 × 20 píxeles)
const MANAGER_GAP = 6
const MANAGER_RATIO = 0.8

// PLATE_PAD = «cuánto sobresale la placa de una zona de sus mesas», LABEL_ROOM = «el sitio de su nombre, encima»
const PLATE_PAD = 14
const LABEL_ROOM = 44// CARD_WIDTH = «el ancho de la tarjeta de una mesa» (RotationCard) y CARD_GAP = «su separación de la mesa»
const CARD_WIDTH = 280
const CARD_GAP = 10

// LOOK = «el aspecto de una mesa según su fase» y BLINK = «las fases que titilan, y con qué color»
const GREEN = 'bg-[#29c50c] text-[#0d2a06]'
const YELLOW = 'bg-[#e9b949] text-[#2b2418]'
const LOOK: Record<TablePhase, string> = {
  espera: GREEN,
  ocupada: GREEN,
  servida: YELLOW,
  limpieza: YELLOW,
  libre: 'bg-white text-portal-ink ring-2 ring-inset ring-portal-ring dark:bg-[#efe7d4] dark:text-[#3a342a] dark:ring-0',
}
const BLINK: Partial<Record<TablePhase, string>> = {
  espera: 'table-blink table-blink-green',
  limpieza: 'table-blink table-blink-yellow',
}

// TURN_GAIN = «cuánto más grande tiene que salir el croquis girado para girarlo» (un 15 %)
const TURN_GAIN = 1.15

// Plate = «la placa de una zona»; PlanLayout = «un croquis listo para dibujar»: sus placas, el recuadro de todo lo que
// se dibuja (con el nombre de cada zona encima) y lo que mide ese recuadro con su margen
type Plate = { id: string; label: string; x0: number; y0: number; x1: number; y1: number }
type PlanLayout = { plan: FloorPlan; plates: Plate[]; bounds: { x0: number; y0: number; x1: number; y1: number }; width: number; height: number }

// layoutOf = «las placas de las zonas (el rectángulo de sus piezas) y el recuadro de todo lo que se dibuja»
function layoutOf(plan: FloorPlan): PlanLayout {
  const plates = plan.zonas
    .map(zona => {
      const pieces = plan.piezas.filter(piece => piece.zona === zona.id)
      if (!pieces.length) return null
      const x0 = Math.min(...pieces.map(p => p.x)) - PLATE_PAD
      const y0 = Math.min(...pieces.map(p => p.y)) - PLATE_PAD
      const x1 = Math.max(...pieces.map(p => p.x + p.w)) + PLATE_PAD
      const y1 = Math.max(...pieces.map(p => p.y + p.h)) + PLATE_PAD
      return { id: zona.id, label: zona.label, x0, y0, x1, y1 }
    })
    .filter(plate => plate !== null)
  const all = [...plates.map(p => ({ x0: p.x0, y0: p.y0 - LABEL_ROOM, x1: p.x1, y1: p.y1 })), ...plan.piezas.map(p => ({ x0: p.x, y0: p.y, x1: p.x + p.w, y1: p.y + p.h }))]
  const bounds = all.length
    ? { x0: Math.min(...all.map(b => b.x0)), y0: Math.min(...all.map(b => b.y0)), x1: Math.max(...all.map(b => b.x1)), y1: Math.max(...all.map(b => b.y1)) }
    : { x0: 0, y0: 0, x1: plan.board.w, y1: plan.board.h }
  return { plan, plates, bounds, width: bounds.x1 - bounds.x0 + 16, height: bounds.y1 - bounds.y0 + 16 }
}

// PACK_GAIN = «cuánto más grandes tienen que salir las mesas para repartir las zonas» (un 10 %): si no, se deja el
// croquis como se dibujó. ZONE_GAP = «el hueco entre dos zonas repartidas», LABEL_CHAR = «lo que ocupa una letra del
// nombre de una zona» (para que el nombre no pise la zona de al lado) y PACK_STEPS = «cuántos anchos se prueban»,
// todo en unidades del croquis
const PACK_GAIN = 1.1
// PACK_KEEP = «cuánto pueden encoger las mesas al repartir las zonas cuando el croquis tal cual está apretado» (el
// nombre de una zona pisa otra, o dos zonas se montan): un 15 % como mucho
const PACK_KEEP = 0.85
const ZONE_GAP = 24
const LABEL_CHAR = 21
const PACK_STEPS = 24

// ZoneBlock = «una zona como bloque»: sus piezas, el rectángulo que ocupan y lo que mide el bloque con su placa y su
// nombre encima
type ZoneBlock = { pieces: FloorPlan['piezas']; x0: number; y0: number; w: number; h: number }

// zoneBlocks = «las zonas de un croquis como bloques, en el orden en que se leen»: de arriba abajo (por franjas de
// 120) y de izquierda a derecha
function zoneBlocks(plan: FloorPlan): ZoneBlock[] {
  return plan.zonas
    .map(zona => {
      const pieces = plan.piezas.filter(piece => piece.zona === zona.id)
      if (!pieces.length) return null
      const x0 = Math.min(...pieces.map(p => p.x))
      const y0 = Math.min(...pieces.map(p => p.y))
      const x1 = Math.max(...pieces.map(p => p.x + p.w))
      const y1 = Math.max(...pieces.map(p => p.y + p.h))
      return { pieces, x0, y0, w: Math.max(x1 - x0 + 2 * PLATE_PAD, zona.label.length * LABEL_CHAR + 8), h: y1 - y0 + 2 * PLATE_PAD + LABEL_ROOM }
    })
    .filter(block => block !== null)
    .sort((one, other) => Math.floor(one.y0 / 120) - Math.floor(other.y0 / 120) || one.x0 - other.x0)
}

// packPlan = «las zonas repartidas en filas, en el orden en que se leen, sin pasar de `width` de ancho»: cada zona se
// mueve entera y sus mesas quedan como estaban dentro de ella
function packPlan(plan: FloorPlan, blocks: ZoneBlock[], width: number): FloorPlan {
  const piezas: FloorPlan['piezas'] = []
  let cursorX = 0
  let cursorY = 0
  let rowHeight = 0
  let boardWidth = 0
  for (const block of blocks) {
    if (cursorX > 0 && cursorX + block.w > width) {
      cursorY += rowHeight + ZONE_GAP
      cursorX = 0
      rowHeight = 0
    }
    const dx = cursorX + PLATE_PAD - block.x0
    const dy = cursorY + LABEL_ROOM + PLATE_PAD - block.y0
    for (const piece of block.pieces) piezas.push({ ...piece, x: piece.x + dx, y: piece.y + dy })
    cursorX += block.w + ZONE_GAP
    rowHeight = Math.max(rowHeight, block.h)
    boardWidth = Math.max(boardWidth, cursorX - ZONE_GAP)
  }
  return { ...plan, board: { ...plan.board, w: Math.max(1, boardWidth), h: Math.max(1, cursorY + rowHeight) }, piezas }
}

// crowded = «el croquis está apretado»: el nombre de una zona pisa otra zona u otro nombre, o dos zonas se montan.
// Pasa sobre todo al girarlo, porque los nombres van encima de cada zona y el hueco entre zonas era de lado
function crowded({ plates }: PlanLayout): boolean {
  const nameOf = (plate: Plate) => ({ x0: plate.x0 + 4, y0: plate.y0 - LABEL_ROOM + 6, x1: plate.x0 + 4 + plate.label.length * LABEL_CHAR, y1: plate.y0 - 2 })
  const hit = (one: { x0: number; y0: number; x1: number; y1: number }, other: { x0: number; y0: number; x1: number; y1: number }) =>
    one.x0 < other.x1 && other.x0 < one.x1 && one.y0 < other.y1 && other.y0 < one.y1
  return plates.some((plate, index) =>
    plates.some((other, otherIndex) => index !== otherIndex && (hit(nameOf(plate), other) || hit(nameOf(plate), nameOf(other)) || hit(plate, other))),
  )
}

// packedLayouts = «las maneras de repartir las zonas que se prueban»: con el croquis tal cual y girado, y para cada
// uno, de todas en una fila a una zona por fila, pasando por PACK_STEPS anchos
function packedLayouts(plan: FloorPlan): PlanLayout[] {
  const layouts: PlanLayout[] = []
  for (const source of [plan, turnPlan(plan)]) {
    const blocks = zoneBlocks(source)
    if (blocks.length < 2) continue
    const widest = Math.max(...blocks.map(block => block.w))
    const total = blocks.reduce((sum, block) => sum + block.w, 0) + ZONE_GAP * (blocks.length - 1)
    for (let step = 0; step <= PACK_STEPS; step++) layouts.push(layoutOf(packPlan(source, blocks, widest + ((total - widest) * step) / PACK_STEPS)))
  }
  return layouts
}

// turnPlan = «el croquis girado un cuarto de vuelta, en el sentido del reloj»: lo de la izquierda queda arriba. Se
// giran las posiciones, no el dibujo, así que los números de las mesas y los nombres de las zonas siguen derechos
function turnPlan(plan: FloorPlan): FloorPlan {
  return {
    ...plan,
    board: { ...plan.board, w: plan.board.h, h: plan.board.w },
    piezas: plan.piezas.map(piece => ({ ...piece, x: plan.board.h - (piece.y + piece.h), y: piece.x, w: piece.h, h: piece.w })),
  }
}

export default function FloorPlanStage({ plan, byTable, cycles, zone, selected, onSelect, topRoom, lastTouch, autoLayout = false }: FloorPlanStageProps) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  // hovered = «la mesa bajo el ratón (o con el foco)»; su tarjeta manda sobre la de la mesa elegida
  const [hovered, setHovered] = useState<string | null>(null)
  // cardHeight = «el alto de la tarjeta», medido cada vez que cambia (su contenido depende de la rotación)
  const [cardHeight, setCardHeight] = useState(320)
  const cardObserver = useRef<ResizeObserver | null>(null)
  const watchCard = useCallback((node: HTMLDivElement | null) => {
    cardObserver.current?.disconnect()
    if (!node) return
    cardObserver.current = new ResizeObserver(() => setCardHeight(node.offsetHeight))
    cardObserver.current.observe(node)
  }, [])

  // Se vuelve a medir el hueco cada vez que cambia de tamaño
  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const measure = () => setSize({ width: element.clientWidth, height: element.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // El croquis tal cual y girado a lo alto, cada uno con sus placas y su recuadro
  const upright = useMemo(() => layoutOf(plan), [plan])
  const turned = useMemo(() => layoutOf(turnPlan(plan)), [plan])
  // Las zonas repartidas solas (solo con autoLayout): varias maneras, y se queda la que deja las mesas más grandes
  const packed = useMemo(() => (autoLayout ? packedLayouts(plan) : []), [plan, autoLayout])

  // El suelo es todo el recuadro del visor, de borde a borde (lo pinta el visor, con la leyenda encima: pedido del
  // usuario), y el plano se encaja en lo que queda bajo la leyenda sin deformarse: el alto entero, o el ancho si el
  // croquis es más apaisado. En una pantalla vertical (el móvil) un croquis apaisado sale mucho más grande girado a lo
  // alto: se gira solo cuando así crece bastante (TURN_GAIN); en el escritorio nunca pasa
  const room = Math.max(0, size.height - topRoom)
  const fit = (layout: PlanLayout) => (size.width && room ? Math.min(size.width / layout.width, room / layout.height) : 0)
  const asDrawn = fit(turned) > fit(upright) * TURN_GAIN ? turned : upright
  const bestPacked = packed.reduce<PlanLayout | null>((best, layout) => (!best || fit(layout) > fit(best) ? layout : best), null)
  // Se reparte si las mesas crecen bastante, o si el croquis tal cual está apretado y repartido apenas encogen
  const packWins = bestPacked !== null && (fit(bestPacked) > fit(asDrawn) * PACK_GAIN || (crowded(asDrawn) && fit(bestPacked) >= fit(asDrawn) * PACK_KEEP))
  const chosen = packWins && bestPacked ? bestPacked : asDrawn
  const { plan: drawn, plates, bounds, width, height } = chosen
  const scale = fit(chosen)
  const left = (size.width - width * scale) / 2 - (bounds.x0 - 8) * scale
  const top = topRoom + (room - height * scale) / 2 - (bounds.y0 - 8) * scale
  const zoneName = new Map(plan.zonas.map(zona => [zona.id, zona.label]))

  // La tarjeta: la de la mesa bajo el ratón o, si no hay, la de la elegida. Va al lado de la mesa (a la izquierda si
  // la mesa está en la mitad derecha, y al revés), centrada en ella y sin salirse del plano por ningún lado: para eso
  // se mide su alto de verdad (cardHeight, con un ResizeObserver)
  const shown = hovered ?? selected
  const shownPiece = shown ? drawn.piezas.find(piece => isTable(piece) && tableKey(piece.label) === shown) ?? null : null
  let cardStyle: CSSProperties | null = null
  if (shownPiece && scale > 0) {
    const leftX = left + shownPiece.x * scale
    const rightX = left + (shownPiece.x + shownPiece.w) * scale
    const centerY = top + (shownPiece.y + shownPiece.h / 2) * scale
    const side = (leftX + rightX) / 2 >= size.width / 2 ? leftX - CARD_GAP - CARD_WIDTH : rightX + CARD_GAP
    const x = Math.min(Math.max(side, 8), Math.max(8, size.width - CARD_WIDTH - 8))
    const y = Math.min(Math.max(centerY - cardHeight / 2, 8), Math.max(8, size.height - cardHeight - 8))
    cardStyle = { left: x, top: y }
  }

  // El gerente: del alto de la mesa (el lado corto, si la mesa es alargada), al lado de la mesa del último toque. Se
  // prueba en este orden: a la izquierda y a la derecha (con los pies a la altura de los de la mesa), debajo y encima
  // (centrado). Se queda en el primer sitio libre; si no hay ninguno, en el primero que no se sale del plano aunque
  // pise otra pieza; y si todos se salen, a la izquierda
  const touchedPiece = lastTouch ? drawn.piezas.find(piece => isTable(piece) && tableKey(piece.label) === lastTouch.key) ?? null : null
  let managerSpot: ManagerSpot | null = null
  if (lastTouch && touchedPiece) {
    const h = Math.min(touchedPiece.w, touchedPiece.h) - 6
    const w = Math.round(h * MANAGER_RATIO)
    const feet = touchedPiece.y + touchedPiece.h - 3 - h
    const centered = touchedPiece.x + (touchedPiece.w - w) / 2
    const spots = [
      { x: touchedPiece.x + 3 - MANAGER_GAP - w, y: feet },
      { x: touchedPiece.x + touchedPiece.w - 3 + MANAGER_GAP, y: feet },
      { x: centered, y: touchedPiece.y + touchedPiece.h - 3 + MANAGER_GAP },
      { x: centered, y: touchedPiece.y + 3 - MANAGER_GAP - h },
    ]
    const inside = ({ x, y }: { x: number; y: number }) => x >= bounds.x0 && x + w <= bounds.x1 && y >= bounds.y0 && y + h <= bounds.y1
    const free = ({ x, y }: { x: number; y: number }) =>
      !drawn.piezas.some(piece => piece.id !== touchedPiece.id && x < piece.x + piece.w && piece.x < x + w && y < piece.y + piece.h && piece.y < y + h)
    const spot = spots.find(place => inside(place) && free(place)) ?? spots.find(inside) ?? spots[0]
    // El cartel, del lado contrario a la mesa: debajo del gerente si él está debajo de ella, encima en los demás casos
    managerSpot = { key: lastTouch.key, x: spot.x, y: spot.y, w, h, tagBelow: spot === spots[2] }
  }

  return (
    <div ref={box} className='absolute inset-0'>
      {scale > 0 && (
        <div className='absolute left-0 top-0 origin-top-left' style={{ width: drawn.board.w, height: drawn.board.h, transform: `translate(${left}px, ${top}px) scale(${scale})` }}>
          {plates.map(plate => {
            const on = zone === plate.id
            return (
              <div key={plate.id} aria-hidden='true'>
                <div className={`absolute rounded-[14px] border-2 ${on ? 'border-[#29c50c] bg-[#29c50c]/8' : 'border-portal-line bg-portal-ink/[0.03]'}`} style={{ left: plate.x0, top: plate.y0, width: plate.x1 - plate.x0, height: plate.y1 - plate.y0 }} />
                <span className={`absolute whitespace-nowrap text-[28px] font-bold uppercase tracking-[0.08em] ${on ? 'text-[#2f8f1c] dark:text-[#7fdc5e]' : 'text-portal-muted'}`} style={{ left: plate.x0 + 4, top: plate.y0 - 38 }}>
                  {plate.label}
                </span>
              </div>
            )
          })}
          {drawn.piezas.map(piece => {
            const style = { left: piece.x + 3, top: piece.y + 3, width: piece.w - 6, height: piece.h - 6 }
            const round = piece.kind === 'redonda' ? 'rounded-full' : 'rounded-[6px]'
            if (!isTable(piece)) {
              // Los muebles grandes (la cocina, la barra) llevan su nombre, como en el plano; los estrechos (una banqueta), no
              return (
                <div key={piece.id} aria-hidden='true' className={`absolute grid place-items-center ${round} bg-portal-line text-[30px] font-bold uppercase tracking-[0.08em] text-portal-muted`} style={style}>
                  {Math.min(piece.w, piece.h) >= 80 && piece.label}
                </div>
              )
            }
            const key = tableKey(piece.label)
            const day = byTable.get(key) ?? EMPTY_DAY
            const cycle = cycles.get(key) ?? null
            const phase = phaseOf(cycle?.current ? cycle.rotation : null)
            const inZone = zone === null || piece.zona === zone
            const chosen = selected === key
            return (
              <button
                key={piece.id}
                type='button'
                onClick={() => onSelect(chosen ? null : key)}
                onPointerEnter={() => setHovered(key)}
                onPointerLeave={() => setHovered(current => (current === key ? null : current))}
                onFocus={() => setHovered(key)}
                onBlur={() => setHovered(current => (current === key ? null : current))}
                aria-pressed={chosen}
                aria-label={t('tables.tableAria', { label: piece.label, zone: zoneName.get(piece.zona) ?? '', rotations: day.rotations, state: t(`tables.phaseAria.${phase}`) })}
                className={`absolute grid place-items-center ${round} font-bold shadow-[5px_5px_0_rgb(0_0_0/0.3)] transition-[background-color,opacity] focus-visible:outline-[5px] focus-visible:outline-offset-4 focus-visible:outline-[#e9b949] ${LOOK[phase]} ${inZone ? (BLINK[phase] ?? '') : 'opacity-30'} ${chosen ? 'outline-[6px] outline-offset-4 outline-portal-ink' : ''}`}
                style={{ ...style, fontSize: piece.label.length > 3 ? 15 : 20 }}
              >
                {piece.label}
                {/* La escoba en la que está por limpiar y el plato servido en la que ya tiene entregado todo lo que pidió */}
                {(phase === 'limpieza' || phase === 'servida') && inZone && (
                  <span aria-hidden='true' className='absolute -bottom-3 -left-3 grid h-7 w-7 place-items-center rounded-full bg-[#2b2418] text-[#f0c95c] shadow-[0_0_0_3px_#e9b949]'>
                    <PathIcon d={phase === 'limpieza' ? BROOM_ICON : SERVED_ICON} size={17} strokeWidth={2.2} />
                  </span>
                )}
                {day.rotations > 0 && inZone && (
                  <span aria-hidden='true' className='absolute -right-3 -top-3 grid h-6 min-w-[26px] place-items-center rounded-full bg-portal-ink px-1.5 text-[16px] text-portal-page shadow-[0_0_0_3px_var(--color-portal-surface)] dark:shadow-[0_0_0_3px_#221e17]'>
                    {day.rotations}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Uno por local: al cambiar de croquis aparece en su mesa, no viene andando desde otro local. Si la mesa del
          último toque ya no está ocupada se esconde, pero sigue montado: con el toque siguiente sale andando desde ahí */}
      {scale > 0 && lastTouch && managerSpot && touchedPiece && (
        <ManagerWalker
          key={plan.establishment}
          spot={managerSpot}
          touch={lastTouch}
          left={left}
          top={top}
          scale={scale}
          width={size.width}
          height={size.height}
          topRoom={topRoom}
          dimmed={zone !== null && touchedPiece.zona !== zone}
          hidden={!lastTouch.occupied}
        />
      )}

      {shownPiece && cardStyle && (
        <div ref={watchCard} className='pointer-events-none absolute z-10' style={cardStyle}>
          <RotationCard
            label={shownPiece.label}
            zone={zoneName.get(shownPiece.zona) ?? ''}
            phase={phaseOf(cycles.get(shown ?? '')?.current ? cycles.get(shown ?? '')?.rotation : null)}
            cycle={cycles.get(shown ?? '') ?? null}
            day={byTable.get(shown ?? '') ?? EMPTY_DAY}
          />
        </div>
      )}
    </div>
  )
}
