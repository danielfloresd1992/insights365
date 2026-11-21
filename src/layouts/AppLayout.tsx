import { Link, Outlet } from 'react-router'

/*  EL MARCO DE TODAS LAS PÁGINAS: la barra de arriba con el nombre del portal y, debajo, la página de la ruta
 *  (Outlet). Solo pinta.
 */
export default function AppLayout() {
  return (
    <div className='min-h-dvh bg-surface text-ink'>
      <header className='border-b border-black/10 bg-white'>
        <div className='mx-auto flex h-14 max-w-6xl items-center px-4'>
          <Link to='/inicio' className='text-lg font-bold tracking-tight text-brand'>
            insights365
          </Link>
        </div>
      </header>

      <main className='mx-auto max-w-6xl px-4 py-8'>
        <Outlet />
      </main>
    </div>
  )
}
