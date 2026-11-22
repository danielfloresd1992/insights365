import type { CSSProperties, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Novelty } from '@/ajax/novelty.ajax'
import { CameraIcon, PathIcon } from '@/components/PortalIcons'
import { alertFamily, type FamilyLook } from '@/libs/alertFamily'
import { formatDuration } from '@/libs/formatDuration'
import { imageUrl } from '@/libs/imageUrl'
import { videoUrl } from '@/libs/videoUrl'
import LoopVideo from './LoopVideo'
import { clockOf, fullDateOf, groupByDay, titleOf } from '../hook/timeline'

/*  EL MURO COMO LÍNEA DE TIEMPO. Solo pinta.
 *
 *  Una alerta por fila, de la más nueva a la más vieja, agrupadas por día. A la izquierda la hora y el turno; en
 *  medio una raya con el icono de la familia de la alerta en su color (libs/alertFamily, --family-* en index.css); a
 *  la derecha la alerta, con la foto a un lado y el local, la familia, qué pasó y los detalles al otro. (Las nuevas se
 *  leen solas en voz alta: AlertWall.)
 *  En el móvil (por debajo de sm) la hora pasa a la cabecera de la alerta y la foto va arriba.
 *  Lo que viene de la API (el título, el plato, el local) queda como llega; lo demás, en el idioma del portal.
 *
 *  @param items       las alertas, de la más nueva a la más vieja
 *  @param now         la hora con la que se sabe qué es «Hoy» y qué «Ayer» (la refresca quien la monta)
 *  @param placeOf       el nombre del local de una alerta
 *  @param englishNames  los nombres en inglés de las alertas, si la API no los trae (useEnglishNames)
 *  @param freshIds    las alertas que acaban de llegar: entran desde la izquierda y empujan a las demás hacia abajo
 *                     (las clases wall-enter* de index.css). La estructura es la misma con y sin ellas, para que la
 *                     fila no se vuelva a montar al quitarlas.
 */
type WallTimelineProps = {
  items: Novelty[]
  now: number
  placeOf: (novelty: Novelty) => string
  englishNames?: ReadonlyMap<string, string> | null
  freshIds?: ReadonlySet<string>
}

// Entering = «la fila que entra: abre su hueco, recorta y trae el contenido desde la izquierda»
function Entering({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div className={active ? 'wall-enter' : undefined}>
      <div className={active ? 'wall-enter-clip' : undefined}>
        <div className={active ? 'wall-enter-content' : undefined}>{children}</div>
      </div>
    </div>
  )
}

// ROW = «las columnas de una fila»: hora, raya y alerta; en el móvil solo raya y alerta
const ROW = 'grid grid-cols-[24px_minmax(0,1fr)] sm:grid-cols-[88px_32px_minmax(0,1fr)]'

// familyStyle = «el color de la familia, para lo que pinta con var(--family)»
const familyStyle = (look: FamilyLook) => ({ '--family': `var(--family-${look.id})` }) as CSSProperties

// Rail = «el tramo de raya de una fila y, si es una alerta, el icono de su familia en un círculo que corta la raya»
function Rail({ look }: { look?: FamilyLook }) {
  return (
    <div aria-hidden='true' className='relative self-stretch'>
      <span className='absolute inset-y-0 left-[11px] w-0.5 bg-portal-line sm:left-[15px]' />
      {look && (
        <span
          style={familyStyle(look)}
          className='absolute -left-[3px] top-[13px] grid h-[30px] w-[30px] place-items-center rounded-full bg-[color-mix(in_srgb,var(--family)_14%,var(--color-portal-page))] text-[var(--family)] shadow-[0_0_0_4px_var(--color-portal-page)] ring-[1.5px] ring-inset ring-[var(--family)] sm:left-[1px] sm:top-[15px]'
        >
          <PathIcon d={look.icon} size={16} />
        </span>
      )}
    </div>
  )
}

export default function WallTimeline({ items, now, placeOf, englishNames, freshIds }: WallTimelineProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const days = groupByDay(items, now, locale, { today: t('wall.today'), yesterday: t('wall.yesterday') })
  const isFresh = (novelty: Novelty) => Boolean(freshIds?.has(novelty._id))

  return (
    <ol aria-label={t('wall.alertsLabel')} className='m-0 list-none p-0'>
      {days.map(day => (
        <li key={day.key}>
          {/* Un día que aparece con la alerta nueva (el primero de «Hoy») entra con ella */}
          <Entering active={day.items.every(isFresh)}>
            <div className={`${ROW} items-center`}>
              <span className='hidden sm:block' />
              <Rail />
              <h3 className='m-0 flex items-baseline justify-between gap-4 pb-4 pl-1 pt-2 text-[15px] font-semibold sm:pl-0'>
                {day.label}
                <span className='shrink-0 text-[13px] font-medium text-portal-muted'>{t('wall.alertCount', { count: day.items.length })}</span>
              </h3>
            </div>
          </Entering>
          <ol className='m-0 list-none p-0'>
            {day.items.map(novelty => (
              <li key={novelty._id}>
                <Entering active={isFresh(novelty)}>
                  <TimelineAlert novelty={novelty} locale={locale} place={placeOf(novelty)} englishNames={englishNames} />
                </Entering>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  )
}

type TimelineAlertProps = {
  novelty: Novelty
  locale: 'es' | 'en'
  place: string
  englishNames?: ReadonlyMap<string, string> | null
}

function TimelineAlert({ novelty, locale, place, englishNames }: TimelineAlertProps) {
  const { t } = useTranslation()
  const family = alertFamily(novelty.alert?.category)
  // familyLabel = «el nombre de la familia»; las que no tienen familia solo llevan la campana, sin rótulo
  const familyLabel = family.id === 'otra' ? null : t(`family.${family.id}`)
  const duration = novelty.period ? formatDuration(novelty.period.start, novelty.period.end) : null
  const title = titleOf(novelty, locale, t('alert.fallbackTitle'), englishNames)
  const shift = novelty.shift === 'day' ? t('alert.dayShift') : novelty.shift === 'night' ? t('alert.nightShift') : null
  const details = [
    novelty.table ? t('alert.table', { table: novelty.table }) : null,
    novelty.nameDish,
    duration ? t('alert.lasted', { duration }) : null,
  ].filter((detail): detail is string => Boolean(detail))
  const clock = clockOf(novelty.date, locale)
  const fullDate = fullDateOf(novelty.date, locale)
  const photo = imageUrl(novelty.imageToShare || novelty.images[0]?.url)
  const video = videoUrl(novelty.videoUrl)
  // MEDIA = «el hueco de la foto o el vídeo»: arriba en el móvil, a la izquierda en escritorio
  const MEDIA = 'aspect-video w-full bg-portal-soft sm:aspect-[16/10] sm:w-[264px] sm:shrink-0'

  return (
    <div className={`${ROW} items-start`}>
      <p className='m-0 hidden flex-col gap-0.5 pt-4 sm:flex'>
        <time dateTime={novelty.date ?? undefined} title={fullDate} className='text-base font-semibold tabular-nums text-portal-ink'>
          {clock}
        </time>
        {shift && <span className='text-xs text-portal-muted'>{shift}</span>}
      </p>
      <Rail look={family} />
      <article className='mb-4 ml-1 flex flex-col overflow-hidden rounded-2xl bg-portal-surface ring-1 ring-inset ring-portal-line sm:ml-0 sm:flex-row'>
        {/* Con vídeo, el vídeo en bucle en el sitio de la foto; si no, la foto */}
        {video ? (
          <LoopVideo src={video} poster={photo} label={`${title}, ${place}`} className={MEDIA} />
        ) : photo ? (
          <img src={photo} alt={`${title}, ${place}`} loading='lazy' decoding='async' className={`object-cover ${MEDIA}`} />
        ) : (
          <div aria-hidden='true' className={`grid place-items-center text-portal-muted ${MEDIA}`}>
            <CameraIcon size={26} />
          </div>
        )}
        <div className='flex min-w-0 flex-1 flex-col gap-2 p-4 sm:px-5 sm:py-[18px]'>
          <div className='flex items-center gap-4'>
            <p className='m-0 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
              <time dateTime={novelty.date ?? undefined} title={fullDate} className='text-[15px] font-semibold tabular-nums sm:hidden'>
                {clock}
              </time>
              <span className='text-base font-bold tracking-[-0.01em] text-portal-ink'>{place}</span>
              {familyLabel && (
                <span style={familyStyle(family)} className='inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>
                  <PathIcon d={family.icon} size={14} strokeWidth={2.2} className='shrink-0 text-[var(--family)]' />
                  {familyLabel}
                </span>
              )}
            </p>
          </div>
          <p className='m-0 text-[17px] font-semibold leading-snug text-portal-ink'>{title}</p>
          {(details.length > 0 || shift) && (
            <ul aria-label={t('alert.details')} className='m-0 mt-1 flex list-none flex-wrap gap-1.5 p-0'>
              {details.map(detail => (
                <li key={detail} className='rounded-full bg-portal-ctl px-2.5 py-1 text-xs font-medium text-portal-ink ring-1 ring-portal-line'>
                  {detail}
                </li>
              ))}
              {/* En el móvil no hay columna de la hora: el turno va aquí */}
              {shift && <li className='rounded-full bg-portal-ctl px-2.5 py-1 text-xs font-medium text-portal-ink ring-1 ring-portal-line sm:hidden'>{shift}</li>}
            </ul>
          )}
        </div>
      </article>
    </div>
  )
}
