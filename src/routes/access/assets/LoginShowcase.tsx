import { Link } from 'react-router'
import AlertCardView from '@/components/AlertCardView'
import { enterDelay } from '@/routes/landing/assets/enterDelay'
import { FAMILIES, SAMPLE_ALERTS, alertImage } from '@/routes/landing/assets/rootSections/proposals/alertSamples'
import BrandMark from './BrandMark'

/*  EL LADO DE LA MARCA EN /acceso (solo en pantalla ancha). Solo pinta.
 *
 *  Sobre marfil: la marca, la promesa y lo que hay dentro, enseñado en vez de contado. Tres alertas del muro abiertas
 *  en abanico, con la tarjeta del muro tal cual (AlertCardView), sus fotos de cámara y sus familias; debajo, tres
 *  cifras del catálogo real de alertas.
 */

// FAN = «las tres alertas del abanico, de atrás hacia delante: cuál es, cuánto se aparta del centro (en anchos de su
// propia tarjeta), cuánto baja y cuánto se tuerce»
const FAN = [
  { id: 'a2', shiftX: '-54%', dropY: '2rem', turn: '-7deg' },
  { id: 'a3', shiftX: '54%', dropY: '2rem', turn: '7deg' },
  { id: 'a1', shiftX: '0%', dropY: '0rem', turn: '0deg' },
]

// CATALOG_FIGURES = «las cifras del catálogo de alertas de Jarvis365 (menus.json): nombres distintos, los que miden
// un tiempo y las familias en que se agrupan»
const CATALOG_FIGURES = [
  { value: '87', label: 'alertas en el catálogo' },
  { value: '41', label: 'con su tiempo medido' },
  { value: '6', label: 'familias, de demoras a local' },
]

export default function LoginShowcase() {
  return (
    <aside className='hidden flex-col gap-10 overflow-hidden bg-[#fbf8f0] p-12 lg:flex'>
      <Link to='/' className='landing-link inline-flex h-11 items-center gap-2.5 self-start text-[1.05rem] font-semibold tracking-[-0.02em]'>
        <BrandMark />
        insights365
      </Link>

      <div className='flex flex-1 flex-col justify-center'>
        <div className='landing-enter max-w-[30rem]'>
          <p className='text-[2.1rem] font-semibold leading-[1.1] tracking-[-0.03em]'>Tus restaurantes, turno a turno.</p>
          <p className='mt-4 leading-relaxed text-[#564e40]'>
            Dentro te espera el muro de alertas: las novedades de tus franquicias según llegan, con su foto, su mesa y su
            plato.
          </p>
        </div>

        {/* El abanico es decorado: las mismas alertas se leen dentro, en el muro. En pantallas bajas se encoge, para que
            las cifras de abajo quepan sin hacer scroll */}
        <div className='relative mt-10 h-[21rem] xl:h-[23.5rem] [@media(max-height:820px)]:mt-6 [@media(max-height:820px)]:h-[16.5rem]' aria-hidden='true'>
          <div className='absolute inset-0 origin-top [@media(max-height:820px)]:scale-[0.78]'>
            {FAN.map((place, order) => {
              const alert = SAMPLE_ALERTS.find(sample => sample.id === place.id)
              if (!alert) return null
              const front = order === FAN.length - 1
              return (
                <div
                  key={alert.id}
                  className='absolute left-1/2 top-0 w-[13.5rem] xl:w-[16rem]'
                  style={{ translate: `calc(-50% + ${place.shiftX}) ${place.dropY}`, rotate: place.turn, zIndex: order }}
                >
                  <div className='landing-enter' style={enterDelay(200 + order * 140)}>
                    <AlertCardView
                      place={alert.place}
                      title={alert.title}
                      when={alert.when}
                      table={alert.table}
                      dish={alert.dish}
                      shift={front ? alert.shift : null}
                      imageSrc={alertImage(alert)}
                      category={FAMILIES[alert.family]}
                      className={front ? 'shadow-[0_32px_60px_-28px_rgba(31,27,20,0.55)]' : 'shadow-[0_20px_40px_-30px_rgba(31,27,20,0.45)]'}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div>
        <dl className='grid grid-cols-3 gap-6 border-t border-[#ddd3bd] pt-6'>
          {CATALOG_FIGURES.map(figure => (
            <div key={figure.label} className='flex flex-col-reverse justify-end'>
              <dt className='mt-1 text-sm leading-snug text-[#564e40]'>{figure.label}</dt>
              <dd className='font-plex-mono text-[1.6rem] font-semibold leading-none tracking-[-0.02em]'>{figure.value}</dd>
            </div>
          ))}
        </dl>
        <p className='mt-6 text-xs text-[#564e40]'>© 2026 Amazonas365</p>
      </div>
    </aside>
  )
}
