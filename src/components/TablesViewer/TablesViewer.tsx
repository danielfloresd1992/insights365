import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, PathIcon } from '@/components/PortalIcons'
import { useAppSelector } from '@/store/hooks'
import FloorPlanStage from './assets/FloorPlanStage'
import { BROOM_ICON, FIRST_TOUCH_ICON, LAYERS_ICON, LIVE_ICON, OTHER_TOUCHES_ICON, ROTATIONS_ICON } from './assets/icons'
import { activityByTable, cyclesByTable, EMPTY_DAY, percent, sumDays, tableKey, tablesOf, unplacedRotations } from './hook/tableActivity'
import { useFloorPlans } from './hook/useFloorPlans'
import { useTableActivity } from './hook/useTableActivity'

/*  EL VISOR DE MESAS: el croquis del local y lo que pasa hoy en sus mesas
 *
 *  Propuesta A del lienzo «Croquis en la columna del panel en vivo», elegida por el usuario. Ocupa la columna derecha
 *  del panel en vivo (en lugar de los adelantos «Próximamente»):
 *  - arriba, el local, con un selector que separa los que tienen croquis de los que no y dice cuál de ellos es
 *    («Croquis 3 de 4»); a sus lados, dos flechas (o ← y → con el foco en el plano) para pasar al croquis anterior o
 *    al siguiente. Van fuera del plano para no taparle ninguna mesa (pedido del usuario);
 *  - en medio, el plano desde arriba (assets/FloorPlanStage): en verde las mesas ocupadas, en amarillo con una escoba
 *    las que están por limpiar, en la esquina de cada una sus rotaciones de hoy; al pasar el ratón por una mesa, el
 *    ciclo de su rotación (assets/RotationCard);
 *  - debajo, cuatro cifras de hoy: mesas en vivo, rotaciones (en vivo + guardadas), primeros toques (sobre las
 *    rotaciones) y otros toques (sobre los primeros); y las zonas, que filtran el plano y las cifras.
 *  Los datos: los croquis (hook/useFloorPlans) y las rotaciones del día operativo (hook/useTableActivity), al día por
 *  el socket. Las reglas de las cuentas, en hook/tableActivity.
 *
 *  En el móvil (por debajo de lg) cabe entero en la pantalla, sin desplazarse (propuesta B del lienzo «Visor de mesas
 *  a pantalla completa en el móvil»): sin el título ni la línea de «Hoy en todo el local», la posición del croquis
 *  dentro del selector, las cuatro cifras en una fila con su nombre corto, y el plano en todo lo que sobra (girado a
 *  lo alto si así sale más grande: assets/FloorPlanStage).
 *
 *  @param className   el sitio que le deja el panel (alto y posición fija); sin él, el alto que pida su contenido
 *  @param autoLayout  repartir las zonas del croquis solas para que las mesas salgan más grandes (el móvil)
 */

// ARROW = «una flecha de las que pasan de croquis», a los lados del selector y de su mismo alto
const ARROW = 'grid w-11 shrink-0 place-items-center rounded-xl bg-portal-ctl text-portal-ink ring-1 ring-inset ring-portal-line hover:bg-portal-soft focus-visible:outline-2 focus-visible:outline-[#29c50c]'

// Stat = «una de las cuatro cifras de abajo», con el icono de lo que cuenta delante del nombre (assets/icons)
// En el escritorio: el icono y el nombre, la cifra grande y la nota. En el móvil, para que las cuatro quepan en una
// fila: el icono con la cifra y debajo el nombre corto (short)
function Stat({ icon, label, short, value, note, live = false }: { icon: string; label: ReactNode; short: ReactNode; value: ReactNode; note: ReactNode; live?: boolean }) {
  const tone = live ? 'text-[#177406] dark:text-[#a8e598]' : 'text-portal-muted'
  return (
    <div className={`flex min-w-0 flex-col justify-center gap-0.5 rounded-[10px] px-2 py-2 ring-1 ring-inset lg:px-3 lg:py-2.5 ${live ? 'bg-[#29c50c]/12 ring-[#29c50c]/30' : 'bg-portal-ctl ring-portal-line'}`}>
      <span className={`hidden items-center gap-1.5 text-xs lg:inline-flex ${tone}`}>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1 ring-inset ${live ? 'bg-[#29c50c]/20 text-[#177406] ring-[#29c50c]/30 dark:text-[#7fdc5e]' : 'bg-portal-soft text-portal-ink ring-portal-line'}`}>
          <PathIcon d={icon} size={14} />
        </span>
        {label}
      </span>
      <span className='hidden text-2xl font-bold leading-tight tabular-nums text-portal-ink lg:block'>{value}</span>
      <span className={`hidden text-[11px] leading-snug lg:block ${tone}`}>{note}</span>
      <span className='flex items-center gap-1.5 lg:hidden'>
        <PathIcon d={icon} size={13} className={live ? 'shrink-0 text-[#177406] dark:text-[#7fdc5e]' : 'shrink-0 text-portal-muted'} />
        <span className='text-lg font-bold leading-tight tabular-nums text-portal-ink'>{value}</span>
      </span>
      <span className={`truncate text-[11px] lg:hidden ${tone}`}>{short}</span>
    </div>
  )
}

export default function TablesViewer({ className = '', autoLayout = false }: { className?: string; autoLayout?: boolean }) {
  const { t } = useTranslation()
  const items = useAppSelector(state => state.establishments.items)
  const ids = useMemo(() => items.map(item => item._id), [items])
  const floor = useFloorPlans(ids)

  const withPlan = items.filter(item => floor.plans[item._id])
  const withoutPlan = items.filter(item => !floor.plans[item._id])
  const [chosenId, setChosenId] = useState<string | null>(null)
  // Sin elegir: el primer local con croquis
  const current = items.find(item => item._id === chosenId) ?? withPlan[0] ?? items[0] ?? null
  const plan = current ? floor.plans[current._id] ?? null : null

  const [menuOpen, setMenuOpen] = useState(false)
  const menu = useRef<HTMLDivElement>(null)
  const [zone, setZone] = useState<string | null>(null)
  const [table, setTable] = useState<string | null>(null)

  // legendRoom = «lo que mide la leyenda del plano, con su margen»: el plano deja ese hueco arriba para que la
  // leyenda no le tape nada, también cuando pasa a dos líneas en una columna estrecha
  const [legendRoom, setLegendRoom] = useState(40)
  const legendObserver = useRef<ResizeObserver | null>(null)
  const watchLegend = useCallback((node: HTMLDivElement | null) => {
    legendObserver.current?.disconnect()
    if (!node) return
    legendObserver.current = new ResizeObserver(() => setLegendRoom(node.offsetHeight + 12))
    legendObserver.current.observe(node)
  }, [])

  // El menú se cierra al pulsar fuera o con Escape
  useEffect(() => {
    if (!menuOpen) return
    const away = (event: PointerEvent) => { if (!menu.current?.contains(event.target as Node)) setMenuOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', escape)
    }
  }, [menuOpen])

  const activity = useTableActivity(plan && current ? { _id: current._id, name: current.name } : null)
  const byTable = useMemo(() => activityByTable(activity.rotations), [activity.rotations])
  const cycles = useMemo(() => cyclesByTable(activity.rotations), [activity.rotations])

  const choose = (id: string) => {
    setChosenId(id)
    setZone(null)
    setTable(null)
    setMenuOpen(false)
  }

  // Pasar al croquis de al lado (las flechas del selector, o ← y →): solo entre los locales con croquis, y del último se
  // vuelve al primero. Desde un local sin croquis, la flecha lleva al primero (→) o al último (←)
  const position = withPlan.findIndex(item => item._id === current?._id)
  const neighbor = (delta: 1 | -1) => {
    if (!withPlan.length) return null
    const from = position >= 0 ? position : delta > 0 ? -1 : withPlan.length
    return withPlan[(from + delta + withPlan.length) % withPlan.length]
  }
  const canStep = withPlan.length > 1 || (withPlan.length === 1 && position < 0)
  const step = (delta: 1 | -1) => {
    const next = neighbor(delta)
    if (next && canStep) choose(next._id)
  }
  const stepByKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') step(-1)
    if (event.key === 'ArrowRight') step(1)
  }

  // Las cifras: de todo el local (también las mesas que no están en el croquis) o de las mesas de la zona elegida
  const totals = plan && zone ? sumDays(tablesOf(plan, zone).map(piece => byTable.get(tableKey(piece.label)) ?? EMPTY_DAY)) : sumDays(byTable.values())
  const unplaced = plan && !zone ? unplacedRotations(plan, byTable) : 0
  const pct = (value: number | null) => (value === null ? t('tables.noPct') : `${value} %`)
  const tables = plan ? tablesOf(plan, null) : []
  const seats = tables.reduce((sum, piece) => sum + (piece.cap || 0), 0)
  const planMeta = plan ? t('tables.planMeta', { tables: tables.length, zones: plan.zonas.length, seats }) : ''

  const zoneLabel = (id: string | null) => plan?.zonas.find(zona => zona.id === id)?.label ?? ''

  const option = (item: (typeof items)[number], has: boolean) => {
    const on = current?._id === item._id
    return (
      <button
        key={item._id}
        type='button'
        role='option'
        aria-selected={on}
        onClick={() => choose(item._id)}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-2.5 text-left text-sm ${on ? 'bg-portal-soft ring-[1.5px] ring-inset ring-[#29c50c]' : 'hover:bg-portal-soft'}`}
      >
        <span className={has ? 'font-semibold text-portal-ink' : 'text-portal-muted'}>{item.name}</span>
        <span className={`shrink-0 text-xs ${has ? 'text-[#177406] dark:text-[#7fdc5e]' : 'text-portal-muted'}`}>
          {has ? t('tables.hasPlan') : item.isActive ? t('tables.noPlan') : t('tables.inactive')}
        </span>
      </button>
    )
  }

  return (
    <section aria-label={t('tables.title')} className={`flex flex-col gap-2.5 rounded-2xl bg-portal-surface p-3 ring-1 ring-inset ring-portal-line lg:gap-3 lg:p-4 ${className}`}>
      {/* En el móvil sobra: la pestaña de abajo ya dice dónde se está */}
      <header className='hidden items-center justify-between gap-3 lg:flex'>
        <h2 className='m-0 text-lg font-semibold text-portal-ink'>{t('tables.title')}</h2>
        {floor.status === 'ready' && (
          <p className='m-0 text-[13px] text-portal-muted'>
            <strong className='font-semibold text-portal-ink'>{t('tables.withPlan', { n: withPlan.length, total: items.length })}</strong>
          </p>
        )}
      </header>

      {floor.status === 'loading' && <div role='status' className='min-h-0 flex-1 animate-pulse rounded-xl bg-portal-ctl'><span className='sr-only'>{t('tables.loading')}</span></div>}

      {floor.status === 'failed' && (
        <p role='alert' className='m-0 rounded-xl bg-portal-danger-bg px-4 py-3 text-sm text-portal-danger'>{t('tables.failed')}</p>
      )}

      {floor.status === 'ready' && current && (
        <>
          <div className='flex gap-2'>
          {canStep && (
            <button type='button' onClick={() => step(-1)} aria-label={t('tables.prevPlan', { name: neighbor(-1)?.name ?? '' })} title={neighbor(-1)?.name} className={ARROW}>
              <ChevronLeftIcon size={20} />
            </button>
          )}
          <div ref={menu} className='relative min-w-0 flex-1'>
            <button
              type='button'
              onClick={() => setMenuOpen(open => !open)}
              aria-expanded={menuOpen}
              aria-haspopup='listbox'
              className='flex h-[52px] w-full items-center gap-3 rounded-xl bg-portal-ctl px-3 text-left ring-1 ring-inset ring-portal-line focus-visible:outline-2 focus-visible:outline-[#29c50c]'
            >
              <span aria-hidden='true' className={`grid h-8 w-8 shrink-0 place-items-center rounded-[9px] ${plan ? 'bg-[#29c50c]/15 text-[#177406] dark:text-[#7fdc5e]' : 'border-[1.5px] border-dashed border-portal-ring text-portal-muted'}`}>
                <PathIcon d={LAYERS_ICON} size={16} />
              </span>
              <span className='flex min-w-0 flex-1 flex-col'>
                <span className='truncate text-[15px] font-semibold text-portal-ink'>{current.name}</span>
                <span className='truncate text-xs text-portal-muted'>
                  <span className='hidden lg:inline'>{plan ? `${planMeta} · ${t('tables.change')}` : `${t('tables.noPlan')} · ${t('tables.change')}`}</span>
                  {/* En el móvil, más corto y con la posición del croquis (la pastilla no cabe) */}
                  <span className='lg:hidden'>
                    {plan && position >= 0 ? t('tables.planMetaShort', { tables: tables.length, n: position + 1, total: withPlan.length }) : plan ? planMeta : t('tables.noPlan')}
                  </span>
                </span>
              </span>
              {position >= 0 && withPlan.length > 1 && (
                <span className='hidden shrink-0 rounded-full bg-portal-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-portal-muted ring-1 ring-inset ring-portal-line lg:inline'>
                  {t('tables.planPosition', { n: position + 1, total: withPlan.length })}
                </span>
              )}
              <PathIcon d='M6 9l6 6 6-6' size={18} className='shrink-0 text-portal-muted' />
            </button>
            {menuOpen && (
              <div role='listbox' aria-label={t('tables.establishments')} className='absolute inset-x-0 top-[58px] z-20 flex max-h-[420px] flex-col gap-0.5 overflow-y-auto rounded-xl bg-portal-ctl p-2 shadow-[0_18px_40px_rgb(0_0_0/0.35)] ring-1 ring-inset ring-portal-ring'>
                <p className='m-0 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>{t('tables.groupWith')}</p>
                {withPlan.map(item => option(item, true))}
                {withoutPlan.length > 0 && <p className='m-0 mt-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>{t('tables.groupWithout')}</p>}
                {withoutPlan.map(item => option(item, false))}
              </div>
            )}
          </div>
          {canStep && (
            <button type='button' onClick={() => step(1)} aria-label={t('tables.nextPlan', { name: neighbor(1)?.name ?? '' })} title={neighbor(1)?.name} className={ARROW}>
              <ChevronRightIcon size={20} />
            </button>
          )}
          </div>

          {plan ? (
            <>
              {/* ← y → pasan de croquis mientras el foco está en el plano (en una mesa) */}
              <div role='group' aria-label={t('tables.planGroup', { name: current.name })} onKeyDown={stepByKey} className='relative min-h-0 flex-1 overflow-hidden rounded-xl bg-portal-surface ring-1 ring-inset ring-portal-line dark:bg-[#221e17] dark:ring-0'>
                <div ref={watchLegend} aria-hidden='true' className='absolute left-1/2 top-2.5 flex w-max max-w-[calc(100%-20px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg bg-portal-surface/90 px-2.5 py-1.5 text-xs text-portal-muted'>
                  {/* Las fases del ciclo, en su orden; las que titilan en el plano titilan también aquí */}
                  <span className='inline-flex items-center gap-1.5'><span className='table-blink table-blink-green h-2.5 w-2.5 rounded-[3px] bg-[#29c50c] ring-1 ring-portal-ring [--blink-inset:2px]' />{t('tables.phase.espera')}</span>
                  <span className='inline-flex items-center gap-1.5'><span className='h-2.5 w-2.5 rounded-[3px] bg-[#29c50c]' />{t('tables.phase.ocupada')}</span>
                  <span className='inline-flex items-center gap-1.5'><span className='h-2.5 w-2.5 rounded-[3px] bg-[#e9b949]' />{t('tables.phase.servida')}</span>
                  <span className='inline-flex items-center gap-1.5'><span className='table-blink table-blink-yellow grid h-4 w-4 place-items-center rounded-[4px] bg-[#e9b949] text-[#2b2418] ring-1 ring-portal-ring [--blink-inset:2px]'><PathIcon d={BROOM_ICON} size={11} strokeWidth={2.4} /></span>{t('tables.phase.limpieza')}</span>
                  <span className='inline-flex items-center gap-1.5'><span className='grid h-4 min-w-[18px] place-items-center rounded-full bg-portal-ink px-1 text-[11px] font-bold text-portal-page'>2</span>{t('tables.legendCount')}</span>
                </div>
                <FloorPlanStage plan={plan} byTable={byTable} cycles={cycles} zone={zone} selected={table} onSelect={setTable} topRoom={legendRoom} autoLayout={autoLayout} />
              </div>

              <section aria-label={t('tables.statsLabel')} className='flex flex-col gap-1.5'>
                {/* En el móvil esta línea solo sale si algo falló: el resto del sitio es para el plano */}
                <p className={`m-0 text-xs text-portal-muted ${activity.status === 'failed' ? '' : 'hidden lg:block'}`}>
                  {zone ? t('tables.scopeZone', { zone: zoneLabel(zone) }) : t('tables.scopeAll')}
                  {activity.status === 'failed' && <span className='text-portal-danger'> · {t('tables.activityFailed')}</span>}
                  {unplaced > 0 && <span> · {t('tables.unplaced', { count: unplaced })}</span>}
                </p>
                <div className='grid grid-cols-4 gap-1.5'>
                  <Stat live icon={LIVE_ICON} label={t('tables.live')} short={t('tables.live')} value={totals.live} note={t('tables.liveNote', { occupied: totals.occupied, cleaning: totals.cleaning })} />
                  <Stat icon={ROTATIONS_ICON} label={t('tables.rotations')} short={t('tables.rotations')} value={totals.rotations} note={t('tables.rotationsNote', { live: totals.live, saved: totals.saved })} />
                  <Stat icon={FIRST_TOUCH_ICON} label={t('tables.firsts')} short={t('tables.firstsShort')} value={totals.firsts} note={t('tables.firstsNote', { pct: pct(percent(totals.firsts, totals.rotations)) })} />
                  <Stat icon={OTHER_TOUCHES_ICON} label={t('tables.others')} short={t('tables.othersShort')} value={totals.others} note={t('tables.othersNote', { pct: pct(percent(totals.others, totals.firsts)) })} />
                </div>
              </section>

              <div role='group' aria-label={t('tables.zones')} className='flex shrink-0 gap-1.5 overflow-x-auto pb-1'>
                {[{ id: null, label: t('tables.allZones') }, ...plan.zonas].map(zona => {
                  const on = zone === zona.id
                  const count = tablesOf(plan, zona.id).length
                  return (
                    <button
                      key={zona.id ?? 'todas'}
                      type='button'
                      onClick={() => { setZone(zona.id); setTable(null) }}
                      aria-pressed={on}
                      className={`h-9 shrink-0 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold text-portal-ink ring-inset focus-visible:outline-2 focus-visible:outline-[#29c50c] ${on ? 'bg-portal-soft ring-[1.5px] ring-[#29c50c]' : 'bg-portal-ctl ring-1 ring-portal-line'}`}
                    >
                      {zona.label} <span className='font-medium text-portal-muted'>{count}</span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className='grid flex-1 place-items-center rounded-xl border-[1.5px] border-dashed border-portal-ring text-center'>
              <div className='flex max-w-[340px] flex-col items-center gap-2 p-6'>
                <p className='m-0 text-base font-semibold text-portal-ink'>{withPlan.length ? t('tables.emptyTitle', { name: current.name }) : t('tables.noneTitle')}</p>
                <p className='m-0 text-sm text-portal-muted'>{t('tables.emptyText')}</p>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
