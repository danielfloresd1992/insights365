import { Navigate, createBrowserRouter } from 'react-router'
import AppLayout from '@/layouts/AppLayout'
import PortalLayout from '@/layouts/PortalLayout'
import AccessController from '@/routes/access/access.controller'
import ForgotController from '@/routes/access/forgot.controller'
import ResetController from '@/routes/access/reset.controller'
import LivePanelController from '@/routes/livePanel/livePanel.controller'
import NotFound from '@/routes/notFound/NotFound'
import ShiftReportsController from '@/routes/shiftReports/shiftReports.controller'
import WeeklyReportController from '@/routes/weeklyReport/weeklyReport.controller'
import LandingFallback from './LandingFallback'

/*  LAS RUTAS DEL PORTAL (React Router, modo datos)
 *
 *  '/' es la portada de presentación (la D de los prototipos), con sus secciones y su pie.
 *  '/portadas' reúne los prototipos de portada para compararlos, y '/portadas/a'… abre cada uno.
 *  '/acceso' es entrar con correo y contraseña; '/acceso/recuperar' pide el enlace para crear una contraseña nueva y
 *  '/acceso/restablecer' es donde abre ese enlace (la API arma la dirección: RESET_PATH en passwordReset.lib.ts). Las
 *  tres viven en routes/access/, porque comparten el marco. Las pantallas con sesión cuelgan del marco del portal (PortalLayout),
 *  que sin sesión manda a '/acceso': hoy, '/en-vivo', el panel en vivo, con el muro de alertas dentro, '/reportes',
 *  el reporte semanal e intersemanal, y '/reportes-turno', los informes diarios de cada turno. '/inicio' y '/muro' (donde estaba el muro antes del panel) llevan al panel.
 *  Cada pantalla nueva va en routes/<nombre>/ con su <nombre>.controller.tsx, y se registra aquí. La última, '*',
 *  recoge lo que no existe.
 *
 *  Las portadas se cargan aparte (lazy): traen Three.js, que pesa más que todo lo demás junto, y el portal no lo
 *  necesita.
 */

// loadLanding = «trae el código de las portadas solo cuando se abre una»
const loadLanding = () => import('@/routes/landing/landing.controller')

export const router = createBrowserRouter([
  {
    path: '/',
    lazy: async () => ({ Component: (await loadLanding()).RootLanding }),
    hydrateFallbackElement: <LandingFallback />,
  },
  {
    path: '/portadas/:variant?',
    lazy: async () => ({ Component: (await loadLanding()).default }),
    hydrateFallbackElement: <LandingFallback />,
  },
  { path: '/acceso', element: <AccessController /> },
  { path: '/acceso/recuperar', element: <ForgotController /> },
  { path: '/acceso/restablecer', element: <ResetController /> },
  {
    element: <PortalLayout />,
    children: [
      { path: '/en-vivo', element: <LivePanelController /> },
      { path: '/reportes', element: <WeeklyReportController /> },
      { path: '/reportes-turno', element: <ShiftReportsController /> },
      { path: '/muro', element: <Navigate to='/en-vivo' replace /> },
      { path: '/inicio', element: <Navigate to='/en-vivo' replace /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [{ path: '*', element: <NotFound /> }],
  },
])
