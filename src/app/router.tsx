import { Navigate, createBrowserRouter } from 'react-router'
import AppLayout from '@/layouts/AppLayout'
import PortalLayout from '@/layouts/PortalLayout'
import AccessController from '@/routes/access/access.controller'
import WallController from '@/routes/wall/wall.controller'
import NotFound from '@/routes/notFound/NotFound'
import LandingFallback from './LandingFallback'

/*  LAS RUTAS DEL PORTAL (React Router, modo datos)
 *
 *  '/' es la portada de presentación (la D de los prototipos), con sus secciones y su pie.
 *  '/portadas' reúne los prototipos de portada para compararlos, y '/portadas/a'… abre cada uno.
 *  '/acceso' es entrar con correo y contraseña. Las pantallas con sesión cuelgan del marco del portal (PortalLayout),
 *  que sin sesión manda a '/acceso': hoy, '/muro', el muro de alertas ('/inicio' lleva ahí).
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
  {
    element: <PortalLayout />,
    children: [
      { path: '/muro', element: <WallController /> },
      { path: '/inicio', element: <Navigate to='/muro' replace /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [{ path: '*', element: <NotFound /> }],
  },
])
