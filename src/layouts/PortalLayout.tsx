import { useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { logout } from '@/ajax/user.ajax'
import { stopSpeaking } from '@/libs/speech'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signedOut } from '@/store/slices/session.slice'
import PortalHeader from './assets/PortalHeader'
import { usePortalDocument } from './hook/usePortalDocument'
import { useSessionCheck } from './hook/useSessionCheck'

/*  EL MARCO DEL PORTAL CON SESIÓN (/en-vivo y lo que venga)
 *
 *  Antes de enseñar nada pregunta si hay sesión. Sin ella, manda a /acceso y apunta a dónde volver. Con ella, pinta la
 *  barra del portal, fija arriba, y debajo la pantalla de la ruta, con el hueco de la barra (64 px en el móvil, 72 en
 *  escritorio). Mientras está abierto pone en el documento el tema y el idioma elegidos (usePortalDocument).
 *  Cerrar sesión calla la voz, la cierra en la API y vuelve a /acceso.
 */

// PORTAL_STYLE = «el anillo del foco en la tinta del tema, claro u oscuro» (lo leen los botones landing-*)
const PORTAL_STYLE = { '--focus-ring': 'var(--color-portal-ink)' } as CSSProperties

export default function PortalLayout() {
  const { status, user } = useSessionCheck()
  const theme = useAppSelector(state => state.preferences.theme)
  const { t, i18n } = useTranslation()
  usePortalDocument(theme, i18n.resolvedLanguage === 'en' ? 'en' : 'es')
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [signingOut, setSigningOut] = useState(false)

  if (status === 'signedOut') {
    return <Navigate to={`/acceso?volver=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (status === 'unknown' || !user) {
    return (
      <div className='grid min-h-dvh place-items-center bg-portal-page font-plex text-portal-muted' role='status'>
        {t('portal.checkingSession')}
      </div>
    )
  }

  const onSignOut = () => {
    setSigningOut(true)
    stopSpeaking()
    logout()
      .catch(() => {
        // Si la API no contesta, la sesión se da por cerrada aquí igualmente
      })
      .finally(() => {
        dispatch(signedOut())
        navigate('/acceso', { replace: true })
      })
  }

  return (
    <div className='min-h-dvh bg-portal-page font-plex text-portal-ink transition-colors' style={PORTAL_STYLE}>
      <PortalHeader userName={user.name} onSignOut={onSignOut} signingOut={signingOut} />
      <main id='contenido' className='pt-16 md:pt-[72px]'>
        <Outlet />
      </main>
    </div>
  )
}
