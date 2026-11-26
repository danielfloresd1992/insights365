import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AlertWall from '@/components/AlertWall/AlertWall'
import { PathIcon } from '@/components/PortalIcons'
import { LAYERS_ICON } from '@/components/TablesViewer/assets/icons'
import TablesViewer from '@/components/TablesViewer/TablesViewer'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import { useMediaQuery } from '@/routes/landing/hook/useStillScene'

/*  EL PANEL EN VIVO (/en-vivo, con sesión)
 *
 *  Lo que está pasando en los establecimientos de quien entra, según llega. En pantallas anchas (lg, 1024 px), dos
 *  mitades: a la izquierda el muro de alertas (components/AlertWall, que se acomoda a su propio ancho) y a la derecha,
 *  fijo mientras se recorre el muro, el visor de mesas (components/TablesViewer): el croquis del local con lo que pasa
 *  hoy en sus mesas. Ocupa el sitio que tenían los tres adelantos «Próximamente» (pedido del usuario).
 *  En pantallas más estrechas (el móvil), uno u otro, con dos pestañas fijas abajo, como una app (propuesta B del
 *  lienzo «Visor de mesas a pantalla completa en el móvil», elegida por el usuario). El visor ocupa justo el alto que
 *  queda entre la barra del portal y las pestañas, sin desplazarse. El muro sigue montado aunque se vea el visor, para
 *  que no deje de leer en voz alta ni de traer las alertas nuevas; el visor se monta al elegirlo.
 *  Sin cabecera propia, para no robarle altura al muro: el nombre del panel ya está en la barra de arriba y el título
 *  «Panel en vivo» queda para lectores de pantalla.
 *  A todo el ancho de la pantalla, sin el tope de 1288 px del resto del sitio (pedido del usuario): con el tope, en una
 *  pantalla de 1920 la columna del visor se quedaba en 576 px y el croquis, apaisado, no llegaba a llenar el alto. La
 *  barra de arriba se ensancha igual en esta ruta (PortalHeader), para que no queden desalineadas.
 */

// WIDE_QUERY = «una pantalla con sitio para las dos mitades» (lg de Tailwind)
const WIDE_QUERY = '(min-width: 1024px)'

// BELL_ICON = «el icono del muro»: una campana, como las alertas sin familia
const BELL_ICON = 'M18 16v-5a6 6 0 0 0-12 0v5l-1.5 2h15L18 16ZM10 20a2 2 0 0 0 4 0'

// NarrowView = «qué se ve en una pantalla estrecha»: el muro o el visor de mesas
type NarrowView = 'wall' | 'tables'

// TABLES_HEIGHT = «el alto del visor en el móvil»: la pantalla menos la barra del portal (64), el margen de arriba
// (12), el de abajo (12), las pestañas (64) y la franja segura de abajo de algunos teléfonos
const TABLES_HEIGHT = 'h-[calc(100dvh-152px-env(safe-area-inset-bottom))]'

export default function LivePanelController() {
  const { t } = useTranslation()
  const wide = useMediaQuery(WIDE_QUERY)
  const [view, setView] = useState<NarrowView>('wall')
  useDocumentTitle(t('live.documentTitle'))

  const views: { id: NarrowView; label: string; icon: string }[] = [
    { id: 'wall', label: t('wall.title'), icon: BELL_ICON },
    { id: 'tables', label: t('tables.title'), icon: LAYERS_ICON },
  ]

  if (wide) {
    return (
      <div className='w-full px-6 pb-24 pt-6'>
        <h1 className='sr-only'>{t('live.title')}</h1>
        <div className='grid grid-cols-2 items-start gap-6'>
          <AlertWall />
          <TablesViewer className='sticky top-24 h-[calc(100dvh-120px)] min-h-[600px]' />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={view === 'tables' ? 'w-full px-3 pt-3' : 'w-full px-6 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-6'}>
        <h1 className='sr-only'>{t('live.title')}</h1>
        {/* grid-cols-1 (minmax(0, 1fr)): una fila que se desliza (las zonas del visor) no ensancha la columna */}
        <div className='grid grid-cols-1'>
          <AlertWall className={view === 'wall' ? '' : 'hidden'} />
          {view === 'tables' && <TablesViewer className={TABLES_HEIGHT} autoLayout />}
        </div>
      </div>
      <nav
        aria-label={t('live.viewsLabel')}
        className='fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-portal-line bg-portal-bar pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] backdrop-saturate-[1.4]'
      >
        {views.map(option => {
          const on = view === option.id
          return (
            <button
              key={option.id}
              type='button'
              aria-pressed={on}
              onClick={() => setView(option.id)}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-portal-ink ${
                on ? 'text-[#177406] shadow-[inset_0_2px_0_#29c50c] dark:text-[#7fdc5e]' : 'text-portal-muted'
              }`}
            >
              <PathIcon d={option.icon} size={21} />
              {option.label}
            </button>
          )
        })}
      </nav>
    </>
  )
}
