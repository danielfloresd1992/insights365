import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import type { ByShift, ShiftKey, WeeklyReport } from '@/libs/weekly/weeklyMetrics.js'
import { useWeekLoads } from '../hook/useWeekLoads'
import { METRICS, addWeeks, combine, formatMetric, isoWeekOf, summarize, type Metric, type MetricId, type Summary } from '../weekData'
import { storyOf, type FindingIcon, type FindingTone, type Phrase } from '../weekStory'
import type { BarSeries } from './BarChart'
import BarChart3D, { MiniBars3D } from './Bars3D'
import { Arrow, Card, GrowBar, IconTile, NUM, Notice, Progress, STAGE, TABLE, TD, TH } from './parts'
import { TONE } from './tone'
import { METRIC_ICON, SECTION_ICON } from './weeklyIcons'

/*  EL SEMANAL DE UN LOCAL: una semana, con las mismas cifras que el PDF (libs/weekly/weeklyMetrics), contada primero
 *  (propuesta A del lienzo del semanal, elegida por el usuario).
 *
 *  - Arriba, el veredicto frente a la semana anterior y, si faltaron turnos, cuáles.
 *  - Los indicadores, cada uno con su cambio (frente a la semana anterior o al promedio de las tres anteriores) y una
 *    gráfica mínima de sus siete días con el pico marcado.
 *  - «Para mirar primero»: los hallazgos de la semana (weekStory), cada uno con enlace a la sección que lo explica.
 *  - Debajo, el detalle del PDF: el cuadro general (con el turno que más pesó en cada demora), las rotaciones y las
 *    demoras de preparación por día, la preparación por plato, las devoluciones y los toques.
 *  Lo que el local no evalúa (barra, primera atención…) no sale, igual que en el PDF (report.aplica). Las semanas con
 *  que se compara se piden aparte: la semana se enseña en cuanto llega y los cambios aparecen después.
 *  Las gráficas van en 3D y cada título lleva su icono (propuesta B del lienzo «Semanal en 3D con iconos»: Bars3D,
 *  IconTile y weeklyIcons); las cifras son las mismas.
 *
 *  @param establishment  el local
 *  @param monday         el lunes de la semana
 */
type WeeklyViewProps = { establishment: FullEstablishment; monday: string }

// Base = «contra qué se compara»: la semana anterior o el promedio de las AVERAGE_WEEKS anteriores
type Base = 'previous' | 'average'
const AVERAGE_WEEKS = 3

// SHIFT_COLOR = «el color de cada turno en las gráficas»; el turno único usa el del diurno
const SHIFT_COLOR: Record<ShiftKey, string> = { day: 'bg-chart-day', night: 'bg-chart-night', all: 'bg-chart-day' }
// SHIFT_TINT = «el mismo color, como valor de CSS», para rellenar las cajas de la gráfica en 3D
const SHIFT_TINT: Record<ShiftKey, string> = { day: 'var(--color-chart-day)', night: 'var(--color-chart-night)', all: 'var(--color-chart-day)' }

// FINDING_LOOK = «el aspecto de cada hallazgo»: grave en naranja, aviso en ocre, bueno en azul
const FINDING_LOOK: Record<FindingTone, { card: string; area: string }> = {
  bad: { card: 'bg-[#fbeee8] ring-[#ecc9b8] dark:bg-[#2b2119] dark:ring-[#5a3a28]', area: 'text-[#b04a22] dark:text-[#f4a98c]' },
  warn: { card: 'bg-portal-surface ring-portal-line', area: 'text-[#80590a] dark:text-[#e9c46a]' },
  good: { card: 'bg-[#edf3fb] ring-[#c9d8ee] dark:bg-[#1d2430] dark:ring-[#34496b]', area: 'text-[#2f63b8] dark:text-[#a9cdf5]' },
  neutral: { card: 'bg-portal-surface ring-portal-line', area: 'text-portal-muted' },
}

// FINDING_ICON = «el dibujo de cada hallazgo»: cocina (reloj), salón (mesa), calendario, devolución, todo bien
const FINDING_ICON: Record<FindingIcon, string[]> = {
  kitchen: ['M12 7v5l3 2', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z'],
  hall: ['M3 10h18', 'M6 10v9M18 10v9', 'M8 6h8'],
  calendar: ['M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M8 3v4M16 3v4M4 10h16'],
  returns: ['M9 14L4 9l5-5', 'M4 9h10a6 6 0 0 1 0 12h-3'],
  check: ['M5 12l5 5L20 7'],
}

// sentence = «la frase con su primera letra en mayúscula»
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

export default function WeeklyView({ establishment, monday }: WeeklyViewProps) {
  const { t } = useTranslation()
  const [base, setBase] = useState<Base>('previous')
  const key = `${establishment._id}|${monday}`
  const { loads } = useWeekLoads([{ key, establishment, monday }])

  // Las semanas con que se compara: la anterior siempre (el veredicto y los hallazgos van contra ella) y, para el
  // promedio, las otras dos
  const compareMondays = Array.from({ length: base === 'previous' ? 1 : AVERAGE_WEEKS }, (_, index) => addWeeks(monday, -(index + 1)))
  const compareRequests = compareMondays.map(week => ({ key: `${establishment._id}|${week}`, establishment, monday: week }))
  const compare = useWeekLoads(compareRequests)

  const load = loads[key]
  if (!load) return <Progress text={t('reports.loadingWeek', { name: establishment.name })} done={0} total={1} />
  if (load.status === 'failed' || !load.report) return <Notice tone='error'>{t(`reports.error.${load.error ?? 'unknown'}`)}</Notice>
  if (load.report.cobertura.encontrados === 0) return <Notice>{t('reports.emptyWeek', { name: establishment.name })}</Notice>

  // compared = «el resumen de cada semana con que se compara»; null si no llegó o no tuvo informes
  const compared = compareRequests.map(request => {
    const report = compare.loads[request.key]?.report
    return report && report.cobertura.encontrados > 0 ? summarize(report) : null
  })
  return (
    <WeeklyBoard
      report={load.report}
      name={establishment.name}
      monday={monday}
      base={base}
      onBase={setBase}
      comparing={compare.done < compare.total}
      previous={compared[0] ?? null}
      compared={compared}
    />
  )
}

type WeeklyBoardProps = {
  report: WeeklyReport
  name: string
  monday: string
  base: Base
  onBase: (base: Base) => void
  comparing: boolean
  previous: Summary | null
  compared: (Summary | null)[]
}

function WeeklyBoard({ report, name, monday, base, onBase, comparing, previous, compared }: WeeklyBoardProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const count = (value: number | null) => formatMetric(value, 'count', lang)
  const pct = (value: number | null) => formatMetric(value, 'percent', lang)
  const shifts = report.meta.turnos
  const shiftName = (shift: ShiftKey) => t(`reports.shift.${shift}`)
  const { cuadroGeneral: cuadro, aplica, metrica, devoluciones } = report
  const week = isoWeekOf(monday).week
  const previousWeek = isoWeekOf(addWeeks(monday, -1)).week

  // Los días, escritos en el idioma de la vista (el reporte los trae en español)
  const weekdayOf = (index: number, style: 'long' | 'short') =>
    new Intl.DateTimeFormat(lang, { weekday: style, timeZone: 'UTC' }).format(new Date(`${report.porDia[index].date}T00:00:00Z`))
  const days = report.porDia.map((_, index) => sentence(weekdayOf(index, 'short').replace('.', '')))
  const list = (items: string[]) => new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items)

  // say = «una frase de weekStory, traducida»; sus valores pueden ser a su vez frases
  const say = (phrase: Phrase): string => {
    const params = Object.fromEntries(Object.entries(phrase.params ?? {}).map(([name, value]) => [name, typeof value === 'object' ? say(value) : value]))
    return t(phrase.key, params)
  }
  const story = storyOf(report, previous, previous ? previousWeek : null, { count: value => count(value), pct, weekday: index => weekdayOf(index, 'long'), list })

  // seriesOf = «una serie por turno del local, con un valor por día»
  const seriesOf = (valueOf: (index: number, shift: ShiftKey) => number): BarSeries[] =>
    shifts.map(shift => ({
      name: shiftName(shift),
      color: SHIFT_COLOR[shift],
      tint: SHIFT_TINT[shift],
      values: report.porDia.map((day, index) => (day[shift].presente ? valueOf(index, shift) : null)),
    }))
  // perDay = «la suma de los turnos de cada día»
  const perDay = (valueOf: (index: number, shift: ShiftKey) => number) => report.porDia.map((_, index) => shifts.reduce((total, shift) => total + valueOf(index, shift), 0))
  const dayPresent = report.porDia.map(day => shifts.some(shift => day[shift].presente))

  /* Los indicadores: cifra, cambio, nota y sus siete días */
  const current = summarize(report)
  const referenceOf = (metric: Metric): number | null => {
    if (base === 'previous') return previous ? metric.value(previous) : null
    const weeks = compared.filter((summary): summary is Summary => summary !== null)
    if (weeks.length === 0) return null
    const pooled = metric.value(combine(weeks))
    return pooled === null ? null : metric.kind === 'count' ? pooled / weeks.length : pooled
  }
  const kpiPlan: { id: MetricId; applies: boolean; note: string | null; days: number[]; unit: 'count' | 'delays' }[] = [
    {
      id: 'rotaciones', applies: true, unit: 'count',
      note: shifts.length > 1 ? t('reports.story.dayNight', { day: count(cuadro.rotaciones.day), night: count(cuadro.rotaciones.night) }) : t('reports.shiftsReceived', { found: report.cobertura.encontrados, expected: report.cobertura.esperados }),
      days: perDay((index, shift) => report.porDia[index][shift].rotaciones),
    },
    { id: 'pct1ra', applies: aplica.demora1ra, unit: 'delays', note: t('reports.delaysOf', { count: cuadro.demora1ra.total }), days: perDay((index, shift) => report.porDia[index][shift].demora1ra) },
    { id: 'pctLimpieza', applies: aplica.demoraLimpieza, unit: 'delays', note: t('reports.delaysOf', { count: cuadro.demoraLimpieza.total }), days: perDay((index, shift) => report.porDia[index][shift].demoraLimpieza) },
    { id: 'procesos', applies: aplica.metrica, unit: 'count', note: t('reports.story.dishCount', { count: metrica.porPlato.length }), days: perDay((index, shift) => report.procesosPorDia[index][shift]) },
    { id: 'pctPrep', applies: aplica.metrica, unit: 'delays', note: t('reports.delaysOf', { count: metrica.demorasTotales }), days: perDay((index, shift) => report.demorasPorDia[index][shift]) },
    { id: 'devoluciones', applies: true, unit: 'count', note: devoluciones.porcentaje !== null ? t('reports.ofProcesses', { pct: pct(devoluciones.porcentaje) }) : null, days: perDay((index, shift) => devoluciones.porDia[index][shift]) },
  ]
  const kpis = kpiPlan.filter(plan => plan.applies).map(plan => {
    const metric = METRICS.find(item => item.id === plan.id) as Metric
    const now = metric.value(current)
    const reference = referenceOf(metric)
    let change: { direction: 'up' | 'down' | 'flat'; good: boolean | null; text: string } | null = null
    if (now !== null && reference !== null) {
      const diff = metric.kind === 'percent' ? Math.round((now - reference) * 10) / 10 : Math.round(now - reference)
      const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
      const amount = metric.kind === 'percent'
        ? `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(Math.abs(diff))} ${t('reports.points')}`
        : count(Math.abs(diff))
      change = {
        direction,
        good: direction === 'flat' ? null : (direction === 'up') === (metric.better === 'higher'),
        text: direction === 'flat' ? t('reports.noChange') : `${diff > 0 ? '+' : '−'}${amount}`,
      }
    }
    const top = Math.max(...plan.days)
    const peak = plan.days.indexOf(top)
    return {
      id: plan.id,
      label: t(`reports.metric.${plan.id}`),
      value: formatMetric(now, metric.kind, lang),
      change,
      note: plan.note,
      icon: METRIC_ICON[plan.id],
      bars: plan.days.map((value, index) => ({ ratio: top > 0 ? Math.max(0.04, value / top) : 0.04, peak: top > 0 && index === peak, present: dayPresent[index] })),
      peak: top <= 0 ? t('reports.story.noPeak') : plan.unit === 'delays' ? t('reports.story.peakDelays', { day: days[peak], count: top }) : t('reports.story.peak', { day: days[peak], value: count(top) }),
    }
  })
  const toneOf = (good: boolean | null) => (good === true ? TONE.better : good === false ? TONE.worse : TONE.same)

  /* El veredicto y la bajada */
  const headline = story.verdict ? sentence(say(story.verdict)) : t('reports.story.noCompare', { week, count: count(cuadro.rotaciones.total) })
  // Si una de las dos semanas llegó con bastantes menos turnos, sus cuentas no se comparan del todo: se avisa
  const coverageOf = (summary: Summary) => (summary.turnosEsperados > 0 ? summary.turnosEncontrados / summary.turnosEsperados : 1)
  const caution = previous && Math.abs(coverageOf(current) - coverageOf(previous)) > 0.1
    ? t('reports.story.coverageCaution', { found: current.turnosEncontrados, expected: current.turnosEsperados, week: previousWeek, prevFound: previous.turnosEncontrados, prevExpected: previous.turnosEsperados })
    : ''
  const lede = story.rotations
    ? [say(story.rotations), story.moved.length > 0 ? `${sentence(list(story.moved.map(say)))}.` : '', caution].filter(Boolean).join(' ')
    : comparing ? t('reports.story.comparing', { week: previousWeek }) : t('reports.story.noPrevious', { week: previousWeek })

  /* El cuadro general: en las demoras, el turno que más pesó va marcado */
  const rows: { label: string; values: ByShift<number | null>; percent?: boolean; delay?: boolean }[] = [
    { label: t('reports.row.rotationsHall'), values: cuadro.rotacionesSalon },
    ...(aplica.barra ? [{ label: t('reports.row.rotationsBar'), values: cuadro.rotacionesBarra }] : []),
    ...(aplica.clientesSinUbicar ? [{ label: t('reports.row.unseated'), values: cuadro.clientesSinUbicar }] : []),
    ...(aplica.demora1ra
      ? [
          { label: t('reports.row.firstDelays'), values: cuadro.demora1ra, delay: true },
          { label: t('reports.row.firstPct'), values: cuadro.porcentaje1ra, percent: true, delay: true },
        ]
      : []),
    ...(aplica.demoraLimpieza
      ? [
          { label: t('reports.row.cleanDelays'), values: cuadro.demoraLimpieza, delay: true },
          { label: t('reports.row.cleanPct'), values: cuadro.porcentajeLimpieza, percent: true, delay: true },
        ]
      : []),
  ]
  // heaviest = «los turnos con la cifra más alta de una fila de demora», si se distinguen de los demás
  const heaviest = (row: (typeof rows)[number]): ShiftKey[] => {
    if (!row.delay || shifts.length < 2) return []
    const values = shifts.map(shift => row.values[shift] ?? 0)
    const top = Math.max(...values)
    return top > 0 && values.some(value => value < top) ? shifts.filter(shift => (row.values[shift] ?? 0) === top) : []
  }

  // Las rotaciones por día, dichas: el día más fuerte y los días sin mesas
  const rotationDays = perDay((index, shift) => report.porDia[index][shift].rotaciones)
  const strongest = rotationDays.indexOf(Math.max(...rotationDays))
  const emptyDays = rotationDays.map((value, index) => ({ value, index })).filter(day => day.value === 0 && dayPresent[day.index]).map(day => weekdayOf(day.index, 'long'))

  // La barra de la preparación por plato llega al mayor de los porcentajes, o al 5 %
  const dishScale = Math.max(5, ...metrica.porPlato.map(row => row.total.porcentaje ?? 0))
  const missing = report.cobertura.faltantes

  return (
    <div className='flex flex-col gap-6'>
      <header className='flex flex-col gap-2'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <p className='m-0 text-[13px] font-semibold text-[#1f7a0a] dark:text-[#8be070]'>{t('reports.story.eyebrow', { week, name })}</p>
          {report.cobertura.completa && (
            <span className='ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#1f9a08]/12 px-3 py-1.5 text-[12.5px] font-semibold text-[#1f7a0a] dark:bg-[#2ea016]/18 dark:text-[#9fe28a]'>
              <svg aria-hidden='true' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round'><path d='M5 12l5 5L20 7' /></svg>
              {t('reports.story.allShifts', { count: report.cobertura.esperados })}
            </span>
          )}
        </div>
        <h1 className='m-0 max-w-[60rem] text-[clamp(1.35rem,2.4vw,2rem)] font-semibold leading-tight tracking-[-0.02em] text-portal-ink'>{headline}</h1>
        <p className='m-0 max-w-[60rem] text-[15px] leading-relaxed text-portal-muted'>{lede}</p>
      </header>

      {!report.cobertura.completa && (
        <Notice>
          <b>{t('reports.coverage', { found: report.cobertura.encontrados, expected: report.cobertura.esperados })}</b>{' '}
          {missing.length > 0 && t('reports.missing', { list: missing.map(item => `${item.weekday.toLowerCase()} ${shiftName(item.shift).toLowerCase()}`).join(', ') })}
        </Notice>
      )}

      <section aria-labelledby='semanal-indicadores' className='flex flex-col gap-3'>
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <h2 id='semanal-indicadores' className='m-0 flex-1 basis-60 text-[16px] font-semibold text-portal-ink'>{t('reports.story.indicators')}</h2>
          <div role='group' aria-label={t('reports.story.compareWith')} className='flex flex-wrap gap-1 rounded-xl bg-portal-ctl p-1 ring-1 ring-inset ring-portal-line'>
            {(['previous', 'average'] as const).map(option => (
              <button
                key={option}
                type='button'
                aria-pressed={base === option}
                onClick={() => onBase(option)}
                className={`h-10 rounded-lg px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${
                  base === option ? 'bg-portal-surface text-portal-ink shadow-sm ring-1 ring-portal-line' : 'text-portal-muted hover:text-portal-ink'
                }`}
              >
                {option === 'previous' ? t('reports.story.vsWeek', { week: previousWeek }) : t('reports.story.vsAverage', { count: AVERAGE_WEEKS })}
              </button>
            ))}
          </div>
        </div>
        <div className='grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]'>
          {kpis.map(kpi => (
            <article key={kpi.id} className={`flex min-w-0 flex-col gap-2 rounded-2xl bg-portal-surface p-4 ring-1 ring-inset ring-portal-line ${STAGE}`}>
              <div className='flex items-start gap-2.5'>
                <IconTile paths={kpi.icon} size='sm' />
                <h3 className='m-0 min-h-[2.5em] min-w-0 pt-0.5 text-[12.5px] font-medium leading-snug text-portal-muted'>{kpi.label}</h3>
              </div>
              <p className='m-0 font-plex-mono text-[1.75rem] font-medium leading-none tracking-[-0.02em] text-portal-ink'>{kpi.value}</p>
              {kpi.change ? (
                <p className={`m-0 inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${toneOf(kpi.change.good).pill}`}>
                  <Arrow direction={kpi.change.direction} size={12} />
                  {kpi.change.text}
                  {kpi.change.good !== null && <span>· {t(kpi.change.good ? 'reports.better' : 'reports.worse')}</span>}
                </p>
              ) : (
                <p className='m-0 self-start rounded-full bg-portal-ctl px-2.5 py-1 text-[12px] text-portal-muted'>{comparing ? t('reports.story.comparingShort') : t('reports.story.noReference')}</p>
              )}
              {kpi.note && <p className='m-0 text-xs text-portal-muted'>{kpi.note}</p>}
              <MiniBars3D bars={kpi.bars} />
              <p className='m-0 text-[11.5px] text-portal-muted'>{kpi.peak}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby='semanal-hallazgos' className='flex flex-col gap-3'>
        <h2 id='semanal-hallazgos' className='m-0 text-[16px] font-semibold text-portal-ink'>{t('reports.story.findings')}</h2>
        {/* auto-fill: un hallazgo solo no se estira a todo el ancho */}
        <div className='grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]'>
          {story.findings.map(finding => {
            const look = FINDING_LOOK[finding.tone]
            return (
              <article key={finding.id} className={`flex min-w-0 flex-col gap-2 rounded-2xl p-4 ring-1 ring-inset sm:p-5 ${look.card}`}>
                <p className={`m-0 flex items-center gap-2 text-[12.5px] font-semibold ${look.area}`}>
                  <svg aria-hidden='true' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'>
                    {FINDING_ICON[finding.icon].map(path => <path key={path} d={path} />)}
                  </svg>
                  {say(finding.area)}
                </p>
                <h3 className='m-0 text-[16px] font-semibold leading-snug text-portal-ink'>{sentence(say(finding.title))}</h3>
                {finding.text.length > 0 && <p className='m-0 text-[13.5px] leading-relaxed text-portal-muted'>{finding.text.map(phrase => sentence(say(phrase))).join(' ')}</p>}
                {finding.anchor && finding.link && (
                  <a href={`#${finding.anchor}`} className='mt-auto self-start rounded text-[13.5px] font-semibold text-[#1f7a0a] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink dark:text-[#8be070]'>
                    {say(finding.link)}
                  </a>
                )}
              </article>
            )
          })}
        </div>
      </section>

      <div className='grid gap-4 lg:grid-cols-2'>
        <Card id='semanal-cuadro' title={t('reports.generalTable')} icon={SECTION_ICON.generalTable} className={STAGE} note={shifts.length > 1 ? t('reports.story.heaviestNote') : undefined}>
          <div className='overflow-x-auto'>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope='col' className={TH}><span className='sr-only'>{t('reports.indicator')}</span></th>
                  {shifts.map(shift => <th key={shift} scope='col' className={`${TH} ${NUM}`}>{shiftName(shift)}</th>)}
                  {shifts.length > 1 && <th scope='col' className={`${TH} ${NUM}`}>{t('reports.total')}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const marked = heaviest(row)
                  return (
                    <tr key={row.label}>
                      <th scope='row' className={`${TD} text-left font-normal`}>{row.label}</th>
                      {shifts.map(shift => (
                        <td key={shift} className={`${TD} ${NUM} ${marked.includes(shift) ? 'bg-[#c4532a]/10 dark:bg-[#e0703f]/15' : ''}`}>
                          {row.percent ? pct(row.values[shift]) : count(row.values[shift])}
                          {marked.includes(shift) && <span className='sr-only'> ({t('reports.story.heaviest')})</span>}
                        </td>
                      ))}
                      {shifts.length > 1 && <td className={`${TD} ${NUM} font-semibold`}>{row.percent ? pct(row.values.total) : count(row.values.total)}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card id='semanal-dias' title={t('reports.rotationsByDay')} icon={SECTION_ICON.rotationsByDay} className={STAGE}>
          <BarChart3D categories={days} series={seriesOf((index, shift) => report.porDia[index][shift].rotaciones)} format={count} label={t('reports.rotationsByDay')} />
          {rotationDays[strongest] > 0 && (
            <p className='m-0 text-[12.5px] text-portal-muted'>
              {t('reports.story.strongestDay', { day: weekdayOf(strongest, 'long'), count: count(rotationDays[strongest]) })}
              {emptyDays.length > 0 && ` ${sentence(t('reports.story.noTables', { count: emptyDays.length, days: list(emptyDays) }))}`}
            </p>
          )}
        </Card>

        {aplica.metrica && (
          <Card id='semanal-plato' title={t('reports.byDish')} icon={SECTION_ICON.byDish} className={STAGE} note={t('reports.story.dishBarNote', { pct: pct(dishScale) })}>
            <div className='overflow-x-auto'>
              <table className={TABLE}>
                <thead>
                  <tr>
                    <th scope='col' className={TH}>{t('reports.dish')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.processes')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.delays')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.delayPct')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.average')}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrica.porPlato.map(row => (
                    <tr key={row.dish}>
                      <th scope='row' className={`${TD} text-left font-normal`}>{row.dish}</th>
                      <td className={`${TD} ${NUM}`}>{count(row.total.procesos)}</td>
                      <td className={`${TD} ${NUM}`}>{count(row.total.demoras)}</td>
                      <td className={`${TD} ${NUM}`}>
                        <span className='inline-flex items-center justify-end gap-2'>
                          <GrowBar
                            fraction={(row.total.porcentaje ?? 0) / dishScale}
                            track='hidden h-2 w-16 overflow-hidden rounded-full bg-portal-line sm:block'
                            fill='block h-full rounded-full bg-[#c4532a] dark:bg-[#e0703f]'
                          />
                          {pct(row.total.porcentaje)}
                        </span>
                      </td>
                      <td className={`${TD} ${NUM}`}>{row.total.promedio && row.total.promedio !== 'N/A' ? row.total.promedio : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {aplica.metrica && (
          <Card title={t('reports.prepDelaysByDay')} icon={SECTION_ICON.prepDelaysByDay} className={STAGE} note={t('reports.prepDelaysNote')}>
            <BarChart3D categories={days} series={seriesOf((index, shift) => report.demorasPorDia[index][shift])} format={count} label={t('reports.prepDelaysByDay')} />
          </Card>
        )}

        {aplica.devoluciones && (
          <Card id='semanal-devoluciones' title={t('reports.returns')} icon={SECTION_ICON.returns} className={STAGE} note={devoluciones.porcentaje !== null ? sentence(t('reports.ofProcesses', { pct: pct(devoluciones.porcentaje) })) : undefined}>
            <dl className='m-0 grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]'>
              {devoluciones.porTipo.filter(row => row.visible).map(row => (
                <div key={row.tipo} className='rounded-xl bg-portal-ctl px-3 py-2.5'>
                  <dt className='text-xs text-portal-muted'>{row.etiqueta}</dt>
                  <dd className='m-0 mt-1 font-plex-mono text-[1.35rem] font-medium text-portal-ink'>{count(row.total)}</dd>
                </div>
              ))}
            </dl>
            <BarChart3D categories={days} series={seriesOf((index, shift) => devoluciones.porDia[index][shift])} format={count} label={t('reports.returns')} height={150} />
          </Card>
        )}

        {aplica.toques && report.toques.length > 0 && (
          <Card title={t('reports.touches')} icon={SECTION_ICON.touches} className={STAGE} note={aplica.toquesSeparados ? t('reports.touchesNote') : undefined}>
            <div className='overflow-x-auto'>
              <table className={TABLE}>
                <thead>
                  <tr>
                    <th scope='col' className={TH}>{t('reports.manager')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.firstTouches')}</th>
                    <th scope='col' className={`${TH} ${NUM}`}>{t('reports.firstTouchesPct')}</th>
                    {aplica.toquesSeparados && <th scope='col' className={`${TH} ${NUM}`}>{t('reports.otherTouches')}</th>}
                    {aplica.toquesSeparados && <th scope='col' className={`${TH} ${NUM}`}>{t('reports.otherTouchesPct')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {report.toques.map(block => (
                    <tr key={block.name}>
                      <th scope='row' className={`${TD} text-left font-normal`}>{block.name}</th>
                      <td className={`${TD} ${NUM}`}>{count(block.totales.primeros)}</td>
                      <td className={`${TD} ${NUM}`}>{pct(block.promedioSemanal.pctPrimeros)}</td>
                      {aplica.toquesSeparados && <td className={`${TD} ${NUM}`}>{count(block.totales.otros)}</td>}
                      {aplica.toquesSeparados && <td className={`${TD} ${NUM}`}>{pct(block.promedioSemanal.pctOtros)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
