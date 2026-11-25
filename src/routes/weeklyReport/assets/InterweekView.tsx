import { Suspense, lazy, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import { useWeekLoads } from '../hook/useWeekLoads'
import { METRICS, addWeeks, combine, formatMetric, isoWeekOf, summarize, trendOf, weekRangeLabel, type Metric, type MetricId, type Summary } from '../weekData'
import BarChart from './BarChart'
import { Arrow, Card, NUM, Notice, Progress, TABLE, TD, TH } from './parts'
import { TONE } from './tone'
import type { ReliefData } from './reliefScene'

/*  EL INTERSEMANAL DE UN LOCAL: las cuatro semanas que acaban en la elegida (propuesta A del lienzo).
 *
 *  - Arriba, el veredicto en una frase: en cuántos indicadores la última semana fue peor que la anterior y qué se
 *    movió más. Si la última semana llegó con bastantes menos turnos que la anterior, lo avisa: entonces las cuentas
 *    no son comparables (bajan las rotaciones sin que el local vaya peor).
 *  - El relieve 3D (Relief3D, cargado aparte: trae three.js) con los seis indicadores a la vez; la última semana en
 *    azul si mejoró y en naranja si empeoró. A su lado, el detalle del indicador elegido.
 *  - Los seis indicadores como botones (eligen la fila del relieve) y, debajo, la tabla de las cuatro semanas.
 *  Sin WebGL, en el sitio del relieve va la gráfica plana del indicador elegido.
 *
 *  @param establishment  el local
 *  @param monday         el lunes de la última semana de las cuatro
 */
type InterweekViewProps = { establishment: FullEstablishment; monday: string }

const WEEKS = 4

// Relief3D = «el relieve, cargado aparte»: three.js solo se descarga al abrir el intersemanal
const Relief3D = lazy(() => import('./Relief3D'))

export default function InterweekView({ establishment, monday }: InterweekViewProps) {
  const { t } = useTranslation()
  const mondays = Array.from({ length: WEEKS }, (_, index) => addWeeks(monday, index - (WEEKS - 1)))
  const requests = mondays.map(week => ({ key: `${establishment._id}|${week}`, establishment, monday: week }))
  const { loads, done, total } = useWeekLoads(requests)

  if (done < total) return <Progress text={t('reports.loadingWeeks', { done, total, name: establishment.name })} done={done} total={total} />

  const failed = requests.map(request => loads[request.key]).find(load => load?.status === 'failed')
  if (failed) return <Notice tone='error'>{t(`reports.error.${failed.error ?? 'unknown'}`)}</Notice>

  // summaries = «los indicadores de cada semana»; null si esa semana no llegó ningún informe
  const summaries: (Summary | null)[] = requests.map(request => {
    const report = loads[request.key]?.report
    return report && report.cobertura.encontrados > 0 ? summarize(report) : null
  })
  if (summaries.every(summary => summary === null)) return <Notice>{t('reports.emptyWeeks', { name: establishment.name })}</Notice>

  return <InterweekBoard summaries={summaries} mondays={mondays} />
}


type Change = { direction: 'up' | 'down' | 'flat'; good: boolean | null; text: string; relative: number }

function InterweekBoard({ summaries, mondays }: { summaries: (Summary | null)[]; mondays: string[] }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const weekNumbers = mondays.map(week => isoWeekOf(week).week)
  const weekLabels = weekNumbers.map(number => t('reports.weekShort', { number }))
  const lastNumber = weekNumbers[WEEKS - 1]
  const previousNumber = weekNumbers[WEEKS - 2]
  const valuesOf = (metric: Metric) => summaries.map(summary => (summary ? metric.value(summary) : null))
  const format = (metric: Metric, value: number | null) => formatMetric(value, metric.kind, lang)

  // changeOf = «cuánto cambió la última semana frente a la anterior», en puntos o en unidades, y si eso es bueno
  const changeOf = (metric: Metric): Change | null => {
    const values = valuesOf(metric)
    const last = values[WEEKS - 1]
    const previous = values[WEEKS - 2]
    if (last === null || previous === null) return null
    const diff = Math.round((last - previous) * 10) / 10
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
    const good = direction === 'flat' ? null : (direction === 'up') === (metric.better === 'higher')
    // Los puntos porcentuales llevan un decimal, como el porcentaje: de 0,6 % a 0,9 % son 0,3 pts, no 0
    const amount = metric.kind === 'percent'
      ? `${new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(Math.abs(diff))} ${t('reports.points')}`
      : formatMetric(Math.abs(diff), 'count', lang)
    return { direction, good, text: direction === 'flat' ? t('reports.noChange') : `${diff > 0 ? '+' : '−'}${amount}`, relative: Math.abs(diff) / (Math.abs(previous) || 1) }
  }
  const toneOf = (change: Change | null) => (change?.good === true ? TONE.better : change?.good === false ? TONE.worse : TONE.same)

  const changes = METRICS.map(metric => ({ metric, change: changeOf(metric) }))
  const biggest = changes.filter(item => item.change && item.change.direction !== 'flat').sort((a, b) => (b.change?.relative ?? 0) - (a.change?.relative ?? 0))[0]
  const [picked, setPicked] = useState<MetricId | null>(null)
  const selectedId: MetricId = picked ?? biggest?.metric.id ?? METRICS[0].id
  const selected = METRICS.find(metric => metric.id === selectedId) ?? METRICS[0]

  // signature = «lo que dibuja el relieve, en una cadena»: la escena solo se rehace si cambian las cifras o el idioma
  const reliefInput = METRICS.map(metric => ({ metric, values: valuesOf(metric), good: changeOf(metric)?.good ?? null }))
  const signature = JSON.stringify([lang, weekLabels, reliefInput.map(item => [item.values, item.good])])
  const reliefData: ReliefData = useMemo(
    () => ({
      weeks: weekLabels,
      metrics: reliefInput.map(({ metric, values, good }) => ({ id: metric.id, name: t(`reports.metric.${metric.id}`), values, labels: values.map(value => format(metric, value)), good })),
    }),
    // oxlint-disable-next-line react-hooks/exhaustive-deps
    [signature],
  )

  const worse = changes.filter(item => item.change?.good === false).length
  const compared = changes.filter(item => item.change !== null).length
  const last = summaries[WEEKS - 1]
  const previous = summaries[WEEKS - 2]
  // Si la última semana llegó con bastantes menos turnos que la anterior, sus cuentas no se comparan bien
  const coverageGap = last && previous && last.turnosEsperados > 0 && previous.turnosEsperados > 0
    && last.turnosEncontrados / last.turnosEsperados < previous.turnosEncontrados / previous.turnosEsperados - 0.1
  const whole = combine(summaries.filter((summary): summary is Summary => summary !== null))

  const selectedValues = valuesOf(selected)
  const selectedChange = changeOf(selected)
  const trend = trendOf(selectedValues)
  const trendGood = trend === 'up' || trend === 'down' ? (trend === 'up') === (selected.better === 'higher') : null

  return (
    <div className='flex flex-col gap-4'>
      <header className='flex flex-col gap-1.5'>
        <p className='m-0 text-[clamp(1.15rem,1.8vw,1.45rem)] font-semibold leading-snug tracking-[-0.01em] text-portal-ink'>
          {compared === 0
            ? t('reports.verdictNone', { last: lastNumber, prev: previousNumber })
            : t('reports.verdict', { last: lastNumber, prev: previousNumber, count: worse, total: compared })}
        </p>
        {biggest?.change && (
          <p className='m-0 text-[14.5px] text-portal-muted'>
            {t('reports.biggestMove', {
              metric: t(`reports.metric.${biggest.metric.id}`).toLowerCase(),
              from: format(biggest.metric, valuesOf(biggest.metric)[WEEKS - 2]),
              to: format(biggest.metric, valuesOf(biggest.metric)[WEEKS - 1]),
            })}
          </p>
        )}
      </header>

      {coverageGap && last && previous && (
        <Notice>
          {t('reports.coverageGap', { week: lastNumber, found: last.turnosEncontrados, expected: last.turnosEsperados, prev: previousNumber, prevFound: previous.turnosEncontrados, prevExpected: previous.turnosEsperados })}
        </Notice>
      )}

      <div className='flex flex-wrap items-stretch gap-4'>
        <section aria-labelledby='relieve-titulo' className='flex min-w-0 flex-[999_1_560px] flex-col gap-2 rounded-2xl bg-portal-surface p-4 ring-1 ring-inset ring-portal-line sm:p-5'>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-1.5'>
            <h2 id='relieve-titulo' className='m-0 text-[15px] font-semibold text-portal-ink'>{t('reports.reliefTitle')}</h2>
            <span className='ml-auto inline-flex items-center gap-1.5 text-xs text-portal-muted'><span aria-hidden='true' className='h-2.5 w-2.5 rounded-[3px] bg-[#2f63b8] dark:bg-[#5b8fe0]' />{t('reports.legendBetter', { week: lastNumber })}</span>
            <span className='inline-flex items-center gap-1.5 text-xs text-portal-muted'><span aria-hidden='true' className='h-2.5 w-2.5 rounded-[3px] bg-[#c4532a] dark:bg-[#e0703f]' />{t('reports.legendWorse', { week: lastNumber })}</span>
          </div>
          <p className='m-0 text-[12.5px] text-portal-muted'>{t('reports.reliefHint')}</p>
          <div className='relative h-[240px] sm:h-[420px] lg:h-[480px]'>
            <Suspense fallback={<div className='absolute inset-0 animate-pulse rounded-xl bg-portal-ctl' />}>
              <Relief3D
                data={reliefData}
                selected={selectedId}
                onPick={id => setPicked(id as MetricId)}
                fallback={
                  <BarChart
                    categories={weekLabels}
                    series={[{ name: t(`reports.metric.${selected.id}`), color: 'bg-chart-day', values: selectedValues }]}
                    format={value => format(selected, value)}
                    label={t(`reports.metric.${selected.id}`)}
                    highlight={WEEKS - 1}
                    height={300}
                  />
                }
              />
            </Suspense>
          </div>
        </section>

        <aside aria-label={t(`reports.metric.${selected.id}`)} aria-live='polite' className='flex min-w-0 flex-[1_1_300px] flex-col gap-4 rounded-2xl bg-portal-surface p-5 ring-1 ring-inset ring-portal-line'>
          <div>
            <h2 className='m-0 text-[14.5px] font-semibold text-portal-muted'>{t(`reports.metric.${selected.id}`)}</h2>
            <p className='m-0 mt-1.5 font-plex-mono text-[2.9rem] font-medium leading-none tracking-[-0.03em] text-portal-ink'>{format(selected, selectedValues[WEEKS - 1])}</p>
            {selectedChange && (
              <p className={`m-0 mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold ${toneOf(selectedChange).pill}`}>
                <Arrow direction={selectedChange.direction} />
                {selectedChange.text}
                {selectedChange.good !== null && <span>· {t(selectedChange.good ? 'reports.better' : 'reports.worse')}</span>}
              </p>
            )}
            <p className='m-0 mt-2 text-[12.5px] text-portal-muted'>{t('reports.weekVsWeek', { last: lastNumber, prev: previousNumber })}</p>
          </div>

          {/* La lectura plana de la fila elegida: en el relieve la perspectiva no deja comparar alturas con exactitud */}
          <BarChart
            categories={weekLabels}
            series={[{ name: t(`reports.metric.${selected.id}`), color: 'bg-[#c9962f] dark:bg-[#d9a441]', values: selectedValues }]}
            format={value => format(selected, value)}
            label={t('reports.fourWeeksOf', { metric: t(`reports.metric.${selected.id}`) })}
            highlight={WEEKS - 1}
            height={150}
          />

          <p className='m-0 text-[13.5px] leading-relaxed text-portal-ink'>
            {t(selected.better === 'lower' ? 'reports.ruleLower' : 'reports.ruleHigher')}{' '}
            {t('reports.trendLine', { trend: t(`reports.trendIs.${trend ?? 'none'}`) })}{' '}
            {trendGood !== null && <span className={toneOf({ direction: 'flat', good: trendGood, text: '', relative: 0 }).text}>{t(trendGood ? 'reports.trendGood' : 'reports.trendBad')}</span>}
          </p>
          <p className='m-0 mt-auto text-xs text-portal-muted'>{t('reports.pickHint')}</p>
        </aside>
      </div>

      <div role='group' aria-label={t('reports.indicators')} className='grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        {changes.map(({ metric, change }) => {
          const on = metric.id === selectedId
          return (
            <button
              key={metric.id}
              type='button'
              aria-pressed={on}
              onClick={() => setPicked(metric.id)}
              className={`flex min-h-[78px] flex-col gap-1.5 rounded-2xl px-3.5 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${
                on ? 'bg-portal-soft ring-2 ring-inset ring-[#c9962f] dark:ring-[#d9a441]' : 'bg-portal-surface ring-1 ring-inset ring-portal-line hover:bg-portal-ctl'
              }`}
            >
              <span className='text-[12.5px] font-medium text-portal-muted'>{t(`reports.metric.${metric.id}`)}</span>
              <span className='flex flex-wrap items-baseline gap-x-2'>
                <span className='font-plex-mono text-[1.3rem] font-medium text-portal-ink'>{format(metric, valuesOf(metric)[WEEKS - 1])}</span>
                {change && (
                  <span className={`inline-flex items-center gap-1 text-[12.5px] font-semibold ${toneOf(change).text}`}>
                    <Arrow direction={change.direction} size={12} />
                    {change.text}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>

      <Card title={t('reports.fourWeeksTable')} note={t('reports.fourWeeksNote')}>
        <div className='overflow-x-auto'>
          <table className={`${TABLE} min-w-[640px]`}>
            <thead>
              <tr>
                <th scope='col' className={TH}>{t('reports.indicator')}</th>
                {mondays.map((week, index) => (
                  <th key={week} scope='col' className={`${TH} ${NUM}`}>
                    {weekLabels[index]}
                    <span className='block font-normal'>{weekRangeLabel(week, lang)}</span>
                  </th>
                ))}
                <th scope='col' className={`${TH} ${NUM}`}>{t('reports.fourWeeksTotal')}</th>
              </tr>
            </thead>
            <tbody>
              {METRICS.map(metric => (
                <tr key={metric.id} className={metric.id === selectedId ? 'bg-portal-ctl' : ''}>
                  <th scope='row' className={`${TD} text-left font-normal`}>{t(`reports.metric.${metric.id}`)}</th>
                  {valuesOf(metric).map((value, index) => <td key={mondays[index]} className={`${TD} ${NUM}`}>{format(metric, value)}</td>)}
                  <td className={`${TD} ${NUM} font-semibold`}>{format(metric, metric.value(whole))}</td>
                </tr>
              ))}
              <tr>
                <th scope='row' className={`${TD} text-left font-normal`}>{t('reports.shiftsRow')}</th>
                {summaries.map((summary, index) => <td key={mondays[index]} className={`${TD} ${NUM}`}>{summary ? `${summary.turnosEncontrados}/${summary.turnosEsperados}` : '—'}</td>)}
                <td className={`${TD} ${NUM} font-semibold`}>{whole.turnosEncontrados}/{whole.turnosEsperados}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
