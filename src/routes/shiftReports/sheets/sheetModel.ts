import type { Dish, FullEstablishment } from '@/ajax/establishments.ajax'
import type { ShiftDocument } from '@/ajax/shiftReports.ajax'
import { imageUrl } from '@/libs/imageUrl'
import { clock, durationOf, list, longestFirst, orderedPages, periodOf, rec, secondsOf, spanSeconds, text, type Dict } from '../reportPages'

/*  LAS HOJAS DEL INFORME, COMO LAS ARMA REPORTES365. Funciones puras, sin React.
 *
 *  El PDF del informe diario es una hoja apaisada de 1000×700 por cada pieza: portada, resumen, demoras, punto de
 *  venta, entregas, servicios, toques y una por novedad. Aquí se arma la MISMA lista de hojas, con sus títulos, sus
 *  tablas partidas igual (chunkArray) y sus fotos con su flecha, para que insights365 las enseñe como el PDF. Las reglas
 *  vienen de reportes365 (app/components/page/…, ver la nota de cada tipo); los textos de las hojas van en español,
 *  como en el PDF.
 *
 *  Tres cosas se corrigen a propósito respecto del PDF:
 *  - los tiempos guardados como texto JSON se leen (el PDF pone «...:...:...»), y una demora que cruza la medianoche
 *    no sale negativa;
 *  - la hoja de entrega lee bien «EntregaPLato» (el PDF busca «entregaPlato» y pone «...:...:...»);
 *  - en la reunión pre-shift la segunda fila se llama «Fin» (el PDF dice «Duración», pero guarda la hora de fin).
 */

export type SheetSection = 'cover' | 'summary' | 'firstAttention' | 'prep' | 'cleaning' | 'touches' | 'novelties'

// SECTION_ORDER = «el orden de las secciones en el índice»
export const SECTION_ORDER: SheetSection[] = ['cover', 'summary', 'firstAttention', 'prep', 'cleaning', 'touches', 'novelties']

// Arrow = «la flecha roja sobre una foto», como la guarda reportes365: desplazamiento y giro
export type Arrow = { x: number; y: number; rotate: number }
// SheetImage = «una foto de una hoja»: src null es «sin foto» (el PDF pone ahí una imagen de relleno)
export type SheetImage = { src: string | null; caption: string | null; arrow: Arrow | null }

export type SummaryLine =
  | { kind: 'row'; label: string; value: string }
  | { kind: 'group'; title: string; items: { label: string; value: string }[] }
export type DynamicNode = { key: string; value: string; children: { key: string; value: string }[] }

// MetricRow = «una categoría de plato en las métricas»: su tiempo promedio frente a su límite, procesos y demoras
export type MetricRow = { name: string; avg: string; limit: string | null; overLimit: boolean; tickets: number; delays: number; share: number | null }

export type Block =
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'text'; heading: string | null; line: string | null; tone: 'light' | 'dark' }
  // fit 'contain' = la foto entera (capturas de la tablet); 'cover' = llena el hueco (fotos de cámara)
  | { type: 'images'; images: SheetImage[]; width: string; height: number; fit?: 'cover' | 'contain' }
  | { type: 'box'; text: string; size: 'title' | 'line' }
  | { type: 'summary'; lines: SummaryLine[]; simplified: boolean }
  | { type: 'dynamic'; nodes: DynamicNode[]; fontSize: number }
  | { type: 'preShift'; images: SheetImage[]; start: string; end: string }
  | { type: 'metrics'; kpis: { label: string; value: string; warn: boolean }[]; rows: MetricRow[] }
  | { type: 'stats'; items: { label: string; value: string }[] }
  | { type: 'novelty'; images: SheetImage[]; title: string; meta: string | null; duration: string | null; note: string | null; side: boolean }

export type CoverData = { date: string; shift: string; name: string; image: string | null }

// Sheet = «una hoja»: title null la deja sin barra de título (como las novedades con noSubtitleInTheReport)
export type Sheet = { key: string; section: SheetSection; label: string; title: string | null; cover: CoverData | null; blocks: Block[] }

// SheetStyle = «los colores del informe del local» (config_report.style), con los de reportes365 por defecto
export type SheetStyle = { page: string; border: string; bg: string; gradient: string; frontText: string; boxBg: string; boxText: string; boxBorder: string }

export function sheetStyleOf(config: Dict): SheetStyle {
  const style = rec(config.style)
  const pick = (key: string, fallback: string) => text(style[key]) ?? fallback
  return {
    page: pick('pageColor', '#ffffff'),
    border: pick('borderColor', '#29c709'),
    bg: pick('bg', '#dddddd'),
    gradient: pick('colorGreadientLogo', '#000000'),
    frontText: pick('colorTextFront', '#ffffff'),
    boxBg: pick('bgTextBox', '#ffffff'),
    boxText: pick('colorTextBox', '#000000'),
    boxBorder: pick('colorBorderBox', '#000000'),
  }
}

// ── Lo que copia tal cual de reportes365 ──

// timePeriodEs = TimeOperator.timePeriod: '00:05:00' → '5 minutos', '00:03:30' → '3:30 minutos', '01:30:00' → '1 hora y 30 minutos'
export function timePeriodEs(time: unknown): string {
  const parts = (typeof time === 'string' ? time : '00:00:00').split(':').map(Number)
  const [hours, minutes, seconds] = [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  return `${hours ? `${hours} hora y ` : ''}${minutes ? `${minutes}` : ''}${seconds ? `:${seconds}` : ''} minutos`
}

// americanDateFormat = 'AAAA-MM-DD' → 'DD-MM-AAAA' (o 'MM-DD-AAAA' si el local lo pide); otra cosa, 'N/A'
export function americanDateFormat(date: string, american: boolean): string {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(date)) return 'N/A'
  const [year, month, day] = date.split('-')
  return american ? `${month}-${day}-${year}` : `${day}-${month}-${year}`
}

// shiftToEs = 'day' → 'diurno', 'night' → 'nocturno', 'all' → 'diario'
export const shiftToEs = (shift: string) => (shift === 'day' ? 'diurno' : shift === 'night' ? 'nocturno' : shift === 'all' ? 'diario' : shift)

// chunkArray = el reparto en hojas de reportes365 (app/lib/dataParser/arr.js): hasta 15 filas, una hoja; si no, de a
// `size`, y si la última queda con menos de 5, sus filas se corren hacia las primeras
export function chunkArray<T>(rows: T[], size: number): T[][] {
  if (rows.length <= 15) return [rows]
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size))
  const last = chunks[chunks.length - 1]
  if (last.length > 0 && last.length < 5) {
    const rest = chunks.pop() as T[]
    const shift = rest.length
    if (chunks.length > 1) {
      for (let target = chunks.length - 2; target >= 0; target--) chunks[target].push(...chunks[target + 1].splice(0, shift))
    }
    chunks[chunks.length - 1].push(...rest)
  }
  return chunks
}

// chunkArr = de a `size`, sin más
export function chunkArr<T>(rows: T[], size = 4): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) chunks.push(rows.slice(index, index + size))
  return chunks
}

// ── Piezas ──

const arrowOf = (value: unknown): Arrow | null => {
  const data = rec(value)
  const position = rec(data.position)
  const x = Number(position.x), y = Number(position.y), rotate = Number(data.rotate)
  return Object.keys(data).length === 0 ? null : { x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0, rotate: Number.isFinite(rotate) ? rotate : 0 }
}
// DEFAULT_ARROW = «la flecha que el PDF pinta aunque nadie la haya movido»
const DEFAULT_ARROW: Arrow = { x: 0, y: 0, rotate: 0 }

const image = (url: unknown, caption: string | null, arrow: Arrow | null): SheetImage => ({ src: imageUrl(text(url)), caption, arrow })
const urlOf = (row: unknown, index: number) => {
  const entry = list(rec(row).imageUrl).map(rec).find((item, position) => (typeof item.index === 'number' ? item.index : position) === index)
  return entry ? entry.url : undefined
}
const show = (value: unknown) => text(value) ?? ''
const tableOf = (row: unknown) => show(rec(row).table)
const durationText = (row: unknown) => durationOf(row) ?? '...:...:...'
const lineOf = (row: unknown, withTable = true) => {
  const { init, end } = periodOf(row)
  return `${withTable ? `Mesa ${tableOf(row)} ` : ''}(Desde: ${init ?? '...'} - Hasta: ${end ?? '...'}) Duración: ${durationText(row)}`
}
const timeRow = (row: unknown, withTable = true) => {
  const { init, end } = periodOf(row)
  return [...(withTable ? [tableOf(row)] : []), init ?? '', end ?? '', durationText(row)]
}
// hasPeriod = «la fila tiene un tiempo de verdad»: las filas vacías de la plantilla (00:00:00 a 00:00:00) no cuentan
const hasPeriod = (row: unknown) => {
  const { init, end } = periodOf(row)
  return Boolean((init && init !== '00:00:00') || (end && end !== '00:00:00') || (secondsOf(durationOf(row)) ?? 0) > 0)
}

// cleanLimit = «un límite de la configuración, o null si no hay» ('00:00:00' cuenta como sin configurar)
const cleanLimit = (value: unknown): string | null => {
  const seconds = secondsOf(value)
  return seconds ? String(value) : null
}

// imageSize = «el alto de las fotos bajo una tabla», como reportes365: una 330, dos 300, tres 250
const sizeFor = (count: number) => (count <= 1 ? { width: '100%', height: 330 } : count === 2 ? { width: '48%', height: 300 } : { width: '31.5%', height: 250 })

// ── Cada tipo de página ──

function coverSheets(document: ShiftDocument, establishment: FullEstablishment, config: Dict): Sheet[] {
  return [{
    key: 'portada', section: 'cover', label: 'Portada', title: null, blocks: [],
    cover: {
      date: americanDateFormat(document.date, Boolean(config.americanDateFormatForCoverPage)),
      shift: shiftToEs(document.shift),
      name: document.establishmentName ?? establishment.name,
      image: imageUrl(text(config.urlImgFront)),
    },
  }]
}

function summarySheets(page: Dict | unknown[], key: string, config: Dict): Sheet[] {
  if (Array.isArray(page)) {
    // El cuadro adaptativo: una hoja por cada página de tabla del árbol (las simples no se pintan)
    return page.map(rec).filter(tree => tree.content === 'tableMultiplekey').map((tree, index) => ({
      key: `${key}-${index}`, section: 'summary' as const, label: 'Resumen del reporte', title: show(tree.titlePage), cover: null,
      blocks: [{
        type: 'dynamic' as const,
        fontSize: Number(tree.sizeFont) || 14,
        nodes: Object.values(rec(tree.value)).map(rec).map(node => ({
          key: show(node.key),
          value: node.type === 'node' ? '' : valueOf(node),
          children: node.type === 'node' ? Object.values(rec(node.value)).map(rec).map(child => ({ key: show(child.key), value: valueOf(child) })) : [],
        })),
      }],
    }))
  }

  const data = page
  const simplified = config.typePageSumary === 'simplified'
  const withPreShift = !data.hiddenPreShift && Boolean(config.requirePageMeetingPreShift)
  const preshift = rec(rec(data.preshift).result)
  const bar = rec(data.totalOfOccupiedTablesBar)
  const barResult = rec(bar.result)
  const lines: SummaryLine[] = []
  const row = (label: string, value: unknown) => lines.push({ kind: 'row', label, value: show(value) })

  if (!simplified && withPreShift) {
    lines.push({ kind: 'group', title: 'Reunión Pre-Shift', items: [{ label: 'Inicio', value: show(rec(preshift.firt).value) }, { label: 'Fin', value: show(rec(preshift.second).value) }] })
  }
  row('Total de rotaciones de mesas evaluadas', text(data.totalOfOccupiedTables) ?? 'N/A')
  if (!simplified) {
    row('Promedio de espera para primera atención', data.averageTimeToFirstResponse)
    row(`Mesas con demora superior a ${config.time1Attention ? timePeriodEs(config.time1Attention) : 'sin configurar'} en ser atendidas`, data.totalCountFirstResponse)
  }
  row('Promedio para recibir plato fuerte una vez tomada la orden', data.averageTimeToReceiveTheMainCourse)
  if (!simplified && config.requireBarTable) {
    lines.push({ kind: 'group', title: text(bar.title) ?? 'Rotaciones en el Área de Barra', items: ['firt', 'second', 'addRow'].map(name => ({ label: show(rec(barResult[name]).key), value: show(rec(barResult[name]).value) })) })
  }
  if (!simplified) {
    // Los gerentes sin ningún toque (todo N/A o vacío) van juntos en una fila: dos filas de N/A por cada uno no dicen nada
    const withoutTouches: string[] = []
    for (const item of list(data.touch).map(rec)) {
      const result = rec(item.result)
      const title = text(item.title) ?? `Toques de ${show(item.name)}`
      const values = config.typeOfManagerToTableApproachEvaluation === 'single' ? [result.total] : [rec(result.firt).value, rec(result.second).value]
      if (values.every(value => { const shown = text(value); return shown === null || shown === 'N/A' })) {
        withoutTouches.push(show(item.name) || title)
        continue
      }
      if (config.typeOfManagerToTableApproachEvaluation === 'single') lines.push({ kind: 'group', title, items: [{ label: 'Cantidad total', value: show(result.total) }] })
      else lines.push({ kind: 'group', title, items: [{ label: 'Primeros toques', value: show(rec(result.firt).value) }, { label: 'Otros toques', value: show(rec(result.second).value) }] })
    }
    if (withoutTouches.length > 0) lines.push({ kind: 'row', label: `Sin toques registrados: ${withoutTouches.join(', ')}`, value: 'N/A' })
    const waiters = rec(data.waitersApproachTheTable)
    if (Object.keys(waiters).length > 0) {
      const result = rec(waiters.result)
      lines.push({ kind: 'group', title: text(waiters.title) ?? 'Promedios de toque de mesa por los mesoneros', items: [{ label: 'Cantidad', value: show(rec(result.firt).value) }, { label: 'Tiempo', value: show(rec(result.second).value) }] })
    }
  }
  row(`Mesas con demora superior a ${config.timeDelayClean ? timePeriodEs(config.timeDelayClean) : 'Sin configurar'} en ser limpiada`, data.totalCountClearTable)
  row('Promedio de tiempo para limpiar mesas después de ser desocupadas', data.averageTimeToCleartTable)
  row('Uso de celular', data.usePhone)

  const sheets: Sheet[] = [{ key, section: 'summary', label: 'Resumen del reporte', title: 'Resumen del reporte', cover: null, blocks: [{ type: 'summary', lines, simplified }] }]
  if (withPreShift) {
    sheets.push({
      key: `${key}-preshift`, section: 'summary', label: 'Reunión pre-shift', title: '', cover: null,
      blocks: [{ type: 'preShift', start: show(rec(preshift.firt).value), end: show(rec(preshift.second).value), images: [image(rec(preshift.firt).image, null, null), image(rec(preshift.second).image, null, null)] }],
    })
  }
  const barRows = list(bar.bodyForTable).filter(Array.isArray).map(item => (item as unknown[]).map(show))
  if (Number(rec(barResult.firt).value) > 0 && barRows.length > 0) {
    const sorted = [...barRows].sort((a, b) => (a[1] ?? '').localeCompare(b[1] ?? ''))
    chunkArray(sorted, 10).forEach((chunk, index) => sheets.push({
      key: `${key}-barra-${index}`, section: 'summary', label: 'Rotaciones en barra', title: 'Rotaciones en barra', cover: null,
      blocks: [{
        type: 'table', header: ['Mesa', 'Ocupada', 'Atencion', 'Espera', 'Orden', 'Entrega', 'Demora total'],
        rows: chunk.map(item => [item[0], item[1], item[2], clock(spanSeconds(item[1], item[2])) ?? 'N/A', item[4], item[5], clock(spanSeconds(item[4], item[5])) ?? 'N/A']),
      }],
    }))
  }
  return sheets
}

function valueOf(node: Dict): string {
  if (node.disabled) return 'N/A'
  if (node.type === 'checkbox') return node.value ? '✓' : '✗'
  if (node.type === '%') return `${show(node.value)}%`
  return show(node.value)
}

// delay1ra y delayClear (compound_pages/delay_clear): la tabla de 10 en 10 y la mesa que más tardó con sus dos fotos
function delaySheets(data: Dict, key: string, kind: 'firstAttention' | 'cleaning', config: Dict): Sheet[] {
  const rows = longestFirst(list(data.body).filter(hasPeriod))
  if (rows.length === 0) return []
  const first = kind === 'firstAttention'
  const label = first ? 'Primera atención' : 'Limpieza'
  const limit = timePeriodEs(first ? config.time1Attention : config.timeDelayClean ?? '00:00:00')
  const plural = text(data.namePageTable) ?? (first ? `Mesas con demoras superior a ${limit} en ser atendidas` : `Mesas con demoras superior ${limit} en ser limpiadas`)
  const singular = first ? `Mesa con demoras superior a ${limit} en ser atendida` : `Mesa con demoras superior a ${limit} en ser limpiada`
  const longest = first ? 'Mesa con mayor demora en ser atendida' : 'Mesa con mayor demora en ser limpiada'
  const captions = first ? ['Ocupa', 'Primera atención'] : ['Desocupa', 'Limpieza']
  const arrows = list(data.coordinates)
  const header = list(data.header).map(show)
  const head = header.length === 4 ? header : first ? ['Mesas', 'Ocupa', 'Primera atención', 'Total'] : ['Mesas', 'Desocupa', 'Limpieza', 'Total']
  const photos = (height: number): Block => ({
    type: 'images', width: '48%', height,
    images: [0, 1].map(index => image(urlOf(rows[0], index), captions[index], arrowOf(arrows[index]) ?? DEFAULT_ARROW)),
  })

  if (rows.length === 1) {
    return [{ key, section: kind, label, title: '', cover: null, blocks: [{ type: 'text', heading: singular, line: lineOf(rows[0]), tone: 'dark' }, photos(300)] }]
  }
  const sheets: Sheet[] = chunkArray(rows, 10).map((chunk, index) => ({
    key: `${key}-${index}`, section: kind, label, title: plural, cover: null,
    blocks: [
      { type: 'table' as const, header: head, rows: chunk.map(row => timeRow(row)) },
      ...(rows.length < 4 ? [{ type: 'text' as const, heading: longest, line: lineOf(rows[0]), tone: 'light' as const }, photos(200)] : []),
    ],
  }))
  if (rows.length > 3) {
    sheets.push({ key: `${key}-mayor`, section: kind, label, title: '', cover: null, blocks: [{ type: 'text', heading: longest, line: lineOf(rows[0]), tone: 'dark' }, photos(300)] })
  }
  return sheets
}

// delayToastPostAndServise (compoudPageDelayToastPosAndServices): métricas, punto de venta por categoría, órdenes sin
// comandar, entregas (una hoja cada una) y servicios
function prepSheets(data: Dict, key: string, config: Dict, dishes: Dish[], night: boolean): Sheet[] {
  const legacy = rec(data.body)
  const isLegacy = Object.keys(legacy).length > 0
  const toast = isLegacy
    ? Object.entries(legacy).filter(([name]) => name !== 'delayDeliveryDishWhenItIsReadyInKitchen').flatMap(([name, value]) => list(rec(value).delay).map(row => ({ ...rec(row), nameDish: rec(row).nameDish ?? name })))
    : list(rec(data.delayToastPost).delay).map(rec)
  const delivery = (isLegacy ? list(rec(legacy.delayDeliveryDishWhenItIsReadyInKitchen).delay) : list(rec(data.delayDeliveryDishWhenItIsReadyInKitchen).delay)).map(rec)
  const services = list(rec(data.delayServices).delay).map(rec)
  const metrics = rec(rec(data.delayToastPost).categoryMetrics)
  const isError = (row: Dict) => text(rec(row.menuRef).es) === 'Error en comanda'
  const category = (row: Dict) => text(row.nameDish) ?? 'plato'
  const names = [...new Set([...dishes.map(dish => dish.nameDishe), ...toast.map(category), ...services.map(category)])]
  const sheets: Sheet[] = []

  if (config.propMetricTableInToastPos && (Object.keys(metrics).length > 0 || isLegacy)) {
    const metricOf = (name: string) => rec(isLegacy ? legacy[name] : metrics[name])
    const tickets = (name: string) => Number(isLegacy ? metricOf(name).totalProcess : metricOf(name).totalTickets) || 0
    const average = (name: string) => show(isLegacy ? metricOf(name).average : metricOf(name).avgPreparation)
    const delaysOf = (name: string) => toast.filter(row => category(row) === name).length
    const listed = dishes.length > 0 ? dishes.map(dish => dish.nameDishe) : names
    const total = listed.filter(name => name.trim().toLowerCase() !== 'take out').reduce((sum, name) => sum + tickets(name), 0)
    // El límite de cada categoría es el de su turno (el nocturno, si lo tiene, en un informe nocturno)
    const limitOf = (name: string) => {
      const dish = dishes.find(item => item.nameDishe === name)
      return cleanLimit(night ? dish?.timeLimit?.night ?? dish?.timeLimit?.day : dish?.timeLimit?.day)
    }
    // Mismas cifras que el PDF (procesos evaluados sin take out, demoras de preparación con las órdenes sin comandar),
    // en una tabla por categoría con su límite y el porcentaje de procesos con demora
    sheets.push({
      key: `${key}-metricas`, section: 'prep', label: 'Resumen general de métricas', title: 'Resumen general de métricas', cover: null,
      blocks: [{
        type: 'metrics',
        kpis: [
          { label: 'Procesos evaluados', value: String(total), warn: false },
          { label: 'Demoras en preparación', value: String(toast.length), warn: toast.length > 0 },
          { label: 'Demoras en entrega de plato', value: String(delivery.length), warn: delivery.length > 0 },
        ],
        rows: listed.map(name => {
          const limit = limitOf(name)
          const avg = average(name)
          const ticketsOf = tickets(name)
          const delays = delaysOf(name)
          return {
            name, avg, limit, tickets: ticketsOf, delays,
            overLimit: limit !== null && (secondsOf(avg) ?? 0) > (secondsOf(limit) ?? Infinity),
            share: ticketsOf > 0 ? Math.min(1, delays / ticketsOf) : null,
          }
        }),
      }],
    })
  }

  const header = list(rec(data.delayToastPost).header).map(show)
  const posHead = header.length === 4 ? header : list(data.header).length === 4 ? list(data.header).map(show) : ['Mesas', 'Toma de orden', 'Listo en tablet', 'Tiempo total']
  for (const name of names) {
    const rows = longestFirst(toast.filter(row => category(row) === name && !isError(row)))
    const title = `Demora en preparación de ${name}`
    // Las fotos del punto de venta son capturas de la tablet: se enseñan enteras (contain), con la mesa y lo que tardó
    const shared = (row: Dict) => image(row.imageToShare, `Mesa ${tableOf(row)} · ${durationText(row)}`, null)
    chunkArray(rows, 10).forEach((chunk, index) => {
      if (chunk.length === 0) return
      const size = sizeFor(chunk.length)
      sheets.push({
        key: `${key}-pos-${name}-${index}`, section: 'prep', label: title, title, cover: null,
        blocks: [
          { type: 'table', header: posHead, rows: chunk.map(row => timeRow(row)) },
          ...(chunk.length <= 3 ? [{ type: 'images' as const, images: chunk.map(shared), width: size.width, height: size.height, fit: 'contain' as const }] : []),
        ],
      })
    })
    if (rows.length > 3) {
      chunkArr(rows, 4).forEach((chunk, index) => sheets.push({
        key: `${key}-pos-fotos-${name}-${index}`, section: 'prep', label: title, title, cover: null,
        blocks: [{ type: 'images', images: chunk.map(shared), width: '48%', height: 240, fit: 'contain' }],
      }))
    }
    const errors = toast.filter(row => category(row) === name && isError(row))
    chunkArr(errors, 2).forEach((chunk, index) => sheets.push({
      key: `${key}-comanda-${name}-${index}`, section: 'prep', label: `Preparación de orden sin comandar - ${name}`, title: `Preparación de orden sin comandar - ${name}`, cover: null,
      blocks: [{ type: 'images', images: chunk.map(row => image(row.imageToShare, tableOf(row) ? `Mesa ${tableOf(row)}` : null, null)), width: chunk.length === 1 ? '100%' : '48%', height: chunk.length === 1 ? 420 : 400, fit: 'contain' }],
    }))
  }

  delivery.forEach((row, index) => {
    const period = rec(row.timePeriod)
    const duration = text(period.timeTotal) ?? clock(spanSeconds(text(period.listoCocina), text(period.EntregaPLato ?? period.entregaPlato))) ?? durationText(row)
    sheets.push({
      key: `${key}-entrega-${index}`, section: 'prep', label: 'Demora en entrega', title: '', cover: null,
      blocks: [
        { type: 'box', text: `Demora en entrega de ${text(row.nameDish) ?? 'plato'} - mesa: ${tableOf(row)}`, size: 'title' },
        { type: 'images', width: '48%', height: 200, images: list(row.imageUrl).map(rec).map(item => image(item.url, text(item.caption), arrowOf(item.coordinates))) },
        { type: 'box', text: `Duración: ${duration}`, size: 'line' },
      ],
    })
  })

  for (const name of names) {
    const rows = longestFirst(services.filter(row => category(row) === name))
    if (rows.length === 0) continue
    const dish = dishes.find(item => item.nameDishe === name)
    const withTable = dish?.requiresTableNumber !== false
    const limit = timePeriodEs((night ? dish?.timeLimit?.night ?? dish?.timeLimit?.day : dish?.timeLimit?.day) ?? '00:00:00')
    const titleForTable = withTable ? `${rows.length > 1 ? 'Mesas' : 'Mesa'} con demora superior a ${limit} para recibir servicio de ${name}` : `Demora superior a ${limit} para recibir servicio de ${name}`
    const titleHead = withTable ? `Mesa con mayor demora en recibir servicio de ${name}` : `Demora con mayor tiempo en recibir servicio de ${name}`
    const titleLine = lineOf(rows[0], withTable)
    const arrows = list(rows[0].coordinates)
    const photos = (height: number): Block => ({ type: 'images', width: '48%', height, images: [image(urlOf(rows[0], 0), 'Toma de orden', arrowOf(arrows[0]) ?? DEFAULT_ARROW), image(urlOf(rows[0], 1), `Entrega de ${name}`, arrowOf(arrows[1]) ?? DEFAULT_ARROW)] })
    chunkArray(rows, 10).forEach((chunk, index) => {
      if (chunk.length < 2) return
      sheets.push({
        key: `${key}-servicio-${name}-${index}`, section: 'prep', label: `Servicio de ${name}`, title: titleForTable, cover: null,
        blocks: [
          { type: 'table', header: [...(withTable ? ['Mesas'] : []), 'Toma de orden', 'Entrega de servicio', 'Demora'], rows: chunk.map(row => timeRow(row, withTable)) },
          ...(chunk.length < 4 ? [{ type: 'text' as const, heading: titleHead, line: titleLine, tone: 'light' as const }, photos(170)] : []),
        ],
      })
    })
    if (rows.length > 3 || rows.length === 1) {
      sheets.push({
        key: `${key}-servicio-${name}-mayor`, section: 'prep', label: `Servicio de ${name}`, title: '', cover: null,
        blocks: [{ type: 'text', heading: rows.length === 1 ? titleForTable : titleHead, line: titleLine, tone: 'dark' }, photos(300)],
      })
    }
  }
  return sheets
}

// touchPageData (CompoundPageTouch): toda la tabla en una hoja y, si hay más de 3 filas, otra de 4 fotos
function touchSheets(data: Dict, key: string): Sheet[] {
  const rows = list(data.body).filter(hasPeriod)
  const urls = list(data.img)
  const arrows = list(data.coordinates)
  if (rows.length === 0 && urls.length === 0) return []
  const title = text(data.namePageTable) ?? (rows.length < 11 ? 'Toques de' : 'Algunos toques de')
  const header = list(data.header).map(show)
  const size = sizeFor(rows.length)
  // Arriba de la tabla, lo que se busca al leerla: cuántos toques, cuánto duran de media y el más largo
  const timed = rows.map(row => ({ row, seconds: secondsOf(durationOf(row)) })).filter((item): item is { row: unknown; seconds: number } => item.seconds !== null)
  const longestTouch = timed.reduce<{ row: unknown; seconds: number } | null>((best, item) => (!best || item.seconds > best.seconds ? item : best), null)
  const stats: Block[] = rows.length > 0 ? [{
    type: 'stats',
    items: [
      { label: rows.length === 1 ? 'Toque' : 'Toques', value: String(rows.length) },
      ...(timed.length > 0 ? [{ label: 'Duración promedio', value: clock(timed.reduce((sum, item) => sum + item.seconds, 0) / timed.length) ?? '' }] : []),
      ...(longestTouch ? [{ label: 'El más largo', value: `${clock(longestTouch.seconds)} · mesa ${tableOf(longestTouch.row)}` }] : []),
    ],
  }] : []
  const sheets: Sheet[] = [{
    key, section: 'touches', label: 'Toques', title, cover: null,
    blocks: [
      ...stats,
      { type: 'table', header: header.length === 4 ? header : ['Mesas', 'Inició', 'Finalizó', 'Duración'], rows: rows.map(row => timeRow(row)) },
      ...(rows.length <= 3 && rows.length > 0 ? [{ type: 'images' as const, width: size.width, height: rows.length === 1 ? 260 : size.height - 90, images: rows.map((_row, index) => image(urls[index], null, arrowOf(arrows[index]) ?? DEFAULT_ARROW)) }] : []),
    ],
  }]
  if (rows.length > 3) {
    sheets.push({
      key: `${key}-fotos`, section: 'touches', label: 'Toques', title: text(data.namePageImg) ?? 'Toques de', cover: null,
      blocks: [{ type: 'images', width: '48%', height: 230, images: [0, 1, 2, 3].map(index => image(urls[index], null, arrowOf(arrows[index]) ?? DEFAULT_ARROW)) }],
    })
  }
  return sheets
}

// blocked&novelty (compoundPageNovelty): una hoja por cada vez que pasó
function noveltySheets(data: Dict, key: string): Sheet[] {
  const menu = rec(data.menuRef)
  const slots = list(rec(menu.photos).caption).map(item => text(rec(item).es))
  const name = text(menu.es) ?? 'Novedad'
  return list(data.body).map(rec).map((row, index) => {
    const arrows = list(row.coordinates)
    const count = Math.max(slots.length, list(row.imageUrl).length)
    const images = Array.from({ length: count }, (_unused, slot) => slot)
      .filter(slot => !(row.jarvisNewsHydration === true && urlOf(row, slot) === undefined))
      .map(slot => {
        const entry = list(row.imageUrl).map(rec).find((item, position) => (typeof item.index === 'number' ? item.index : position) === slot)
        const caption = slots.length > 1 && !menu.noSubtitleInTheReport ? text(entry?.caption) ?? slots[slot] ?? null : null
        return image(entry?.url, caption, arrowOf(arrows[slot]) ?? DEFAULT_ARROW)
      })
    const period = periodOf(row)
    const duration = menu.time ? text(row.timeTotal) ?? (period.init || period.end ? durationText(row) : '00:00:00') : null
    const note = menu.descriptionNoteForReportDocument && !row.hiddenDescription ? text(row.description) ?? 'Nota:' : null
    // Cuándo pasó, si la fila lo trae: va en la caja del título, junto a la mesa
    const meta = period.init && period.end && period.init !== period.end ? `${period.init} → ${period.end}` : period.init ?? period.end ?? null
    return {
      key: `${key}-${index}`, section: 'novelties' as const, label: name, title: menu.noSubtitleInTheReport ? null : name, cover: null,
      blocks: [{ type: 'novelty' as const, images, title: show(row.title), meta, duration: duration ? `Duración: ${duration}` : null, note, side: slots.length === 2 }],
    }
  })
}

// buildSheets = «todas las hojas del informe, en su orden»
export function buildSheets(document: ShiftDocument, establishment: FullEstablishment): Sheet[] {
  const config = rec(establishment.config_report)
  const sheets: Sheet[] = []
  for (const page of orderedPages(document.pages)) {
    const key = page._id || page.type
    const data = Array.isArray(page.data) ? page.data : rec(page.data)
    if (page.type === 'front') sheets.push(...coverSheets(document, establishment, config))
    else if (page.type === 'summary') sheets.push(...summarySheets(data, key, config))
    else if (page.type === 'delay1ra') sheets.push(...delaySheets(rec(data), key, 'firstAttention', config))
    else if (page.type === 'delayClear') sheets.push(...delaySheets(rec(data), key, 'cleaning', config))
    else if (page.type === 'delayToastPostAndServise') sheets.push(...prepSheets(rec(data), key, config, establishment.dishes, document.shift === 'night'))
    else if (page.type === 'touchPageData') sheets.push(...touchSheets(rec(data), key))
    else if (page.type === 'blocked&novelty') sheets.push(...noveltySheets(rec(data), key))
  }
  // Sin página de portada (un informe a medias), igual se abre con la portada: es lo primero del PDF
  if (!sheets.some(sheet => sheet.section === 'cover') && document.pages.length > 0) sheets.unshift(...coverSheets(document, establishment, config))
  // Un hueco de fotos sin ninguna foto no dice nada (el PDF imprime ahí una imagen de relleno): se quita, y la hoja que
  // se queda sin nada (la de fotos de los toques, cuando no se subió ninguna), también
  return sheets
    .map(sheet => ({ ...sheet, blocks: sheet.blocks.filter(block => !(block.type === 'images' && block.images.every(item => !item.src))) }))
    .filter(sheet => sheet.cover !== null || sheet.blocks.length > 0)
}

// photosOfSheet = «las fotos de una hoja», para abrirlas en el visor
export function photosOfSheet(sheet: Sheet): { src: string; caption: string | null }[] {
  return sheet.blocks.flatMap(block => ('images' in block ? block.images : []))
    .filter((item): item is SheetImage & { src: string } => Boolean(item.src))
    .map(item => ({ src: item.src, caption: item.caption }))
}
