import { Link } from 'react-router'
import SiteBar from './SiteBar'
import { COVERS, PALETTE } from './landing.content'
import { enterDelay } from './enterDelay'

/*  LA PÁGINA QUE REÚNE LOS TRES PROTOTIPOS DE PORTADA (/portadas). Solo pinta. */
export default function LandingIndex() {
  return (
    <div className='min-h-dvh bg-ivory font-familjen text-ink'>
      <SiteBar tone='light' />
      <main className='mx-auto w-full max-w-[1288px] px-6 pb-32 pt-10'>
        <p className='landing-enter text-sm font-semibold' style={{ color: PALETTE.greenText }}>
          Página principal · prototipos
        </p>
        <h1 className='landing-enter mt-3 max-w-[18ch] text-[clamp(2.2rem,4.2vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]' style={enterDelay(60)}>
          Tres portadas para insights365
        </h1>
        <p className='landing-enter mt-5 max-w-[40rem] text-[1.075rem] leading-relaxed text-ink-soft' style={enterDelay(120)}>
          Las tres cuentan lo que hacen los informes, con las cifras de una semana real: qué se mide en sala y cocina, y
          cómo llega al semanal. Cambian la escena 3D, el tono y la letra.
        </p>

        <ul className='mt-12 grid gap-5 md:grid-cols-3'>
          {COVERS.map((cover, coverIndex) => (
            <li key={cover.id} className='landing-enter' style={enterDelay(180 + coverIndex * 70)}>
              <Link
                to={`/portadas/${cover.id}`}
                className='landing-card group flex h-full flex-col rounded-2xl border border-black/10 bg-white p-5'
              >
                <span aria-hidden='true' className='block h-40 rounded-xl ring-1 ring-black/5' style={{ background: cover.preview }} />
                <span className='mt-5 text-sm font-semibold' style={{ color: PALETTE.greenText }}>
                  Prototipo {cover.id.toUpperCase()}
                </span>
                <span className='mt-1 text-2xl font-semibold tracking-[-0.03em]'>{cover.name}</span>
                <span className='mt-2 flex-1 leading-relaxed text-ink-soft'>{cover.summary}</span>
                <span className='landing-underline mt-5 self-start font-semibold'>Abrir el prototipo {cover.id.toUpperCase()}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
