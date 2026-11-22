import { useEffect, useRef, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { ForgotErrors } from '../hook/useForgotPassword'
import AccessShell from './AccessShell'
import { FIELD_ICON, SECONDARY_BUTTON, TEXT_LINK, fieldClasses } from './accessStyles'
import { FieldError, FormAlert, FormIntro, MailIcon, Spinner, SubmitButton } from './accessUi'

/*  PEDIR EL ENLACE (/acceso/recuperar). Solo pinta.
 *
 *  Dos momentos en el marco de /acceso. Primero, el correo de la cuenta y el botón para mandar el enlace. Después,
 *  «revisa tu correo»: a qué dirección se pidió, cuánto dura el enlace y qué hacer si no llega, con el botón de pedir
 *  otro (apagado, con su cuenta atrás, mientras dura la espera) y la vuelta a escribir el correo. El texto no promete
 *  que el correo llegue: la API no dice si la cuenta existe, y la pantalla tampoco.
 */
type ForgotFormProps = {
  email: string
  errors: ForgotErrors
  pending: boolean
  sentTo: string | null
  minutes: number
  resendIn: number
  onEmailChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onResend: () => void
  onChangeEmail: () => void
}

// BACK_TO_LOGIN = «la vuelta de arriba: a entrar, no a la portada»
const BACK_TO_LOGIN = { to: '/acceso', label: 'Volver a iniciar sesión' }

// countdown = «los segundos que faltan, como 0:42»
const countdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

export default function ForgotForm(props: ForgotFormProps) {
  return <AccessShell back={BACK_TO_LOGIN}>{props.sentTo ? <SentNotice {...props} sentTo={props.sentTo} /> : <EmailForm {...props} />}</AccessShell>
}

function EmailForm({ email, errors, pending, onEmailChange, onSubmit }: ForgotFormProps) {
  return (
    <form noValidate onSubmit={onSubmit} className='landing-enter w-full max-w-[400px]' aria-labelledby='forgot-title'>
      <FormIntro eyebrow='Recuperar el acceso' title='¿Olvidaste tu contraseña?' titleId='forgot-title'>
        <p>Escribe el correo de tu cuenta de Jarvis365 y te mandamos un enlace para crear una nueva.</p>
      </FormIntro>

      <div className='mt-9'>
        <label htmlFor='forgot-email' className='text-sm font-semibold'>
          Correo
        </label>
        <div className='relative mt-2'>
          <MailIcon className={FIELD_ICON} />
          <input
            id='forgot-email'
            type='email'
            autoComplete='email'
            inputMode='email'
            placeholder='nombre@restaurante.com'
            value={email}
            onChange={event => onEmailChange(event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            className={fieldClasses(Boolean(errors.email), false)}
          />
        </div>
        {errors.email && <FieldError id='forgot-email-error'>{errors.email}</FieldError>}
      </div>

      {errors.form && (
        <FormAlert tone='error' className='mt-6'>
          {errors.form}
        </FormAlert>
      )}

      <SubmitButton pending={pending} pendingLabel='Enviando…' className='mt-8'>
        Enviar el enlace
      </SubmitButton>

      <p className='mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-[#ddd3bd]'>
        ¿Te acordaste?{' '}
        <Link to='/acceso' className={TEXT_LINK}>
          Inicia sesión
        </Link>
      </p>
    </form>
  )
}

function SentNotice({ sentTo, minutes, resendIn, pending, errors, onResend, onChangeEmail }: ForgotFormProps & { sentTo: string }) {
  // Al pasar a «revisa tu correo» el foco va al título, para que un lector de pantalla lo anuncie
  const titleRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const waiting = resendIn > 0
  return (
    <section className='landing-enter w-full max-w-[400px]' aria-labelledby='forgot-sent-title'>
      <span className='inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#29c50c]/15 text-[#29c50c] ring-1 ring-[#29c50c]/30' aria-hidden='true'>
        <MailIcon className='h-7 w-7' />
      </span>
      <h1 id='forgot-sent-title' ref={titleRef} tabIndex={-1} className='mt-6 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em] outline-none'>
        Revisa tu correo
      </h1>
      <p className='mt-2 leading-relaxed text-[#ddd3bd]'>
        Si <strong className='break-words font-semibold text-[#fbf8f0]'>{sentTo}</strong> tiene una cuenta de Jarvis365, te llegará un enlace para crear una
        contraseña nueva.
      </p>

      <ul className='mt-7 grid gap-3 text-sm leading-relaxed text-[#ddd3bd]'>
        {[
          `El enlace dura ${minutes} minutos y sirve una sola vez.`,
          'Si en un par de minutos no aparece, mira en spam o en promociones.',
          'Si pides otro, el anterior deja de valer: usa siempre el último.',
        ].map(hint => (
          <li key={hint} className='flex gap-3'>
            <span className='mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[#29c50c]' aria-hidden='true' />
            {hint}
          </li>
        ))}
      </ul>

      {errors.form && (
        <FormAlert tone='error' className='mt-6'>
          {errors.form}
        </FormAlert>
      )}

      <button type='button' onClick={onResend} disabled={waiting || pending} className={`${SECONDARY_BUTTON} mt-8`}>
        {pending ? (
          <>
            <Spinner />
            Enviando…
          </>
        ) : waiting ? (
          <>
            Pedir otro enlace en <span className='font-plex-mono tabular-nums'>{countdown(resendIn)}</span>
          </>
        ) : (
          'Pedir otro enlace'
        )}
      </button>

      <p className='mt-8 border-t border-white/10 pt-6 text-sm leading-relaxed text-[#ddd3bd]'>
        ¿No es tu correo?{' '}
        <button type='button' onClick={onChangeEmail} className={TEXT_LINK}>
          Escribe otro
        </button>
      </p>
    </section>
  )
}
