import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { notificationSupport, requestNotifications, type NotificationSupport } from '@/libs/notifications'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { notificationsChanged } from '@/store/slices/preferences.slice'

/*  LOS AVISOS DEL SISTEMA: su interruptor (arriba del panel de la voz, en la barra y en el menú del móvil)
 *
 *  Con permiso del navegador es un interruptor, como el de la voz, que va a las preferencias. Sin permiso todavía,
 *  un botón que lo pide (tiene que ser un toque: iOS no deja pedirlo de otra forma). Si está bloqueado, si el
 *  navegador no tiene avisos o si es un iPhone en Safari (solo funcionan desde la pantalla de inicio), lo explica.
 *  El permiso puede cambiar fuera del portal (en los ajustes del sitio): se vuelve a mirar al volver a la pestaña.
 *
 *  @param compact  sin la explicación (el menú del móvil)
 */

const TOGGLE = 'flex min-h-14 w-full items-center justify-between gap-4 rounded-xl bg-portal-ctl py-2.5 pl-3.5 pr-3 text-left text-sm text-portal-ink ring-1 ring-inset ring-portal-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'

export default function NotificationsToggle({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const on = useAppSelector(state => state.preferences.notifications.on)
  const dispatch = useAppDispatch()
  const [support, setSupport] = useState<NotificationSupport>(() => notificationSupport())

  useEffect(() => {
    const recheck = () => setSupport(notificationSupport())
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    return () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('focus', recheck)
    }
  }, [])

  const ask = () => {
    requestNotifications().then(next => {
      setSupport(next)
      if (next === 'ready') dispatch(notificationsChanged(true))
    })
  }

  const label = (
    <span className='flex flex-col gap-0.5'>
      <span className='font-semibold'>{t('notify.toggle')}</span>
      {!compact && <span className='text-xs leading-snug text-portal-muted'>{t('notify.hint')}</span>}
    </span>
  )

  if (support === 'ready') {
    return (
      <div className='flex flex-col gap-1.5'>
        <button type='button' aria-pressed={on} onClick={() => dispatch(notificationsChanged(!on))} className={TOGGLE}>
          {label}
          <span aria-hidden='true' className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-[#29c50c]' : 'bg-portal-ring'}`}>
            <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-[left] ${on ? 'left-[21px]' : 'left-[3px]'}`} />
          </span>
        </button>
        <p className='m-0 text-xs leading-snug text-portal-muted'>{on ? t('notify.ready') : t('notify.off')}</p>
      </div>
    )
  }

  if (support === 'ask') {
    return (
      <div className='flex flex-col gap-2 rounded-xl bg-portal-ctl p-3.5 text-sm text-portal-ink ring-1 ring-inset ring-portal-ring'>
        {label}
        <button
          type='button'
          onClick={ask}
          className='min-h-11 self-start rounded-full bg-[#29c50c] px-4 text-sm font-semibold text-[#2f2a1e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'
        >
          {t('notify.enable')}
        </button>
      </div>
    )
  }

  const reason = support === 'denied' ? t('notify.denied') : support === 'ios-install' ? t('notify.iosInstall') : t('notify.unsupported')
  return (
    <div className='flex flex-col gap-1 rounded-xl bg-portal-ctl p-3.5 text-sm text-portal-ink ring-1 ring-inset ring-portal-ring'>
      <span className='font-semibold'>{t('notify.toggle')}</span>
      <span className='text-xs leading-snug text-portal-muted'>{reason}</span>
    </div>
  )
}
