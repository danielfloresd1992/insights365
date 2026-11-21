import { Link } from 'react-router'
import AlertCardView from '@/components/AlertCardView'
import { WALL_PATH } from '../landing.content'

/*  EL MURO DE ALERTAS, EN ADELANTO
 *
 *  Una pantalla partida: a la izquierda qué es el muro y el botón para verlo; a la derecha, sobre un panel marfil,
 *  cuatro alertas de familias distintas, con nombres del catálogo real, pintadas como las del muro de verdad
 *  (AlertCardView). Quieta: los dos momentos de la página ya están repartidos (taste-skill no deja un tercero, ni
 *  tarjetas que entren al hacer scroll). Solo pinta.
 */

// SAMPLE_ALERTS = «cuatro alertas de muestra, una de cada familia, para enseñar que el muro no es solo de mesas»
const SAMPLE_ALERTS = [
  {
    title: 'Demora de primera atención',
    when: 'hace 2 min',
    table: '5',
    shift: 'day' as const,
    category: { label: 'Demoras', color: '#d03b3b' },
  },
  {
    title: 'Cliente sin ser ubicado por el host',
    when: 'hace 6 min',
    shift: 'day' as const,
    category: { label: 'Clientes', color: '#d9a441' },
  },
  {
    title: 'Devolución de plato',
    when: 'hace 11 min',
    table: '12',
    dish: 'Plato fuerte',
    category: { label: 'Comida y devoluciones', color: '#b5763b' },
  },
  {
    title: 'Puerta de cava abierta',
    when: 'hace 25 min',
    shift: 'night' as const,
    category: { label: 'Local y cámaras', color: '#7d621b' },
  },
]

export default function WallTeaser() {
  return (
    <section aria-labelledby='wall-teaser-title' className='bg-white'>
      <div className='mx-auto grid w-full max-w-[1288px] items-center gap-10 px-6 py-24 lg:min-h-svh lg:grid-cols-12 lg:gap-x-6'>
        <div className='lg:col-span-5'>
          <p className='text-sm font-semibold text-[#177406]'>Muro de alertas</p>
          <h2 id='wall-teaser-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
            Tus alertas, según llegan
          </h2>
          <p className='mt-5 max-w-[32rem] text-[1.075rem] leading-relaxed text-[#564e40] text-pretty'>
            Al entrar ves las alertas de tus restaurantes de la más nueva a la más vieja, de todas las familias: la foto
            de la cámara, el local, la mesa, el plato y el turno. Las filtras por franquicia y se actualizan solas.
          </p>
          <Link
            to={WALL_PATH}
            className='landing-button mt-8 inline-flex h-12 items-center rounded-md bg-[#29c50c] px-6 font-semibold text-[#2f2a1e] hover:bg-[#24b00a]'
          >
            Ver mis alertas
          </Link>
        </div>

        <div data-ui className='lg:col-span-6 lg:col-start-7'>
          <div className='grid gap-3 rounded-3xl bg-[#f7f2e4] p-5 sm:grid-cols-2 sm:p-6'>
            {SAMPLE_ALERTS.map(alert => (
              <AlertCardView
                key={alert.title}
                place='Sucursal de ejemplo'
                title={alert.title}
                when={alert.when}
                table={alert.table ?? null}
                dish={alert.dish ?? null}
                shift={alert.shift ?? null}
                category={alert.category}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
