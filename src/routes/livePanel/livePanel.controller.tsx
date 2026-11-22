import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import AlertWall from '@/components/AlertWall/AlertWall'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import { useMediaQuery } from '@/routes/landing/hook/useStillScene'

/*  EL PANEL EN VIVO (/en-vivo, con sesión)
 *
 *  Lo que está pasando en los establecimientos de quien entra, según llega. En pantallas anchas (lg, 1024 px), dos
 *  mitades: a la izquierda el muro de alertas (components/AlertWall, que se acomoda a su propio ancho) y a la derecha,
 *  fijo mientras se recorre el muro, tres adelantos «Próximamente» apilados (assets/SoonColumn): el visor de mesas, las
 *  tendencias de la semana y los informes del turno. En pantallas más estrechas, el muro solo: los adelantos ni se
 *  cargan, porque traen three.js.
 *  Sin cabecera propia, para no robarle altura al muro: el nombre del panel ya está en la barra de arriba y el título
 *  «Panel en vivo» queda para lectores de pantalla.
 */

// SoonColumn = «los tres adelantos de lo que viene, cargados aparte»: three.js solo se descarga si se van a enseñar
const SoonColumn = lazy(() => import('./assets/SoonColumn'))

// WIDE_QUERY = «una pantalla con sitio para las dos mitades» (lg de Tailwind)
const WIDE_QUERY = '(min-width: 1024px)'

export default function LivePanelController() {
  const { t } = useTranslation()
  const wide = useMediaQuery(WIDE_QUERY)
  useDocumentTitle(t('live.documentTitle'))

  return (
    <div className='mx-auto w-full max-w-[1288px] px-6 pb-24 pt-6'>
      <h1 className='sr-only'>{t('live.title')}</h1>
      <div className='grid gap-6 lg:grid-cols-2 lg:items-start'>
        <AlertWall />
        {wide && (
          <Suspense fallback={<div className='sticky top-24 h-[calc(100dvh-120px)] rounded-2xl bg-portal-ctl ring-1 ring-inset ring-portal-line' />}>
            <SoonColumn className='sticky top-24 h-[calc(100dvh-120px)] min-h-[600px]' />
          </Suspense>
        )}
      </div>
    </div>
  )
}
