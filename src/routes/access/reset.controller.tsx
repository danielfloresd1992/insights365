import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAppDispatch } from '@/store/hooks'
import { signedOut } from '@/store/slices/session.slice'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import ResetForm from './assets/ResetForm'
import { useResetPassword } from './hook/useResetPassword'

/*  CREAR LA CONTRASEÑA NUEVA (/acceso/restablecer#token=…)
 *
 *  Es la pantalla del enlace del correo. El token viene detrás del # (así lo arma la API), que el navegador no manda
 *  a ningún servidor. Nada más llegar se quita de la barra de direcciones y se guarda en el estado de la página: no se
 *  queda a la vista ni en el historial, y si se recarga la pantalla sigue ahí. Al cambiar la contraseña la API cierra
 *  las sesiones de la cuenta, así que aquí también se da por cerrada, y se vuelve a /acceso con el aviso de que cambió.
 */

// tokenInHash = «el token que trae el # de la dirección, si lo trae»
const tokenInHash = (hash: string) => new URLSearchParams(hash.replace(/^#/, '')).get('token')

export default function ResetController() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  useDocumentTitle('Contraseña nueva · insights365')

  const fromHash = tokenInHash(location.hash)
  const token = fromHash ?? (location.state as { token?: string } | null)?.token ?? null

  useEffect(() => {
    if (fromHash) navigate(location.pathname, { replace: true, state: { token: fromHash } })
  }, [fromHash, location.pathname, navigate])

  const form = useResetPassword(token, () => {
    dispatch(signedOut())
    navigate('/acceso', { replace: true, state: { passwordChanged: true } })
  })

  return (
    <ResetForm
      status={form.status}
      account={form.account}
      checkFailure={form.checkFailure}
      password={form.password}
      confirmation={form.confirmation}
      passwordVisible={form.passwordVisible}
      errors={form.errors}
      pending={form.pending}
      onPasswordChange={form.setPassword}
      onConfirmationChange={form.setConfirmation}
      onTogglePassword={form.togglePasswordVisible}
      onSubmit={form.submit}
      onRetry={form.retryCheck}
    />
  )
}
