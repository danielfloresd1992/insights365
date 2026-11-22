import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { safeReturnPath, useSessionCheck } from '@/layouts/hook/useSessionCheck'
import { useDocumentTitle } from '@/routes/landing/hook/useDocumentTitle'
import LoginForm from './assets/LoginForm'
import { useLogin } from './hook/useLogin'

/*  ENTRAR (/acceso)
 *
 *  Si ya hay sesión, salta a donde iba (?volver=) o al panel en vivo. Si no, el formulario de correo y contraseña; al entrar,
 *  lo mismo. Mientras se comprueba la sesión no enseña nada, para que el formulario no parpadee. Si se llega de crear
 *  una contraseña nueva (/acceso/restablecer), el formulario lo confirma arriba.
 */

// AFTER_LOGIN = «a dónde se va al entrar si nadie dijo otra cosa»
const AFTER_LOGIN = '/en-vivo'

// PASSWORD_CHANGED_NOTICE = «lo que dice el formulario al volver de crear la contraseña nueva»
const PASSWORD_CHANGED_NOTICE = 'Listo: tu contraseña cambió. Entra con la nueva.'

export default function AccessController() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const passwordChanged = Boolean((location.state as { passwordChanged?: boolean } | null)?.passwordChanged)
  const navigate = useNavigate()
  const returnPath = safeReturnPath(searchParams.get('volver'), AFTER_LOGIN)
  const { status } = useSessionCheck()
  const form = useLogin(() => navigate(returnPath, { replace: true }))
  useDocumentTitle('Iniciar sesión · insights365')

  if (status === 'signedIn') return <Navigate to={returnPath} replace />
  // Mientras tanto, los mismos dos fondos del formulario (marfil y tinta), para que no destelle en blanco
  if (status === 'unknown') return <div className='min-h-dvh bg-[#2f2a1e] lg:bg-[linear-gradient(to_right,#fbf8f0_50%,#2f2a1e_50%)]' aria-busy='true' />

  return (
    <LoginForm
      email={form.email}
      password={form.password}
      errors={form.errors}
      pending={form.pending}
      passwordVisible={form.passwordVisible}
      notice={passwordChanged ? PASSWORD_CHANGED_NOTICE : null}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onTogglePassword={form.togglePasswordVisible}
      onSubmit={form.submit}
    />
  )
}
