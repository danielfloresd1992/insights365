import { useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Novelty } from '@/ajax/novelty.ajax'
import { CameraIcon, ImagesIcon, PathIcon } from '@/components/PortalIcons'
import { alertFamily, type FamilyLook } from '@/libs/alertFamily'
import { formatDuration } from '@/libs/formatDuration'
import { imageUrl } from '@/libs/imageUrl'
import { videoUrl } from '@/libs/videoUrl'
import LoopVideo from './LoopVideo'
import { noteOf } from '../hook/note'
import { clockOf, fullDateOf, groupByDay, titleOf } from '../hook/timeline'
import { viewerItems } from '../hook/viewerItems'
import ImageViewer from './ImageViewer'

/*  EL MURO COMO LÍNEA DE TIEMPO. Solo pinta.
 *
 *  Una alerta por fila, de la más nueva a la más vieja, agrupadas por día. A la izquierda la hora y el turno; en
 *  medio una raya con el icono de la familia de la alerta en su color (libs/alertFamily, --family-* en index.css); a
 *  la derecha la alerta, con la foto a un lado y el local, la familia, qué pasó y los detalles al otro. (Las nuevas se
 *  leen solas en voz alta: AlertWall.)
 *  En el móvil (por debajo de sm) la hora pasa a la cabecera de la alerta y la foto va arriba.
 *  Las fotos de las alertas de ayer llevan arriba a la izquierda la marca «Ayer» (pedido del usuario): la hora sola,
 *  22:39, se lee como de esta noche, y el rótulo del día se queda atrás al bajar por la lista.
 *  Si el monitoreo dejó una nota (la línea «Nota:» del texto que se mandó al grupo: hook/note), va en una banda a todo
 *  lo ancho al pie de la alerta (propuesta B del lienzo, elegida por el usuario).
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
const ROW = 'grid grid-cols-[24px_minmax(0,1fr)] @md/wall:grid-cols-[72px_32px_minmax(0,1fr)]'

// HISTORY_ICON = «un reloj con la flecha hacia atrás», el dibujo de la marca «Ayer»
const HISTORY_ICON = 'M3 12a9 9 0 1 0 2.64-6.36L3 8.3M3 3.5v4.8h4.8M12 7.5V12l3 2'

// YesterdayMark = «la marca "Ayer" sobre la foto»: ocre macizo con letra oscura, que se lee sobre cualquier foto y en
// los dos temas; no usa el color de ninguna familia para no confundirse con ellas
function YesterdayMark({ label }: { label: string }) {
  return (
    <span className='pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-[#e9b949] py-[3px] pl-1.5 pr-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2b2418] shadow-[0_1px_3px_rgb(0_0_0/0.35)]'>
      <PathIcon d={HISTORY_ICON} size={13} strokeWidth={2.4} />
      {label}
    </span>
  )
}

// NOTE_ICON = «un globo de texto con renglones», el dibujo de la nota del monitoreo
const NOTE_ICON = 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM7 8h10M7 12h6'

// NoteBand = «la nota del monitoreo, en la banda del pie de la alerta». La larga se corta en dos líneas con «Ver nota
// completa»; el botón solo sale si de verdad no cabe (se mide, y se vuelve a medir si cambia el ancho). La banda se
// separa 1 px de los bordes para no tapar el filo de la tarjeta, que es un ring por dentro.
function NoteBand({ note }: { note: string }) {
  const { t } = useTranslation()
  const id = useId()
  const text = useRef<HTMLParagraphElement>(null)
  const [open, setOpen] = useState(false)
  // cut = «la nota no cabe en las dos líneas»
  const [cut, setCut] = useState(false)

  useLayoutEffect(() => {
    const element = text.current
    if (!element || open) return
    const measure = () => setCut(element.scrollHeight > element.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [open, note])

  return (
    <div className='mx-px mb-px flex items-start gap-2.5 rounded-b-[15px] border-t border-portal-line bg-portal-ctl px-4 py-3'>
      <PathIcon d={NOTE_ICON} size={16} className='mt-0.5 shrink-0 text-portal-muted' />
      <div className='flex min-w-0 flex-col gap-1'>
        <p ref={text} id={id} className={`m-0 whitespace-pre-line text-sm leading-normal text-portal-ink ${open ? '' : 'line-clamp-2'}`}>
          <span className='mr-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>{t('alert.note')}</span>
          {note}
        </p>
        {(cut || open) && (
          <button
            type='button'
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen(value => !value)}
            className='-mb-3 -mt-2.5 self-start py-3 text-[13px] font-semibold text-portal-ink underline underline-offset-[3px] hover:text-portal-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#29c50c]'
          >
            {open ? t('alert.noteLess') : t('alert.noteMore')}
          </button>
        )}
      </div>
    </div>
  )
}

// familyStyle = «el color de la familia, para lo que pinta con var(--family)»
const familyStyle = (look: FamilyLook) => ({ '--family': `var(--family-${look.id})` }) as CSSProperties

// Rail = «el tramo de raya de una fila y, si es una alerta, el icono de su familia en un círculo que corta la raya»
function Rail({ look }: { look?: FamilyLook }) {
  return (
    <div aria-hidden='true' className='relative self-stretch'>
      <span className='absolute inset-y-0 left-[11px] w-0.5 bg-portal-line @md/wall:left-[15px]' />
      {look && (
        <span
          style={familyStyle(look)}
          className='absolute -left-[3px] top-[13px] grid h-[30px] w-[30px] place-items-center rounded-full bg-[color-mix(in_srgb,var(--family)_14%,var(--color-portal-page))] text-[var(--family)] shadow-[0_0_0_4px_var(--color-portal-page)] ring-[1.5px] ring-inset ring-[var(--family)] @md/wall:left-[1px] @md/wall:top-[15px]'
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
              <span className='hidden @md/wall:block' />
              <Rail />
              <h3 className='m-0 flex items-baseline justify-between gap-4 pb-4 pl-1 pt-2 text-[15px] font-semibold @md/wall:pl-0'>
                {day.label}
                <span className='shrink-0 text-[13px] font-medium text-portal-muted'>{t('wall.alertCount', { count: day.items.length })}</span>
              </h3>
            </div>
          </Entering>
          <ol className='m-0 list-none p-0'>
            {day.items.map(novelty => (
              <li key={novelty._id}>
                <Entering active={isFresh(novelty)}>
                  <TimelineAlert novelty={novelty} locale={locale} place={placeOf(novelty)} englishNames={englishNames} fromYesterday={day.when === 'yesterday'} />
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
  // fromYesterday = «la alerta es de ayer»: su foto lleva la marca y el visor lo dice junto a la hora
  fromYesterday?: boolean
}

function TimelineAlert({ novelty, locale, place, englishNames, fromYesterday = false }: TimelineAlertProps) {
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
  const yesterday = fromYesterday ? t('wall.yesterday') : null
  const note = noteOf(novelty)
  const fullDate = fullDateOf(novelty.date, locale)
  const photo = imageUrl(novelty.imageToShare || novelty.images[0]?.url)
  const video = videoUrl(novelty.videoUrl)
  // MEDIA = «el hueco de la foto o el vídeo»: arriba en el móvil, a la izquierda en escritorio
  const MEDIA = 'aspect-video w-full bg-portal-soft @md/wall:aspect-[16/10] @md/wall:w-[200px] @3xl/wall:w-[264px] @md/wall:shrink-0'
  // Al pulsar la foto o el vídeo se abre el visor con todo lo de la alerta
  const [viewerOpen, setViewerOpen] = useState(false)
  const gallery = viewerItems(novelty, { video: t('viewer.video'), shared: t('viewer.shared') })
  const media = video ? (
    <LoopVideo src={video} poster={photo} label={`${title}, ${place}`} className='h-full w-full' />
  ) : photo ? (
    <img src={photo} alt={`${title}, ${place}`} loading='lazy' decoding='async' className='h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]' />
  ) : null

  return (
    <div className={`${ROW} items-start`}>
      <p className='m-0 hidden flex-col gap-0.5 pt-4 @md/wall:flex'>
        <time dateTime={novelty.date ?? undefined} title={fullDate} className='text-base font-semibold tabular-nums text-portal-ink'>
          {clock}
        </time>
        {shift && <span className='text-xs text-portal-muted'>{shift}</span>}
      </p>
      <Rail look={family} />
      <article className='mb-4 ml-1 flex flex-col overflow-hidden rounded-2xl bg-portal-surface ring-1 ring-inset ring-portal-line @md/wall:ml-0'>
        <div className='flex flex-col @md/wall:flex-row'>
          {/* Con vídeo, el vídeo en bucle en el sitio de la foto; si no, la foto. Pulsarlo abre el visor */}
          {media && gallery.length > 0 ? (
            <button
              type='button'
              onClick={() => setViewerOpen(true)}
              aria-label={[t('viewer.open', { title }), yesterday].filter(Boolean).join(', ')}
              className={`group relative block cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[#29c50c] ${MEDIA}`}
            >
              {media}
              {yesterday && <YesterdayMark label={yesterday} />}
              {gallery.length > 1 && (
                <span className='pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-0.5 text-[11px] font-semibold text-white'>
                  <ImagesIcon size={13} />
                  {t('viewer.count', { count: gallery.length })}
                </span>
              )}
            </button>
          ) : (
            <div aria-hidden='true' className={`relative grid place-items-center text-portal-muted ${MEDIA}`}>
              <CameraIcon size={26} />
              {yesterday && <YesterdayMark label={yesterday} />}
            </div>
          )}
          {viewerOpen && (
            <ImageViewer
              items={gallery}
              heading={title}
              subheading={[place, [yesterday, clock].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}
              onClose={() => setViewerOpen(false)}
            />
          )}
          <div className='flex min-w-0 flex-1 flex-col gap-2 p-4 @md/wall:px-5 @md/wall:py-[18px]'>
            <div className='flex items-center gap-4'>
              <p className='m-0 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1'>
                <time dateTime={novelty.date ?? undefined} title={fullDate} className='text-[15px] font-semibold tabular-nums @md/wall:hidden'>
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
                {shift && <li className='rounded-full bg-portal-ctl px-2.5 py-1 text-xs font-medium text-portal-ink ring-1 ring-portal-line @md/wall:hidden'>{shift}</li>}
              </ul>
            )}
          </div>
        </div>
        {note && <NoteBand note={note} />}
      </article>
    </div>
  )
}
