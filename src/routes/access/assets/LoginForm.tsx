import type { FormEvent } from 'react'
import { Link } from 'react-router'
import type { LoginErrors } from '../hook/useLogin'
import AccessShell from './AccessShell'
import { FIELD_ICON, fieldClasses } from './accessStyles'
import { EyeToggle, FieldError, FormAlert, FormIntro, LockIcon, MailIcon, SubmitButton } from './accessUi'

/*  LA PANTALLA DE ENTRAR (/acceso). Solo pinta.
 *
 *  Dentro del marco de /acceso (AccessShell): cada campo con su icono, su etiqueta a la vista y su error debajo; la
 *  contraseña con su ojo para verla y, en su misma línea, el enlace para recuperarla, que se lleva el correo escrito;
 *  el botón verde con una rueda mientras entra. Si se llega de crear una contraseña nueva, un aviso verde arriba lo
 *  confirma. Abajo, a quién acudir si no se puede entrar.
 */
type LoginFormProps = {
  email: string
  password: string
  errors: LoginErrors
  pending: boolean
  passwordVisible: boolean
  notice: string | null
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export default function LoginForm({ email, password, errors, pending, passwordVisible, notice, onEmailChange, onPasswordChange, onTogglePassword, onSubmit }: LoginFormProps) {
  return (
    <AccessShell>
      <form noValidate onSubmit={onSubmit} className='landing-enter w-full max-w-[400px]' aria-labelledby='login-title'>
        <FormIntro eyebrow='Portal de clientes de Jarvis365' title='Iniciar sesión' titleId='login-title'>
          <p>Con el correo y la contraseña de tu cuenta de Jarvis365.</p>
        </FormIntro>

        {notice && (
          <FormAlert tone='success' className='mt-6'>
            {notice}
          </FormAlert>
        )}

        <div className='mt-9'>
          <label htmlFor='login-email' className='text-sm font-semibold'>
            Correo
          </label>
          <div className='relative mt-2'>
            <MailIcon className={FIELD_ICON} />
            <input
              id='login-email'
              type='email'
              autoComplete='email'
              inputMode='email'
              placeholder='nombre@restaurante.com'
              value={email}
              onChange={event => onEmailChange(event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'login-email-error' : undefined}
              className={fieldClasses(Boolean(errors.email), false)}
            />
          </div>
          {errors.email && <FieldError id='login-email-error'>{errors.email}</FieldError>}
        </div>

        <div className='mt-5'>
          <div className='flex items-baseline justify-between gap-4'>
            <label htmlFor='login-password' className='text-sm font-semibold'>
              Contraseña
            </label>
            {/* El correo escrito viaja a la pantalla de recuperar, para no tener que volver a escribirlo */}
            <Link
              to='/acceso/recuperar'
              state={{ email: email.trim() }}
              className='landing-link -my-1 py-1 text-sm font-medium text-[#ddd3bd] underline decoration-[#8b8577] underline-offset-4 hover:text-[#fbf8f0]'
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <div className='relative mt-2'>
            <LockIcon className={FIELD_ICON} />
            <input
              id='login-password'
              type={passwordVisible ? 'text' : 'password'}
              autoComplete='current-password'
              value={password}
              onChange={event => onPasswordChange(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'login-password-error' : undefined}
              className={fieldClasses(Boolean(errors.password), true)}
            />
            <EyeToggle visible={passwordVisible} onToggle={onTogglePassword} />
          </div>
          {errors.password && <FieldError id='login-password-error'>{errors.password}</FieldError>}
        </div>

        {errors.form && (
          <FormAlert tone='error' className='mt-6'>
            {errors.form}
          </FormAlert>
        )}

        <SubmitButton pending={pending} pendingLabel='Entrando…' className='mt-8'>
          Entrar al muro
        </SubmitButton>

        <p className='mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-[#ddd3bd]'>
          ¿No tienes cuenta o no recuerdas tu correo? Habla con tu contacto de Jarvis365: tu cuenta es la misma de allí.
        </p>
      </form>
    </AccessShell>
  )
}
