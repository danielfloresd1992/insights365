import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import type { LoginErrors } from '../hook/useLogin'
import BrandMark from './BrandMark'
import LoginShowcase from './LoginShowcase'
import './login.css'

/*  LA PANTALLA DE ENTRAR (/acceso). Colores de Amazonas, en IBM Plex. Solo pinta.
 *
 *  Partida en dos en pantalla ancha: a la izquierda, sobre marfil, la marca y una muestra del muro (LoginShowcase); a
 *  la derecha, el formulario sobre la tinta de Amazonas (#2f2a1e), con la letra en marfil y un brillo verde en la
 *  esquina. Cada campo con su icono, su etiqueta a la vista y su error debajo, en un rojo claro que se lee sobre la
 *  tinta; la contraseña con su ojo para verla; el botón verde con la tinta encima y una rueda mientras entra. Arriba,
 *  la vuelta a la portada; abajo, a quién acudir si no se puede entrar.
 */
type LoginFormProps = {
  email: string
  password: string
  errors: LoginErrors
  pending: boolean
  passwordVisible: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

// ERROR_TEXT = «el rojo de los errores sobre la tinta: el #bf3330 de siempre no se lee en fondo oscuro»
const ERROR_TEXT = 'text-[#f4a29c]'

// fieldClasses = «el campo: algo más claro que la tinta, con borde que se distingue de ella; verde con el foco, rojo
// claro si tiene error. Deja sitio al icono de la izquierda y, si lo lleva, al ojo de la derecha»
const fieldClasses = (hasError: boolean, withEye: boolean) =>
  `login-field block h-12 w-full rounded-lg border bg-[#3a3528] pl-11 text-[0.95rem] text-[#fbf8f0] outline-none transition-[border-color,box-shadow] placeholder:text-[#b3aa96] focus:border-[#29c50c] focus:ring-[3px] focus:ring-[#29c50c]/35 ${
    withEye ? 'pr-12' : 'pr-3.5'
  } ${hasError ? 'border-[#f4a29c]' : 'border-[#8b8577]'}`

// Icon = «un icono de trazo de 20 px que hereda el color del texto»
function Icon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className={className}>
      {children}
    </svg>
  )
}

const FIELD_ICON = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3aa96]'

export default function LoginForm({ email, password, errors, pending, passwordVisible, onEmailChange, onPasswordChange, onTogglePassword, onSubmit }: LoginFormProps) {
  return (
    <div className='grid min-h-dvh bg-white font-plex text-[#2f2a1e] lg:grid-cols-2' style={{ ['--focus-ring' as string]: '#2f2a1e' }}>
      <LoginShowcase />

      {/* Fondo en la tinta de Amazonas (#2f2a1e, pedido del usuario); el anillo de foco pasa a marfil para verse sobre ella */}
      <main
        id='contenido'
        className='relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#2f2a1e] px-6 py-6 text-[#fbf8f0] sm:px-10 lg:py-10'
        style={{ ['--focus-ring' as string]: '#fbf8f0' }}
      >
        <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(44rem_26rem_at_100%_0%,rgba(41,197,12,0.13),transparent_70%),radial-gradient(30rem_20rem_at_0%_100%,rgba(217,164,65,0.08),transparent_70%)]' />

        <div className='flex items-center justify-between gap-4'>
          <Link to='/' className='landing-link inline-flex h-11 items-center gap-2.5 text-[1.05rem] font-semibold lg:hidden'>
            <BrandMark />
            insights365
          </Link>
          <Link to='/' className='landing-link ml-auto inline-flex h-11 items-center gap-2 text-sm font-medium text-[#ddd3bd]'>
            <Icon>
              <path d='M19 12H5M11 6l-6 6 6 6' />
            </Icon>
            Volver a la portada
          </Link>
        </div>

        <div className='flex flex-1 items-center justify-center py-10'>
          <form noValidate onSubmit={onSubmit} className='landing-enter w-full max-w-[400px]' aria-labelledby='login-title'>
            <p className='inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#ddd3bd] ring-1 ring-white/10'>
              <span className='landing-live-dot h-1.5 w-1.5 rounded-full bg-[#29c50c]' aria-hidden='true' />
              Portal de clientes de Jarvis365
            </p>
            <h1 id='login-title' className='mt-5 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em]'>
              Iniciar sesión
            </h1>
            <p className='mt-2 leading-relaxed text-[#ddd3bd]'>Con el correo y la contraseña de tu cuenta de Jarvis365.</p>

            <div className='mt-9'>
              <label htmlFor='login-email' className='text-sm font-semibold'>
                Correo
              </label>
              <div className='relative mt-2'>
                <Icon className={FIELD_ICON}>
                  <rect x='3' y='5' width='18' height='14' rx='2' />
                  <path d='m3.5 7 8.5 6 8.5-6' />
                </Icon>
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
              {errors.email && (
                <p id='login-email-error' className={`mt-1.5 text-sm ${ERROR_TEXT}`}>
                  {errors.email}
                </p>
              )}
            </div>

            <div className='mt-5'>
              <label htmlFor='login-password' className='text-sm font-semibold'>
                Contraseña
              </label>
              <div className='relative mt-2'>
                <Icon className={FIELD_ICON}>
                  <rect x='4.5' y='10.5' width='15' height='10' rx='2' />
                  <path d='M8 10.5V7.5a4 4 0 0 1 8 0v3' />
                </Icon>
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
                <button
                  type='button'
                  onClick={onTogglePassword}
                  aria-pressed={passwordVisible}
                  aria-label={passwordVisible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
                  className='landing-button absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-[#ddd3bd] hover:bg-white/[0.06] hover:text-[#fbf8f0]'
                >
                  {passwordVisible ? (
                    <Icon>
                      <path d='M3 3l18 18' />
                      <path d='M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.5 6 10 6a9.6 9.6 0 0 0 5.4-1.6' />
                      <path d='M9.9 9.9a3 3 0 0 0 4.2 4.2' />
                    </Icon>
                  ) : (
                    <Icon>
                      <path d='M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z' />
                      <circle cx='12' cy='12' r='3' />
                    </Icon>
                  )}
                </button>
              </div>
              {errors.password && (
                <p id='login-password-error' className={`mt-1.5 text-sm ${ERROR_TEXT}`}>
                  {errors.password}
                </p>
              )}
            </div>

            {errors.form && (
              <p role='alert' className={`mt-6 rounded-lg bg-[#f4a29c]/10 px-3.5 py-3 text-sm ring-1 ring-[#f4a29c]/30 ${ERROR_TEXT}`}>
                {errors.form}
              </p>
            )}

            <button
              type='submit'
              disabled={pending}
              className='landing-button group mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#29c50c] font-semibold text-[#2f2a1e] shadow-[0_14px_30px_-14px_rgba(41,197,12,0.7)] hover:bg-[#2fd610] disabled:opacity-70'
            >
              {pending ? (
                <>
                  <svg viewBox='0 0 24 24' width='18' height='18' className='animate-spin motion-reduce:animate-none' aria-hidden='true'>
                    <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeOpacity='0.25' strokeWidth='3' />
                    <path d='M21 12a9 9 0 0 0-9-9' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
                  </svg>
                  Entrando…
                </>
              ) : (
                <>
                  Entrar al muro
                  <Icon className='transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none'>
                    <path d='M5 12h14M13 6l6 6-6 6' />
                  </Icon>
                </>
              )}
            </button>

            <p className='mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-[#ddd3bd]'>
              ¿No puedes entrar? Habla con tu contacto de Jarvis365: tu cuenta es la misma de allí.
            </p>
          </form>
        </div>

        <p className='text-center text-xs text-[#b3aa96] lg:hidden'>© 2026 Amazonas365</p>
      </main>
    </div>
  )
}
