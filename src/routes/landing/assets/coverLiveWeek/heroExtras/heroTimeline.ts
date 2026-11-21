import type { ReactNode } from 'react'
import { FLOOR_ALERTS } from '../../landing.content'

/*  LOS HUECOS DE LA PORTADA DE '/' Y EL RELOJ DE SUS NOVEDADES
 *
 *  HeroSlots son los huecos de la portada donde se añade algo sin quitar nada: arriba del texto, debajo de la
 *  leyenda, encima de la escena y una franja al pie. Y el reloj de las novedades: la sala enciende las alertas de
 *  FLOOR_ALERTS en vuelta, y aquí cada una tiene su hora dentro de un turno de ejemplo de 12:00 a 16:00, para que la
 *  píldora y la regla del turno digan la misma hora que la tarjeta de novedades.
 */

export type HeroSlots = {
  top?: ReactNode
  belowText?: ReactNode
  scene?: ReactNode
  bottom?: ReactNode
}

// SHIFT_START_MINUTES, SHIFT_END_MINUTES = «el turno de ejemplo, de 12:00 a 16:00, en minutos del día»
export const SHIFT_START_MINUTES = 12 * 60
export const SHIFT_END_MINUTES = 16 * 60
// ALERT_STEP_MINUTES = «cuánto pasa, en la hora del ejemplo, entre una novedad y la siguiente»
const ALERT_STEP_MINUTES = 26

// floorAlert = «la novedad número alertNumber de la sala»
export const floorAlert = (alertNumber: number) => FLOOR_ALERTS[alertNumber % FLOOR_ALERTS.length]

// alertMinute = «a qué minuto del día se anotó esa novedad; cada vuelta de la lista empieza el turno otra vez»
export const alertMinute = (alertNumber: number) => SHIFT_START_MINUTES + 4 + (alertNumber % FLOOR_ALERTS.length) * ALERT_STEP_MINUTES

export const formatClock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
