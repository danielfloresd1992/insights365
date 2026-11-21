import AlertCardView from '@/components/AlertCardView'

/*  CÓMO TE LLEGA, DIBUJADO (paso «Te llega» de «De la cámara a tu informe»)
 *
 *  La alerta ya validada tal como sale en tu muro (AlertCardView, la misma tarjeta del muro de verdad) y, debajo, el
 *  aviso de que se mandó al grupo de WhatsApp del local (cuando lo tiene), como lo marca Client365. Colores de
 *  Amazonas. Solo pinta.
 */
export default function NotifyWindow() {
  return (
    <div data-ui className='grid w-full max-w-[420px] gap-3'>
      <AlertCardView
        place='Sucursal de ejemplo'
        title='Demora de primera atención'
        when='ahora'
        table='5'
        shift='day'
        category={{ label: 'Demoras', color: '#d03b3b' }}
        className='shadow-[0_24px_48px_-30px_rgba(47,42,30,0.45)]'
      />
      <p className='flex items-center gap-2 self-start rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#2f2a1e] ring-1 ring-[#ece5d5]'>
        <span className='h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
        Enviada al grupo de WhatsApp del local
      </p>
    </div>
  )
}
