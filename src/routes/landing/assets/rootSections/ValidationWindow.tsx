/*  LA VALIDACIÓN, DIBUJADA (paso «Se valida» de «De la cámara a tu informe»)
 *
 *  La misma novedad, ya revisada: arriba la alerta y su prueba; abajo el resultado de la validación, aprobada, con
 *  quién la revisó, cuándo y su nota. Es lo que guarda la API de cada novedad (validationResult). Colores de
 *  Amazonas. Solo pinta.
 */
export default function ValidationWindow() {
  return (
    <div data-ui className='w-full max-w-[440px] overflow-hidden rounded-xl border border-[#ddd3bd] bg-white shadow-[0_24px_48px_-30px_rgba(47,42,30,0.45)]'>
      <div className='flex items-start gap-3 p-3 sm:p-4'>
        <span className='mt-0.5 h-10 w-1.5 shrink-0 rounded-full bg-[#d03b3b]' aria-hidden='true' />
        <div className='min-w-0'>
          <p className='text-xs font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Demoras · Mesa 5</p>
          <p className='mt-0.5 font-semibold text-[#2f2a1e]'>Demora de primera atención</p>
          <p className='mt-1 text-sm text-[#564e40]'>Sucursal de ejemplo · turno diurno · 12:41</p>
        </div>
      </div>
      <div className='border-t border-[#ece5d5] bg-[#fbf8f0] p-3 sm:p-4'>
        <div className='flex items-center justify-between gap-3'>
          <p className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Validación</p>
          <span className='rounded-full bg-[#29c50c] px-3 py-1 text-xs font-semibold text-[#2f2a1e]'>Aprobada</span>
        </div>
        <dl className='mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm'>
          <div>
            <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Revisó</dt>
            <dd className='mt-0.5 font-medium text-[#2f2a1e]'>Supervisión de turno</dd>
          </div>
          <div>
            <dt className='text-[11px] font-semibold uppercase tracking-[0.1em] text-[#564e40]'>Hora</dt>
            <dd className='mt-0.5 font-medium text-[#2f2a1e]'>12:44</dd>
          </div>
        </dl>
        {/* En el teléfono el marco es más bajo: la nota se esconde para que la ventana quepa entera */}
        <p className='mt-3 hidden rounded-md bg-white px-3 py-2 text-sm text-[#2f2a1e] ring-1 ring-[#ece5d5] sm:block'>
          Se ve en el video: la mesa espera sin ser atendida.
        </p>
      </div>
    </div>
  )
}
