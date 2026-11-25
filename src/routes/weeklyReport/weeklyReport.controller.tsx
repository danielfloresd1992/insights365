import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadEstablishments } from '@/store/slices/establishments.slice'
import EstablishmentPicker, { AllEstablishments } from './assets/EstablishmentPicker'
import GlobalView from './assets/GlobalView'
import InterweekView from './assets/InterweekView'
import WeekPicker from './assets/WeekPicker'
import WeeklyView from './assets/WeeklyView'
import { Notice } from './assets/parts'
import { addWeeks, mondayOf } from './weekData'

/*  EL REPORTE SEMANAL E INTERSEMANAL (/reportes, con sesión)
 *
 *  La pestaña de la barra que va junto al Panel en vivo (pedido del usuario). Tres vistas sobre los mismos reportes
 *  semanales, que se arman aquí con los informes diarios de la API y el cálculo de reportes365 (libs/weekly):
 *  - Semanal: un local y una semana, cualquiera del año.
 *  - Intersemanal: un local, las cuatro semanas que acaban en la elegida, con su cambio y su tendencia.
 *  - Global: todos los locales de quien entra en una semana, comparados entre sí y por franquicia.
 *  La vista, el local y la semana viven en la dirección (?vista=&local=&semana=): un enlace o un refresco abren lo
 *  mismo. Sin nada en la dirección: el semanal del primer local, en la última semana que ya terminó.
 *  Los locales son los del estado global (store/slices/establishments.slice), cargados al abrir sesión.
 */

const VIEWS = ['semanal', 'intersemanal', 'global'] as const
type View = (typeof VIEWS)[number]

const isView = (value: string | null): value is View => VIEWS.includes(value as View)
// isDate = «una fecha AAAA-MM-DD que existe»
const isDate = (value: string | null): value is string => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))

// VIEW_ICON = «el dibujo de cada vista»: calendario (semanal), barras que suben (intersemanal), cuadrícula (global)
const VIEW_ICON: Record<View, string> = {
  semanal: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 3v4M16 3v4M4 10h16',
  intersemanal: 'M4 19h16M7 16v-5M12 16V7M17 16v-3',
  global: 'M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z',
}

export default function WeeklyReportController() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const establishments = useAppSelector(state => state.establishments)
  const [params, setParams] = useSearchParams()
  useDocumentTitle(t('reports.documentTitle'))

  const view: View = isView(params.get('vista')) ? (params.get('vista') as View) : 'semanal'
  const semana = params.get('semana')
  // La semana de la dirección se alinea a su lunes y no pasa de la semana en curso
  // current = «el lunes de la semana en curso», fijado al abrir la pantalla; por defecto se abre la anterior, ya terminada
  const [current] = useState(() => mondayOf(new Date()))
  const monday = isDate(semana) && mondayOf(semana) <= current ? mondayOf(semana) : addWeeks(current, -1)
  const items = establishments.items
  const selected = items.find(item => item._id === params.get('local')) ?? items.find(item => item.isActive) ?? items[0] ?? null

  // change = «cambia algo de la dirección sin tocar lo demás»; no llena el historial con cada clic
  const change = (values: Record<string, string>) => {
    const next = new URLSearchParams(params)
    Object.entries(values).forEach(([name, value]) => next.set(name, value))
    setParams(next, { replace: true })
  }

  return (
    <div className='mx-auto w-full max-w-[1288px] px-6 pb-24 pt-7'>
      {/* La cabecera (propuesta A del lienzo de los filtros): el título con la descripción de la vista y, a su lado, las
          vistas como control segmentado; debajo, una sola barra con el local y la semana */}
      <header className='mb-6 flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-x-6 gap-y-3'>
          <div className='min-w-0 flex-[1_1_420px]'>
            <h1 className='m-0 text-[clamp(1.5rem,2.2vw,1.9rem)] font-semibold tracking-[-0.02em] text-portal-ink'>{t('reports.title')}</h1>
            <p className='m-0 mt-1.5 text-sm text-portal-muted'>{t(`reports.viewHint.${view}`)}</p>
          </div>
          {/* En el teléfono las tres pestañas se reparten el ancho, sin iconos */}
          <div role='tablist' aria-label={t('reports.viewsLabel')} className='flex w-full gap-1 rounded-2xl bg-portal-surface p-1 ring-1 ring-inset ring-portal-line sm:w-auto'>
            {VIEWS.map(item => (
              <button
                key={item}
                type='button'
                role='tab'
                id={`vista-${item}`}
                aria-selected={item === view}
                aria-controls='reporte-panel'
                onClick={() => change({ vista: item })}
                className={`inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-[11px] px-2 text-sm font-semibold transition-colors sm:flex-none sm:px-4 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-portal-ink ${
                  item === view ? 'bg-portal-soft text-portal-ink shadow-[inset_0_-2px_0_#29c50c]' : 'text-portal-muted hover:bg-portal-ctl hover:text-portal-ink'
                }`}
              >
                <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.1' strokeLinecap='round' strokeLinejoin='round' className='hidden flex-none sm:block'><path d={VIEW_ICON[item]} /></svg>
                {t(`reports.view.${item}`)}
              </button>
            ))}
          </div>
        </div>

        <div className='relative z-20 flex flex-wrap items-stretch gap-1.5 rounded-[18px] bg-portal-ctl p-1.5 ring-1 ring-inset ring-portal-line dark:bg-portal-surface'>
          {view === 'global' ? (
            <AllEstablishments items={items} />
          ) : (
            selected && <EstablishmentPicker items={items} selected={selected} onChange={id => change({ local: id })} />
          )}
          <span aria-hidden='true' className='my-2 hidden w-px bg-portal-line sm:block' />
          <WeekPicker monday={monday} span={view === 'intersemanal' ? 'fourWeeks' : 'week'} onChange={week => change({ semana: week })} />
        </div>
      </header>

      <div id='reporte-panel' role='tabpanel' aria-labelledby={`vista-${view}`}>
        {establishments.status === 'failed' ? (
          <Notice tone='error'>
            {establishments.error ?? t('reports.error.unknown')}{' '}
            <button type='button' className='font-semibold underline' onClick={() => void dispatch(loadEstablishments({ force: true }))}>{t('reports.retry')}</button>
          </Notice>
        ) : establishments.status !== 'ready' ? (
          <div role='status' className='h-40 animate-pulse rounded-2xl bg-portal-ctl ring-1 ring-inset ring-portal-line'><span className='sr-only'>{t('reports.loadingEstablishments')}</span></div>
        ) : !selected ? (
          <Notice>{t('reports.noEstablishments')}</Notice>
        ) : view === 'semanal' ? (
          <WeeklyView key={`${selected._id}|${monday}`} establishment={selected} monday={monday} />
        ) : view === 'intersemanal' ? (
          <InterweekView key={`${selected._id}|${monday}`} establishment={selected} monday={monday} />
        ) : (
          <GlobalView key={monday} establishments={items} monday={monday} />
        )}
      </div>
    </div>
  )
}
