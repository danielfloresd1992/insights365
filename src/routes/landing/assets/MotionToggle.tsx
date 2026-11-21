/*  EL BOTÓN DE PAUSA DE LA ESCENA 3D. Solo pinta.
 *
 *  Toda animación que dura más de unos segundos lleva cómo pararla. Con movimiento reducido, o en el teléfono, la
 *  escena ya está quieta, así que el botón no aparece.
 */

// MotionControl = «el estado de la animación y cómo cambiarlo; lo lleva el controlador»
export type MotionControl = {
  paused: boolean
  // still = «la escena no se anima (movimiento reducido o teléfono): no hay nada que pausar»
  still: boolean
  onToggle: () => void
}

type MotionToggleProps = {
  motion: MotionControl
  tone: 'light' | 'dark'
  className?: string
}

export default function MotionToggle({ motion, tone, className = '' }: MotionToggleProps) {
  if (motion.still) return null
  const label = motion.paused ? 'Reanudar la animación' : 'Pausar la animación'
  const toneClasses = tone === 'dark'
    ? 'bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/20'
    : 'bg-white/90 text-ink shadow-sm ring-1 ring-black/10 hover:bg-white'

  return (
    <button
      type='button'
      onClick={motion.onToggle}
      aria-label={label}
      title={label}
      className={`landing-button z-10 grid h-11 w-11 place-items-center rounded-full backdrop-blur ${toneClasses} ${className}`}
    >
      {motion.paused ? (
        <svg width='14' height='14' viewBox='0 0 14 14' aria-hidden='true'>
          <path d='M3 1.5v11l9-5.5z' fill='currentColor' />
        </svg>
      ) : (
        <svg width='14' height='14' viewBox='0 0 14 14' aria-hidden='true'>
          <rect x='2.5' y='1.5' width='3' height='11' rx='1' fill='currentColor' />
          <rect x='8.5' y='1.5' width='3' height='11' rx='1' fill='currentColor' />
        </svg>
      )}
    </button>
  )
}
