/*  LA BIENVENIDA DE LA PORTADA, mientras el portal no tiene datos. Solo pinta.
 *
 *  @param userName  el nombre de quien tiene la sesión abierta, o null
 */
type HomeWelcomeProps = {
  userName: string | null
}

export default function HomeWelcome({ userName }: HomeWelcomeProps) {
  return (
    <section className='rounded-2xl border border-black/10 bg-white p-8'>
      <h1 className='text-2xl font-bold'>{userName ? `Hola, ${userName}` : 'Bienvenido'}</h1>
      <p className='mt-2 max-w-prose text-ink-soft'>
        Aquí vas a ver la analítica de todos tus restaurantes: el servicio en mesa, la cocina, las novedades y cómo
        evolucionan día a día.
      </p>
    </section>
  )
}
