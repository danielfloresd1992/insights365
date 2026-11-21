import { useInView } from '../../../../hook/useInView'
import CountUp from '../CountUp'
import { CATALOG_NAMES, FAMILIES } from '../alertSamples'

/*  EL CATÁLOGO, EN MOVIMIENTO (propuesta C, primera sección)
 *
 *  Una frase grande y, debajo, cuatro cintas de nombres de alertas del catálogo real, cada uno con el color de su
 *  familia, que corren solas en sentidos alternos de borde a borde. Cierra una fila de cifras del catálogo de hoy,
 *  contadas en Jarvis-express365 (menus.json): alertas distintas, cuántas miden tiempo, cuántas van ligadas a una
 *  mesa y cuántas piden una foto por paso. Con movimiento reducido las cintas se quedan quietas. Solo pinta.
 */

// ROWS = «los nombres repartidos en cuatro cintas, con su ritmo y su sentido»
const ROWS = [0, 1, 2, 3].map(row => ({
  names: CATALOG_NAMES.filter((_, index) => index % 4 === row),
  seconds: [70, 84, 76, 92][row],
  reverse: row % 2 === 1,
}))

// CATALOG_FACTS = «cifras del catálogo de alertas de hoy»
const CATALOG_FACTS = [
  { value: 87, label: 'alertas distintas en el catálogo' },
  { value: 41, label: 'se miden con reloj, como las demoras' },
  { value: 20, label: 'van ligadas a una mesa' },
  { value: 11, label: 'piden más de una foto, una por paso' },
]

function Pill({ name, family, featured }: { name: string; family: keyof typeof FAMILIES; featured: boolean }) {
  const color = FAMILIES[family].color
  return (
    <span
      className={`mr-3 inline-flex shrink-0 items-center gap-2.5 rounded-full px-5 py-3 text-[1.05rem] font-medium text-[#2f2a1e] ${featured ? '' : 'bg-white ring-1 ring-[#ece5d5]'}`}
      style={featured ? { background: `color-mix(in srgb, ${color} 14%, #ffffff)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${color} 45%, transparent)` } : undefined}
    >
      <span className='h-2.5 w-2.5 rounded-full' style={{ background: color }} aria-hidden='true' />
      {name}
    </span>
  )
}

export default function CatalogMarquee() {
  const { ref: factsRef, inView: factsIn } = useInView<HTMLDListElement>(0.4)

  return (
    <section aria-labelledby='pc-catalog-title' className='overflow-hidden bg-[#fbf8f0]'>
      <div className='mx-auto w-full max-w-[1288px] px-6 pt-24'>
        <p className='text-sm font-semibold text-[#177406]'>El catálogo de alertas</p>
        <h2 id='pc-catalog-title' className='mt-4 max-w-[14ch] text-[clamp(2.8rem,6.6vw,6rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-[#2f2a1e]'>
          Más de 80 alertas distintas.
        </h2>
        <p className='mt-6 max-w-[38rem] text-[1.15rem] leading-relaxed text-[#564e40] text-pretty'>
          Cada una con su familia y su foto de cámara. Las que miden tiempo llevan reloj; las de mesa, su número; algunas
          piden una foto por paso.
        </p>
      </div>

      <div className='pc-marquee mt-14 grid -rotate-2 gap-3 py-4' role='list' aria-label='Algunas alertas del catálogo'>
        {ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className='overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]'>
            <div className={`pc-marquee__track flex w-max ${row.reverse ? 'pc-marquee__track--reverse' : ''}`} style={{ ['--duration' as string]: `${row.seconds}s` }}>
              {[0, 1].map(copy => (
                <div key={copy} className='flex' aria-hidden={copy === 1 ? 'true' : undefined}>
                  {row.names.map((entry, index) => (
                    <span key={entry.name} role={copy === 0 ? 'listitem' : undefined}>
                      <Pill name={entry.name} family={entry.family} featured={(index + rowIndex) % 4 === 0} />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className='mx-auto w-full max-w-[1288px] px-6 pb-24'>
        <dl ref={factsRef} className='mt-14 grid grid-cols-2 gap-6 border-t border-[#ddd3bd] pt-8 lg:grid-cols-4'>
          {CATALOG_FACTS.map(fact => (
            <div key={fact.label} className='flex flex-col-reverse justify-end'>
              <dt className='mt-2 max-w-[16rem] text-[#564e40]'>{fact.label}</dt>
              <dd className='text-[3rem] font-semibold leading-none tracking-[-0.04em] text-[#2f2a1e]'>
                <CountUp value={fact.value} active={factsIn} />
              </dd>
            </div>
          ))}
        </dl>
        <p className='mt-6 text-sm text-[#564e40]'>Cifras del catálogo de alertas de hoy.</p>
      </div>
    </section>
  )
}
