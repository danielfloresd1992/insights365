import { DEMO_WEEK } from '../../../landing.content'
import { CHART_COLORS } from './chartColors'

/*  LAS GRÁFICAS DEL SEMANAL, EN PEQUEÑO (propuesta A, «La semana en cifras»)
 *
 *  Cada una copia una hoja o una tabla del informe semanal con las cifras de la semana de ejemplo (DEMO_WEEK): las
 *  mismas que imprime el PDF, decimales con punto incluidos. Son SVG que se escalan con su tarjeta. Se arman al
 *  aparecer: las barras crecen, la línea se dibuja y los anillos se llenan; eso lo hace el CSS de pa-* cuando la
 *  rejilla lleva data-in='true'. Solo pintan.
 */

const DAYS = DEMO_WEEK.days

/*  «Cantidad de demoras por día»: Lunch y Plato fuerte, lado a lado, con su cifra encima */
export function DelaysByDishChart() {
  const area = { left: 30, right: 552, top: 22, bottom: 196 }
  const maxValue = 12
  const groupWidth = (area.right - area.left) / DAYS.length
  const barWidth = 22
  const scaleY = (value: number) => ((area.bottom - area.top) * value) / maxValue
  const series = [
    { values: DEMO_WEEK.delaysByDish.lunch, color: CHART_COLORS.lunch },
    { values: DEMO_WEEK.delaysByDish.mainCourse, color: CHART_COLORS.mainCourse },
  ]

  return (
    <svg viewBox='0 0 560 230' className='h-auto w-full' role='img' aria-label='Cantidad de demoras por día de la semana de ejemplo, de Lunch y de Plato fuerte'>
      {[0, 4, 8, 12].map(tick => (
        <g key={tick}>
          <line x1={area.left} x2={area.right} y1={area.bottom - scaleY(tick)} y2={area.bottom - scaleY(tick)} stroke={CHART_COLORS.grid} />
          <text x={area.left - 8} y={area.bottom - scaleY(tick) + 4} textAnchor='end' fontSize='11' fill={CHART_COLORS.axis}>
            {tick}
          </text>
        </g>
      ))}
      {DAYS.map((day, dayIndex) => {
        const center = area.left + groupWidth * (dayIndex + 0.5)
        return (
          <g key={day}>
            {series.map((entry, seriesIndex) => {
              const value = entry.values[dayIndex]
              const left = center - barWidth - 2 + seriesIndex * (barWidth + 4)
              const height = scaleY(value)
              const delay = `${dayIndex * 0.07 + seriesIndex * 0.04}s`
              return (
                <g key={seriesIndex}>
                  <rect className='pa-bar' style={{ ['--delay' as string]: delay }} x={left} y={area.bottom - height} width={barWidth} height={Math.max(height, 0.01)} rx='3' fill={entry.color} />
                  {/* Un cero no lleva cifra: no hay barra a la que ponérsela */}
                  {value > 0 && (
                    <text className='pa-fade' style={{ ['--delay' as string]: `calc(${delay} + 0.45s)` }} x={left + barWidth / 2} y={area.bottom - height - 6} textAnchor='middle' fontSize='12' fontWeight='600' fill={CHART_COLORS.ink}>
                      {value}
                    </text>
                  )}
                </g>
              )
            })}
            <text x={center} y={area.bottom + 22} textAnchor='middle' fontSize='12' fill={CHART_COLORS.axis}>
              {day}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/*  «Porcentaje de demoras por día»: la línea de la semana con su cifra en cada punto */
export function DelayPctChart() {
  const area = { left: 34, right: 404, top: 26, bottom: 188 }
  const maxValue = 30
  const values = DEMO_WEEK.delayPctByDay
  const stepX = (area.right - area.left) / (values.length - 1)
  const points = values.map((value, index) => ({
    x: area.left + stepX * index,
    y: area.bottom - ((area.bottom - area.top) * value) / maxValue,
    value,
  }))
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(' ')
  const fill = `${line} L${area.right} ${area.bottom} L${area.left} ${area.bottom} Z`

  return (
    <svg viewBox='0 0 420 222' className='h-auto w-full' role='img' aria-label='Porcentaje de demoras por día de la semana de ejemplo'>
      <defs>
        <linearGradient id='pa-pct-fill' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={CHART_COLORS.pct} stopOpacity='0.18' />
          <stop offset='100%' stopColor={CHART_COLORS.pct} stopOpacity='0' />
        </linearGradient>
      </defs>
      {[0, 10, 20, 30].map(tick => {
        const positionY = area.bottom - ((area.bottom - area.top) * tick) / maxValue
        return (
          <g key={tick}>
            <line x1={area.left} x2={area.right} y1={positionY} y2={positionY} stroke={CHART_COLORS.grid} />
            <text x={area.left - 8} y={positionY + 4} textAnchor='end' fontSize='11' fill={CHART_COLORS.axis}>
              {tick}%
            </text>
          </g>
        )
      })}
      <path className='pa-fade' style={{ ['--delay' as string]: '0.5s' }} d={fill} fill='url(#pa-pct-fill)' />
      <path className='pa-line' d={line} pathLength={1} fill='none' stroke={CHART_COLORS.pct} strokeWidth='2.5' strokeLinejoin='round' strokeLinecap='round' />
      {points.map((point, index) => {
        // En un valle (más bajo que sus vecinos) la cifra va debajo del punto, para no cruzarse con la línea
        const valley = index > 0 && index < points.length - 1 && point.value < points[index - 1].value && point.value < points[index + 1].value
        return (
        <g key={DAYS[index]} className='pa-fade' style={{ ['--delay' as string]: `${0.25 + index * 0.12}s` }}>
          <circle cx={point.x} cy={point.y} r='4.5' fill='#ffffff' stroke={CHART_COLORS.pct} strokeWidth='2.5' />
          <text x={valley && point.y + 20 > area.bottom - 4 ? point.x + 26 : point.x} y={valley ? (point.y + 20 > area.bottom - 4 ? point.y + 4 : point.y + 20) : point.y - 11} textAnchor='middle' fontSize='11.5' fontWeight='600' fill={CHART_COLORS.ink}>
            {point.value.toFixed(1)}%
          </text>
          <text x={point.x} y={area.bottom + 22} textAnchor='middle' fontSize='12' fill={CHART_COLORS.axis}>
            {DAYS[index]}
          </text>
        </g>
        )
      })}
    </svg>
  )
}

/*  «Procesos evaluados»: diurnos y nocturnos de cada día, apilados, con el total encima */
export function ProcessesChart() {
  const area = { left: 8, right: 552, top: 24, bottom: 150 }
  const maxValue = 80
  const groupWidth = (area.right - area.left) / DAYS.length
  const barWidth = 34
  const scaleY = (value: number) => ((area.bottom - area.top) * value) / maxValue

  return (
    <svg viewBox='0 0 560 178' className='h-auto w-full' role='img' aria-label='Procesos evaluados por día de la semana de ejemplo, diurnos y nocturnos'>
      <line x1={area.left} x2={area.right} y1={area.bottom} y2={area.bottom} stroke={CHART_COLORS.grid} />
      {DAYS.map((day, dayIndex) => {
        const dayValue = DEMO_WEEK.processes.day[dayIndex]
        const nightValue = DEMO_WEEK.processes.night[dayIndex]
        const left = area.left + groupWidth * (dayIndex + 0.5) - barWidth / 2
        const dayHeight = scaleY(dayValue)
        const nightHeight = scaleY(nightValue)
        const delay = `${dayIndex * 0.07}s`
        return (
          <g key={day}>
            <rect className='pa-bar' style={{ ['--delay' as string]: delay }} x={left} y={area.bottom - dayHeight} width={barWidth} height={dayHeight} rx='3' fill={CHART_COLORS.dayShift} />
            <rect className='pa-bar pa-bar--late' style={{ ['--delay' as string]: delay }} x={left} y={area.bottom - dayHeight - nightHeight - 2} width={barWidth} height={nightHeight} rx='3' fill={CHART_COLORS.nightShift} />
            <text className='pa-fade' style={{ ['--delay' as string]: `calc(${delay} + 0.6s)` }} x={left + barWidth / 2} y={area.bottom - dayHeight - nightHeight - 9} textAnchor='middle' fontSize='12' fontWeight='600' fill={CHART_COLORS.ink}>
              {dayValue + nightValue}
            </text>
            <text x={left + barWidth / 2} y={area.bottom + 20} textAnchor='middle' fontSize='12' fill={CHART_COLORS.axis}>
              {day}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/*  Un anillo que se llena hasta su porcentaje; si pasa de 100, da otra vuelta en tinta */
export function PercentRing({ value, color, label }: { value: number; color: string; label: string }) {
  const firstLap = Math.min(value, 100)
  const secondLap = Math.max(0, value - 100)
  return (
    <svg viewBox='0 0 120 120' className='h-auto w-full max-w-[132px]' role='img' aria-label={`${label}: ${value.toFixed(1)}%`}>
      <circle cx='60' cy='60' r='48' fill='none' stroke='#f4f2ee' strokeWidth='12' />
      <circle className='pa-ring' style={{ ['--arc' as string]: firstLap }} cx='60' cy='60' r='48' fill='none' stroke={color} strokeWidth='12' strokeLinecap='round' pathLength={100} transform='rotate(-90 60 60)' />
      {secondLap > 0 && (
        <circle className='pa-ring pa-ring--late' style={{ ['--arc' as string]: secondLap }} cx='60' cy='60' r='48' fill='none' stroke={CHART_COLORS.ink} strokeWidth='12' strokeLinecap='round' pathLength={100} transform='rotate(-90 60 60)' />
      )}
      <text x='60' y='66' textAnchor='middle' fontSize='20' fontWeight='700' fill={CHART_COLORS.ink}>
        {value.toFixed(1)}%
      </text>
    </svg>
  )
}

/*  Un sol o una luna, para los turnos diurno y nocturno */
export function ShiftIcon({ shift, color = 'currentColor' }: { shift: 'day' | 'night'; color?: string }) {
  return shift === 'day' ? (
    <svg viewBox='0 0 16 16' width='14' height='14' aria-hidden='true' fill='none' stroke={color} strokeWidth='1.6' strokeLinecap='round'>
      <circle cx='8' cy='8' r='3' />
      <path d='M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1' />
    </svg>
  ) : (
    <svg viewBox='0 0 16 16' width='14' height='14' aria-hidden='true' fill='none' stroke={color} strokeWidth='1.6' strokeLinejoin='round'>
      <path d='M12.8 10.4A5.5 5.5 0 0 1 5.6 3.2a5.5 5.5 0 1 0 7.2 7.2Z' />
    </svg>
  )
}
