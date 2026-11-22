import { useLocation } from 'react-router'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import ForgotForm from './assets/ForgotForm'
import { useForgotPassword } from './hook/useForgotPassword'

/*  PEDIR EL ENLACE PARA CREAR UNA CONTRASEÑA NUEVA (/acceso/recuperar)
 *
 *  Se llega desde «¿Olvidaste tu contraseña?» en /acceso, que trae el correo que ya estaba escrito para no tener que
 *  volver a escribirlo. No mira la sesión: cualquiera puede pedir el enlace, y la API no dice si la cuenta existe.
 */
export default function ForgotController() {
  const location = useLocation()
  const initialEmail = (location.state as { email?: string } | null)?.email ?? ''
  const form = useForgotPassword(initialEmail)
  useDocumentTitle('Recuperar la contraseña · insights365')

  return (
    <ForgotForm
      email={form.email}
      errors={form.errors}
      pending={form.pending}
      sentTo={form.sentTo}
      minutes={form.minutes}
      resendIn={form.resendIn}
      onEmailChange={form.setEmail}
      onSubmit={form.submit}
      onResend={form.resend}
      onChangeEmail={form.changeEmail}
    />
  )
}
