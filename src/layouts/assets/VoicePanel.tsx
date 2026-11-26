import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PlayIcon, StopIcon } from '@/components/PortalIcons'
import { speak, stopSpeaking, type BrowserVoice } from '@/libs/speech'
import { useBrowserVoices } from '@/libs/useBrowserVoices'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { RATE_RANGE, voiceChanged } from '@/store/slices/preferences.slice'
import { GROUP_LABEL } from './headerStyles'
import NotificationsToggle from './NotificationsToggle'

/*  LA VOZ DE LAS ALERTAS: el panel donde se configura (en el header y en el menú del móvil)
 *
 *  Arriba, los avisos del sistema para las alertas nuevas (NotificationsToggle). Después, la voz:
 *  un interruptor para leer en voz alta las alertas nuevas, la lista de voces del navegador para el idioma del
 *  portal (cada una con su botón para escucharla antes de elegirla) y la velocidad. Todo va a las preferencias del
 *  store, que lo recuerdan en este navegador. Si el navegador no puede hablar, lo dice y no enseña nada más.
 *
 *  @param idPrefix  para que los id del panel no choquen si hay dos en la página (barra y menú del móvil)
 *  @param compact   sin la explicación de arriba ni la velocidad (el menú del móvil)
 */
type VoicePanelProps = { idPrefix: string; compact?: boolean }

export default function VoicePanel({ idPrefix, compact = false }: VoicePanelProps) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage === 'en' ? 'en' : 'es'
  const voice = useAppSelector(state => state.preferences.voice)
  const dispatch = useAppDispatch()
  const { voices, loaded, supported } = useBrowserVoices(language)
  // playing = «la voz que se está escuchando de prueba»
  const [playing, setPlaying] = useState<string | null>(null)
  const playingRef = useRef<string | null>(null)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  // Al cerrar el panel, la prueba se calla
  useEffect(
    () => () => {
      if (playingRef.current) stopSpeaking()
    },
    [],
  )

  const selected = voices.some(entry => entry.uri === voice.voiceURI) ? voice.voiceURI : (voices[0]?.uri ?? null)
  const rateLabel = `${new Intl.NumberFormat(language, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(voice.rate)}×`

  const preview = (entry: BrowserVoice) => {
    if (playing === entry.uri) {
      stopSpeaking()
      setPlaying(null)
      return
    }
    setPlaying(entry.uri)
    speak(t('voice.sample'), {
      language,
      voiceURI: entry.uri,
      rate: voice.rate,
      onEnd: () => setPlaying(current => (current === entry.uri ? null : current)),
    })
  }

  if (!supported) {
    return (
      <div className='flex flex-col gap-4'>
        <NotificationsToggle compact={compact} />
        <p className='m-0 rounded-xl bg-portal-ctl p-3 text-sm text-portal-ink'>{t('voice.unsupported')}</p>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-4'>
      <NotificationsToggle compact={compact} />
      <button
        type='button'
        aria-pressed={voice.on}
        onClick={() => dispatch(voiceChanged({ on: !voice.on }))}
        className='flex min-h-14 w-full items-center justify-between gap-4 rounded-xl bg-portal-ctl py-2.5 pl-3.5 pr-3 text-left text-sm text-portal-ink ring-1 ring-inset ring-portal-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'
      >
        <span className='flex flex-col gap-0.5'>
          <span className='font-semibold'>{t('voice.autoRead')}</span>
          {!compact && <span className='text-xs leading-snug text-portal-muted'>{t('voice.autoReadHint')}</span>}
        </span>
        <span aria-hidden='true' className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${voice.on ? 'bg-[#29c50c]' : 'bg-portal-ring'}`}>
          <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-[left] ${voice.on ? 'left-[21px]' : 'left-[3px]'}`} />
        </span>
      </button>

      <fieldset className='m-0 min-w-0 border-0 p-0'>
        <legend className={GROUP_LABEL}>{t('voice.pick')}</legend>
        {voices.length === 0 ? (
          <p className='m-0 rounded-xl bg-portal-ctl p-3 text-sm text-portal-ink'>{loaded ? t('voice.noVoices') : t('voice.loading')}</p>
        ) : (
          <div className='flex max-h-[232px] flex-col gap-1 overflow-y-auto p-0.5'>
            {voices.map(entry => {
              const isSelected = entry.uri === selected
              const isPlaying = playing === entry.uri
              return (
                <div
                  key={entry.uri}
                  className={`flex items-center gap-1 rounded-xl ${isSelected ? 'bg-portal-ctl ring-[1.5px] ring-inset ring-[#29c50c]' : 'ring-1 ring-inset ring-portal-line'}`}
                >
                  {/* La etiqueta envuelve la opción: así no hace falta un id (el de la voz puede llevar espacios) */}
                  <label className='flex min-h-[52px] min-w-0 flex-1 cursor-pointer items-center gap-2.5 py-1.5 pl-3 pr-1'>
                    <input
                      type='radio'
                      name={`${idPrefix}-voz`}
                      value={entry.uri}
                      checked={isSelected}
                      onChange={() => dispatch(voiceChanged({ voiceURI: entry.uri }))}
                      className='m-0 h-[18px] w-[18px] shrink-0 accent-[#29c50c]'
                    />
                    <span className='flex min-w-0 flex-col'>
                      <span className='truncate text-sm font-semibold text-portal-ink'>{entry.name}</span>
                      <span className='text-xs text-portal-muted'>
                        {entry.lang} · {entry.local ? t('voice.onDevice') : t('voice.online')}
                      </span>
                    </span>
                  </label>
                  <button
                    type='button'
                    aria-label={isPlaying ? t('voice.stopPreview', { name: entry.name }) : t('voice.preview', { name: entry.name })}
                    title={isPlaying ? t('voice.stopPreview', { name: entry.name }) : t('voice.preview', { name: entry.name })}
                    onClick={() => preview(entry)}
                    className={`mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink ${
                      isPlaying ? 'bg-[#29c50c] text-[#2f2a1e]' : 'text-portal-ink hover:bg-portal-ctl'
                    }`}
                  >
                    {isPlaying ? <StopIcon /> : <PlayIcon />}
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <p className='m-0 mt-2 text-xs leading-snug text-portal-muted'>{t('voice.saved')}</p>
      </fieldset>

      {!compact && (
        <div>
          <div className='flex items-baseline justify-between'>
            <label htmlFor={`${idPrefix}-velocidad`} className='text-xs font-semibold uppercase tracking-[0.08em] text-portal-muted'>
              {t('voice.rate')}
            </label>
            <span className='text-[13px] tabular-nums text-portal-muted'>{rateLabel}</span>
          </div>
          <input
            id={`${idPrefix}-velocidad`}
            type='range'
            min={RATE_RANGE.min}
            max={RATE_RANGE.max}
            step={RATE_RANGE.step}
            value={voice.rate}
            onChange={event => dispatch(voiceChanged({ rate: Number(event.target.value) }))}
            className='mt-2.5 w-full accent-[#29c50c]'
          />
        </div>
      )}
    </div>
  )
}
