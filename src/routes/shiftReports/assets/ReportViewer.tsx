import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import type { ShiftDocument } from '@/ajax/shiftReports.ajax'
import ImageViewer from '@/components/AlertWall/assets/ImageViewer'
import type { ViewerItem } from '@/components/AlertWall/hook/viewerItems'
import { Notice } from '@/routes/weeklyReport/assets/parts'
import { rec } from '../reportPages'
import { dayLabel } from '../shiftData'
import SheetDialog from '../sheets/SheetDialog'
import SheetView, { SheetFrameLabel } from '../sheets/SheetView'
import { SECTION_ORDER, buildSheets, photosOfSheet, sheetStyleOf, type Sheet, type SheetSection } from '../sheets/sheetModel'
import { useElementWidth } from '../sheets/useElementWidth'

/*  EL INFORME DE UN TURNO, HOJA POR HOJA (propuesta E del lienzo, elegida por el usuario)
 *
 *  Las hojas del PDF de reportes365 (sheets/sheetModel arma la lista; sheets/SheetView las pinta), una debajo de otra,
 *  como al leer el PDF en el navegador. Cada sección empieza con su título y cuántas hojas trae; cada hoja lleva
 *  encima su número y sus botones: ver sus fotos en el visor del muro y ampliarla a pantalla completa.
 *  - Escritorio: el índice queda fijo a la izquierda, con la sección por la que se va y «hoja n de N».
 *  - Teléfono (columna de menos de 560 px): el índice pasa a fichas arriba y cada hoja se pinta a lo alto, con la
 *    misma identidad del PDF, para leerla sin hacer zoom.
 *  Las novedades son una hoja cada una: se enseñan las 3 primeras y el resto con «Ver las N restantes».
 *
 *  @param document       el informe con sus páginas
 *  @param establishment  su local, con su configuración (colores, umbrales) y sus platos
 */
type ReportViewerProps = { document: ShiftDocument; establishment: FullEstablishment }

// FIRST_NOVELTIES = «cuántas hojas de novedad se enseñan antes de "Ver las restantes"»
const FIRST_NOVELTIES = 3

export default function ReportViewer({ document, establishment }: ReportViewerProps) {
  const { t, i18n } = useTranslation()
  const config = useMemo(() => rec(establishment.config_report), [establishment.config_report])
  const sheets = useMemo(() => buildSheets(document, establishment), [document, establishment])
  const style = useMemo(() => sheetStyleOf(config), [config])
  const [columnRef, width] = useElementWidth()
  const mode = width >= 560 ? 'landscape' : 'portrait'
  const zoom = Math.min(1, width / 1000)

  const [allNovelties, setAllNovelties] = useState(false)
  const [current, setCurrent] = useState(0)
  const [viewer, setViewer] = useState<{ items: ViewerItem[]; heading: string } | null>(null)
  const [enlarged, setEnlarged] = useState<Sheet | null>(null)

  const total = sheets.length
  const noveltyIndexes = sheets.flatMap((sheet, index) => (sheet.section === 'novelties' ? [index] : []))
  const hidden = allNovelties ? new Set<number>() : new Set(noveltyIndexes.slice(FIRST_NOVELTIES))
  const sections = SECTION_ORDER.map(section => ({ section, count: sheets.filter(sheet => sheet.section === section).length })).filter(item => item.count > 0)
  const shiftLabel = t(`shiftReports.shift.${document.shift}`, { defaultValue: document.shift })
  const heading = `${dayLabel(document.date, i18n.language)} · ${shiftLabel}`

  // La hoja que se está leyendo: la que cruza la franja de arriba de la ventana
  useEffect(() => {
    const nodes = Array.from(window.document.querySelectorAll<HTMLElement>('[data-sheet-index]'))
    if (nodes.length === 0) return
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).map(entry => Number((entry.target as HTMLElement).dataset.sheetIndex))
      if (visible.length) setCurrent(Math.min(...visible))
    }, { rootMargin: '-30% 0px -60% 0px' })
    nodes.forEach(node => observer.observe(node))
    return () => observer.disconnect()
  }, [sheets, allNovelties, mode])

  const openPhotos = useCallback((sheet: Sheet) => {
    const items = photosOfSheet(sheet).map(photo => ({ kind: 'image' as const, src: photo.src, caption: photo.caption, poster: null }))
    if (items.length) setViewer({ items, heading: sheet.title || sheet.label })
  }, [setViewer])

  if (total === 0) return <Notice>{t('shiftReports.report.empty')}</Notice>
  const currentSection = sheets[current]?.section
  const sectionLabel = (section: SheetSection) => t(`shiftReports.sections.${section}`)
  const numberOf = (section: SheetSection) => String(sections.findIndex(item => item.section === section)).padStart(2, '0')

  return (
    <div className='flex flex-col gap-3'>
      {/* Teléfono: las secciones como fichas, fijas bajo la barra del portal */}
      <nav aria-label={t('shiftReports.report.indexLabel')} className='sticky top-16 z-10 -mx-4 flex gap-1.5 overflow-x-auto bg-portal-page/95 px-4 py-2 backdrop-blur lg:hidden'>
        {sections.map(item => (
          <a key={item.section} href={`#hoja-${item.section}`} className={`inline-flex h-9 flex-none items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold ${item.section === currentSection ? 'bg-portal-ink text-portal-page' : 'bg-portal-ctl text-portal-ink ring-1 ring-inset ring-portal-line'}`}>
            {sectionLabel(item.section)}{item.count > 1 ? ` · ${item.count}` : ''}
          </a>
        ))}
      </nav>

      <div className='grid items-start gap-7 lg:grid-cols-[230px_minmax(0,1fr)]'>
        <nav aria-label={t('shiftReports.report.indexLabel')} className='sticky top-24 hidden flex-col gap-1 lg:flex'>
          <div className='mb-2 flex flex-col gap-0.5 rounded-2xl bg-portal-surface p-3.5 ring-1 ring-inset ring-portal-line'>
            <span className='text-[11px] font-semibold uppercase tracking-[0.1em] text-portal-muted'>{t('shiftReports.sheet.kicker')}</span>
            <strong className='text-[15px] capitalize text-portal-ink'>{heading}</strong>
            <span className='text-[12.5px] text-portal-muted'>{t('shiftReports.sheet.progress', { current: current + 1, total })}</span>
            <span aria-hidden='true' className='mt-2 block h-1.5 overflow-hidden rounded-full bg-portal-line'>
              <span className='block h-full rounded-full bg-[#29c50c] transition-[width] duration-300' style={{ width: `${((current + 1) / total) * 100}%` }} />
            </span>
          </div>
          {sections.map(item => {
            const active = item.section === currentSection
            return (
              <a key={item.section} href={`#hoja-${item.section}`} aria-current={active ? 'location' : undefined} className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-sm font-semibold ${active ? 'bg-portal-surface text-portal-ink shadow-[inset_3px_0_0_#29c50c]' : 'text-portal-muted hover:bg-portal-ctl hover:text-portal-ink'}`}>
                <span className='flex-1'>{sectionLabel(item.section)}</span>
                <span className={`min-w-6 rounded-full px-1.5 text-center text-xs ${active ? 'bg-[#29c50c]/15 text-[#177406] dark:text-[#8be070]' : 'bg-portal-ctl text-portal-muted'}`}>{item.count}</span>
              </a>
            )
          })}
        </nav>

        <div ref={columnRef} className='flex min-w-0 flex-col items-center gap-5'>
          {sheets.map((sheet, index) => {
            if (hidden.has(index)) return null
            const firstOfSection = sheets.findIndex(item => item.section === sheet.section) === index
            const photos = photosOfSheet(sheet)
            const count = sheets.filter(item => item.section === sheet.section).length
            return (
              <section
                key={sheet.key}
                id={firstOfSection ? `hoja-${sheet.section}` : undefined}
                data-sheet-index={index}
                aria-label={t('shiftReports.sheet.of', { n: index + 1, total })}
                className='flex w-full scroll-mt-36 flex-col gap-2 lg:scroll-mt-24'
                style={mode === 'landscape' ? { maxWidth: 1000 * zoom } : undefined}
              >
                {firstOfSection && sheet.section !== 'cover' && (
                  <h2 className='m-0 mt-3 flex flex-wrap items-baseline gap-x-2.5 text-lg font-semibold text-portal-ink'>
                    <span className='font-plex-mono text-[13px] text-[#177406] dark:text-[#8be070]'>{numberOf(sheet.section)}</span>
                    {sectionLabel(sheet.section)}
                    <span className='text-[13px] font-normal text-portal-muted'>{t('shiftReports.sheet.sheetsCount', { count })}</span>
                  </h2>
                )}
                <SheetFrameLabel>
                  <span>{t('shiftReports.sheet.of', { n: index + 1, total })} · {sheet.label}</span>
                  <span className='flex gap-1.5'>
                    {photos.length > 0 && (
                      <button type='button' onClick={() => openPhotos(sheet)} className='h-9 rounded-lg px-3 text-[12.5px] font-semibold text-portal-ink ring-1 ring-inset ring-portal-ring hover:bg-portal-ctl'>
                        {t('shiftReports.sheet.photos', { count: photos.length })}
                      </button>
                    )}
                    <button type='button' onClick={() => setEnlarged(sheet)} className='h-9 rounded-lg px-3 text-[12.5px] font-semibold text-portal-ink ring-1 ring-inset ring-portal-ring hover:bg-portal-ctl'>
                      {t('shiftReports.sheet.enlarge')}
                    </button>
                  </span>
                </SheetFrameLabel>
                <div className='overflow-hidden shadow-[0_24px_50px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/10'>
                  {width > 0 && <SheetView sheet={sheet} style={style} mode={mode} zoom={zoom} width={width} />}
                </div>
              </section>
            )
          })}
          {hidden.size > 0 && (
            <button type='button' onClick={() => setAllNovelties(true)} className='flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-portal-ring bg-portal-surface text-sm font-semibold text-portal-ink hover:bg-portal-ctl' style={mode === 'landscape' ? { maxWidth: 1000 * zoom } : undefined}>
              {t('shiftReports.sheet.showRest', { count: hidden.size })}
            </button>
          )}
          {document.pages.some(page => page.type === 'perimeter') && <Notice>{t('shiftReports.report.perimeter')}</Notice>}
        </div>
      </div>

      {viewer && <ImageViewer items={viewer.items} heading={viewer.heading} subheading={`${document.establishmentName ?? establishment.name} · ${heading}`} onClose={() => setViewer(null)} />}
      {enlarged && <SheetDialog sheet={enlarged} style={style} heading={`${enlarged.title || enlarged.label} · ${heading}`} onClose={() => setEnlarged(null)} />}
    </div>
  )
}
