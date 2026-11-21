/*  LOS ESTADOS DEL MURO SIN ALERTAS QUE ENSEÑAR: cargando, vacío y error. Solo pintan. */

// WallLoading = «las tarjetas en gris mientras llega la primera página»
export function WallLoading() {
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3' role='status' aria-label='Cargando alertas'>
      {[0, 1, 2, 3, 4, 5].map(slot => (
        <div key={slot} className='overflow-hidden rounded-2xl border border-[#ece5d5] bg-white'>
          <div className='aspect-[16/10] animate-pulse bg-[#f4f2ee]' />
          <div className='space-y-2 p-4'>
            <div className='h-3 w-1/2 animate-pulse rounded bg-[#f4f2ee]' />
            <div className='h-4 w-3/4 animate-pulse rounded bg-[#f4f2ee]' />
          </div>
        </div>
      ))}
    </div>
  )
}

// WallEmpty = «no hay alertas de las franquicias elegidas en lo que se ha mirado»
export function WallEmpty({ canLoadMore, onLoadMore, loadingMore }: { canLoadMore: boolean; onLoadMore: () => void; loadingMore: boolean }) {
  return (
    <div className='rounded-2xl bg-[#fbf8f0] px-6 py-14 text-center'>
      <p className='text-lg font-semibold text-[#2f2a1e]'>Sin alertas de estas franquicias por ahora</p>
      <p className='mx-auto mt-2 max-w-[34rem] text-[#564e40]'>
        En las últimas publicaciones del muro no hay ninguna de sus locales. Las nuevas aparecerán aquí solas.
      </p>
      {canLoadMore && (
        <button
          type='button'
          onClick={onLoadMore}
          disabled={loadingMore}
          className='landing-button mt-6 inline-flex h-11 items-center rounded-md border border-[#ddd3bd] bg-white px-5 text-sm font-semibold text-[#2f2a1e] hover:bg-[#f7f2e4] disabled:opacity-60'
        >
          {loadingMore ? 'Buscando…' : 'Buscar en alertas más antiguas'}
        </button>
      )}
    </div>
  )
}

// WallError = «la API no contestó»
export function WallError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role='alert' className='rounded-2xl bg-[#fbeceb] px-6 py-10 text-center'>
      <p className='font-semibold text-[#bf3330]'>No se pudieron traer las alertas.</p>
      <p className='mt-1 text-sm text-[#2f2a1e]'>Puede ser la conexión o el servidor.</p>
      <button
        type='button'
        onClick={onRetry}
        className='landing-button mt-5 inline-flex h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-[#2f2a1e] ring-1 ring-[#ddd3bd] hover:bg-[#fbf8f0]'
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
