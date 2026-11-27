import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { ShiftName } from '@/ajax/documents.ajax'
import type { DayRow } from '../shiftData'

/*  LOS DÍAS DEL MES Y SUS TURNOS (la franja de arriba de la propuesta E)
 *
 *  Un botón por día, del más nuevo al más viejo, con un punto por turno: verde si llegó su informe, ámbar si es de hoy
 *  y todavía no (en curso), hueco si falta. Al lado, los turnos del día elegido: el que tiene informe se abre; el que
 *  no, sale apagado. Al abrir, el día elegido se trae a la vista.
 *
 *  @param rows      los días (shiftData.dayRows)
 *  @param day       el día elegido, AAAA-MM-DD
 *  @param reportId  el informe abierto
 *  @param today     hoy, AAAA-MM-DD
 */
type DayStripProps = { rows: DayRow[]; day: string | null; reportId: string | null; today: string; onDay: (date: string) => void; onReport: (id: string, date: string) => void }

const SHIFT_ICON: Record<ShiftName, string> = {
  day: 'M12 4V2M12 22v-2M4 12H2M22 12h-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  night: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  all: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
}

const weekdayOf = (date: string, lang: string) => new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

export default function DayStrip({ rows, day, reportId, today, onDay, onReport }: DayStripProps) {
  const { t, i18n } = useTranslation()
  const selectedRef = useRef<HTMLButtonElement>(null)
  const selected = rows.find(row => row.date === day) ?? null
  const all = rows.flatMap(row => row.shifts)
  const delivered = all.filter(item => item.document).length

  // El día elegido, a la vista dentro de la franja (sin mover la página)
  useEffect(() => {
    const button = selectedRef.current
    const strip = button?.parentElement
    if (!button || !strip) return
    strip.scrollTo({ left: button.offsetLeft - strip.clientWidth / 2 + button.clientWidth / 2, behavior: 'smooth' })
  }, [day])

  return (
    <section aria-label={t('shiftReports.listLabel')} className='flex flex-wrap items-center gap-2.5 rounded-[18px] bg-portal-surface p-2.5 ring-1 ring-inset ring-portal-line'>
      <div className='flex min-w-0 flex-[999_1_480px] gap-1.5 overflow-x-auto pb-1'>
        {rows.map(row => {
          const isSelected = row.date === day
          const isToday = row.date === today
          return (
            <button
              key={row.date}
              ref={isSelected ? selectedRef : undefined}
              type='button'
              aria-pressed={isSelected}
              onClick={() => onDay(row.date)}
              className={`flex w-[58px] flex-none flex-col items-center gap-1 rounded-[13px] pb-2.5 pt-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${
                isSelected ? 'bg-portal-ink text-portal-page' : isToday ? 'text-portal-ink ring-[1.5px] ring-inset ring-[#e0a83a]' : 'text-portal-ink ring-1 ring-inset ring-portal-line hover:bg-portal-ctl'
              }`}
            >
              <span className={`text-[11px] font-semibold capitalize ${isSelected ? 'text-portal-page/75' : 'text-portal-muted'}`}>{weekdayOf(row.date, i18n.language)}</span>
              <span className='font-plex-mono text-[19px] font-semibold leading-none'>{Number(row.date.slice(8))}</span>
              <span className='flex gap-[3px]' aria-hidden='true'>
                {row.shifts.map(({ shift, document }) => (
                  <span key={shift} className={`h-[7px] w-[7px] rounded-full ${document ? 'bg-[#29c50c]' : isToday ? 'bg-[#e0a83a]' : `border-[1.5px] ${isSelected ? 'border-portal-page/60' : 'border-portal-muted'}`}`} />
                ))}
              </span>
              <span className='sr-only'>{t('shiftReports.strip.dayStatus', { delivered: row.shifts.filter(item => item.document).length, total: row.shifts.length })}</span>
            </button>
          )
        })}
      </div>

      <div className='flex min-w-0 flex-[1_1_260px] flex-col gap-1.5'>
        <div className='flex gap-1.5 rounded-[13px] bg-portal-page p-1'>
          {selected?.shifts.map(({ shift, document }) => {
            const label = t(`shiftReports.shift.${shift}`)
            const icon = <svg aria-hidden='true' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round'><path d={SHIFT_ICON[shift]} /></svg>
            if (!document) {
              return (
                <span key={shift} className='inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-portal-ring text-[13px] text-portal-muted'>
                  {icon}{label} · {selected.date === today ? t('shiftReports.inProgress') : t('shiftReports.missing')}
                </span>
              )
            }
            const open = document._id === reportId
            return (
              <button key={shift} type='button' aria-pressed={open} onClick={() => onReport(document._id, selected.date)} className={`inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${open ? 'bg-[#29c50c] text-[#0e2a06]' : 'bg-portal-ctl text-portal-ink hover:bg-portal-soft'}`}>
                {icon}{label}
              </button>
            )
          })}
        </div>
        <p className='m-0 px-1 text-[12px] text-portal-muted'>{t('shiftReports.deliveredCount', { delivered, total: all.length })}</p>
      </div>
    </section>
  )
}
