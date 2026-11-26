import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PathIcon } from '@/components/PortalIcons'
import { minutesBetween, shortHour, type TableCycle, type TableDay, type TablePhase } from '../hook/tableActivity'
import { BROOM_ICON } from './icons'

/*  LA TARJETA DE UNA MESA: el ciclo completo de su rotación. Solo pinta.
 *
 *  Sale al pasar el ratón por una mesa del croquis (o al pulsarla, y entonces se queda). Enseña la rotación en curso
 *  o, si la mesa está libre, la última guardada de hoy, paso por paso y con sus horas: Ocupa, Primera atención, los
 *  toques de gerente, la toma de orden y la entrega de cada pedido, Desocupa y Limpieza. Al lado de Primera atención
 *  y de Limpieza, los minutos que tardaron (desde Ocupa y desde Desocupa). Lo que todavía no pasó queda en gris,
 *  «pendiente». Abajo, lo de hoy de la mesa.
 *
 *  @param label  la mesa, zone su zona
 *  @param phase  en qué punto del ciclo está ahora (espera, ocupada, servida, por limpiar o libre)
 *  @param cycle  la rotación que se enseña, o null si hoy no tuvo ninguna
 *  @param day    lo de hoy de la mesa
 */
type RotationCardProps = { label: string; zone: string; phase: TablePhase; cycle: TableCycle | null; day: TableDay }

// CHIP = «el color del distintivo de la fase», como la mesa en el croquis
const GREEN_CHIP = 'bg-[#29c50c]/15 text-[#177406] dark:text-[#a8e598]'
const YELLOW_CHIP = 'bg-[#e9b949]/20 text-[#7a5a00] dark:text-[#f0c95c]'
const CHIP: Record<TablePhase, string> = {
  espera: GREEN_CHIP,
  ocupada: GREEN_CHIP,
  servida: YELLOW_CHIP,
  limpieza: YELLOW_CHIP,
  libre: 'bg-portal-ctl text-portal-muted ring-1 ring-inset ring-portal-line',
}

// Step = «un paso del ciclo»: su nombre, su hora (o la lista de horas) y, si toca, cuánto tardó
function Step({ title, hour, after, pending, children }: { title: string; hour?: string; after?: string | null; pending: boolean; children?: ReactNode }) {
  return (
    <li className='relative flex gap-2.5 pb-2.5 last:pb-0'>
      <span aria-hidden='true' className={`relative z-10 mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${pending ? 'bg-portal-surface ring-2 ring-inset ring-portal-ring' : 'bg-portal-ink'}`} />
      <div className='flex min-w-0 flex-1 flex-col gap-0.5'>
        <div className='flex items-baseline justify-between gap-3'>
          <span className={`text-[13px] font-semibold ${pending ? 'text-portal-muted' : 'text-portal-ink'}`}>{title}</span>
          {hour !== undefined && (
            <span className={`shrink-0 text-[13px] tabular-nums ${pending ? 'text-portal-muted' : 'font-semibold text-portal-ink'}`}>
              {hour}
              {after && <span className='ml-1.5 text-[11px] font-medium text-portal-muted'>{after}</span>}
            </span>
          )}
        </div>
        {children}
      </div>
    </li>
  )
}

export default function RotationCard({ label, zone, phase, cycle, day }: RotationCardProps) {
  const { t } = useTranslation()
  const rotation = cycle?.rotation ?? null
  const pending = t('tables.card.pending')
  const hourOr = (value: string | undefined) => shortHour(value) || pending
  const after = (from?: string, to?: string) => {
    const minutes = minutesBetween(from, to)
    return minutes === null ? null : t('tables.card.after', { minutes })
  }
  const orders = (rotation?.process ?? []).filter(process => process.orderTaking)
  const touches = rotation?.touch ?? []

  return (
    <div className='flex w-[280px] flex-col gap-2.5 rounded-xl bg-portal-surface p-3.5 text-left shadow-[0_14px_36px_rgb(0_0_0/0.4)] ring-1 ring-inset ring-portal-ring'>
      <div className='flex items-center justify-between gap-2'>
        <p className='m-0 text-[15px] font-semibold text-portal-ink'>
          {t('tables.card.title', { label })} <span className='font-medium text-portal-muted'>· {zone}</span>
        </p>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${CHIP[phase]}`}>
          {phase === 'limpieza' && <PathIcon d={BROOM_ICON} size={12} strokeWidth={2.2} />}
          {t(`tables.phase.${phase}`)}
        </span>
      </div>

      {rotation ? (
        <>
          <p className='m-0 text-xs text-portal-muted'>{cycle?.current ? t('tables.card.current') : t('tables.card.lastSaved')}</p>
          <ol className='relative m-0 list-none p-0 before:absolute before:bottom-2 before:left-[4px] before:top-2 before:w-0.5 before:bg-portal-line'>
            <Step title={t('tables.card.occupies')} hour={hourOr(rotation.hourOccupies)} pending={!rotation.hourOccupies} />
            <Step title={t('tables.card.firstAttention')} hour={hourOr(rotation.hourFirstAttention)} after={after(rotation.hourOccupies, rotation.hourFirstAttention)} pending={!rotation.hourFirstAttention} />
            <Step title={t('tables.card.touches')} pending={touches.length === 0}>
              {touches.length ? (
                <ul className='m-0 flex list-none flex-wrap gap-1 p-0'>
                  {touches.map((touch, index) => (
                    <li key={touch._id ?? index} className='rounded-md bg-portal-ctl px-1.5 py-0.5 text-[11px] tabular-nums text-portal-ink ring-1 ring-inset ring-portal-line'>
                      <span className='font-semibold'>{touch.name || '—'}</span> {shortHour(touch.hourTouch)}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className='text-xs text-portal-muted'>{t('tables.card.noTouches')}</span>
              )}
            </Step>
            <Step title={t('tables.card.orders')} pending={orders.length === 0}>
              {orders.length ? (
                <ul className='m-0 flex list-none flex-col gap-0.5 p-0'>
                  {orders.map((process, index) => (
                    <li key={process._id ?? index} className='flex justify-between gap-3 text-xs text-portal-ink'>
                      <span className='truncate'>{process.dishType || t('tables.card.order')}</span>
                      <span className='shrink-0 tabular-nums'>
                        {shortHour(process.orderTaking)} <span aria-hidden='true' className='text-portal-muted'>→</span>{' '}
                        {process.dishDelivery ? shortHour(process.dishDelivery) : <span className='text-portal-muted'>{pending}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <span className='text-xs text-portal-muted'>{t('tables.card.noOrders')}</span>
              )}
            </Step>
            <Step title={t('tables.card.breakUp')} hour={hourOr(rotation.breakUp)} pending={!rotation.breakUp} />
            <Step title={t('tables.card.cleaning')} hour={hourOr(rotation.tableCleaning)} after={after(rotation.breakUp, rotation.tableCleaning)} pending={!rotation.tableCleaning} />
          </ol>
        </>
      ) : (
        <p className='m-0 text-[13px] text-portal-muted'>{t('tables.card.noneToday')}</p>
      )}

      <p className='m-0 border-t border-portal-line pt-2 text-[11px] text-portal-muted'>
        {t('tables.card.day', { rotations: day.rotations, firsts: day.firsts, others: day.others })}
      </p>
    </div>
  )
}
