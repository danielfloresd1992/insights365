import { useTranslation } from 'react-i18next'
import AlertWall from '@/components/AlertWall/AlertWall'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'

/*  EL PANEL EN VIVO (/en-vivo, con sesión)
 *
 *  Lo que está pasando en los establecimientos de quien entra, según llega. Hoy es el muro de alertas (el componente
 *  components/AlertWall, que trae todo lo suyo), sin cabecera propia para no robarle altura: el nombre del panel ya
 *  está en la barra de arriba. El título «Panel en vivo» queda para lectores de pantalla. Lo que se sume al panel va
 *  debajo, como otra sección con su título.
 */
export default function LivePanelController() {
  const { t } = useTranslation()
  useDocumentTitle(t('live.documentTitle'))

  return (
    <div className='mx-auto w-full max-w-[1288px] px-6 pb-24 pt-6'>
      <h1 className='sr-only'>{t('live.title')}</h1>
      <AlertWall />
    </div>
  )
}
