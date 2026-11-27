import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import { tweenLabel, useRevealValues } from '../hook/useRevealValues'
import { useWeekLoads } from '../hook/useWeekLoads'
import { METRICS, combine, formatMetric, summarize, type Metric, type MetricId, type Summary } from '../weekData'
import { Card, NUM, Notice, Progress, TABLE, TD, TH } from './parts'

/*  LA POSICIÓN GLOBAL: todos los locales que ve quien entra, en una misma semana, comparados entre sí.
 *
 *  Se elige un indicador y sale el ranking de locales en barras, del mejor al peor según ese indicador (en las demoras
 *  y devoluciones, menos es mejor). Si hay más de una franquicia, otro ranking igual con cada franquicia como un solo
 *  local (sus cuentas sumadas, sus porcentajes recalculados). Debajo, la tabla con todos los indicadores, que se
 *  ordena pulsando una cabecera. Va saliendo según llegan los locales: cada uno son hasta 28 peticiones.
 *  Solo entran los locales activos; uno sin informes esa semana va al final, con «—».
 *
 *  @param establishments  los locales de quien entra
 *  @param monday          el lunes de la semana
 */
type GlobalViewProps = { establishments: FullEstablishment[]; monday: string }

type Row = { id: string; name: string; franchise: string; summary: Summary | null }

// byMetric = «ordena del mejor al peor en ese indicador»; lo que no tiene dato, al final
const byMetric = (metric: Metric, ascending?: boolean) => (first: Row, second: Row) => {
  const a = first.summary ? metric.value(first.summary) : null
  const b = second.summary ? metric.value(second.summary) : null
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1
  const bestFirst = metric.better === 'higher' ? b - a : a - b
  return ascending === undefined ? bestFirst : ascending ? a - b : b - a
}

// Ranking = «las barras de un ranking»: un renglón por local (o franquicia), con su puesto, su barra y su cifra. Las
// barras y las cifras están en 0 hasta que el ranking entra en pantalla, y luego crecen; van por local, así que al
// reordenarse (llega otro local, se cambia de indicador) cada barra sigue siendo la suya
function Ranking({ rows, metric, lang, label }: { rows: Row[]; metric: Metric; lang: string; label: string }) {
  const values = rows.map(row => (row.summary ? metric.value(row.summary) : null))
  const peak = Math.max(1, ...values.map(value => value ?? 0))
  const { ref, valueOf } = useRevealValues<HTMLOListElement>(rows.map((row, index): [string, number] => [row.id, values[index] ?? 0]))
  return (
    <ol ref={ref} aria-label={label} className='m-0 flex list-none flex-col gap-1.5 p-0'>
      {rows.map((row, index) => {
        const value = values[index]
        const now = valueOf(row.id)
        return (
          <li key={row.id} className='grid grid-cols-[1.5rem_minmax(0,11rem)_minmax(0,1fr)_4.5rem] items-center gap-2.5 text-[13.5px]'>
            <span className='text-right font-plex-mono text-xs text-portal-muted'>{value === null ? '' : index + 1}</span>
            <span className='truncate text-portal-ink' title={row.name}>{row.name}</span>
            <span aria-hidden='true' className='block h-4 rounded-[4px] bg-portal-soft'>
              {value !== null && <span className='block h-full min-w-px rounded-[4px] bg-chart-day' style={{ width: `${(now / peak) * 100}%` }} />}
            </span>
            <span className='text-right font-plex-mono tabular-nums text-portal-ink'>
              <span aria-hidden='true'>{value === null ? formatMetric(null, metric.kind, lang) : formatMetric(tweenLabel(now, value), metric.kind, lang)}</span>
              <span className='sr-only'>{formatMetric(value, metric.kind, lang)}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function GlobalView({ establishments, monday }: GlobalViewProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [metricId, setMetricId] = useState<MetricId>('pctPrep')
  // sort = «por qué columna va la tabla»; null = el orden del ranking
  const [sort, setSort] = useState<{ id: MetricId | 'name'; ascending: boolean } | null>(null)

  const active = establishments.filter(establishment => establishment.isActive)
  const requests = active.map(establishment => ({ key: `${establishment._id}|${monday}`, establishment, monday }))
  const { loads, done, total } = useWeekLoads(requests)

  if (active.length === 0) return <Notice>{t('reports.noEstablishments')}</Notice>

  const sessionLost = requests.some(request => loads[request.key]?.error === 'session')
  if (sessionLost) return <Notice tone='error'>{t('reports.error.session')}</Notice>

  const metric = METRICS.find(item => item.id === metricId) ?? METRICS[0]
  const rows: Row[] = active
    .filter(establishment => loads[`${establishment._id}|${monday}`])
    .map(establishment => {
      const report = loads[`${establishment._id}|${monday}`]?.report
      return {
        id: establishment._id,
        name: establishment.name,
        franchise: establishment.franchiseName ?? t('reports.noFranchise'),
        summary: report && report.cobertura.encontrados > 0 ? summarize(report) : null,
      }
    })

  const ranked = [...rows].sort(byMetric(metric))
  const withData = rows.filter((row): row is Row & { summary: Summary } => row.summary !== null)

  // franchises = «cada franquicia como un solo local»: lo de sus locales con datos, combinado
  const franchises: Row[] = [...new Set(rows.map(row => row.franchise))]
    .map(name => {
      const own = withData.filter(row => row.franchise === name)
      return { id: name, name, franchise: name, summary: own.length ? combine(own.map(row => row.summary)) : null }
    })
    .sort(byMetric(metric))

  const tableRows = sort
    ? [...rows].sort(sort.id === 'name' ? (a, b) => a.name.localeCompare(b.name, lang) * (sort.ascending ? 1 : -1) : byMetric(METRICS.find(item => item.id === sort.id) ?? metric, sort.ascending))
    : ranked
  const toggleSort = (id: MetricId | 'name') => setSort(current => (current?.id === id ? { id, ascending: !current.ascending } : { id, ascending: id === 'name' }))
  const ariaSort = (id: MetricId | 'name') => (sort?.id === id ? (sort.ascending ? 'ascending' : 'descending') : undefined)
  const everyone = withData.length ? combine(withData.map(row => row.summary)) : null
  const failedCount = requests.filter(request => loads[request.key]?.status === 'failed').length

  return (
    <div className='flex flex-col gap-4'>
      {done < total && <Progress text={t('reports.loadingGlobal', { done, total })} done={done} total={total} />}
      {failedCount > 0 && done === total && <Notice tone='error'>{t('reports.someFailed', { count: failedCount })}</Notice>}

      <div role='group' aria-label={t('reports.compareBy')} className='flex flex-wrap items-center gap-1.5'>
        <span className='mr-1 text-[13px] font-medium text-portal-muted'>{t('reports.compareBy')}</span>
        {METRICS.map(item => (
          <button
            key={item.id}
            type='button'
            aria-pressed={item.id === metricId}
            onClick={() => setMetricId(item.id)}
            className={`h-10 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${item.id === metricId ? 'bg-portal-ink text-portal-page ring-portal-ink' : 'text-portal-ink ring-portal-ring hover:bg-portal-ctl'}`}
          >
            {t(`reports.metric.${item.id}`)}
          </button>
        ))}
      </div>

      {rows.length > 0 && (
        <div className={`grid gap-4 ${franchises.length > 1 ? 'lg:grid-cols-2' : ''}`}>
          <Card title={t('reports.rankingLocals', { metric: t(`reports.metric.${metric.id}`) })} note={t(metric.better === 'lower' ? 'reports.lowerIsBetter' : 'reports.higherIsBetter')}>
            <Ranking rows={ranked} metric={metric} lang={lang} label={t('reports.rankingLocals', { metric: t(`reports.metric.${metric.id}`) })} />
          </Card>
          {franchises.length > 1 && (
            <Card title={t('reports.rankingFranchises', { metric: t(`reports.metric.${metric.id}`) })} note={t('reports.franchiseNote')}>
              <Ranking rows={franchises} metric={metric} lang={lang} label={t('reports.rankingFranchises', { metric: t(`reports.metric.${metric.id}`) })} />
            </Card>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <Card title={t('reports.allIndicators')} note={t('reports.sortHint')}>
          <div className='overflow-x-auto'>
            <table className={`${TABLE} min-w-[760px]`}>
              <thead>
                <tr>
                  <th scope='col' className={TH} aria-sort={ariaSort('name')}>
                    <button type='button' className='font-semibold hover:text-portal-ink' onClick={() => toggleSort('name')}>{t('reports.establishment')}</button>
                  </th>
                  {METRICS.map(item => (
                    <th key={item.id} scope='col' className={`${TH} ${NUM}`} aria-sort={ariaSort(item.id)}>
                      <button type='button' className='font-semibold hover:text-portal-ink' onClick={() => toggleSort(item.id)}>{t(`reports.metric.${item.id}`)}</button>
                    </th>
                  ))}
                  <th scope='col' className={`${TH} ${NUM}`}>{t('reports.shiftsRow')}</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(row => (
                  <tr key={row.id}>
                    <th scope='row' className={`${TD} text-left font-normal`}>
                      {row.name}
                      {franchises.length > 1 && <span className='block text-xs text-portal-muted'>{row.franchise}</span>}
                    </th>
                    {METRICS.map(item => <td key={item.id} className={`${TD} ${NUM}`}>{formatMetric(row.summary ? item.value(row.summary) : null, item.kind, lang)}</td>)}
                    <td className={`${TD} ${NUM}`}>{row.summary ? `${row.summary.turnosEncontrados}/${row.summary.turnosEsperados}` : t('reports.noReports')}</td>
                  </tr>
                ))}
              </tbody>
              {everyone && (
                <tfoot>
                  <tr>
                    <th scope='row' className={`${TD} text-left font-semibold`}>{t('reports.allTogether')}</th>
                    {METRICS.map(item => <td key={item.id} className={`${TD} ${NUM} font-semibold`}>{formatMetric(item.value(everyone), item.kind, lang)}</td>)}
                    <td className={`${TD} ${NUM} font-semibold`}>{everyone.turnosEncontrados}/{everyone.turnosEsperados}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
