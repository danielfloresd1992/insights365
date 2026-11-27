import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadEstablishments } from '@/store/slices/establishments.slice'
import EstablishmentPicker from '@/routes/weeklyReport/assets/EstablishmentPicker'
import { Notice } from '@/routes/weeklyReport/assets/parts'
import DayStrip from './assets/DayStrip'
import MonthPicker from './assets/MonthPicker'
import ReportViewer from './assets/ReportViewer'
import { useShiftDocument, useShiftDocuments } from './hook/useShiftReports'
import { dayRows, daysDescending, expectedShifts, isMonth, monthOf, monthRange, todayOf } from './shiftData'

/*  LOS REPORTES POR TURNO (/reportes-turno, con sesión) — propuesta E del lienzo, elegida por el usuario
 *
 *  Los informes diarios que el equipo de monitoreo arma en reportes365, uno por turno, vistos como sus hojas del PDF.
 *  Arriba, el local y el mes; debajo, la franja de días con sus turnos (diurno y nocturno, o el único si el local
 *  entrega uno al día); y el informe elegido, hoja por hoja (assets/ReportViewer).
 *  El local, el mes, el día y el informe viven en la dirección (?local=&mes=&dia=&informe=): un enlace o un refresco
 *  abren lo mismo. Sin nada elegido, se abre el último informe entregado del mes. Los locales son los de quien entra (el
 *  estado global, que ya filtra la API), y la API tampoco deja abrir el informe de otro local.
 */

export default function ShiftReportsController() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const establishments = useAppSelector(state => state.establishments)
  const [params, setParams] = useSearchParams()
  useDocumentTitle(t('shiftReports.documentTitle'))

  // now = «hoy», fijado al abrir la pantalla
  const [now] = useState(() => new Date())
  const today = todayOf(now)
  const currentMonth = monthOf(now)
  const askedMonth = params.get('mes')
  const month = isMonth(askedMonth) && askedMonth <= currentMonth ? askedMonth : currentMonth

  const items = establishments.items
  const selected = items.find(item => item._id === params.get('local')) ?? items.find(item => item.isActive) ?? items[0] ?? null

  const range = useMemo(() => monthRange(month, today), [month, today])
  const list = useShiftDocuments(selected?._id ?? null, range)
  const rows = useMemo(
    () => (range && list.data ? dayRows(daysDescending(range.from, range.to), list.data, expectedShifts(selected?.config_report ?? null)) : []),
    [range, list.data, selected],
  )

  // Qué día y qué informe: los de la dirección; si no, el último informe entregado del mes
  const asked = params.get('informe')
  const rowOfAsked = asked ? rows.find(row => row.shifts.some(item => item.document?._id === asked)) : undefined
  const latest = rows.find(row => row.shifts.some(item => item.document))
  const day = params.get('dia') ?? rowOfAsked?.date ?? latest?.date ?? rows[0]?.date ?? null
  const dayRow = rows.find(row => row.date === day) ?? null
  const firstOfDay = dayRow?.shifts.find(item => item.document)?.document?._id ?? null
  // Mientras llega la lista, el informe de la dirección ya se va pidiendo
  const reportId = asked && (list.status !== 'ready' || rowOfAsked?.date === day) ? asked : firstOfDay
  const report = useShiftDocument(reportId)

  // change = «cambia algo de la dirección sin tocar lo demás»; null lo quita. No llena el historial con cada clic
  const change = (values: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([name, value]) => (value === null ? next.delete(name) : next.set(name, value)))
    setParams(next, { replace: true })
  }

  return (
    <div className='mx-auto w-full max-w-[1320px] px-4 pb-24 pt-7 sm:px-6'>
      <header className='mb-5 flex flex-col gap-4'>
        <div>
          <h1 className='m-0 text-[clamp(1.5rem,2.2vw,1.9rem)] font-semibold tracking-[-0.02em] text-portal-ink'>{t('shiftReports.title')}</h1>
          <p className='m-0 mt-1.5 text-sm text-portal-muted'>{t('shiftReports.hint')}</p>
        </div>
        {selected && (
          <div className='relative z-20 flex flex-wrap items-stretch gap-1.5 rounded-[18px] bg-portal-ctl p-1.5 ring-1 ring-inset ring-portal-line dark:bg-portal-surface'>
            <EstablishmentPicker items={items} selected={selected} onChange={id => change({ local: id, dia: null, informe: null })} />
            <span aria-hidden='true' className='my-2 hidden w-px bg-portal-line sm:block' />
            <MonthPicker month={month} current={currentMonth} onChange={value => change({ mes: value, dia: null, informe: null })} />
          </div>
        )}
      </header>

      {establishments.userId === null && establishments.status === 'failed' ? (
        <Notice tone='error'>
          {establishments.error ?? t('reports.error.unknown')}{' '}
          <button type='button' className='font-semibold underline' onClick={() => void dispatch(loadEstablishments({ force: true }))}>{t('reports.retry')}</button>
        </Notice>
      ) : establishments.userId === null ? (
        <div role='status' className='h-40 animate-pulse rounded-2xl bg-portal-ctl ring-1 ring-inset ring-portal-line'><span className='sr-only'>{t('reports.loadingEstablishments')}</span></div>
      ) : !selected ? (
        <Notice>{t('shiftReports.noEstablishments')}</Notice>
      ) : (
        <div className='flex flex-col gap-5'>
          {list.status === 'loading' ? (
            <div role='status' className='h-[86px] animate-pulse rounded-[18px] bg-portal-ctl'><span className='sr-only'>{t('shiftReports.loadingList')}</span></div>
          ) : list.status === 'failed' ? (
            <Notice tone='error'>{t(`shiftReports.failure.${list.failure ?? 'server'}`)}</Notice>
          ) : !range ? (
            <Notice>{t('shiftReports.futureMonth')}</Notice>
          ) : (
            <DayStrip
              rows={rows}
              day={day}
              reportId={reportId}
              today={today}
              onDay={date => change({ dia: date, informe: null })}
              onReport={(id, date) => change({ dia: date, informe: id })}
            />
          )}

          {!reportId ? (
            list.status === 'ready' && (
              <div className='grid min-h-[260px] place-content-center gap-1.5 rounded-2xl bg-portal-surface px-6 py-12 text-center ring-1 ring-inset ring-portal-line'>
                <p className='m-0 font-semibold text-portal-ink'>{latest ? t('shiftReports.dayWithoutTitle') : t('shiftReports.monthWithoutTitle')}</p>
                <p className='m-0 text-sm text-portal-muted'>{latest ? t('shiftReports.dayWithoutText') : t('shiftReports.monthWithoutText')}</p>
              </div>
            )
          ) : report.status === 'loading' ? (
            <div role='status' className='flex flex-col items-center gap-4'>
              <span className='block aspect-[10/7] w-full max-w-[1000px] animate-pulse rounded bg-portal-ctl' />
              <span className='sr-only'>{t('shiftReports.loadingReport')}</span>
            </div>
          ) : report.status === 'failed' || !report.data ? (
            <Notice tone='error'>{t(`shiftReports.failure.${report.failure ?? 'server'}`)}</Notice>
          ) : (
            <ReportViewer key={report.data._id} document={report.data} establishment={selected} />
          )}
        </div>
      )}
    </div>
  )
}
