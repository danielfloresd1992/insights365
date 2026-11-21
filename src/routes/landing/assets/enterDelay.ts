import type { CSSProperties } from 'react'

// enterDelay = «el estilo que retrasa la entrada de una pieza de la portada (clase landing-enter) tantos milisegundos»
export const enterDelay = (milliseconds: number) => ({ '--enter-delay': `${milliseconds}ms` }) as CSSProperties
