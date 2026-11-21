import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { logout } from '@/libs/session.api'
import { useAppDispatch } from '@/store/hooks'
import { signedOut } from '@/store/slices/session.slice'
import PortalHeader from './assets/PortalHeader'
import { useSessionCheck } from './hook/useSessionCheck'

/*  EL MARCO DEL PORTAL CON SESIÓN (/muro y lo que venga)
 *
 *  Antes de enseñar nada pregunta si hay sesión. Sin ella, manda a /acceso y apunta a dónde volver. Con ella, pinta la
 *  barra del portal y la pantalla de la ruta debajo. Cerrar sesión la cierra en la API y vuelve a /acceso.
 *  Colores de Amazonas: blanco con marfiles y la tinta, en IBM Plex.
 */
export default function PortalLayout() {
  const { status, user } = useSessionCheck()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [signingOut, setSigningOut] = useState(false)

  if (status === 'signedOut') {
    return <Navigate to={`/acceso?volver=${encodeURIComponent(location.pathname)}`} replace />
  }

  if (status === 'unknown' || !user) {
    return (
      <div className='grid min-h-dvh place-items-center bg-white font-plex text-[#564e40]' role='status'>
        Comprobando la sesión…
      </div>
    )
  }

  const onSignOut = () => {
    setSigningOut(true)
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
    <div className='min-h-dvh bg-white font-plex text-[#2f2a1e]' style={{ ['--focus-ring' as string]: '#2f2a1e' }}>
      <PortalHeader userName={user.name} onSignOut={onSignOut} signingOut={signingOut} />
      <main id='contenido'>
        <Outlet />
      </main>
    </div>
  )
}
