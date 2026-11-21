import { DEMO_WEEK, PALETTE } from '../landing.content'

/*  LAS HOJAS DEL INFORME SEMANAL, DIBUJADAS PARA LA PORTADA C
 *
 *  Cada hoja copia la composición de su hoja real del PDF (1000 × 700, apaisada): título en tinta, subtítulo,
 *  la regla con el degradado de la marca, cabeceras de tabla en gris y las gráficas en ocre, naranja y chocolate
 *  sobre marfil. Las cifras son las de la semana de ejemplo. Se dibujan en coordenadas de la hoja; quien llama
 *  escala el lienzo a la resolución que quiera.
 */

// SHEET_WIDTH, SHEET_HEIGHT = «el tamaño de una hoja del PDF, en píxeles de la hoja»
export const SHEET_WIDTH = 1000
export const SHEET_HEIGHT = 700
// SHEET_FAMILY = «la letra de las hojas: la misma de la portada»
export const SHEET_FAMILY = 'Manrope, ui-sans-serif, system-ui, sans-serif'

// ReportSheet = «una hoja: su nombre, para la lista de la portada, y cómo se dibuja»
export type ReportSheet = { name: string; draw: (context: CanvasRenderingContext2D) => void }

const font = (weight: number, size: number) => `${weight} ${size}px ${SHEET_FAMILY}`

function brandRule(context: CanvasRenderingContext2D, fromX: number, toX: number, positionY: number, thickness: number) {
  const gradient = context.createLinearGradient(fromX, 0, toX, 0)
  gradient.addColorStop(0, '#29c50c')
  gradient.addColorStop(0.55, '#d9a441')
  gradient.addColorStop(1, '#b5763b')
  context.fillStyle = gradient
  context.fillRect(fromX, positionY, toX - fromX, thickness)
}

function sheetFrame(context: CanvasRenderingContext2D, title: string, subtitle: string) {
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT)
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillStyle = PALETTE.ink
  context.font = font(800, 30)
  context.fillText(title, 56, 76)
  context.fillStyle = PALETTE.inkSoft
  context.font = font(500, 16)
  context.fillText(subtitle, 56, 104)
  brandRule(context, 56, SHEET_WIDTH - 56, 122, 3)
  context.fillStyle = '#9a917f'
  context.font = font(500, 12)
  context.textAlign = 'right'
  context.fillText(`insights365 · ${DEMO_WEEK.branch} · ${DEMO_WEEK.range}`, SHEET_WIDTH - 56, SHEET_HEIGHT - 26)
}

function roundedRect(context: CanvasRenderingContext2D, positionX: number, positionY: number, width: number, height: number, radius: number | number[]) {
  context.beginPath()
  context.roundRect(positionX, positionY, width, height, radius)
}

// table = «una tabla como las del informe: cabecera gris, filas alternas en blanco y marfil»
function table(context: CanvasRenderingContext2D, columns: { label: string; width: number }[], rows: string[][], options: { top: number; rowHeight: number; boldLast?: boolean }) {
  const left = 56
  const totalWidth = columns.reduce((sum, column) => sum + column.width, 0)
  context.fillStyle = PALETTE.reportHeader
  context.fillRect(left, options.top, totalWidth, 44)
  context.fillStyle = '#ffffff'
  context.font = font(700, 14)
  let cursor = left
  columns.forEach((column, columnIndex) => {
    context.textAlign = columnIndex === 0 ? 'left' : 'center'
    context.fillText(column.label, columnIndex === 0 ? cursor + 16 : cursor + column.width / 2, options.top + 28)
    cursor += column.width
  })

  rows.forEach((row, rowIndex) => {
    const rowTop = options.top + 44 + rowIndex * options.rowHeight
    const isLast = options.boldLast && rowIndex === rows.length - 1
    context.fillStyle = isLast ? PALETTE.ivoryDeep : rowIndex % 2 === 0 ? '#ffffff' : PALETTE.ivory
    context.fillRect(left, rowTop, totalWidth, options.rowHeight)
    context.fillStyle = '#ece5d5'
    context.fillRect(left, rowTop + options.rowHeight - 1, totalWidth, 1)
    let rowCursor = left
    row.forEach((cell, cellIndex) => {
      const column = columns[cellIndex]
      context.fillStyle = PALETTE.ink
      context.font = cellIndex === 0 ? font(isLast ? 800 : 500, 15) : font(700, 16)
      context.textAlign = cellIndex === 0 ? 'left' : 'center'
      context.fillText(cell, cellIndex === 0 ? rowCursor + 16 : rowCursor + column.width / 2, rowTop + options.rowHeight / 2 + 6)
      rowCursor += column.width
    })
  })
}

function plotArea(context: CanvasRenderingContext2D, area: { left: number; top: number; right: number; bottom: number }, maxValue: number, ticks: number[], suffix: string) {
  context.fillStyle = PALETTE.ivory
  context.fillRect(area.left, area.top, area.right - area.left, area.bottom - area.top)
  context.font = font(500, 12)
  context.textAlign = 'right'
  for (const tick of ticks) {
    const positionY = area.bottom - (tick / maxValue) * (area.bottom - area.top)
    context.fillStyle = '#ece5d5'
    context.fillRect(area.left, positionY, area.right - area.left, 1)
    context.fillStyle = '#8a8170'
    context.fillText(`${tick}${suffix}`, area.left - 10, positionY + 4)
  }
}

function dayAxis(context: CanvasRenderingContext2D, area: { left: number; right: number; bottom: number }) {
  const slot = (area.right - area.left) / DEMO_WEEK.days.length
  context.fillStyle = '#7a7161'
  context.font = font(600, 13)
  context.textAlign = 'center'
  DEMO_WEEK.days.forEach((dayName, dayIndex) => {
    context.fillText(dayName, area.left + slot * (dayIndex + 0.5), area.bottom + 24)
  })
  return slot
}

function legend(context: CanvasRenderingContext2D, items: { label: string; color: string }[], positionY: number) {
  context.font = font(600, 13)
  context.textAlign = 'left'
  const widths = items.map(item => context.measureText(item.label).width + 40)
  let cursor = SHEET_WIDTH / 2 - widths.reduce((sum, width) => sum + width, 0) / 2
  items.forEach((item, itemIndex) => {
    context.fillStyle = item.color
    context.fillRect(cursor, positionY - 10, 12, 12)
    context.fillStyle = PALETTE.inkSoft
    context.fillText(item.label, cursor + 18, positionY)
    cursor += widths[itemIndex]
  })
}

/* 1. Portada */
function drawCover(context: CanvasRenderingContext2D) {
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, SHEET_WIDTH, SHEET_HEIGHT)
  context.textAlign = 'center'
  context.textBaseline = 'alphabetic'
  context.fillStyle = PALETTE.greenText
  context.font = font(800, 15)
  context.letterSpacing = '6px'
  context.fillText('REPORTE SEMANAL', SHEET_WIDTH / 2, 248)
  context.letterSpacing = '0px'
  context.fillStyle = PALETTE.ink
  context.font = font(800, 56)
  context.fillText(DEMO_WEEK.branch, SHEET_WIDTH / 2, 322)
  context.fillStyle = PALETTE.inkSoft
  context.font = font(500, 22)
  context.fillText(`Del ${DEMO_WEEK.range.replace(/^del /, '')}`, SHEET_WIDTH / 2, 372)

  const chip = `${DEMO_WEEK.shiftsFound} de ${DEMO_WEEK.shiftsExpected} turnos`
  context.font = font(700, 16)
  const chipWidth = context.measureText(chip).width + 44
  roundedRect(context, SHEET_WIDTH / 2 - chipWidth / 2, 410, chipWidth, 40, 20)
  context.strokeStyle = '#d8ccb2'
  context.lineWidth = 1.5
  context.stroke()
  context.fillStyle = PALETTE.ink
  context.fillText(chip, SHEET_WIDTH / 2, 436)

  context.fillStyle = PALETTE.greenText
  context.font = font(800, 18)
  context.fillText('insights365', SHEET_WIDTH / 2, 600)
  brandRule(context, 0, SHEET_WIDTH, SHEET_HEIGHT - 12, 12)
}

/* 2. Tabla general de métrica */
function drawMetric(context: CanvasRenderingContext2D) {
  sheetFrame(context, 'Tabla general de métrica', 'Procesos evaluados, promedios y demoras en preparación')
  table(
    context,
    [{ label: 'Categoría', width: 300 }, { label: 'Procesos evaluados', width: 200 }, { label: 'Tiempo promedio', width: 200 }, { label: 'Demoras', width: 188 }],
    [
      ...DEMO_WEEK.metric.map(row => [row.dish, row.processes, row.average, row.delays]),
      ['Total', DEMO_WEEK.metricTotal.processes, '', DEMO_WEEK.metricTotal.delays],
    ],
    { top: 168, rowHeight: 62, boldLast: true },
  )
  context.textAlign = 'left'
  context.fillStyle = PALETTE.inkSoft
  context.font = font(600, 16)
  context.fillText('Porcentaje de demora en preparación', 56, 520)
  context.fillStyle = PALETTE.orange
  context.font = font(800, 64)
  context.fillText(DEMO_WEEK.metricTotal.delayPct, 56, 590)
}

/* 3. Cantidad de demoras por día */
function drawDelaysByDay(context: CanvasRenderingContext2D) {
  sheetFrame(context, 'Cantidad de demoras por día', 'Desglose por categoría')
  const area = { left: 96, top: 168, right: 944, bottom: 580 }
  const maxValue = 12
  plotArea(context, area, maxValue, [0, 3, 6, 9, 12], '')
  const slot = dayAxis(context, area)
  const series = [
    { values: DEMO_WEEK.delaysByDish.lunch, color: PALETTE.orange },
    { values: DEMO_WEEK.delaysByDish.mainCourse, color: PALETTE.chocolate },
  ]
  const barWidth = 26
  DEMO_WEEK.days.forEach((_dayName, dayIndex) => {
    series.forEach((serie, serieIndex) => {
      const value = serie.values[dayIndex]
      if (!value) return
      const barHeight = (value / maxValue) * (area.bottom - area.top)
      const positionX = area.left + slot * (dayIndex + 0.5) + (serieIndex === 0 ? -barWidth - 3 : 3)
      context.fillStyle = serie.color
      roundedRect(context, positionX, area.bottom - barHeight, barWidth, barHeight, [4, 4, 0, 0])
      context.fill()
      context.fillStyle = PALETTE.ink
      context.font = font(800, 13)
      context.textAlign = 'center'
      context.fillText(String(value), positionX + barWidth / 2, area.bottom - barHeight - 8)
    })
  })
  legend(context, [{ label: 'Demoras de Lunch', color: PALETTE.orange }, { label: 'Demoras de Plato fuerte', color: PALETTE.chocolate }], 640)
}

/* 4. Porcentaje de demoras por día */
function drawDelayPct(context: CanvasRenderingContext2D) {
  sheetFrame(context, 'Porcentaje de demoras por día', 'Demoras sobre los procesos evaluados de cada día')
  const area = { left: 96, top: 168, right: 944, bottom: 590 }
  const maxValue = 25
  plotArea(context, area, maxValue, [0, 5, 10, 15, 20, 25], '%')
  const slot = dayAxis(context, area)
  const points = DEMO_WEEK.delayPctByDay.map((value, dayIndex) => ({
    positionX: area.left + slot * (dayIndex + 0.5),
    positionY: area.bottom - (value / maxValue) * (area.bottom - area.top),
    value,
  }))
  context.strokeStyle = PALETTE.orange
  context.lineWidth = 3.5
  context.lineJoin = 'round'
  context.beginPath()
  points.forEach((point, pointIndex) => {
    if (pointIndex === 0) context.moveTo(point.positionX, point.positionY)
    else context.lineTo(point.positionX, point.positionY)
  })
  context.stroke()
  for (const point of points) {
    context.beginPath()
    context.arc(point.positionX, point.positionY, 6, 0, Math.PI * 2)
    context.fillStyle = PALETTE.orange
    context.fill()
    context.lineWidth = 3
    context.strokeStyle = PALETTE.ivory
    context.stroke()
    context.fillStyle = PALETTE.ink
    context.font = font(800, 14)
    context.textAlign = 'center'
    context.fillText(`${point.value.toFixed(1)}%`, point.positionX, point.positionY - 16)
  }
}

/* 5. Toques de gerente */
function drawTouches(context: CanvasRenderingContext2D) {
  sheetFrame(context, `Toques de ${DEMO_WEEK.touches.role.toLowerCase()}`, 'Primeros toques sobre las rotaciones del turno; otros toques sobre los primeros')
  const { first, others } = DEMO_WEEK.touches
  const centerX = 300
  const centerY = 400
  const pieRadius = 190
  const firstAngle = (first / (first + others)) * Math.PI * 2
  const slices = [
    { from: -Math.PI / 2, to: -Math.PI / 2 + firstAngle, color: PALETTE.orange, value: first },
    { from: -Math.PI / 2 + firstAngle, to: Math.PI * 1.5, color: PALETTE.chocolate, value: others },
  ]
  for (const slice of slices) {
    context.beginPath()
    context.moveTo(centerX, centerY)
    context.arc(centerX, centerY, pieRadius, slice.from, slice.to)
    context.closePath()
    context.fillStyle = slice.color
    context.fill()
    const middle = (slice.from + slice.to) / 2
    context.fillStyle = '#ffffff'
    context.font = font(800, 22)
    context.textAlign = 'center'
    context.fillText(`${slice.value.toFixed(1)}%`, centerX + Math.cos(middle) * pieRadius * 0.6, centerY + Math.sin(middle) * pieRadius * 0.6 + 8)
  }
  const rows = [
    { label: 'Promedio de primeros toques', value: `${first.toFixed(1)}%`, color: PALETTE.orange },
    { label: 'Promedio de otros toques', value: `${others.toFixed(1)}%`, color: PALETTE.chocolate },
  ]
  rows.forEach((row, rowIndex) => {
    const rowTop = 330 + rowIndex * 64
    context.fillStyle = row.color
    context.fillRect(560, rowTop - 12, 14, 14)
    context.fillStyle = PALETTE.ink
    context.font = font(600, 17)
    context.textAlign = 'left'
    context.fillText(row.label, 586, rowTop)
    context.font = font(800, 19)
    context.textAlign = 'right'
    context.fillText(row.value, 944, rowTop)
    context.fillStyle = '#ece5d5'
    context.fillRect(560, rowTop + 22, 384, 1)
  })
}

// REPORT_SHEETS = «las hojas del abanico, de izquierda a derecha. Son impares para que la portada quede sola en el
// centro, delante de todas; el cuadro general no va porque ya lo enseña la portada B»
export const REPORT_SHEETS: ReportSheet[] = [
  { name: 'Tabla de métrica', draw: drawMetric },
  { name: 'Demoras por día', draw: drawDelaysByDay },
  { name: 'Portada', draw: drawCover },
  { name: 'Porcentaje por día', draw: drawDelayPct },
  { name: 'Toques de gerente', draw: drawTouches },
]

// SHEET_FONTS = «los pesos de la letra que usan las hojas; se esperan antes de redibujarlas»
export const SHEET_FONTS = [500, 600, 700, 800].map(weight => font(weight, 20))
