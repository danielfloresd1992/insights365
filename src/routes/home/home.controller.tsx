import { useAppSelector } from '@/store/hooks'
import HomeWelcome from './assets/HomeWelcome'

/*  EL INICIO DEL PORTAL (/inicio): la bienvenida tras entrar. La portada de presentación vive en / (routes/landing)
 *
 *  El patrón de los proyectos hermanos: el controlador lee lo que hace falta (hooks, store) y lo reparte entre las
 *  piezas de assets/, que solo pintan. La lógica que crezca irá en hook/.
 */
export default function HomeController() {
  const user = useAppSelector(state => state.session.user)

  return <HomeWelcome userName={user?.name ?? null} />
}
