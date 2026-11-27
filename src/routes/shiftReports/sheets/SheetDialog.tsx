import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import SheetView from './SheetView'
import type { Sheet, SheetStyle } from './sheetModel'

/*  UNA HOJA EN GRANDE («Ampliar»)
 *
 *  La hoja del PDF a todo lo que dé la ventana, sobre fondo oscuro. Es un <dialog> modal: Escape o el botón lo
 *  cierran y la página de detrás no se mueve. En un teléfono en vertical se ve pequeña: se sugiere girarlo.
 */
type SheetDialogProps = { sheet: Sheet; style: SheetStyle; heading: string; onClose: () => void }

// fitZoom = «cuánto encoger la hoja de 1000×700 para que quepa en la ventana»
const fitZoom = () => Math.min((window.innerWidth - 32) / 1000, (window.innerHeight - 120) / 700, 1.4)

export default function SheetDialog({ sheet, style, heading, onClose }: SheetDialogProps) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [zoom, setZoom] = useState(fitZoom)

  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const resize = () => setZoom(fitZoom())
    window.addEventListener('resize', resize)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('resize', resize)
    }
  }, [])

  const portraitPhone = window.innerWidth < 640 && window.innerHeight > window.innerWidth

  return (
    <dialog
      ref={dialog}
      aria-label={heading}
      onCancel={event => { event.preventDefault(); onClose() }}
      className='m-0 h-dvh max-h-none w-dvw max-w-none bg-[#0d0c0a]/95 p-0 text-[#f5f0e3] backdrop:bg-black/60'
    >
      <div className='flex h-full flex-col'>
        <header className='flex items-center justify-between gap-3 px-4 py-3'>
          <p className='m-0 min-w-0 truncate text-sm font-semibold'>{heading}</p>
          <button type='button' onClick={onClose} className='inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white hover:bg-white/20'>
            {t('shiftReports.sheet.close')}
          </button>
        </header>
        <div className='grid min-h-0 flex-1 place-items-center overflow-auto p-4'>
          <div className='shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]'>
            <SheetView sheet={sheet} style={style} mode='landscape' zoom={zoom} width={1000 * zoom} />
          </div>
        </div>
        {portraitPhone && <p className='m-0 px-4 pb-5 text-center text-[13px] text-white/75'>{t('shiftReports.sheet.rotateHint')}</p>}
      </div>
    </dialog>
  )
}
