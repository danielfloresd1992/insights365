import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { LastTouch } from '../hook/tableActivity'

/*  EL GERENTE EN PÍXELES, AL LADO DE LA ÚLTIMA MESA QUE TOCÓ (pedido del usuario)
 *
 *  Un muñeco de píxeles al estilo de las consolas de 8 bits, del alto de la mesa y vestido de gerente (camisa verde
 *  lima de manga larga con placa dorada y pantalón negro), que se pone al lado de la mesa del último toque de gerente del
 *  día. Cuando llega un toque en otra mesa, camina solo hasta ella: primero de lado y luego de frente, con las piernas
 *  alternando. Quieto, respira (sube y baja un píxel). Solo se ve mientras la mesa de ese toque sigue ocupada: al
 *  desocuparse se esconde, y con el toque siguiente sale andando desde donde estaba.
 *  Su cartel, «Última mesa tocada por el Gerente» con la mesa, quién y a qué hora, sale solo al pasarle el ratón (o al
 *  enfocarlo con el teclado: el muñeco se puede enfocar y el lector de pantalla lee el cartel), del lado contrario a la
 *  mesa para no taparla, y del otro si ahí no cabe.
 *  Va en coordenadas de pantalla, encima del plano: recibe dónde se pinta el plano (left, top, scale) y se coloca él
 *  solo, así que al andar solo se vuelve a pintar él y no todo el croquis. No se pulsa.
 *  Con movimiento reducido no camina ni respira: aparece en la mesa nueva.
 *
 *  @param spot     dónde se pone, en unidades del croquis: la mesa (su tableKey), el recuadro del muñeco a su lado y si
 *                  el cartel va debajo (el muñeco está debajo de la mesa) o encima
 *  @param touch    el último toque: la mesa, quién y a qué hora
 *  @param left, top, scale  cómo se pinta el plano en pantalla
 *  @param width, height  lo que mide el visor, para que el cartel no se salga
 *  @param topRoom  la franja de arriba que tapa la leyenda: el cartel no se mete en ella
 *  @param dimmed   la mesa es de otra zona que la elegida: el muñeco se apaga y el cartel se calla
 *  @param hidden   la mesa del último toque ya no está ocupada: no se pinta (pero recuerda dónde estaba)
 */
export type ManagerSpot = { key: string; x: number; y: number; w: number; h: number; tagBelow: boolean }

type ManagerWalkerProps = {
  spot: ManagerSpot
  touch: LastTouch
  left: number
  top: number
  scale: number
  width: number
  height: number
  topRoom: number
  dimmed: boolean
  hidden: boolean
}

// El muñeco, píxel a píxel (16 × 20, de frente): camisa verde lima de manga larga (cuello abierto, tapeta y placa dorada de
// gerente), pantalón negro y zapatos marrones (pedido del usuario). Cada letra es un color de PALETTE; el punto,
// transparente. BODY = «de la cabeza a la cadera»; LEGS_STILL = «las piernas juntas» (quieto) y LEGS_STEP = «abiertas»
// (el paso)
const BODY = [
  '......KKKK......',
  '.....KHHHHK.....',
  '....KHHHHHHK....',
  '....KHSSSSHK....',
  '....KSSSSSSK....',
  '....KSKSSKSK....',
  '....KSSSSSSK....',
  '.....KSSSSK.....',
  '...KKgGSSGgKK...',
  '..KGGGGggGGGGK..',
  '..KGGGGggGYGGK..',
  '..KGKGGggGGKGK..',
  '..KGKGGggGGKGK..',
  '..KSKPPPPPPKSK..',
  '..KKKPPPPPPKKK..',
  '.....KPPPPK.....',
]
const LEGS_STILL = ['.....KPKKPK.....', '.....KPKKPK.....', '....BBB..BBB....', '................']
const LEGS_STEP = ['.....KPKKPK.....', '....KPK..KPK....', '...BBB....BBB...', '................']

// PALETTE = «los colores del muñeco», pocos y planos, como en una consola de 8 bits
const PALETTE: Record<string, string> = {
  K: '#101010', // contorno
  H: '#5a3410', // pelo
  S: '#f8b898', // piel
  G: '#b8f818', // camisa, verde lima claro (pedido del usuario)
  g: '#6fa80a', // cuello y tapeta de la camisa, el mismo lima más hondo
  Y: '#f8b800', // placa de gerente
  P: '#262626', // pantalón
  B: '#6b3a12', // zapatos
}

// framePaths = «un cuadro del muñeco como un trazo por color», un cuadrado de 1 × 1 por píxel
function framePaths(rows: string[]) {
  const byColor = new Map<string, string>()
  rows.forEach((row, y) =>
    [...row].forEach((cell, x) => {
      if (cell !== '.') byColor.set(cell, `${byColor.get(cell) ?? ''}M${x} ${y}h1v1h-1z`)
    }),
  )
  return [...byColor].map(([cell, d]) => ({ fill: PALETTE[cell], d }))
}
const FRAMES = [framePaths([...BODY, ...LEGS_STILL]), framePaths([...BODY, ...LEGS_STEP])]

// SPEED = «lo que anda por segundo», en unidades del croquis; WALK_MIN_MS / WALK_MAX_MS = «lo que tarda como poco y
// como mucho» (una mesa al lado no es un salto; una al otro lado del local no se hace eterna); STEP_MS = «cada cuánto
// cambia de pierna»
const SPEED = 260
const WALK_MIN_MS = 700
const WALK_MAX_MS = 3200
const STEP_MS = 150

// TAG_WIDTH = «el ancho del cartel» y TAG_ROOM = «lo que ocupa de alto, con su separación», en píxeles de pantalla
const TAG_WIDTH = 240
const TAG_ROOM = 52

type Point = { x: number; y: number }

export default function ManagerWalker({ spot, touch, left, top, scale, width, height, topRoom, dimmed, hidden }: ManagerWalkerProps) {
  const { t } = useTranslation()
  const [pos, setPos] = useState<Point | null>(null)
  const [walking, setWalking] = useState(false)
  const [frame, setFrame] = useState(0)
  // pointedAt = «la mesa junto a la que estaba el muñeco cuando el ratón se le puso encima (o tuvo el foco)»: sale su
  // cartel mientras siga ahí; si se esconde o se va a otra mesa sin que el ratón salga, el cartel no se queda colgado
  const [pointedAt, setPointedAt] = useState<string | null>(null)
  // current = «dónde está ahora», para que un paseo nuevo salga de donde se quedó el anterior; lastKey = «la mesa a
  // la que iba»: si la mesa es la misma y solo se movió el dibujo (el croquis se giró o se repartió), no camina
  const current = useRef<Point | null>(null)
  const lastKey = useRef<string | null>(null)

  useEffect(() => {
    const from = current.current
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const jump = !from || lastKey.current === spot.key || reduced
    lastKey.current = spot.key
    let raf = 0

    if (jump) {
      raf = requestAnimationFrame(() => {
        current.current = { x: spot.x, y: spot.y }
        setPos(current.current)
        setWalking(false)
      })
      return () => cancelAnimationFrame(raf)
    }

    // El camino: primero de lado y luego de frente, como en los juegos de 8 bits
    const across = Math.abs(spot.x - from.x)
    const along = Math.abs(spot.y - from.y)
    const total = across + along
    const duration = Math.min(WALK_MAX_MS, Math.max(WALK_MIN_MS, (total / SPEED) * 1000))
    let start = -1
    const step = (now: number) => {
      if (start < 0) start = now
      const progress = Math.min(1, (now - start) / duration)
      const done = progress * total
      const next =
        done <= across
          ? { x: from.x + Math.sign(spot.x - from.x) * done, y: from.y }
          : { x: spot.x, y: from.y + Math.sign(spot.y - from.y) * (done - across) }
      current.current = next
      setPos(next)
      setWalking(progress < 1)
      setFrame(Math.floor((now - start) / STEP_MS) % 2)
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [spot.key, spot.x, spot.y])

  if (!pos || hidden) return null

  const x = left + pos.x * scale
  const y = top + pos.y * scale
  const w = spot.w * scale
  const h = spot.h * scale
  // El cartel, centrado sobre el muñeco y sin salirse por los lados; del lado que pide su sitio (el contrario a la
  // mesa) y, si ahí no cabe (la leyenda arriba, el borde abajo), del otro
  const tagLeft = Math.min(Math.max(x + w / 2 - TAG_WIDTH / 2, 8), Math.max(8, width - TAG_WIDTH - 8))
  const roomAbove = y - TAG_ROOM > topRoom
  const roomBelow = y + h + TAG_ROOM < height
  const above = spot.tagBelow ? !roomBelow && roomAbove : roomAbove || !roomBelow
  const label = t('tables.manager.lastTouch')
  const detail = t('tables.manager.detail', { table: touch.table, name: touch.name, hour: touch.hour })

  return (
    <>
      <div
        role='img'
        aria-label={`${label}. ${detail}`}
        tabIndex={0}
        onPointerEnter={() => setPointedAt(spot.key)}
        onPointerLeave={() => setPointedAt(null)}
        onFocus={() => setPointedAt(spot.key)}
        onBlur={() => setPointedAt(null)}
        className={`absolute z-[5] rounded-[3px] outline-none transition-opacity focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#e9b949] ${dimmed ? 'opacity-35' : ''}`}
        style={{ left: x, top: y, width: w, height: h }}
      >
        <svg
          viewBox='0 0 16 20'
          width='100%'
          height='100%'
          shapeRendering='crispEdges'
          className={walking ? '' : 'manager-idle'}
          style={{ transform: walking && frame === 1 ? 'translateY(-5%)' : undefined, filter: 'drop-shadow(2px 2px 0 rgb(0 0 0 / 0.3))' }}
        >
          {FRAMES[walking ? frame : 0].map(part => (
            <path key={part.fill} d={part.d} fill={part.fill} />
          ))}
        </svg>
      </div>
      {pointedAt === spot.key && !dimmed && (
        <p
          aria-hidden='true'
          className='pointer-events-none absolute z-[6] m-0 rounded-[3px] bg-[#101010] px-2.5 py-1.5 text-center text-[11.5px] font-semibold leading-tight text-[#fcfcfc] shadow-[0_0_0_2px_#fcfcfc,0_0_0_4px_#101010]'
          style={{ left: tagLeft, top: above ? y - 10 : y + h + 10, width: TAG_WIDTH, transform: above ? 'translateY(-100%)' : undefined }}
        >
          <span className='block'>{label}</span>
          <span className='block font-medium text-[#f8b800]'>{detail}</span>
        </p>
      )}
    </>
  )
}
