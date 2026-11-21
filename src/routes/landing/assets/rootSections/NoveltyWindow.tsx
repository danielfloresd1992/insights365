/*  LA VENTANA DEL OPERADOR, DIBUJADA (paso «Se detecta» de «De la cámara a tu informe»)
 *
 *  Una ventana de la aplicación donde el operador anota una novedad: la sala en esquema, con la mesa de la novedad
 *  marcada; la categoría y la alerta del catálogo, y la prueba que la acompaña (foto, y video si la alerta lo pide).
 *  Es la interfaz del producto en pequeño, sin fotos. Con los colores de Amazonas. Solo pinta.
 */

// TABLES = «las mesas del esquema de la sala; la marcada es la de la novedad»
const TABLES = [1, 2, 3, 4, 5, 6, 7, 8]
const MARKED_TABLE = 5

// FIELDS = «lo que el operador anota de la novedad»
const FIELDS = [
  { label: 'Categoría', value: 'Demoras' },
  { label: 'Alerta', value: 'Demora de primera atención' },
  { label: 'Mesa', value: String(MARKED_TABLE) },
  { label: 'Turno', value: 'Diurno' },
]

// EVIDENCE = «la prueba que va con la novedad»
const EVIDENCE = ['Foto de la cámara', 'Video']

export default function NoveltyWindow() {
  return (
    <div data-ui className='w-full max-w-[460px] overflow-hidden rounded-xl border border-[#ddd3bd] bg-white shadow-[0_24px_48px_-30px_rgba(47,42,30,0.45)]'>
      <div className='flex items-center gap-1.5 border-b border-[#ece5d5] bg-[#f7f2e4] px-3 py-2'>
        <span className='h-2.5 w-2.5 rounded-full bg-[#ddd3bd]' aria-hidden='true' />
        <span className='h-2.5 w-2.5 rounded-full bg-[#ddd3bd]' aria-hidden='true' />
        <span className='h-2.5 w-2.5 rounded-full bg-[#ddd3bd]' aria-hidden='true' />
        <span className='ml-2 truncate text-xs font-medium text-[#564e40]'>Jarvis365 · Nueva novedad · Sucursal de ejemplo</span>
      </div>

      {/* Las mesas en una sola fila: así la ventana es baja y cabe entera en su marco, también en el teléfono */}
      <div className='grid grid-cols-8 gap-1.5 bg-[#f4f2ee] p-3 sm:gap-2 sm:p-4' aria-hidden='true'>
        {TABLES.map(table => (
          <span
            key={table}
            className={`grid aspect-square place-items-center rounded-full text-[11px] font-semibold ${
              table === MARKED_TABLE ? 'bg-white text-[#bf3330] ring-2 ring-[#d03b3b]' : 'bg-white text-[#88847f] ring-1 ring-[#e2dfda]'
            }`}
          >
            {table}
          </span>
        ))}
      </div>

      <dl className='grid grid-cols-2 gap-x-4 gap-y-2 p-3 sm:gap-y-3 sm:p-4'>
        {FIELDS.map(field => (
          <div key={field.label}>
            <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>{field.label}</dt>
            <dd className='mt-0.5 text-sm font-medium text-[#2f2a1e]'>{field.value}</dd>
          </div>
        ))}
      </dl>
      {/* En el teléfono el marco es más bajo: la fila de abajo se esconde para que la ventana quepa entera */}
      <div className='hidden items-center justify-between gap-3 border-t border-[#ece5d5] px-4 py-3 sm:flex'>
        <ul className='flex gap-1.5'>
          {EVIDENCE.map(item => (
            <li key={item} className='rounded-full bg-[#f2fbee] px-2.5 py-1 text-[11px] font-semibold text-[#177406]'>
              ✓ {item}
            </li>
          ))}
        </ul>
        <span className='rounded-md bg-[#29c50c] px-3 py-1.5 text-xs font-semibold text-[#2f2a1e]'>Registrar</span>
      </div>
    </div>
  )
}
