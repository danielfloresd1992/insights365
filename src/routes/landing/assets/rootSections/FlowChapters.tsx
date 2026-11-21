import NotifyWindow from './NotifyWindow'
import NoveltyWindow from './NoveltyWindow'
import SheetCanvas from './SheetCanvas'
import ValidationWindow from './ValidationWindow'

/*  DE LA CÁMARA A TU INFORME (momento pinned-chapters de taste-skill)
 *
 *  Lo que le pasa a una alerta, en cuatro pasos: se detecta, se valida, te llega y se cuenta. En pantallas anchas la
 *  sección se queda en su sitio durante una pantalla de scroll mientras los pasos se abren uno a uno, y el marco de la
 *  derecha cambia a la imagen de cada paso: la ventana del operador, la validación, la alerta en tu muro y la gráfica
 *  del semanal. En el teléfono, con movimiento reducido o sin script, los cuatro pasos se ven quietos, cada uno con su
 *  imagen. El movimiento lo pone el momento (../../moments, montado por useMoments); aquí solo se escribe el marcado
 *  que espera. Solo pinta.
 */

// STEPS = «los cuatro pasos de una alerta, con su imagen»
const STEPS = [
  {
    title: 'Se detecta',
    text: 'El operador la ve por cámara y la registra con su categoría, su mesa, su hora y su foto, y video cuando la alerta lo pide.',
    visual: <NoveltyWindow />,
  },
  {
    title: 'Se valida',
    text: 'Alguien del equipo la revisa con la prueba delante y la aprueba o la rechaza, con su nota y su hora.',
    visual: <ValidationWindow />,
  },
  {
    title: 'Te llega',
    text: 'Sale en tu muro de alertas en el momento y, si el local tiene grupo de WhatsApp, también ahí, con su foto.',
    visual: <NotifyWindow />,
  },
  {
    title: 'Se cuenta',
    text: 'Cada turno cierra con su informe diario, y el semanal junta los turnos: demoras, devoluciones, toques y novedades.',
    visual: <SheetCanvas sheetName='Demoras por día' label='Cantidad de demoras por día, por categoría de plato' />,
  },
]

export default function FlowChapters() {
  return (
    <section data-moment='pinned-chapters' aria-labelledby='flow-title' className='bg-white'>
      <div className='mo-pc__grid mx-auto w-full max-w-[1288px] px-6 py-20'>
        <div className='mo-pc__text'>
          <div>
            <p className='text-sm font-semibold text-[#177406]'>Cómo funciona</p>
            <h2 id='flow-title' className='mt-3 text-[clamp(2rem,3.6vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[#2f2a1e]'>
              De la cámara a tu informe
            </h2>
          </div>
          <ol className='mo-pc__steps'>
            {STEPS.map(step => (
              <li key={step.title} className='mo-pc__step'>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <figure className='mo-pc__visual mo-pc__visual--lit'>{step.visual}</figure>
              </li>
            ))}
          </ol>
        </div>
        <div className='mo-pc__visuals frame overflow-hidden rounded-2xl ring-1 ring-[#ece5d5]' />
      </div>
    </section>
  )
}
