import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/*  LOS ESTADOS DEL MURO SIN ALERTAS QUE ENSEÑAR: cargando, vacío, sin establecimientos y error. Solo pintan, con los
 *  colores del portal y en su idioma. */

// WallLoading = «la línea de tiempo en gris mientras llega la primera página»: la misma forma que tendrá
export function WallLoading({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div role='status' aria-label={label ?? t('wall.loading')}>
      {[0, 1, 2].map(slot => (
        <div key={slot} className='grid grid-cols-[24px_minmax(0,1fr)] items-start @md/wall:grid-cols-[72px_32px_minmax(0,1fr)]'>
          <div className='hidden space-y-2 pt-4 @md/wall:block'>
            <div className='h-4 w-12 animate-pulse rounded bg-portal-soft' />
            <div className='h-3 w-16 animate-pulse rounded bg-portal-soft' />
          </div>
          <div aria-hidden='true' className='relative self-stretch'>
            <span className='absolute inset-y-0 left-[11px] w-0.5 bg-portal-line @md/wall:left-[15px]' />
          </div>
          <div className='mb-4 ml-1 flex flex-col overflow-hidden rounded-2xl bg-portal-surface ring-1 ring-inset ring-portal-line @md/wall:ml-0 @md/wall:flex-row'>
            <div className='aspect-video w-full animate-pulse bg-portal-soft @md/wall:aspect-[16/10] @md/wall:w-[200px] @3xl/wall:w-[264px] @md/wall:shrink-0' />
            <div className='flex-1 space-y-3 p-4 @md/wall:px-5 @md/wall:py-[18px]'>
              <div className='h-3 w-1/3 animate-pulse rounded bg-portal-soft' />
              <div className='h-4 w-2/3 animate-pulse rounded bg-portal-soft' />
              <div className='h-3 w-1/4 animate-pulse rounded bg-portal-soft' />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// WallNotice = «un aviso en marfil, con su título y su explicación»
function WallNotice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className='rounded-2xl bg-portal-ctl px-6 py-14 text-center'>
      <p className='text-lg font-semibold text-portal-ink'>{title}</p>
      <p className='mx-auto mt-2 max-w-[34rem] text-portal-muted'>{children}</p>
    </div>
  )
}

// WallEmpty = «esos establecimientos no tienen ninguna alerta validada y enviada al grupo»
export function WallEmpty({ several }: { several: boolean }) {
  const { t } = useTranslation()
  return <WallNotice title={several ? t('wall.emptyMany') : t('wall.emptyOne')}>{t('wall.emptyText')}</WallNotice>
}

// WallNoEstablishments = «la cuenta no tiene ningún establecimiento asociado»
export function WallNoEstablishments() {
  const { t } = useTranslation()
  return <WallNotice title={t('wall.noEstablishmentsTitle')}>{t('wall.noEstablishmentsText')}</WallNotice>
}

// WallError = «la API no contestó»
export function WallError({ title, onRetry }: { title?: string; onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <div role='alert' className='rounded-2xl bg-portal-danger-bg px-6 py-10 text-center'>
      <p className='font-semibold text-portal-danger'>{title ?? t('wall.alertsFailed')}</p>
      <p className='mt-1 text-sm text-portal-ink'>{t('wall.failedHint')}</p>
      <button
        type='button'
        onClick={onRetry}
        className='landing-button mt-5 inline-flex h-11 items-center rounded-md bg-portal-surface px-5 text-sm font-semibold text-portal-ink ring-1 ring-portal-ring hover:bg-portal-ctl'
      >
        {t('wall.retry')}
      </button>
    </div>
  )
}
