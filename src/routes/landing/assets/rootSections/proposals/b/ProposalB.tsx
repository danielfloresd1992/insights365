import ShiftStory from './ShiftStory'
import WeekAssembly from './WeekAssembly'
import EverywhereWall from './EverywhereWall'

/*  PROPUESTA B · UN TURNO, MINUTO A MINUTO
 *
 *  Lo que sigue a las tarjetas, contado como una historia: un almuerzo de ejemplo alerta por alerta, con el reloj y el
 *  plano de la sala al lado; después la semana, que se arma turno a turno y avisa si falta alguno, y al final el muro
 *  en la computadora y en el teléfono, recibiendo alertas. Solo pinta.
 */
export default function ProposalB() {
  return (
    <>
      <ShiftStory />
      <WeekAssembly />
      <EverywhereWall />
    </>
  )
}
