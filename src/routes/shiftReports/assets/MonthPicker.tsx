import { useTranslation } from 'react-i18next'
import { addMonths, monthLabel } from '../shiftData'

/*  ELEGIR EL MES:  ‹  noviembre 2026  ›
 *
 *  Las flechas van al mes anterior y al siguiente; no se pasa del mes en curso (los meses futuros no tienen informes).
 *
 *  @param month    el mes elegido, AAAA-MM
 *  @param current  el mes en curso, AAAA-MM
 *  @param onChange (mes) => void
 */
type MonthPickerProps = { month: string; current: string; onChange: (month: string) => void }

const ARROW = 'inline-flex h-14 w-11 flex-none items-center justify-center rounded-xl text-portal-ink hover:bg-portal-soft disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'

const Chevron = ({ to }: { to: 'left' | 'right' }) => (
  <svg aria-hidden='true' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d={to === 'left' ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} /></svg>
)

export default function MonthPicker({ month, current, onChange }: MonthPickerProps) {
  const { t, i18n } = useTranslation()
  const previous = addMonths(month, -1)
  const next = addMonths(month, 1)
  return (
    <div className='flex min-w-0 flex-[1_1_260px] items-center gap-1'>
      <button type='button' className={ARROW} onClick={() => onChange(previous)} aria-label={t('shiftReports.prevMonth')} title={monthLabel(previous, i18n.language)}>
        <Chevron to='left' />
      </button>
      <div className='flex h-14 min-w-0 flex-1 flex-col justify-center px-2'>
        <span className='text-[11px] font-semibold uppercase tracking-[0.08em] text-portal-muted'>{t('shiftReports.month')}</span>
        <span className='truncate text-[15px] font-semibold capitalize text-portal-ink'>{monthLabel(month, i18n.language)}</span>
      </div>
      <button type='button' className={ARROW} onClick={() => onChange(next)} disabled={next > current} aria-label={t('shiftReports.nextMonth')} title={next > current ? undefined : monthLabel(next, i18n.language)}>
        <Chevron to='right' />
      </button>
    </div>
  )
}
