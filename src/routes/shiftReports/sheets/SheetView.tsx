import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { Arrow, Block, CoverData, MetricRow, Sheet, SheetImage, SheetStyle, SummaryLine } from './sheetModel'

/*  UNA HOJA DEL INFORME, COMO EN REPORTES365. Solo pinta.
 *
 *  Dos formas de la misma hoja:
 *  - 'landscape': la hoja del PDF, 1000×700 (app/components/layaut/LayautPage.tsx de reportes365): el título arriba,
 *    la caja del 85 %×75 % con el borde y el fondo del local, y el pie con el icono de Amazonas 365 y el logo de
 *    Jarvis. Se encoge con `zoom` para caber en la columna. Lo de dentro de la caja se ajusta solo (FitBox): si no
 *    cabe (un resumen con muchos gerentes, una tabla larga), se encoge entero en vez de cortarse como en el PDF.
 *  - 'portrait': la misma hoja a lo alto para el teléfono, con la misma identidad (hoja, título, caja con borde y
 *    pie con los logos), pero con el contenido apilado para leerse sin hacer zoom.
 *  Las fotos van siempre al tamaño que tienen en el PDF y se encogen enteras: así la flecha roja, que reportes365
 *  guarda en píxeles respecto de la foto, sigue apuntando al mismo sitio.
 */

type SheetViewProps = { sheet: Sheet; style: SheetStyle; mode: 'landscape' | 'portrait'; zoom: number; width: number }

const FONT = "Inter, 'Noto Sans', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif"
const ICON = '/brand/reporte/icono-amazonas365.png'
const JARVIS = '/brand/reporte/jarvis.png'
const WORDMARK = '/brand/amazonas365-logo.png'
const ARROW = '/brand/reporte/flecha.png'
// INNER = «el ancho útil de la caja en el PDF»: 850 menos el borde (5+5) y el relleno (8+8)
const INNER = 824
// Los tonos de lo que pasa del límite (ámbar) y de lo que está bien (verde), legibles sobre blanco
const WARN = '#b45309'
const WARN_BG = '#fef3c7'
const OK = '#15803d'

export default function SheetView({ sheet, style, mode, zoom, width }: SheetViewProps) {
  if (sheet.cover) return mode === 'landscape' ? <CoverLandscape cover={sheet.cover} style={style} zoom={zoom} /> : <CoverPortrait cover={sheet.cover} style={style} />
  if (mode === 'landscape') {
    return (
      <div style={{ zoom, width: 1000, height: 700, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-evenly', background: style.page, fontFamily: FONT, color: '#1f2937', overflow: 'hidden' }}>
        {sheet.title !== null && <div style={{ minHeight: 28, fontSize: '1.2rem', fontWeight: 700, textAlign: 'center' }}>{sheet.title}</div>}
        <div style={{ width: '85%', height: '75%', boxSizing: 'border-box', border: `5px solid ${style.border}`, background: style.bg, padding: 8, display: 'flex', overflow: 'hidden' }}>
          <FitBox>{sheet.blocks.map((block, index) => <BlockLandscape key={index} block={block} style={style} />)}</FitBox>
        </div>
        <Footer size='landscape' />
      </div>
    )
  }
  // A lo alto: lo que cabe en la columna, menos el borde y el relleno de la caja
  const inner = Math.max(200, width - 20 - 8 - 20)
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', alignItems: 'center', background: style.page, fontFamily: FONT, color: '#1f2937' }}>
      {sheet.title !== null && <div style={{ padding: '14px 12px 10px', fontSize: 16, fontWeight: 700, textAlign: 'center' }}>{sheet.title || ' '}</div>}
      <div style={{ width: 'calc(100% - 20px)', boxSizing: 'border-box', border: `4px solid ${style.border}`, background: style.bg, padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sheet.blocks.map((block, index) => <BlockPortrait key={index} block={block} style={style} inner={inner} />)}
      </div>
      <Footer size='portrait' />
    </div>
  )
}

// FitBox = «lo de dentro de la caja, encogido entero si no cabe»: mide el alto que pide y, si pasa del de la caja,
// lo escala (y lo ensancha en proporción para que siga ocupando todo el ancho)
function FitBox({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const measure = () => {
      const box = outer.current
      const content = inner.current
      if (!box || !content || content.scrollHeight === 0) return
      const next = Math.min(1, box.clientHeight / (content.scrollHeight / 1))
      setScale(previous => (Math.abs(previous - next) > 0.005 ? next : previous))
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (outer.current) observer.observe(outer.current)
    if (inner.current) observer.observe(inner.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outer} style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <div ref={inner} style={{ flex: 'none', width: `${100 / scale}%`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transform: scale < 1 ? `scale(${scale})` : undefined, transformOrigin: 'center' }}>
        {children}
      </div>
    </div>
  )
}

function Footer({ size }: { size: 'landscape' | 'portrait' }) {
  const landscape = size === 'landscape'
  return (
    <div style={{ width: '100%', height: landscape ? 50 : 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
      <img src={ICON} alt='Amazonas 365' style={{ width: landscape ? 100 : 76, height: landscape ? 100 : 76, objectFit: 'contain' }} />
      <img src={JARVIS} alt='Jarvis' style={{ width: landscape ? 50 : 26, height: landscape ? 50 : 26, objectFit: 'contain', marginRight: landscape ? 28 : 14 }} />
    </div>
  )
}

// ── La portada (FrontPage.jsx): la foto del local dentro de la caja, con los dos degradados y los logos ──

function CoverLandscape({ cover, style, zoom }: { cover: CoverData; style: SheetStyle; zoom: number }) {
  const ink = { color: style.frontText, fontWeight: 600 }
  return (
    <div style={{ zoom, width: 1000, height: 700, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', background: style.page, fontFamily: FONT }}>
      <div style={{ width: '85%', height: '75%', boxSizing: 'border-box', border: `5px solid ${style.border}`, background: style.bg, padding: 8 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#ffffff' }}>
          <CoverImage src={cover.image} />
          <div style={{ position: 'absolute', top: 0, width: '100%', height: 146.65, zIndex: 2, backgroundImage: `linear-gradient(180deg, ${style.gradient}, transparent)` }} />
          <div style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem 1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span style={{ ...ink, fontSize: 30 }}>Reporte de novedades</span>
              <span style={{ ...ink, fontSize: 24 }}>{cover.date}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ ...ink, fontSize: 30 }}>{cover.name}</span>
              <span style={{ ...ink, fontSize: 24 }}>{cover.shift}</span>
            </div>
          </div>
          <div style={{ position: 'absolute', bottom: -50, width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', backgroundImage: `linear-gradient(180deg, transparent, ${style.gradient})` }}>
            <img src={WORDMARK} alt='Amazonas 365' style={{ width: 400, position: 'relative', right: 80, filter: 'saturate(3)' }} />
            <img src={JARVIS} alt='Jarvis' style={{ width: 50, height: 50, filter: 'invert(1)' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function CoverPortrait({ cover, style }: { cover: CoverData; style: SheetStyle }) {
  const ink = { color: style.frontText, fontWeight: 600 }
  return (
    <div style={{ background: style.page, padding: 10, fontFamily: FONT }}>
      <div style={{ position: 'relative', height: 420, overflow: 'hidden', border: `4px solid ${style.border}`, background: '#ffffff' }}>
        <CoverImage src={cover.image} />
        <div style={{ position: 'absolute', inset: '0 0 auto 0', padding: '18px 16px 60px', display: 'flex', flexDirection: 'column', gap: 4, backgroundImage: `linear-gradient(180deg, ${style.gradient}, transparent)` }}>
          <span style={{ ...ink, fontSize: 22 }}>Reporte de novedades</span>
          <span style={{ ...ink, fontSize: 17 }}>{cover.date}</span>
        </div>
        <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: '70px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10, backgroundImage: `linear-gradient(180deg, transparent, ${style.gradient})` }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ ...ink, fontSize: 24 }}>{cover.name}</span><span style={{ ...ink, fontSize: 17 }}>{cover.shift}</span></span>
          <span style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <img src={WORDMARK} alt='Amazonas 365' style={{ width: 200, height: 44, objectFit: 'cover', filter: 'saturate(3)' }} />
            <img src={JARVIS} alt='Jarvis' style={{ width: 32, height: 32, filter: 'invert(1)' }} />
          </span>
        </div>
      </div>
    </div>
  )
}

function CoverImage({ src }: { src: string | null }) {
  return src
    ? <img src={src} alt='' style={{ position: 'absolute', top: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    : <div aria-hidden='true' style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #3b3a36 0%, #24231f 55%, #151411 100%)' }} />
}

// ── Las fotos, con su rótulo y su flecha (image_for_page/image.jsx) ──

function Photo({ image, style, width, height, scale = 1, fit = 'cover' }: { image: SheetImage; style: SheetStyle; width: number | string; height: number; scale?: number; fit?: 'cover' | 'contain' }) {
  const box: CSSProperties = { position: 'relative', overflow: 'hidden', width, height, flex: '0 0 auto', background: fit === 'contain' ? '#f4f4f4' : '#bdbdbd' }
  return (
    <div style={scale === 1 ? box : { ...box, zoom: scale }}>
      {image.src
        ? <img src={image.src} alt={image.caption ?? ''} loading='lazy' style={{ display: 'block', width: '100%', height: '100%', objectFit: fit }} />
        : <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', color: '#6b6b6b', fontSize: 14, fontWeight: 600 }}>Sin foto</div>}
      {image.src && image.arrow && <ArrowMark arrow={image.arrow} />}
      {image.caption && (
        <div style={{ position: 'absolute', bottom: 0, minWidth: 100, padding: '.2rem .5rem', boxSizing: 'border-box', background: style.boxBg, border: `2px solid ${style.boxBorder}`, color: style.boxText, fontWeight: 600, textAlign: 'center', fontSize: 15 }}>
          {image.caption}
        </div>
      )}
    </div>
  )
}

// ArrowMark = «la flecha de reportes365» (hook/draggable_element.jsx): 65 px, subida 150 px y corrida un 10 % desde
// debajo de la foto, más el desplazamiento y el giro que guardó el operador
function ArrowMark({ arrow }: { arrow: Arrow }) {
  return (
    <div aria-hidden='true' style={{ position: 'relative', width: 65, top: -150, left: '10%', transform: `translate(${arrow.x}px, ${arrow.y}px)`, pointerEvents: 'none' }}>
      <img src={ARROW} alt='' style={{ display: 'block', width: '100%', filter: 'drop-shadow(2px 0px 10px white)', transform: `rotate(${arrow.rotate}deg)` }} />
    </div>
  )
}

// pxOf = «el ancho en píxeles de una foto en el PDF» (un % del ancho útil de la caja)
const pxOf = (width: string) => (width.endsWith('%') ? (parseFloat(width) / 100) * INNER : parseFloat(width) || INNER)

// Photos en el teléfono: cada foto a su tamaño del PDF, encogida para caber
function PhotosPortrait({ images, style, width, height, inner, columns = 1, fit }: { images: SheetImage[]; style: SheetStyle; width: string; height: number; inner: number; columns?: number; fit?: 'cover' | 'contain' }) {
  const real = pxOf(width)
  const scale = Math.min(1, (inner - (columns - 1) * 8) / columns / real)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: 8, justifyItems: 'center' }}>
      {images.map((item, index) => <Photo key={index} image={item} style={style} width={real} height={height} scale={scale} fit={fit} />)}
    </div>
  )
}

// ── Las piezas de dentro de la caja ──

const outline = (tone: 'light' | 'dark'): CSSProperties => (tone === 'light'
  ? { color: '#ffffff', textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000' }
  : { color: '#000000', textShadow: '-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff' })

// Table = «una tabla de tiempos», con las filas alternadas para seguirlas a lo ancho
function Table({ header, rows, style, size }: { header: string[]; rows: string[][]; style: SheetStyle; size: 'landscape' | 'portrait' }) {
  const cell: CSSProperties = { padding: size === 'landscape' ? '6px 10px' : '6px 8px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', fontSize: size === 'landscape' ? 14 : 13 }}>
        <thead>
          <tr>{header.map((name, index) => <th key={index} scope='col' style={{ ...cell, background: style.boxBg === '#ffffff' ? '#e5e7eb' : style.boxBg, color: style.boxText, fontWeight: 700, borderBottom: '2px solid rgba(0,0,0,0.25)' }}>{name}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} style={{ background: index % 2 ? '#f6f7f8' : '#ffffff' }}>
              {row.map((value, column) => <td key={column} style={{ ...cell, fontWeight: column === row.length - 1 ? 800 : 600, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>{value}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Box({ text, meta, size, style }: { text: string; meta?: string | null; size: 'title' | 'line'; style: SheetStyle }) {
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '4px 14px', padding: size === 'title' ? '12px 16px' : '8px 14px', border: `3px solid ${style.boxBorder}`, background: style.boxBg === '#ffffff' ? '#ffffffc9' : style.boxBg, color: style.boxText, fontSize: size === 'title' ? 18 : 15, fontWeight: size === 'title' ? 700 : 600, textAlign: 'center' }}>
      <span>{text}</span>
      {meta && <span style={{ padding: '2px 10px', borderRadius: 999, background: 'rgba(0,0,0,0.08)', fontSize: 14, fontWeight: 600, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{meta}</span>}
    </div>
  )
}

// SummaryTable = «el resumen del reporte»: etiqueta a la izquierda, valor a la derecha, filas alternadas, y los grupos
// (pre-shift, barra, toques de cada gerente) con su título a un lado
function SummaryTable({ lines, simplified, size }: { lines: SummaryLine[]; simplified: boolean; size: 'landscape' | 'portrait' }) {
  const border = '1px solid #1f2937'
  const cell: CSSProperties = { border, padding: size === 'landscape' ? (simplified ? '9px 14px' : '6px 12px') : '7px 8px' }
  const value: CSSProperties = { ...cell, width: '20%', textAlign: 'center', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }
  const font = size === 'landscape' ? (simplified ? 17 : 13.5) : 13
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', fontSize: font, fontWeight: 600 }}>
      <tbody>
        {lines.flatMap((line, index) => {
          const background = index % 2 ? '#f6f7f8' : '#ffffff'
          return line.kind === 'row'
            ? [<tr key={index} style={{ background }}><td colSpan={2} style={{ ...cell, textAlign: 'left' }}>{line.label}</td><td style={value}>{line.value}</td></tr>]
            : line.items.map((item, itemIndex) => (
              <tr key={`${index}-${itemIndex}`} style={{ background }}>
                {itemIndex === 0 && <td rowSpan={line.items.length} style={{ ...cell, width: '36%', textAlign: 'left', fontWeight: 700, background: '#eef1f3' }}>{line.title}</td>}
                <td style={{ ...cell, textAlign: 'left', fontWeight: 500 }}>{item.label}</td>
                <td style={value}>{item.value}</td>
              </tr>
            ))
        })}
      </tbody>
    </table>
  )
}

function DynamicTable({ block }: { block: Extract<Block, { type: 'dynamic' }> }) {
  const cell: CSSProperties = { border: '1px solid #000', padding: '6px 10px' }
  return (
    <div style={{ width: '100%', boxSizing: 'border-box', background: '#ffffff', border: '3px solid #000', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: block.fontSize, fontWeight: 600, textAlign: 'center' }}>
        <tbody>
          {block.nodes.flatMap((node, index) => (node.children.length === 0
            ? [<tr key={index}><td colSpan={2} style={{ ...cell, width: '50%' }}>{node.key}</td><td style={{ ...cell, width: '25%' }}>{node.value}</td></tr>]
            : node.children.map((child, childIndex) => (
              <tr key={`${index}-${childIndex}`}>
                {childIndex === 0 && <td rowSpan={node.children.length} style={cell}>{node.key}</td>}
                <td style={cell}>{child.key}</td>
                <td style={cell}>{child.value}</td>
              </tr>
            ))))}
        </tbody>
      </table>
    </div>
  )
}

// Kpi = «una cifra grande con su nombre»; las que conviene mirar (demoras) en ámbar
function Kpi({ label, value, warn, size }: { label: string; value: string; warn: boolean; size: 'landscape' | 'portrait' }) {
  return (
    <div style={{ flex: '1 1 0', minWidth: size === 'landscape' ? 0 : 120, display: 'flex', flexDirection: 'column', gap: 4, padding: size === 'landscape' ? '14px 16px' : '10px 12px', background: warn ? WARN_BG : '#ffffff', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
      <span style={{ fontSize: size === 'landscape' ? 13 : 12, fontWeight: 600, color: warn ? WARN : '#4b5563' }}>{label}</span>
      <strong style={{ fontSize: size === 'landscape' ? 34 : 26, lineHeight: 1, fontWeight: 800, color: warn ? WARN : '#111827', fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
    </div>
  )
}

// Metrics = «el resumen de métricas»: tres cifras y, por categoría, el promedio frente a su límite, los procesos, las
// demoras y el porcentaje de procesos que tuvieron demora, con su barra
function Metrics({ block, size }: { block: Extract<Block, { type: 'metrics' }>; size: 'landscape' | 'portrait' }) {
  const landscape = size === 'landscape'
  const cell: CSSProperties = { padding: landscape ? '9px 10px' : '7px 6px', textAlign: 'center', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid rgba(0,0,0,0.08)' }
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {block.kpis.map(kpi => <Kpi key={kpi.label} label={kpi.label} value={kpi.value} warn={kpi.warn} size={size} />)}
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 8, background: '#ffffff', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: landscape ? 14 : 12.5 }}>
          <thead>
            <tr style={{ background: '#e5e7eb' }}>
              <th scope='col' style={{ ...cell, textAlign: 'left' }}>Categoría</th>
              <th scope='col' style={cell}>Tiempo promedio</th>
              <th scope='col' style={cell}>Procesos</th>
              <th scope='col' style={cell}>Demoras</th>
              <th scope='col' style={{ ...cell, width: landscape ? '28%' : undefined }}>Con demora</th>
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row: MetricRow) => (
              <tr key={row.name}>
                <th scope='row' style={{ ...cell, textAlign: 'left', fontWeight: 700, textTransform: 'capitalize' }}>{row.name}</th>
                <td style={cell}>
                  <strong style={{ fontWeight: 800, color: row.overLimit ? WARN : '#111827' }}>{row.avg || '—'}</strong>
                  {row.limit && <span style={{ display: 'block', fontSize: landscape ? 11.5 : 10.5, fontWeight: 500, color: '#6b7280' }}>límite {row.limit}</span>}
                </td>
                <td style={{ ...cell, fontWeight: 700 }}>{row.tickets}</td>
                <td style={{ ...cell, fontWeight: 800, color: row.delays > 0 ? WARN : OK }}>{row.delays}</td>
                <td style={cell}>
                  {row.share === null ? '—' : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span aria-hidden='true' style={{ flex: 1, height: 8, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${Math.max(row.share * 100, row.share > 0 ? 3 : 0)}%`, background: row.share > 0 ? '#d97706' : OK }} />
                      </span>
                      <span style={{ minWidth: 40, fontWeight: 700, textAlign: 'right' }}>{Math.round(row.share * 100)}%</span>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Stats = «una línea de cifras» sobre una tabla (los toques)
function Stats({ items, size }: { items: { label: string; value: string }[]; size: 'landscape' | 'portrait' }) {
  return (
    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {items.map(item => (
        <div key={item.label} style={{ flex: '1 1 0', minWidth: size === 'landscape' ? 0 : 110, display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px', background: '#ffffff', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563' }}>{item.label}</span>
          <strong style={{ fontSize: size === 'landscape' ? 19 : 16, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function TextBlock({ block, size }: { block: Extract<Block, { type: 'text' }>; size: 'landscape' | 'portrait' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, textAlign: 'center', fontWeight: 600, ...outline(block.tone) }}>
      {block.heading && <strong style={{ fontSize: size === 'landscape' ? 20 : 16 }}>{block.heading}</strong>}
      {block.line && <span style={{ fontSize: size === 'landscape' ? 16 : 13.5 }}>{block.line}</span>}
    </div>
  )
}

function BlockLandscape({ block, style }: { block: Block; style: SheetStyle }) {
  switch (block.type) {
    case 'table': return <Table header={block.header} rows={block.rows} style={style} size='landscape' />
    case 'text': return <TextBlock block={block} size='landscape' />
    case 'box': return <Box text={block.text} size={block.size} style={style} />
    case 'summary': return <SummaryTable lines={block.lines} simplified={block.simplified} size='landscape' />
    case 'dynamic': return <DynamicTable block={block} />
    case 'metrics': return <Metrics block={block} size='landscape' />
    case 'stats': return <Stats items={block.items} size='landscape' />
    case 'images':
      return (
        <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
          {block.images.map((item, index) => <Photo key={index} image={item} style={style} width={block.width} height={block.height} fit={block.fit} />)}
        </div>
      )
    case 'preShift':
      return (
        <div style={{ width: '100%', display: 'flex', gap: 12 }}>
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18 }}>
            <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: '2.5rem', fontWeight: 800, color: '#434343' }}>Reunión pre-shift</span>
            <span style={{ display: 'flex', gap: 10 }}>
              <Chip text={`Inicio ${block.start}`} style={style} />
              <Chip text={`Fin ${block.end}`} style={style} />
            </span>
          </div>
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            {block.images.map((item, index) => <Photo key={index} image={item} style={style} width='100%' height={235} />)}
          </div>
        </div>
      )
    case 'novelty':
      return block.side ? (
        <div style={{ width: '100%', display: 'flex', gap: 12 }}>
          <div style={{ width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
            {block.images.map((item, index) => <Photo key={index} image={item} style={style} width='100%' height={235} />)}
          </div>
          <div style={{ width: '45%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
            <NoveltyInfo block={block} style={style} />
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Box text={block.title} meta={block.meta} size='title' style={style} />
          <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {block.images.map((item, index) => <Photo key={index} image={item} style={style} width={block.images.length === 1 ? 'min(800px, 100%)' : '48%'} height={block.images.length === 1 ? 300 : 200} />)}
          </div>
          {(block.duration || block.note !== null) && (
            <div style={{ width: '100%', display: 'flex', gap: 10 }}>
              {block.duration && <div style={{ flex: '0 0 auto' }}><Box text={block.duration} size='line' style={style} /></div>}
              {block.note !== null && <Note text={block.note} />}
            </div>
          )}
        </div>
      )
  }
}

// TimeRows = «una tabla de tiempos en el teléfono»: una tarjeta por fila (la mesa, de cuándo a cuándo y lo que tardó),
// en vez de cuatro columnas que obligan a desplazarse de lado. Las tablas que no son de tiempos siguen como tabla
function TimeRows({ header, rows }: { header: string[]; rows: string[][] }) {
  const withTable = header.length === 4
  return (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((row, index) => {
        const [table, from, to, total] = withTable ? row : ['', ...row]
        return (
          <li key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#ffffff', borderRadius: 8, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}>
            {withTable && <strong style={{ minWidth: 58, fontSize: 14, fontWeight: 800 }}>{/^\d+$/.test(table) ? `Mesa ${table}` : table}</strong>}
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{from || '—'} → {to || '—'}</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{header[withTable ? 1 : 0]} → {header[withTable ? 2 : 1]}</span>
            </span>
            <span style={{ padding: '3px 8px', borderRadius: 6, background: '#f3f4f6', fontSize: 14, fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{total}</span>
          </li>
        )
      })}
    </ol>
  )
}

// isTimeTable = «es una tabla de tiempos» (mesa, desde, hasta, total; o sin la mesa)
const isTimeTable = (header: string[], rows: string[][]) => (header.length === 4 || header.length === 3) && rows.every(row => row.length === header.length)

// SummaryList = «el resumen del reporte en el teléfono»: etiqueta y valor por fila; cada grupo, su título y sus filas
function SummaryList({ lines }: { lines: SummaryLine[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: 8, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}>
      {lines.map((line, index) => (line.kind === 'row' ? (
        <div key={index} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '9px 10px', background: index % 2 ? '#f6f7f8' : '#ffffff', borderTop: index ? '1px solid rgba(0,0,0,0.08)' : undefined }}>
          <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{line.label}</span>
          <strong style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{line.value}</strong>
        </div>
      ) : (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '9px 10px', background: '#eef1f3', borderTop: index ? '1px solid rgba(0,0,0,0.08)' : undefined }}>
          <span style={{ fontSize: 13, fontWeight: 700 }}>{line.title}</span>
          {line.items.map(item => (
            <span key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, paddingLeft: 10, fontSize: 13 }}>
              <span style={{ fontWeight: 500 }}>{item.label}</span>
              <strong style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
            </span>
          ))}
        </div>
      )))}
    </div>
  )
}

function BlockPortrait({ block, style, inner }: { block: Block; style: SheetStyle; inner: number }) {
  switch (block.type) {
    case 'table': return isTimeTable(block.header, block.rows) ? <TimeRows header={block.header} rows={block.rows} /> : <Table header={block.header} rows={block.rows} style={style} size='portrait' />
    case 'text': return <TextBlock block={block} size='portrait' />
    case 'box': return <Box text={block.text} size={block.size} style={style} />
    case 'summary': return <SummaryList lines={block.lines} />
    case 'dynamic': return <DynamicTable block={block} />
    case 'metrics': return <Metrics block={block} size='portrait' />
    case 'stats': return <Stats items={block.items} size='portrait' />
    case 'images': return <PhotosPortrait images={block.images} style={style} width={block.width} height={block.height} inner={inner} fit={block.fit} columns={block.width === '48%' && block.images.length > 2 ? 2 : 1} />
    case 'preShift':
      return (
        <>
          <span style={{ fontFamily: "'Dancing Script', cursive", fontSize: 30, fontWeight: 800, color: '#434343', textAlign: 'center' }}>Reunión pre-shift</span>
          <span style={{ display: 'flex', justifyContent: 'center', gap: 8 }}><Chip text={`Inicio ${block.start}`} style={style} /><Chip text={`Fin ${block.end}`} style={style} /></span>
          <PhotosPortrait images={block.images} style={style} width='50%' height={235} inner={inner} />
        </>
      )
    case 'novelty':
      return (
        <>
          <Box text={block.title} meta={block.meta} size='title' style={style} />
          <PhotosPortrait images={block.images} style={style} width={block.side ? '55%' : block.images.length === 1 ? '97%' : '48%'} height={block.side ? 235 : block.images.length === 1 ? 300 : 200} inner={inner} />
          {block.duration && <Box text={block.duration} size='line' style={style} />}
          {block.note !== null && <Note text={block.note} />}
        </>
      )
  }
}

function NoveltyInfo({ block, style }: { block: Extract<Block, { type: 'novelty' }>; style: SheetStyle }) {
  return (
    <>
      <Box text={block.title} meta={block.meta} size='title' style={style} />
      {block.duration && <Box text={block.duration} size='line' style={style} />}
      {block.note !== null && <Note text={block.note} />}
    </>
  )
}

function Note({ text }: { text: string }) {
  return <div style={{ flex: 1, minHeight: 90, boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #b9b9b9', background: '#ffffff', fontSize: 15, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{text}</div>
}

function Chip({ text, style }: { text: string; style: SheetStyle }) {
  return <span style={{ padding: '4px 12px', border: `2px solid ${style.boxBorder}`, background: style.boxBg, color: style.boxText, fontWeight: 600, fontSize: 15 }}>{text}</span>
}

// SheetFrameLabel = «el rótulo sobre cada hoja» (fuera de la hoja: no es del PDF)
export function SheetFrameLabel({ children }: { children: ReactNode }) {
  return <div className='flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-portal-muted'>{children}</div>
}
