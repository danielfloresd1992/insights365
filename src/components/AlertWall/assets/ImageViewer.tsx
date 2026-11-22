import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlayIcon } from '@/components/PortalIcons'
import type { ViewerItem } from '../hook/viewerItems'

/*  EL VISOR DE IMÁGENES DE UNA ALERTA. Solo pinta.
 *
 *  A pantalla completa sobre fondo oscuro (en los dos temas, como cualquier visor de fotos): arriba qué alerta es,
 *  dónde y cuándo, cuántas lleva y el botón de cerrar; en medio la imagen entera (o el vídeo, con sus controles), con
 *  su rótulo y las flechas a los lados; abajo las miniaturas para saltar a cualquiera.
 *  Se mueve con las flechas, con ← y → del teclado, deslizando el dedo en el móvil y pulsando una miniatura. Escape o
 *  el botón lo cierran. Es un <dialog> modal: el foco no se sale de él y la página de detrás no se desplaza.
 *
 *  @param items       lo que se ve, en orden (hook/viewerItems)
 *  @param heading     qué alerta es («Demora de primera atención»)
 *  @param subheading  dónde y cuándo («Francisca Orlando · 16:53»)
 *  @param onClose     cerrarlo
 */
type ImageViewerProps = {
  items: ViewerItem[]
  heading: string
  subheading: string
  onClose: () => void
}

// SWIPE_PX = «cuánto hay que deslizar el dedo para pasar de imagen»
const SWIPE_PX = 50

export default function ImageViewer({ items, heading, subheading, onClose }: ImageViewerProps) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const swipeFrom = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const item = items[index]
  const several = items.length > 1

  // Se abre como modal al montarse; mientras está abierto, la página de detrás no se desplaza
  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const go = (step: number) => setIndex(current => (current + step + items.length) % items.length)

  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      go(-1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      go(1)
    }
  }

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse') swipeFrom.current = event.clientX
  }
  const onPointerUp = (event: PointerEvent) => {
    if (swipeFrom.current === null) return
    const moved = event.clientX - swipeFrom.current
    swipeFrom.current = null
    if (several && Math.abs(moved) > SWIPE_PX) go(moved < 0 ? 1 : -1)
  }

  if (!item) return null

  return (
    <dialog
      ref={dialog}
      aria-label={t('viewer.label', { title: heading })}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className='m-0 h-dvh max-h-none w-screen max-w-none bg-[#14110c] p-0 text-[#f5f0e3] backdrop:bg-black/80'
    >
      <div className='flex h-full flex-col'>
        <header className='flex items-center gap-4 px-4 py-3 sm:px-6'>
          <div className='min-w-0 flex-1'>
            <p className='m-0 truncate text-[15px] font-semibold'>{heading}</p>
            <p className='m-0 truncate text-[13px] text-[#b3aa96]'>{subheading}</p>
          </div>
          {several && (
            <p className='m-0 shrink-0 text-[13px] tabular-nums text-[#b3aa96]' aria-live='polite'>
              {t('viewer.counter', { current: index + 1, total: items.length })}
            </p>
          )}
          <button
            type='button'
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label={t('viewer.close')}
            title={t('viewer.close')}
            className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#f5f0e3] ring-1 ring-inset ring-white/20 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'
          >
            <CloseIcon size={20} />
          </button>
        </header>

        <div className='relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-20' onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
          <figure className='m-0 flex h-full max-h-full w-full flex-col items-center justify-center gap-3'>
            {item.kind === 'video' ? (
              <video key={item.src} src={item.src} poster={item.poster ?? undefined} controls autoPlay muted loop playsInline className='h-[calc(100%-2.5rem)] w-full object-contain' />
            ) : (
              // Ocupa todo el hueco sin deformarse: las fotos de cámara son pequeñas y así se ven en grande
              <img key={item.src} src={item.src} alt={item.caption ? `${heading}: ${item.caption}` : heading} className='h-[calc(100%-2.5rem)] w-full select-none object-contain' draggable={false} />
            )}
            {item.caption && <figcaption className='text-sm font-semibold text-[#ddd3bd]'>{item.caption}</figcaption>}
          </figure>
          {several && (
            <>
              <button
                type='button'
                onClick={() => go(-1)}
                aria-label={t('viewer.previous')}
                title={t('viewer.previous')}
                className='absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-inset ring-white/20 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white sm:inline-flex sm:left-5'
              >
                <ChevronLeftIcon size={22} />
              </button>
              <button
                type='button'
                onClick={() => go(1)}
                aria-label={t('viewer.next')}
                title={t('viewer.next')}
                className='absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white ring-1 ring-inset ring-white/20 hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white sm:inline-flex sm:right-5'
              >
                <ChevronRightIcon size={22} />
              </button>
            </>
          )}
        </div>

        {several && (
          <nav aria-label={t('viewer.thumbnails')} className='flex justify-center overflow-x-auto px-4 pb-4 pt-3'>
            <ol className='m-0 flex list-none gap-2 p-0'>
              {items.map((entry, position) => (
                <li key={entry.src}>
                  <button
                    type='button'
                    onClick={() => setIndex(position)}
                    aria-label={entry.caption ?? t('viewer.counter', { current: position + 1, total: items.length })}
                    aria-current={position === index ? 'true' : undefined}
                    className={`relative block h-14 w-20 overflow-hidden rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      position === index ? 'ring-2 ring-[#29c50c]' : 'opacity-60 ring-1 ring-white/15 hover:opacity-100'
                    }`}
                  >
                    {entry.kind === 'video' ? (
                      <>
                        {entry.poster ? <img src={entry.poster} alt='' className='h-full w-full object-cover' /> : <span className='block h-full w-full bg-black' />}
                        <span className='absolute inset-0 grid place-items-center bg-black/40 text-white'>
                          <PlayIcon size={16} />
                        </span>
                      </>
                    ) : (
                      <img src={entry.src} alt='' loading='lazy' className='h-full w-full object-cover' />
                    )}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
    </dialog>
  )
}
