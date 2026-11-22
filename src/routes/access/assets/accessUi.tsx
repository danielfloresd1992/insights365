import type { ReactNode } from 'react'
import { ERROR_TEXT } from './accessStyles'

/*  LAS PIEZAS DE LOS FORMULARIOS DE /acceso. Solo pintan.
 *
 *  Las comparten entrar, pedir el enlace y crear la contraseña nueva, para que las tres pantallas se vean como una:
 *  los iconos de trazo, el ojo de la contraseña, la cabecera del formulario, el botón verde con su rueda y los
 *  avisos, en rojo claro o en verde según digan que algo falló o que salió bien.
 */

// Icon = «un icono de trazo de 20 px que hereda el color del texto»
export function Icon({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox='0 0 24 24' width='20' height='20' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className={className}>
      {children}
    </svg>
  )
}

export function MailIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x='3' y='5' width='18' height='14' rx='2' />
      <path d='m3.5 7 8.5 6 8.5-6' />
    </Icon>
  )
}

export function LockIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x='4.5' y='10.5' width='15' height='10' rx='2' />
      <path d='M8 10.5V7.5a4 4 0 0 1 8 0v3' />
    </Icon>
  )
}

export function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d='M5 12h14M13 6l6 6-6 6' />
    </Icon>
  )
}

export function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d='M19 12H5M11 6l-6 6 6 6' />
    </Icon>
  )
}

// Spinner = «la rueda de «enviando», que gira salvo con movimiento reducido»
export function Spinner() {
  return (
    <svg viewBox='0 0 24 24' width='18' height='18' className='animate-spin motion-reduce:animate-none' aria-hidden='true'>
      <circle cx='12' cy='12' r='9' fill='none' stroke='currentColor' strokeOpacity='0.25' strokeWidth='3' />
      <path d='M21 12a9 9 0 0 0-9-9' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' />
    </svg>
  )
}

// EyeToggle = «el ojo dentro del campo de contraseña: la enseña en claro o la tapa»
export function EyeToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type='button'
      onClick={onToggle}
      aria-pressed={visible}
      aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
      className='landing-button absolute right-1 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-[#ddd3bd] hover:bg-white/[0.06] hover:text-[#fbf8f0]'
    >
      {visible ? (
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
  )
}

// FormIntro = «la cabecera de cada formulario: la etiqueta con su punto vivo, el título y la entrada»
export function FormIntro({ eyebrow, title, titleId, children }: { eyebrow: string; title: string; titleId: string; children?: ReactNode }) {
  return (
    <>
      <p className='inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#ddd3bd] ring-1 ring-white/10'>
        <span className='landing-live-dot h-1.5 w-1.5 rounded-full bg-[#29c50c]' aria-hidden='true' />
        {eyebrow}
      </p>
      <h1 id={titleId} className='mt-5 text-[2.25rem] font-semibold leading-tight tracking-[-0.03em]'>
        {title}
      </h1>
      {children && <div className='mt-2 leading-relaxed text-[#ddd3bd]'>{children}</div>}
    </>
  )
}

// FieldError = «el error de un campo, debajo de él»
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className={`mt-1.5 text-sm ${ERROR_TEXT}`}>
      {children}
    </p>
  )
}

// FormAlert = «un aviso del formulario entero: rojo claro si algo falló, verde si algo salió bien»
export function FormAlert({ tone, children, className = '' }: { tone: 'error' | 'success'; children: ReactNode; className?: string }) {
  const toneClasses = tone === 'error' ? `bg-[#f4a29c]/10 ring-[#f4a29c]/30 ${ERROR_TEXT}` : 'bg-[#29c50c]/10 text-[#c9f0bf] ring-[#29c50c]/35'
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg px-3.5 py-3 text-sm leading-relaxed ring-1 ${toneClasses} ${className}`}>
      {children}
    </p>
  )
}

// SubmitButton = «el botón verde del formulario, con la tinta encima: la flecha, o la rueda mientras se envía»
export function SubmitButton({ pending, pendingLabel, children, className = '' }: { pending: boolean; pendingLabel: string; children: ReactNode; className?: string }) {
  return (
    <button
      type='submit'
      disabled={pending}
      className={`landing-button group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#29c50c] font-semibold text-[#2f2a1e] shadow-[0_14px_30px_-14px_rgba(41,197,12,0.7)] hover:bg-[#2fd610] disabled:opacity-70 ${className}`}
    >
      {pending ? (
        <>
          <Spinner />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowRightIcon className='transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none' />
        </>
      )}
    </button>
  )
}
