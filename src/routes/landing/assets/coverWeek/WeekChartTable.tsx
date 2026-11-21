import { DEMO_WEEK } from '../landing.content'

/*  LA GRÁFICA 3D DE LA PORTADA B, EN TEXTO
 *
 *  La escena es solo imagen (aria-hidden). Estos son sus mismos datos para quien usa lector de pantalla: por día y
 *  turno, los procesos evaluados y cuántos acabaron en demora de preparación. No se ve en pantalla. Solo pinta.
 *
 *  La clase sr-only va en un div y no en la tabla: una tabla no respeta su ancho de 1px, se estira a su contenido y
 *  en el teléfono ensancha la página entera.
 */
export default function WeekChartTable() {
  return (
    <div className='sr-only'>
      <table>
        <caption>
          Procesos evaluados y demoras de preparación por día y turno, {DEMO_WEEK.branch}, {DEMO_WEEK.range}
        </caption>
        <thead>
          <tr>
            <th scope='col'>Día</th>
            <th scope='col'>Procesos diurnos</th>
            <th scope='col'>Demoras diurnas</th>
            <th scope='col'>Procesos nocturnos</th>
            <th scope='col'>Demoras nocturnas</th>
          </tr>
        </thead>
        <tbody>
          {DEMO_WEEK.days.map((dayName, dayIndex) => (
            <tr key={dayName}>
              <th scope='row'>{dayName}</th>
              <td>{DEMO_WEEK.processes.day[dayIndex]}</td>
              <td>{DEMO_WEEK.prepDelays.day[dayIndex]}</td>
              <td>{DEMO_WEEK.processes.night[dayIndex]}</td>
              <td>{DEMO_WEEK.prepDelays.night[dayIndex]}</td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}
