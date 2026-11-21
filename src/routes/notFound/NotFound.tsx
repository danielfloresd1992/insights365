import { Link } from 'react-router'

/*  LA PÁGINA QUE NO EXISTE: cualquier dirección que no tiene ruta. Solo pinta. */
export default function NotFound() {
  return (
    <section className='rounded-2xl border border-black/10 bg-white p-8 text-center'>
      <h1 className='text-2xl font-bold'>Esta página no existe</h1>
      <p className='mt-2 text-ink-soft'>Revisa la dirección o vuelve al inicio.</p>
      <Link to='/' className='mt-6 inline-block rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:opacity-90'>
        Volver al inicio
      </Link>
    </section>
  )
}
