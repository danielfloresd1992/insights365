import { useId } from 'react'
import { tweenLabel, useRevealValues } from '../hook/useRevealValues'
import type { BarSeries } from './BarChart'
import { niceMax } from './chartScale'

/*  LAS GRÁFICAS EN 3D DEL SEMANAL (propuesta B del lienzo «Semanal en 3D con iconos», elegida por el usuario). Solo
 *  pintan: las cifras llegan hechas.
 *
 *  Un escenario con un punto de fuga: las barras son cajas sobre un piso que se aleja hacia el fondo, con una pared
 *  detrás donde va la escala, una sombra por barra y carriles entre los días. Las series se apilan, separadas por una
 *  ranura. Lo que tiene el BarChart plano sigue aquí: leyenda, escala de cero al tope, el total encima de cada
 *  columna (— si el día no tuvo informe) y el detalle por serie al pasar el ratón o enfocar la columna.
 *
 *  El dibujo es un SVG con viewBox fijo que crece con el ancho. Los textos van en HTML por encima, colocados en
 *  porcentajes del viewBox, para que no encojan con la gráfica en el móvil.
 *  Los colores salen de variables del tema (--color-chart-day…): el frente lleva un degradado, el costado se oscurece
 *  y la tapa se aclara con color-mix, así que valen en claro y en oscuro.
 *  Las cajas y sus cifras están en 0 hasta que la gráfica entra en pantalla, y entonces crecen; si los datos cambian,
 *  pasan a los nuevos (useRevealValues). El detalle y los lectores de pantalla dicen siempre la cifra exacta.
 */

type Point = [number, number]

// camera = «una cámara con un punto de fuga en (vx, vy)»: at(x, y, k) lleva un punto del frente hacia el fondo; k = 0
// es el frente y k = 1 el punto de fuga
function camera(vx: number, vy: number) {
  const at = (x: number, y: number, k: number): Point => [x + (vx - x) * k, y + (vy - y) * k]
  const pts = (list: Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  // box = «una caja de ancho w entre las alturas bottom y top y las profundidades near y far»: el costado que mira al
  // punto de fuga, el frente y la tapa
  const box = (x: number, w: number, bottom: number, top: number, near: number, far: number) => {
    const sideX = x + w / 2 < vx ? x + w : x
    return {
      side: pts([at(sideX, top, near), at(sideX, top, far), at(sideX, bottom, far), at(sideX, bottom, near)]),
      front: pts([at(x, top, near), at(x + w, top, near), at(x + w, bottom, near), at(x, bottom, near)]),
      top: pts([at(x, top, near), at(x + w, top, near), at(x + w, top, far), at(x, top, far)]),
    }
  }
  // footprint = «la huella de la caja en el piso», para el día sin dato
  const footprint = (x: number, w: number, y: number, near: number, far: number) => pts([at(x, y, near), at(x + w, y, near), at(x + w, y, far), at(x, y, far)])
  // shadow = «la sombra de la caja sobre el piso», hacia el fondo
  const shadow = (x: number, w: number, y: number, from: number, to: number) => pts([at(x, y, from), at(x + w, y, from), at(x + w + 6, y, to), at(x + 6, y, to)])
  return { at, pts, box, footprint, shadow }
}

// darker / lighter = «el color con una parte de negro o de blanco»
const darker = (color: string, amount: number) => `color-mix(in oklab, ${color} ${100 - amount}%, black)`
const lighter = (color: string, amount: number) => `color-mix(in oklab, ${color} ${100 - amount}%, white)`

// cleanId = «un useId que sirve dentro de url(#…)»
const cleanId = (id: string) => id.replace(/[^\w-]/g, '')

// Las profundidades: el frente de las cajas, su fondo y el de la pared
const NEAR = 0.015
const FAR = 0.06
const BACK = 0.085
const NON_SCALING = 'non-scaling-stroke'

/*  BarChart3D: la gráfica grande de un día por columna, con las series apiladas
 *
 *  @param categories  el rótulo de cada columna
 *  @param series      cada serie: nombre, clase de color (leyenda), tint (relleno) y un valor por columna (null = sin dato)
 *  @param format      cómo se escribe un valor
 *  @param label       qué enseña la gráfica, para lectores de pantalla
 *  @param height      el alto del eje en unidades del dibujo (crece con el ancho, como todo el dibujo)
 */
type BarChart3DProps = {
  categories: string[]
  series: BarSeries[]
  format: (value: number) => string
  label: string
  height?: number
}

// El escenario: 640 de ancho; el eje empieza ROOF por debajo del borde (sitio para el tope de la escala y el total
// más alto) y el piso va de X0 a X1
const W = 640
const X0 = 60
const X1 = 624
const ROOF = 62

export default function BarChart3D({ categories, series, format, label, height = 200 }: BarChart3DProps) {
  const uid = cleanId(useId())
  // lo que se ve de cada valor: en 0 hasta que la gráfica entra en pantalla, luego creciendo
  const keyOf = (item: BarSeries, category: string) => `${item.name}|${category}`
  const { ref, valueOf } = useRevealValues<HTMLDivElement>(
    series.flatMap(item => categories.map((category, index): [string, number] => [keyOf(item, category), item.values[index] ?? 0])),
  )
  const totals = categories.map((_, index) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0))
  const top = niceMax(Math.max(0, ...totals))
  const plot = height
  const base = ROOF + plot
  const H = base + 6
  const cam = camera((X0 + X1) / 2, base - 562)
  const slot = (X1 - X0 - 12) / Math.max(1, categories.length)
  const width = slot * 0.6
  const scale = plot / top
  const tintOf = (item: BarSeries) => item.tint ?? 'var(--color-chart-day)'
  const percent = (part: number, whole: number) => `${(part / whole) * 100}%`

  // la escala, en la pared: el tope, la mitad y el cero; la mitad se calla si al escribirla repite el tope
  const grid = [1, 0.5, 0]
    .filter(fraction => fraction !== 0.5 || format(top * 0.5) !== format(top))
    .map(fraction => {
      const y = base - fraction * plot
      return { fraction, from: cam.at(X0, y, BACK), to: cam.at(X1, y, BACK) }
    })
  const lanes = categories.slice(1).map((_, index) => {
    const x = X0 + 6 + (index + 1) * slot
    return { from: cam.at(x, base, 0), to: cam.at(x, base, BACK) }
  })

  const columns = categories.map((category, index) => {
    const left = X0 + 6 + index * slot
    const x = left + (slot - width) / 2
    const empty = series.every(item => item.values[index] === null)
    const now = series.map((item, order) => ({ order, value: valueOf(keyOf(item, category)) }))
    const shown = now.filter(part => part.value > 0)
    // cada tramo sobre el anterior, con una ranura de 2 entre ellos que se reparte entre los dos
    let level = base
    const boxes = shown.map((part, position) => {
      const tall = Math.max(2, part.value * scale)
      const bottom = level - (position > 0 ? 1 : 0)
      const ceiling = level - tall + (position < shown.length - 1 ? 1 : 0)
      level -= tall
      return { order: part.order, faces: cam.box(x, width, bottom, ceiling, NEAR, FAR), last: position === shown.length - 1 }
    })
    const tip = boxes.length > 0 ? level : base - 2
    const center = x + width / 2
    return {
      category,
      index,
      left,
      empty,
      total: totals[index],
      totalNow: now.reduce((sum, part) => sum + part.value, 0),
      boxes,
      flat: !empty && boxes.length === 0 ? cam.box(x, width, base, base - 2, NEAR, FAR) : null,
      footprint: empty ? cam.footprint(x, width, base, NEAR, FAR) : null,
      shadow: boxes.length > 0 ? cam.shadow(x, width, base, FAR, BACK) : null,
      labelX: cam.at(center, tip, (NEAR + FAR) / 2)[0],
      labelY: cam.at(center, tip, FAR)[1],
      dayX: cam.at(center, base, NEAR)[0],
    }
  })

  const wallTop = base - plot - 10
  return (
    <figure className='m-0 flex flex-col gap-2' aria-label={label}>
      {series.length > 1 && (
        <figcaption className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-portal-muted'>
          {series.map(item => (
            <span key={item.name} className='inline-flex items-center gap-1.5'>
              <span aria-hidden='true' className={`h-2.5 w-2.5 rounded-[3px] ${item.color}`} />
              {item.name}
            </span>
          ))}
        </figcaption>
      )}

      <div ref={ref} className='relative'>
        <svg viewBox={`0 0 ${W} ${H}`} className='block h-auto w-full' aria-hidden='true'>
          <defs>
            <linearGradient id={`${uid}-pared`} x1='0' y1='0' x2='0' y2='1'>
              <stop offset='0' style={{ stopColor: 'var(--color-portal-ctl)', stopOpacity: 0 }} />
              <stop offset='1' style={{ stopColor: 'var(--color-portal-ctl)' }} />
            </linearGradient>
            {series.map((item, order) => (
              <linearGradient key={item.name} id={`${uid}-s${order}`} x1='0' y1='0' x2='0' y2='1'>
                <stop offset='0' style={{ stopColor: lighter(tintOf(item), 14) }} />
                <stop offset='1' style={{ stopColor: darker(tintOf(item), 14) }} />
              </linearGradient>
            ))}
          </defs>

          <polygon
            points={cam.pts([cam.at(X0, base, BACK), cam.at(X1, base, BACK), cam.at(X1, wallTop, BACK), cam.at(X0, wallTop, BACK)])}
            fill={`url(#${uid}-pared)`}
            className='stroke-portal-line'
            vectorEffect={NON_SCALING}
          />
          {grid.map(line => (
            <line key={line.fraction} x1={line.from[0]} y1={line.from[1]} x2={line.to[0]} y2={line.to[1]} className='stroke-portal-line' vectorEffect={NON_SCALING} />
          ))}
          <polygon
            points={cam.pts([cam.at(X0, base + 3, 0), cam.at(X1, base + 3, 0), cam.at(X1, base, BACK), cam.at(X0, base, BACK)])}
            className='fill-portal-ctl stroke-portal-line'
            vectorEffect={NON_SCALING}
          />
          {lanes.map(lane => (
            <line key={lane.from[0]} x1={lane.from[0]} y1={lane.from[1]} x2={lane.to[0]} y2={lane.to[1]} className='stroke-portal-line' vectorEffect={NON_SCALING} />
          ))}

          {columns.map(column => (
            <g key={column.category}>
              {column.shadow && <polygon points={column.shadow} className='fill-black/10 dark:fill-black/30' />}
              {column.footprint && <polygon points={column.footprint} fill='none' className='stroke-portal-ring' strokeDasharray='3 3' vectorEffect={NON_SCALING} />}
              {column.flat && (
                <>
                  <polygon points={column.flat.side} className='fill-portal-line' />
                  <polygon points={column.flat.front} className='fill-portal-ring' />
                  <polygon points={column.flat.top} className='fill-portal-ring' />
                </>
              )}
              {column.boxes.map(part => {
                const tint = tintOf(series[part.order])
                return (
                  <g key={part.order}>
                    <polygon points={part.faces.side} style={{ fill: darker(tint, 32) }} />
                    <polygon points={part.faces.front} fill={`url(#${uid}-s${part.order})`} />
                    {part.last && <polygon points={part.faces.top} style={{ fill: lighter(tint, 38) }} />}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>

        {grid.map(line => (
          <span
            key={line.fraction}
            aria-hidden='true'
            className='absolute -translate-y-1/2 pr-1.5 font-plex-mono text-[10.5px] leading-none text-portal-muted'
            style={{ right: percent(W - line.from[0], W), top: percent(line.from[1], H) }}
          >
            {format(top * line.fraction)}
          </span>
        ))}

        <ul className='absolute inset-0 m-0 list-none p-0'>
          {columns.map(column => (
            <li
              key={column.category}
              tabIndex={0}
              className='group absolute inset-y-0 rounded-lg outline-none focus-visible:bg-portal-ink/5'
              style={{ left: percent(column.left, W), width: percent(slot, W) }}
            >
              {/* el total, encima de la caja (por fuera de su alto, para no deformar la escala); cuenta mientras crece,
                  y el lector de pantalla oye la cifra exacta */}
              <span
                aria-hidden='true'
                className='absolute -translate-x-1/2 font-plex-mono text-[11px] font-medium leading-none text-portal-ink'
                style={{ left: percent(column.labelX - column.left, slot), bottom: percent(H - column.labelY, H), marginBottom: 4 }}
              >
                {column.empty ? '—' : format(tweenLabel(column.totalNow, column.total))}
              </span>
              <span className='sr-only'>{`${column.category}: ${column.empty ? '—' : format(column.total)}`}</span>

              {/* el detalle, al pasar el ratón o al enfocar la columna */}
              <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-portal-ink px-2.5 py-1.5 text-xs text-portal-page shadow-lg group-hover:block group-focus-visible:block'>
                <span className='block font-semibold'>{column.category}</span>
                {column.empty ? (
                  <span className='block opacity-80'>—</span>
                ) : (
                  series.map(item => (
                    <span key={item.name} className='block opacity-90'>
                      {series.length > 1 ? `${item.name}: ` : ''}
                      {item.values[column.index] === null ? '—' : format(item.values[column.index] ?? 0)}
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden='true' className='relative h-4'>
        {columns.map(column => (
          <span key={column.category} className='absolute top-0 -translate-x-1/2 whitespace-nowrap text-[11.5px] text-portal-muted' style={{ left: percent(column.dayX, W) }}>
            {column.category}
          </span>
        ))}
      </div>
    </figure>
  )
}

/*  MiniBars3D: los siete días de un indicador, en pequeño y en 3D, con el pico en ámbar. Es decorativa (la cifra y el
 *  pico van escritos en la tarjeta), así que no se anuncia.
 *
 *  @param bars  una por día: ratio = su alto frente al pico (0 a 1), peak = es el pico, present = el día tuvo informe
 *               (si no, solo el contorno punteado de la caja)
 */
export type MiniBar = { ratio: number; peak: boolean; present: boolean }

// La miniatura: 168 × 80, el piso en MINI_BASE y las cajas de hasta MINI_TALL de alto
const MW = 168
const MINI_BASE = 74
const MINI_TALL = 44

export function MiniBars3D({ bars }: { bars: MiniBar[] }) {
  const uid = cleanId(useId())
  // cada caja, en su tope mínimo hasta que la tarjeta entra en pantalla; luego crece hasta su alto
  const { ref, valueOf } = useRevealValues<SVGSVGElement>(bars.map((bar, index): [string, number] => [String(index), bar.ratio]))
  const cam = camera(MW / 2, -150)
  const slot = (MW - 8) / Math.max(1, bars.length)
  const width = slot * 0.62
  const wallTop = MINI_BASE - MINI_TALL - 4
  return (
    <svg
      ref={ref}
      aria-hidden='true'
      viewBox={`0 0 ${MW} 80`}
      className='mt-1 block h-auto w-full [--mini-bar:#d6ccb7] [--mini-peak:#c9962f] dark:[--mini-bar:#5b5341] dark:[--mini-peak:#d9a441]'
    >
      <defs>
        <linearGradient id={`${uid}-pared`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' style={{ stopColor: 'var(--color-portal-ctl)', stopOpacity: 0 }} />
          <stop offset='1' style={{ stopColor: 'var(--color-portal-ctl)' }} />
        </linearGradient>
        <linearGradient id={`${uid}-dia`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' style={{ stopColor: lighter('var(--mini-bar)', 10) }} />
          <stop offset='1' style={{ stopColor: darker('var(--mini-bar)', 12) }} />
        </linearGradient>
        <linearGradient id={`${uid}-pico`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0' style={{ stopColor: lighter('var(--mini-peak)', 18) }} />
          <stop offset='1' style={{ stopColor: darker('var(--mini-peak)', 10) }} />
        </linearGradient>
      </defs>
      <polygon points={cam.pts([cam.at(4, MINI_BASE, 0.08), cam.at(MW - 4, MINI_BASE, 0.08), cam.at(MW - 4, wallTop, 0.08), cam.at(4, wallTop, 0.08)])} fill={`url(#${uid}-pared)`} />
      <polyline points={cam.pts([cam.at(4, wallTop, 0.08), cam.at(MW - 4, wallTop, 0.08)])} fill='none' className='stroke-portal-line' strokeDasharray='2 3' vectorEffect={NON_SCALING} />
      <polygon
        points={cam.pts([cam.at(4, MINI_BASE + 2, 0), cam.at(MW - 4, MINI_BASE + 2, 0), cam.at(MW - 4, MINI_BASE, 0.08), cam.at(4, MINI_BASE, 0.08)])}
        className='fill-portal-ctl stroke-portal-line'
        vectorEffect={NON_SCALING}
      />
      {bars.map((bar, index) => {
        const x = 4 + index * slot + (slot - width) / 2
        if (!bar.present) {
          const outline = cam.box(x, width, MINI_BASE, MINI_BASE - MINI_TALL, 0.012, 0.055)
          return <polygon key={index} points={outline.front} fill='none' className='stroke-portal-ring' strokeDasharray='2 2' vectorEffect={NON_SCALING} />
        }
        const color = bar.peak ? 'var(--mini-peak)' : 'var(--mini-bar)'
        const faces = cam.box(x, width, MINI_BASE, MINI_BASE - Math.max(2, valueOf(String(index)) * MINI_TALL), 0.012, 0.055)
        return (
          <g key={index}>
            <polygon points={cam.shadow(x, width, MINI_BASE, 0.055, 0.08)} className='fill-black/10 dark:fill-black/30' />
            <polygon points={faces.side} style={{ fill: darker(color, 30) }} />
            <polygon points={faces.front} fill={`url(#${uid}-${bar.peak ? 'pico' : 'dia'})`} />
            <polygon points={faces.top} style={{ fill: lighter(color, 30) }} />
          </g>
        )
      })}
    </svg>
  )
}
