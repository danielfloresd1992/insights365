import { tweenLabel, useRevealValues } from '../hook/useRevealValues'
import { niceMax } from './chartScale'

/*  UNA GRÁFICA DE BARRAS, hecha con HTML y CSS (sin librería). Solo pinta.
 *
 *  Una columna por categoría (un día, una semana); dentro, las series apiladas (stacked) o lado a lado. Encima de cada
 *  columna va su total o su valor; al pasar el ratón o enfocar una columna sale el detalle de cada serie. Con más de
 *  una serie lleva leyenda. El eje parte de cero y tiene un solo sentido: una medida por gráfica.
 *  Los colores de serie son clases de fondo (bg-chart-day, bg-chart-night…): cambian con el tema.
 *  Las barras y sus cifras están en 0 hasta que la gráfica entra en pantalla, y entonces crecen; si los datos cambian,
 *  pasan a los nuevos (useRevealValues). El detalle y los lectores de pantalla dicen siempre la cifra exacta.
 *
 *  @param categories  el rótulo de cada columna
 *  @param series      cada serie: nombre, clase de color y un valor por columna (null = sin dato). `tint` es el mismo
 *                     color como valor de CSS (var(--color-chart-day)…), para la gráfica en 3D (Bars3D)
 *  @param stacked     apiladas (las series suman) o lado a lado
 *  @param format      cómo se escribe un valor
 *  @param label       qué enseña la gráfica, para lectores de pantalla
 *  @param highlight   el índice de una columna que se destaca (las demás se atenúan), si lo hay
 */
export type BarSeries = { name: string; color: string; tint?: string; values: (number | null)[] }

type BarChartProps = {
  categories: string[]
  series: BarSeries[]
  stacked?: boolean
  format: (value: number) => string
  label: string
  highlight?: number
  height?: number
}

export default function BarChart({ categories, series, stacked = false, format, label, highlight, height = 200 }: BarChartProps) {
  const columnTotal = (index: number) => series.reduce((sum, item) => sum + (item.values[index] ?? 0), 0)
  const peak = Math.max(...categories.map((_, index) => (stacked ? columnTotal(index) : Math.max(...series.map(item => item.values[index] ?? 0)))))
  const top = niceMax(peak)
  const share = (value: number) => `${(value / top) * 100}%`
  // lo que se ve de cada valor: en 0 hasta que la gráfica entra en pantalla, luego creciendo (la escala, con los datos)
  const keyOf = (item: BarSeries, category: string) => `${item.name}|${category}`
  const { ref, valueOf } = useRevealValues<HTMLDivElement>(
    series.flatMap(item => categories.map((category, index): [string, number] => [keyOf(item, category), item.values[index] ?? 0])),
  )
  const nowTotal = (category: string) => series.reduce((sum, item) => sum + valueOf(keyOf(item, category)), 0)

  return (
    <figure className='m-0 flex flex-col gap-2' aria-label={label}>
      {series.length > 1 && (
        <figcaption className='flex flex-wrap gap-x-4 gap-y-1 text-xs text-portal-muted'>
          {series.map(item => (
            <span key={item.name} className='inline-flex items-center gap-1.5'>
              <span aria-hidden='true' className={`h-2.5 w-2.5 rounded-[3px] ${item.color}`} />
              {item.name}
            </span>
          ))}
        </figcaption>
      )}

      {/* el margen de arriba deja sitio a la cifra de la barra más alta, que va por encima del tope */}
      <div ref={ref} className='relative mt-5' style={{ height }}>
        {/* la rejilla: el tope, la mitad y el cero; la mitad se calla si al escribirla repite el tope (escalas de 0 a 1) */}
        {[1, 0.5, 0].filter(fraction => fraction !== 0.5 || format(top * 0.5) !== format(top)).map(fraction => (
          <div key={fraction} aria-hidden='true' className='absolute inset-x-0 border-t border-portal-line' style={{ bottom: `${fraction * 100}%` }}>
            <span className='absolute -top-2 left-0 bg-portal-surface pr-1.5 font-plex-mono text-[10.5px] text-portal-muted'>{format(top * fraction)}</span>
          </div>
        ))}

        <ul className='absolute inset-0 m-0 flex list-none items-end gap-2 p-0 pl-10'>
          {categories.map((category, index) => {
            const dimmed = highlight !== undefined && highlight !== index
            const total = columnTotal(index)
            const totalNow = nowTotal(category)
            const empty = series.every(item => item.values[index] === null)
            return (
              <li key={category} tabIndex={0} className='group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-none'>
                <div
                  className={`relative flex min-h-0 justify-center ${stacked ? 'flex-col-reverse items-stretch gap-0.5' : 'items-end gap-0.5'} ${dimmed ? 'opacity-45' : ''}`}
                  style={{ height: stacked ? share(totalNow) : '100%' }}
                >
                  {/* la cifra va encima de la barra, fuera de su alto, para no deformar la escala; cuenta mientras
                      crece, y el lector de pantalla oye la exacta */}
                  {(stacked || series.length === 1) && (
                    <>
                      <span
                        aria-hidden='true'
                        className='absolute inset-x-0 text-center font-plex-mono text-[11px] font-medium text-portal-ink'
                        style={{ bottom: stacked ? '100%' : share(totalNow), marginBottom: 3 }}
                      >
                        {empty ? '—' : format(tweenLabel(totalNow, total))}
                      </span>
                      <span className='sr-only'>{`${category}: ${empty ? '—' : format(total)}`}</span>
                    </>
                  )}
                  {series.map(item => {
                    const value = valueOf(keyOf(item, category))
                    if (stacked && value <= 0) return null
                    return (
                      <span
                        key={item.name}
                        aria-hidden='true'
                        className={`block min-h-px rounded-t-[4px] ${item.color} ${stacked ? 'w-full max-w-14 self-center' : 'w-full max-w-9'}`}
                        style={stacked ? { flexGrow: value, flexBasis: 0 } : { height: share(value) }}
                      />
                    )
                  })}
                </div>

                {/* el detalle, al pasar el ratón o al enfocar la columna */}
                <div className='pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-portal-ink px-2.5 py-1.5 text-xs text-portal-page shadow-lg group-hover:block group-focus-visible:block'>
                  <span className='block font-semibold'>{category}</span>
                  {empty ? (
                    <span className='block opacity-80'>—</span>
                  ) : (
                    series.map(item => (
                      <span key={item.name} className='block opacity-90'>
                        {series.length > 1 ? `${item.name}: ` : ''}
                        {item.values[index] === null ? '—' : format(item.values[index] ?? 0)}
                      </span>
                    ))
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <ul aria-hidden='true' className='m-0 flex list-none gap-2 p-0 pl-10'>
        {categories.map((category, index) => (
          <li key={category} className={`min-w-0 flex-1 truncate text-center text-[11.5px] ${highlight === index ? 'font-semibold text-portal-ink' : 'text-portal-muted'}`}>
            {category}
          </li>
        ))}
      </ul>
    </figure>
  )
}
