import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { signedOut } from '@/store/slices/session.slice'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import WallAlert from './assets/WallAlert'
import WallFilters from './assets/WallFilters'
import { WallEmpty, WallError, WallLoading } from './assets/WallStates'
import { useFranchiseScope } from './hook/useFranchiseScope'
import { POLL_MS, useWallFeed } from './hook/useWallFeed'
import { useNow } from './hook/useNow'

/*  EL MURO DE ALERTAS (/muro, con sesión)
 *
 *  El muro de novedades de Client365, para el cliente: las alertas de sus franquicias de la más nueva a la más vieja,
 *  con la foto de la cámara, la mesa, el plato y el turno, y las nuevas llegando solas cada 30 segundos.
 *  Hoy la API no liga usuarios con franquicias, así que las franquicias se eligen (useFranchiseScope lo explica).
 *  El controlador junta la sesión, la elección y las alertas, y lo reparte; las piezas de assets/ solo pintan.
 */
export default function WallController() {
  const user = useAppSelector(state => state.session.user)
  const dispatch = useAppDispatch()
  const scope = useFranchiseScope(user?.franchises ?? null)
  const onUnauthorized = useCallback(() => dispatch(signedOut()), [dispatch])
  const feed = useWallFeed(scope.scopeIds, scope.selectionKey, onUnauthorized)
  const now = useNow(POLL_MS)
  useDocumentTitle('Muro de alertas · insights365')

  const showLoading = feed.visible.length === 0 && !feed.failed && (feed.firstLoad || feed.resolvingScope)

  return (
    <div className='mx-auto w-full max-w-[1288px] px-6 pb-24 pt-10'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h1 className='text-[clamp(1.9rem,3vw,2.6rem)] font-semibold tracking-[-0.03em]'>Muro de alertas</h1>
          <p className='mt-1 text-[#564e40]'>Las novedades de tus franquicias, de la más nueva a la más vieja.</p>
        </div>
        <p className='inline-flex items-center gap-2 text-sm text-[#564e40]'>
          <span className='landing-live-dot h-2 w-2 rounded-full bg-[#29c50c]' aria-hidden='true' />
          Se actualiza solo cada 30 segundos
        </p>
      </div>

      <div className='mt-8'>
        <WallFilters owned={scope.owned} franchises={scope.franchises} selected={scope.selected} onToggle={scope.toggle} onClear={scope.clear} />
      </div>

      <div className='mt-8'>
        {feed.failed && feed.visible.length === 0 ? (
          <WallError onRetry={feed.retry} />
        ) : showLoading ? (
          <WallLoading />
        ) : feed.visible.length === 0 ? (
          <WallEmpty canLoadMore={!feed.exhausted} onLoadMore={feed.loadMore} loadingMore={feed.loadingMore} />
        ) : (
          <>
            <ul className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3' aria-label='Alertas'>
              {feed.visible.map(item => (
                <li key={item._id}>
                  <WallAlert item={item} now={now} />
                </li>
              ))}
            </ul>
            {feed.failed && (
              <div className='mt-6'>
                <WallError onRetry={feed.retry} />
              </div>
            )}
            {!feed.exhausted && !feed.failed && (
              <div className='mt-10 flex justify-center'>
                <button
                  type='button'
                  onClick={feed.loadMore}
                  disabled={feed.loadingMore}
                  className='landing-button inline-flex h-11 items-center rounded-md border border-[#ddd3bd] bg-white px-5 text-sm font-semibold text-[#2f2a1e] hover:bg-[#fbf8f0] disabled:opacity-60'
                >
                  {feed.loadingMore ? 'Cargando…' : 'Ver alertas más antiguas'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
