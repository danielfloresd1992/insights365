import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Novelty } from '@/ajax/novelty.ajax'
import { speak, stopSpeaking } from '@/libs/speech'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { loadEstablishments } from '@/store/slices/establishments.slice'
import { signedOut } from '@/store/slices/session.slice'
import { POLL_MS, useWallFeed } from './hook/useWallFeed'
import { useNow } from './hook/useNow'
import { titleOf } from './hook/timeline'
import { useEnglishNames } from './hook/useEnglishNames'
import WallFilters from './assets/WallFilters'
import { WallEmpty, WallError, WallLoading, WallNoEstablishments } from './assets/WallStates'
import WallTimeline from './assets/WallTimeline'

/*  EL MURO DE ALERTAS: un componente con todo lo suyo (hoy, lo que enseña el Panel en vivo, /en-vivo)
 *
 *  Las alertas de los establecimientos de quien entra que ya llegaron a su grupo (validadas y enviadas), como una
 *  línea de tiempo vertical: de la más nueva a la más vieja, por días, con la hora, la foto de la cámara, la mesa, el
 *  plato, cuánto duró y el turno, y las nuevas llegando solas arriba cada 30 segundos.
 *  Arriba, en una sola línea, el título con la píldora «En vivo» y de quién son los establecimientos; debajo, los
 *  establecimientos en una fila que se desliza. Todo compacto, para que la línea de tiempo empiece cuanto antes.
 *  Los establecimientos son los del estado global (store/slices/establishments.slice), que se cargan al abrir sesión;
 *  aquí solo se elige cuáles se ven. Este archivo junta eso con las alertas y lo reparte.
 *
 *  La voz (preferencias del header): las alertas que llegan se dicen solas, en el idioma del portal y con la voz
 *  elegida para él, hasta READ_AT_ONCE seguidas y luego cuántas más llegaron. Está encendida de partida; el
 *  interruptor del header la silencia.
 *
 *  Todo lo del muro vive en esta carpeta: assets/ pinta (la línea de tiempo, los botones de establecimientos, los
 *  estados vacíos y de error) y hook/ trae los datos (las alertas, por páginas y cada 30 segundos, la hora para «Hoy»
 *  y «Ayer», y cómo se agrupan por día).
 *  Basta con montar <AlertWall /> donde se quiera el muro.
 *
 *  @param className  el espacio que le deja quien lo monta
 */

// READ_AT_ONCE = «cuántas alertas nuevas se leen enteras de una vez»; del resto solo se dice cuántas son
const READ_AT_ONCE = 3

// ENTER_MS = «lo que dura la entrada de una alerta nueva» (wall-enter en index.css), con un poco de margen
const ENTER_MS = 2000

export default function AlertWall({ className = '' }: { className?: string }) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const dispatch = useAppDispatch()
  const establishments = useAppSelector(state => state.establishments)
  const voice = useAppSelector(state => state.preferences.voice)
  const [selected, setSelected] = useState<string[]>([])
  const onUnauthorized = useCallback(() => dispatch(signedOut()), [dispatch])

  // available = «ya llegaron los establecimientos de quien entra»; si se están volviendo a pedir, se siguen usando
  const available = establishments.userId !== null
  const all = establishments.items
  // Lo marcado que ya no sea de quien entra no cuenta; sin nada marcado, todos
  const chosen = selected.filter(id => all.some(establishment => establishment._id === id))
  const scopeIds = available ? (chosen.length > 0 ? chosen : all.map(establishment => establishment._id)) : null

  const nameById = useMemo(() => new Map(all.map(establishment => [establishment._id, establishment.name])), [all])
  const franchises = useMemo(() => [...new Set(all.map(establishment => establishment.franchiseName).filter((name): name is string => Boolean(name)))], [all])
  const placeOf = useCallback(
    (novelty: Novelty) => (novelty.establishment ? nameById.get(novelty.establishment) : null) ?? novelty.place ?? t('alert.noPlace'),
    [nameById, t],
  )

  // Las nuevas, en voz alta, si está encendido: a la cola, sin cortar lo que esté sonando
  const voiceRef = useRef(voice)
  // englishRef = «los nombres en inglés del catálogo, si hubo que pedirlos» (más abajo): la voz los usa al llegar
  const englishRef = useRef<ReadonlyMap<string, string> | null>(null)
  useEffect(() => {
    voiceRef.current = voice
  }, [voice])
  const announce = useCallback(
    (fresh: Novelty[]) => {
      const current = voiceRef.current
      if (!current.on) return
      const options = { language, voiceURI: current.voiceURI, rate: current.rate, interrupt: false } as const
      for (const novelty of fresh.slice(0, READ_AT_ONCE)) {
        speak(t('voice.newAlert', { place: placeOf(novelty), title: titleOf(novelty, language, t('alert.fallbackTitle'), englishRef.current) }), options)
      }
      if (fresh.length > READ_AT_ONCE) speak(t('voice.andMore', { count: fresh.length - READ_AT_ONCE }), options)
    },
    [language, placeOf, t],
  )

  // freshIds = «las que acaban de llegar»: entran desde la izquierda y empujan a las demás; pasada la entrada, nada
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(() => new Set())
  const freshTimer = useRef<number | undefined>(undefined)
  const onNew = useCallback(
    (fresh: Novelty[]) => {
      setFreshIds(new Set(fresh.map(novelty => novelty._id)))
      window.clearTimeout(freshTimer.current)
      freshTimer.current = window.setTimeout(() => setFreshIds(new Set()), ENTER_MS)
      announce(fresh)
    },
    [announce],
  )

  const feed = useWallFeed(scopeIds, onUnauthorized, onNew)
  const now = useNow(POLL_MS)

  // En inglés, si la API no trae el nombre inglés de las alertas (una API anterior), se pide el catálogo una vez
  const needsEnglish = language === 'en' && feed.items.some(novelty => novelty.alert && novelty.alert.nameEn === undefined)
  const englishNames = useEnglishNames(needsEnglish)
  useEffect(() => {
    englishRef.current = englishNames
  }, [englishNames])

  // Al salir del muro, se calla y no queda nada pendiente
  useEffect(
    () => () => {
      stopSpeaking()
      window.clearTimeout(freshTimer.current)
    },
    [],
  )

  const toggle = (id: string) => setSelected(current => (current.includes(id) ? current.filter(entry => entry !== id) : [...current, id]))

  return (
    <section aria-labelledby='alert-wall-title' className={`@container/wall ${className}`}>
      <div className='flex flex-wrap items-center justify-between gap-x-6 gap-y-2'>
        <div className='flex flex-wrap items-center gap-x-3.5 gap-y-2'>
          <h2 id='alert-wall-title' className='m-0 text-[1.625rem] font-semibold leading-tight tracking-[-0.02em]'>
            {t('wall.title')}
          </h2>
          <span className='inline-flex h-7 items-center gap-2 rounded-full bg-[#29c50c]/12 px-3 text-[13px] font-semibold text-[#177406] dark:bg-[#29c50c]/16 dark:text-[#8be070]'>
            <span aria-hidden='true' className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' />
            {voice.on ? t('wall.liveWithVoice') : t('wall.live')}
          </span>
        </div>
        {available && all.length > 0 && (
          <p className='m-0 text-sm text-portal-muted'>
            {franchises.length > 0 && <span className='font-semibold text-portal-ink'>{franchises.join(', ')} · </span>}
            {t('wall.establishments', { count: all.length })}
          </p>
        )}
      </div>

      {!available ? (
        <div className='mt-6'>
          {establishments.status === 'failed' ? (
            <WallError title={t('wall.establishmentsFailed')} onRetry={() => void dispatch(loadEstablishments({ force: true }))} />
          ) : (
            <WallLoading label={t('wall.loadingEstablishments')} />
          )}
        </div>
      ) : all.length === 0 ? (
        <div className='mt-6'>
          <WallNoEstablishments />
        </div>
      ) : (
        <>
          <div className='mt-3'>
            <WallFilters establishments={all} selected={chosen} onToggle={toggle} onClear={() => setSelected([])} />
          </div>

          <div className='mt-6'>
            {feed.failed ? (
              <WallError onRetry={feed.retry} />
            ) : feed.loading ? (
              <WallLoading />
            ) : feed.items.length === 0 ? (
              <WallEmpty several={(scopeIds?.length ?? 0) > 1} />
            ) : (
              <>
                <WallTimeline items={feed.items} now={now} placeOf={placeOf} englishNames={englishNames} freshIds={freshIds} />
                {feed.moreFailed && (
                  <p role='alert' className='mt-6 text-center text-sm font-semibold text-portal-danger'>
                    {t('wall.moreFailed')}
                  </p>
                )}
                {feed.hasMore && (
                  <div className='mt-6 @md/wall:pl-[104px]'>
                    <button
                      type='button'
                      onClick={feed.loadMore}
                      disabled={feed.loadingMore}
                      className='landing-button inline-flex h-11 items-center rounded-md bg-portal-surface px-5 text-sm font-semibold text-portal-ink ring-1 ring-inset ring-portal-ring hover:bg-portal-ctl disabled:opacity-60'
                    >
                      {feed.loadingMore ? t('wall.loadingMore') : t('wall.loadMore')}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
