/*  LA FRASE (momento letters-assemble de taste-skill)
 *
 *  Una pantalla sobre marfil con una frase muy grande. Al subir por la pantalla, sus letras llegan dispersas y se
 *  colocan en la línea una tras otra, y está entera antes de llegar a la mitad. Debajo, una línea que la explica y una
 *  fila de cuatro datos ciertos del servicio (el catálogo de alertas de Jarvis-express365 y lo que miden los informes).
 *  En el teléfono, con movimiento reducido o sin script, la frase está quieta y entera. Solo pinta.
 */

// FACTS = «cuatro datos del servicio, todos sacados del catálogo y de los informes»
const FACTS = [
  { value: '12', label: 'categorías en el catálogo de alertas' },
  { value: '5', label: 'demoras, medidas con los umbrales de cada local' },
  { value: '7', label: 'tipos de devolución' },
  { value: '1', label: 'informe por turno, y el semanal que los junta' },
]

export default function StatementSection() {
  return (
    <section
      data-moment='letters-assemble'
      data-moment-opts='{"spread": 1}'
      aria-labelledby='statement-title'
      className='flex min-h-svh items-center bg-[#fbf8f0]'
    >
      <div className='mx-auto w-full max-w-[1288px] px-6 py-24'>
        <h2 id='statement-title' className='mo-la__type'>
          Cada alerta, con su prueba.
        </h2>
        <p className='mo-la__sub'>
          La foto de la cámara, la hora, la mesa y el turno, y el video cuando la alerta lo pide: lo que vio el
          operador, sin impresiones.
        </p>
        <ul className='mt-14 grid gap-6 border-t border-[#ddd3bd] pt-8 sm:grid-cols-2 lg:grid-cols-4'>
          {FACTS.map(fact => (
            <li key={fact.label}>
              <p className='text-[2.5rem] font-semibold leading-none tracking-[-0.03em] text-[#2f2a1e]'>{fact.value}</p>
              <p className='mt-2 max-w-[16rem] text-[#564e40]'>{fact.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
