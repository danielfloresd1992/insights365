import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router'
import type { ResetCheck } from '@/ajax/user.ajax'
import { PASSWORD_RULES } from '../hook/passwordRules'
import type { ResetErrors, ResetStatus } from '../hook/useResetPassword'
import AccessShell from './AccessShell'
import { FIELD_ICON, SECONDARY_BUTTON, TEXT_LINK, fieldClasses } from './accessStyles'
import { ArrowRightIcon, EyeToggle, FieldError, FormAlert, FormIntro, Icon, LockIcon, Spinner, SubmitButton } from './accessUi'

/*  CREAR LA CONTRASEÑA NUEVA (/acceso/restablecer). Solo pinta.
 *
 *  Según en qué esté el enlace: mientras se comprueba, una rueda; si vale, de quién es la cuenta y la contraseña dos
 *  veces, con su ojo y la lista de reglas que se va marcando en verde según se cumplen; si no vale (caducó, se usó,
 *  se pidió otro) o falta, lo dice y lleva a pedir otro; si no se pudo hablar con la API, deja reintentar.
 */
type ResetFormProps = {
  status: ResetStatus
  account: ResetCheck | null
  checkFailure: string
  password: string
  confirmation: string
  passwordVisible: boolean
  errors: ResetErrors
  pending: boolean
  onPasswordChange: (value: string) => void
  onConfirmationChange: (value: string) => void
  onTogglePassword: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRetry: () => void
}

// BACK_TO_LOGIN = «la vuelta de arriba: a entrar, no a la portada»
const BACK_TO_LOGIN = { to: '/acceso', label: 'Volver a iniciar sesión' }

export default function ResetForm(props: ResetFormProps) {
  return (
    <AccessShell back={BACK_TO_LOGIN}>
      {props.status === 'checking' && (
        <p role='status' className='inline-flex items-center gap-3 text-[#ddd3bd]'>
          <Spinner />
          Comprobando el enlace…
        </p>
      )}
      {props.status === 'ready' && <NewPasswordForm {...props} />}
      {props.status === 'invalid' && (
        <DeadEnd title='Este enlace ya no vale'>
          Caducó, ya se usó o se pidió otro después. Los enlaces duran 30 minutos y sirven una sola vez: pide uno nuevo y usa
          el último que te llegue.
        </DeadEnd>
      )}
      {props.status === 'missing' && (
        <DeadEnd title='Falta el enlace'>
          Esta pantalla se abre con el enlace del correo. Ábrelo tal como llegó o, si se perdió, pide uno nuevo.
        </DeadEnd>
      )}
      {props.status === 'unreachable' && (
        <section className='landing-enter w-full max-w-[400px]' aria-labelledby='reset-down-title'>
          <h1 id='reset-down-title' className='text-[2.25rem] font-semibold leading-tight tracking-[-0.03em]'>
            No se pudo comprobar el enlace
          </h1>
          <p className='mt-2 leading-relaxed text-[#ddd3bd]'>{props.checkFailure}</p>
          <button type='button' onClick={props.onRetry} className={`${SECONDARY_BUTTON} mt-8`}>
            Intentar de nuevo
          </button>
        </section>
      )}
    </AccessShell>
  )
}

// DeadEnd = «un enlace que no sirve: qué pasó y el botón para pedir otro»
function DeadEnd({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='landing-enter w-full max-w-[400px]' aria-labelledby='reset-dead-title'>
      <span className='inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#d9a441]/15 text-[#d9a441] ring-1 ring-[#d9a441]/30' aria-hidden='true'>
        <Icon className='h-7 w-7'>
          <circle cx='12' cy='12' r='9' />
          <path d='M12 7v5l3 2' />
        </Icon>
      </span>
      <h1 id='reset-dead-title' className='mt-6 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em]'>
        {title}
      </h1>
      <p className='mt-2 leading-relaxed text-[#ddd3bd]'>{children}</p>
      <Link
        to='/acceso/recuperar'
        className='landing-button group mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#29c50c] font-semibold text-[#2f2a1e] shadow-[0_14px_30px_-14px_rgba(41,197,12,0.7)] hover:bg-[#2fd610]'
      >
        Pedir un enlace nuevo
        <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none' />
      </Link>
      <p className='mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-[#ddd3bd]'>
        ¿Ya la cambiaste?{' '}
        <Link to='/acceso' className={TEXT_LINK}>
          Inicia sesión
        </Link>
      </p>
    </section>
  )
}

// RuleMark = «la marca de una regla: un círculo vacío, o verde con su visto cuando se cumple»
function RuleMark({ met }: { met: boolean }) {
  return met ? (
    <svg viewBox='0 0 16 16' width='16' height='16' aria-hidden='true' className='mt-0.5 shrink-0'>
      <circle cx='8' cy='8' r='8' fill='#29c50c' />
      <path d='m4.8 8.2 2.1 2.1 4.3-4.5' fill='none' stroke='#2f2a1e' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' />
    </svg>
  ) : (
    <svg viewBox='0 0 16 16' width='16' height='16' aria-hidden='true' className='mt-0.5 shrink-0'>
      <circle cx='8' cy='8' r='7' fill='none' stroke='#8b8577' strokeWidth='1.5' />
    </svg>
  )
}

function NewPasswordForm({
  account,
  password,
  confirmation,
  passwordVisible,
  errors,
  pending,
  onPasswordChange,
  onConfirmationChange,
  onTogglePassword,
  onSubmit,
}: ResetFormProps) {
  const passwordDescribedBy = ['reset-rules', errors.password ? 'reset-password-error' : ''].filter(Boolean).join(' ')
  return (
    <form noValidate onSubmit={onSubmit} className='landing-enter w-full max-w-[400px]' aria-labelledby='reset-title'>
      <FormIntro eyebrow='Contraseña nueva' title='Crea tu contraseña nueva' titleId='reset-title'>
        {account && (
          <p>
            Para la cuenta{account.name ? ` de ${account.name}` : ''}, <strong className='break-words font-semibold text-[#fbf8f0]'>{account.email}</strong>.
            Al guardarla se cerrarán las sesiones que tengas abiertas.
          </p>
        )}
      </FormIntro>

      <div className='mt-9'>
        <label htmlFor='reset-password' className='text-sm font-semibold'>
          Contraseña nueva
        </label>
        <div className='relative mt-2'>
          <LockIcon className={FIELD_ICON} />
          <input
            id='reset-password'
            type={passwordVisible ? 'text' : 'password'}
            autoComplete='new-password'
            value={password}
            onChange={event => onPasswordChange(event.target.value)}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={passwordDescribedBy}
            className={fieldClasses(Boolean(errors.password), true)}
          />
          <EyeToggle visible={passwordVisible} onToggle={onTogglePassword} />
        </div>
        {errors.password && <FieldError id='reset-password-error'>{errors.password}</FieldError>}

        <ul id='reset-rules' className='mt-3 grid gap-1.5 text-sm' aria-label='Lo que tiene que tener la contraseña'>
          {PASSWORD_RULES.map(rule => {
            const met = rule.test(password)
            return (
              <li key={rule.id} className={`flex items-start gap-2 transition-colors ${met ? 'text-[#c9f0bf]' : 'text-[#b3aa96]'}`}>
                <RuleMark met={met} />
                <span>
                  {rule.label}
                  <span className='sr-only'>{met ? ': cumplida' : ': falta'}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className='mt-6'>
        <label htmlFor='reset-confirmation' className='text-sm font-semibold'>
          Repite la contraseña
        </label>
        <div className='relative mt-2'>
          <LockIcon className={FIELD_ICON} />
          <input
            id='reset-confirmation'
            type={passwordVisible ? 'text' : 'password'}
            autoComplete='new-password'
            value={confirmation}
            onChange={event => onConfirmationChange(event.target.value)}
            aria-invalid={Boolean(errors.confirmation)}
            aria-describedby={errors.confirmation ? 'reset-confirmation-error' : undefined}
            className={fieldClasses(Boolean(errors.confirmation), false)}
          />
        </div>
        {errors.confirmation && <FieldError id='reset-confirmation-error'>{errors.confirmation}</FieldError>}
      </div>

      {errors.form && (
        <FormAlert tone='error' className='mt-6'>
          {errors.form}
        </FormAlert>
      )}

      <SubmitButton pending={pending} pendingLabel='Guardando…' className='mt-8'>
        Guardar la contraseña
      </SubmitButton>
    </form>
  )
}
