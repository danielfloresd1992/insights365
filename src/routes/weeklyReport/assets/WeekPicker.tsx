import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { addWeeks, isoWeekOf, mondayOf, weekRangeLabel, weeksOfYear } from '../weekData'
import { TRIGGER } from './parts'

/*  ELEGIR LA SEMANA (propuesta A del lienzo de los filtros, elegida por el usuario)
 *
 *  ‹  [Semana 47 · 16 – 22 nov 2026 ▾]  ›
 *  Las flechas van a la semana anterior y a la siguiente (cruzan de año solas). El botón abre el calendario de semanas:
 *  el año con sus flechas y, por mes, los números de semana (cada semana cuenta en el mes de su jueves, como en la
 *  norma ISO). La semana en curso lleva borde ocre (sus informes aún están llegando) y las futuras no se pueden elegir:
 *  no tienen informes. Abajo, dos atajos: la última semana cerrada y la semana en curso. Escape o un clic fuera cierran.
 *
 *  @param monday     el lunes de la semana elegida
 *  @param onChange   (lunes) => void
 *  @param span       'week' (semanal, global) o 'fourWeeks' (intersemanal: la semana elegida es la última de cuatro)
 *  @param firstYear  el primer año que se ofrece
 */
type WeekPickerProps = { monday: string; onChange: (monday: string) => void; span?: 'week' | 'fourWeeks'; firstYear?: number }

const ARROW = 'inline-flex h-14 w-11 flex-none items-center justify-center rounded-xl text-portal-ink hover:bg-portal-soft disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'
const SMALL_BUTTON = 'h-10 rounded-[10px] bg-portal-soft px-3.5 text-[13px] font-semibold text-portal-ink hover:bg-portal-line disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'

const Arrow = ({ to }: { to: 'left' | 'right' }) => (
  <svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d={to === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} /></svg>
)

// thursdayMonth = «el mes al que pertenece una semana»: el de su jueves
const thursdayMonth = (monday: string) => new Date(Date.parse(`${monday}T00:00:00Z`) + 3 * 86_400_000).getUTCMonth()

export default function WeekPicker({ monday, onChange, span = 'week', firstYear = 2023 }: WeekPickerProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language
  const [current] = useState(() => mondayOf(new Date()))
  const lastClosed = addWeeks(current, -1)
  const { year, week } = isoWeekOf(monday)
  const lastYear = isoWeekOf(current).year
  const [open, setOpen] = useState(false)
  const [yearView, setYearView] = useState(year)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const dialogId = useId()

  // Un clic fuera cierra
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Al abrir, el foco va a la semana elegida (o a la primera que se pueda elegir, si se mira otro año)
  useEffect(() => {
    if (!open) return
    const grid = gridRef.current
    const target = grid?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? grid?.querySelector<HTMLButtonElement>('button:not(:disabled)')
    target?.focus()
    target?.scrollIntoView({ block: 'nearest' })
  }, [open, yearView])

  const toggle = () => {
    if (!open) setYearView(year)
    setOpen(!open)
  }
  // go = «ir a una semana», nunca más allá de la semana en curso
  const go = (next: string, refocus = true) => {
    onChange(next < current ? next : current)
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape') return
    event.preventDefault()
    setOpen(false)
    triggerRef.current?.focus()
  }

  // months = «los meses del año que se mira, cada uno con sus semanas»; sin los que aún no empezaron
  const monthName = (month: number) => {
    const name = new Intl.DateTimeFormat(lang, { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month, 15))).replace('.', '')
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  const weeks = weeksOfYear(yearView)
  const months = Array.from({ length: 12 }, (_, month) => ({ month, weeks: weeks.filter(item => thursdayMonth(item) === month) }))
    .filter(item => item.weeks.some(candidate => candidate <= current))
  const inProgress = monday === current

  return (
    <div ref={rootRef} className='relative flex min-w-0 flex-[1_1_360px] items-center gap-1' onKeyDown={open ? onKeyDown : undefined}>
      <button type='button' className={ARROW} aria-label={t('reports.prevWeek')} onClick={() => go(addWeeks(monday, -1), false)}>
        <Arrow to='left' />
      </button>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='dialog'
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        onClick={toggle}
        className={`${TRIGGER} min-w-0 flex-1 ${open ? 'bg-portal-soft' : 'bg-portal-surface hover:bg-portal-soft dark:bg-portal-page dark:hover:bg-portal-soft'}`}
      >
        <svg aria-hidden='true' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='flex-none text-portal-muted'><rect x='4' y='5' width='16' height='15' rx='2' /><path d='M8 3v4M16 3v4M4 10h16' /></svg>
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-xs text-portal-muted'>{t(span === 'fourWeeks' ? 'reports.picker.weeksUpTo' : 'reports.picker.week')}</span>
          <span className='truncate text-[15px] font-semibold text-portal-ink'>{t('reports.weekOption', { number: week, range: weekRangeLabel(monday, lang) })}</span>
        </span>
        {inProgress && <span className='flex-none rounded-full bg-[#e9c46a]/25 px-2.5 py-0.5 text-xs font-semibold text-[#6b4a06] dark:bg-[#e9c46a]/15 dark:text-[#e9c46a]'>{t('reports.picker.inProgress')}</span>}
        <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='flex-none text-portal-muted'><path d='m6 9 6 6 6-6' /></svg>
      </button>
      <button type='button' className={ARROW} aria-label={t('reports.nextWeek')} disabled={monday >= current} onClick={() => go(addWeeks(monday, 1), false)}>
        <Arrow to='right' />
      </button>

      {open && (
        <div id={dialogId} role='dialog' aria-label={t('reports.picker.chooseWeek')} className='absolute right-0 top-[calc(100%+10px)] z-30 w-[min(420px,calc(100vw-48px))] rounded-2xl bg-portal-surface p-3.5 shadow-[0_18px_40px_rgb(0_0_0/0.25)] ring-1 ring-portal-ring'>
          <div className='flex items-center justify-between gap-2'>
            <button type='button' className={`${SMALL_BUTTON} inline-flex w-10 items-center justify-center px-0`} aria-label={t('reports.picker.prevYear')} disabled={yearView <= firstYear} onClick={() => setYearView(yearView - 1)}>
              <Arrow to='left' />
            </button>
            <p className='m-0 font-plex-mono text-[17px] font-semibold text-portal-ink' aria-live='polite'>{yearView}</p>
            <button type='button' className={`${SMALL_BUTTON} inline-flex w-10 items-center justify-center px-0`} aria-label={t('reports.picker.nextYear')} disabled={yearView >= lastYear} onClick={() => setYearView(yearView + 1)}>
              <Arrow to='right' />
            </button>
          </div>

          <div ref={gridRef} className='mt-2.5 flex max-h-[min(320px,45vh)] flex-col gap-1.5 overflow-y-auto pr-1'>
            {months.map(({ month, weeks: monthWeeks }) => (
              <div key={month} className='grid grid-cols-[44px_repeat(5,minmax(0,1fr))] items-center gap-1.5'>
                <span className='text-[12.5px] font-semibold text-portal-muted'>{monthName(month)}</span>
                {monthWeeks.map(item => {
                  const on = item === monday
                  const isCurrent = item === current
                  const number = isoWeekOf(item).week
                  return (
                    <button
                      key={item}
                      type='button'
                      aria-pressed={on}
                      disabled={item > current}
                      aria-label={`${t('reports.picker.weekAria', { number, range: weekRangeLabel(item, lang) })}${isCurrent ? `, ${t('reports.picker.inProgress')}` : ''}`}
                      onClick={() => go(item)}
                      className={`h-[38px] rounded-[9px] font-plex-mono text-[13.5px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink disabled:cursor-not-allowed disabled:opacity-30 ${
                        on
                          ? 'bg-portal-ink text-portal-page'
                          : `bg-portal-ctl text-portal-ink hover:bg-portal-soft ${isCurrent ? 'ring-[1.5px] ring-inset ring-[#c9962f] dark:ring-[#e9c46a]' : 'ring-1 ring-inset ring-portal-line'}`
                      }`}
                    >
                      {number}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <p className='m-0 mt-2.5 text-[12.5px] text-portal-muted'>{t('reports.picker.currentHint')}</p>
          <div className='mt-2.5 flex flex-wrap gap-1.5'>
            <button type='button' className={SMALL_BUTTON} onClick={() => go(lastClosed)}>{t('reports.picker.lastClosed')}</button>
            <button type='button' className={SMALL_BUTTON} onClick={() => go(current)}>{t('reports.picker.current')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
