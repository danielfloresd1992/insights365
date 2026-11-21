import type { HeroSlots } from './heroTimeline'
import { ScrollCue, ShiftPill, ShiftRuler } from './HeroShift'
import './heroExtras.css'

/*  LO QUE ENRIQUECE LA PORTADA DE '/', REPARTIDO EN SUS HUECOS (sin quitar nada de lo que ya tenía)
 *
 *  La propuesta elegida, «El turno» (la C): arriba del texto la píldora con el reloj del turno; debajo de la leyenda
 *  la regla del turno, alerta por alerta, sobre la tinta de Amazonas; y al pie, la invitación a bajar.
 *
 *  @param cycle  en qué vuelta van las novedades de la sala, para que todo diga la misma hora
 */
export function buildHeroExtras(cycle: number): HeroSlots {
  return { top: <ShiftPill cycle={cycle} />, belowText: <ShiftRuler cycle={cycle} />, bottom: <ScrollCue /> }
}
