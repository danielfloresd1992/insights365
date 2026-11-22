import type { ReactNode } from 'react'

/*  LOS ICONOS DEL PORTAL: trazos de 24×24 que toman el color del texto. Todos son decorado (aria-hidden): quien los
 *  usa pone el nombre del botón en aria-label o en su texto. Solo pintan. */

type IconProps = { size?: number; className?: string }

function Stroke({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      aria-hidden='true'
      className={className}
      fill='none'
      stroke='currentColor'
      strokeWidth={1.8}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      {children}
    </svg>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <circle cx='12' cy='12' r='4' />
      <path d='M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4' />
    </Stroke>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z' />
    </Stroke>
  )
}

export function SpeakerIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M4 9.5h3.5L12 5.5v13l-4.5-4H4z' />
      <path d='M15.5 9a4 4 0 0 1 0 6' />
      <path d='M18 6.5a7.5 7.5 0 0 1 0 11' />
    </Stroke>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M4 7h16M4 12h16M4 17h16' />
    </Stroke>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M6 6l12 12M18 6 6 18' />
    </Stroke>
  )
}

export function SignOutIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3' />
      <path d='M10 16l4-4-4-4' />
      <path d='M14 12H4' />
    </Stroke>
  )
}

// PathIcon = «un icono de trazo dado por su `d`», como los de las familias de alertas (libs/alertFamily)
export function PathIcon({ d, strokeWidth = 2, ...props }: IconProps & { d: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={props.size ?? 18}
      height={props.size ?? 18}
      aria-hidden='true'
      className={props.className}
      fill='none'
      stroke='currentColor'
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <path d={d} />
    </svg>
  )
}

// ChevronLeftIcon, ChevronRightIcon = «anterior» y «siguiente» (el visor de imágenes)
export function ChevronLeftIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M15 5l-7 7 7 7' />
    </Stroke>
  )
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M9 5l7 7-7 7' />
    </Stroke>
  )
}

// ImagesIcon = «varias imágenes», para la marca de la alerta que tiene más de una
export function ImagesIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <rect x='7' y='7' width='14' height='12' rx='2' />
      <path d='M17 4H5a2 2 0 0 0-2 2v10' />
      <path d='m7 16 4-4 3 3 2-2 5 5' />
    </Stroke>
  )
}

// CameraIcon = «la cámara», para el hueco de una alerta sin foto
export function CameraIcon(props: IconProps) {
  return (
    <Stroke {...props}>
      <path d='M4 8h3l1.5-2h7L17 8h3v11H4z' />
      <circle cx='12' cy='13' r='3.5' />
    </Stroke>
  )
}

// PlayIcon, StopIcon = «sonar» y «parar»: rellenos, para que se lean pequeños
export function PlayIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox='0 0 24 24' width={size} height={size} aria-hidden='true' className={className} fill='currentColor'>
      <path d='M8 5.5v13l10.5-6.5z' />
    </svg>
  )
}

export function StopIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox='0 0 24 24' width={size} height={size} aria-hidden='true' className={className} fill='currentColor'>
      <rect x='6' y='6' width='12' height='12' rx='2' />
    </svg>
  )
}
