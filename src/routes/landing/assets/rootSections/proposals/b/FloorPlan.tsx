import { FAMILIES } from '../alertSamples'
import { SPOTS, type ShiftEvent } from './shiftEvents'

/*  EL PLANO DE LA SALA, VISTO DESDE ARRIBA (propuesta B)
 *
 *  Cocina con su pase arriba, la cava en la esquina, la barra a la derecha, nueve mesas y la entrada con el host
 *  abajo a la izquierda. Donde pasó la alerta que se está contando late un anillo de su color; donde pasaron las
 *  anteriores queda un punto. Solo pinta.
 */

type FloorPlanProps = {
  events: ShiftEvent[]
  // activeIndex = «la alerta que se está contando; las anteriores ya pasaron»
  activeIndex: number
}

// TABLES = «las nueve mesas del salón: número y centro»
const TABLES = [0, 1, 2].flatMap(row =>
  [0, 1, 2].map(column => ({ number: row * 3 + column + 1, x: 104 + column * 80, y: 128 + row * 60 })),
)

export default function FloorPlan({ events, activeIndex }: FloorPlanProps) {
  const active = events[activeIndex]

  return (
    <svg viewBox='0 0 400 300' className='h-auto w-full' role='img' aria-label={active ? `Plano de la sala: ${active.title}, ${active.place}` : 'Plano de la sala'}>
      <rect x='1' y='1' width='398' height='298' rx='14' fill='#fbf8f0' stroke='#ddd3bd' strokeWidth='2' />
      {/* Cocina, pase y cava */}
      <rect x='12' y='12' width='300' height='58' rx='8' fill='#f4f2ee' />
      <text x='24' y='34' fontSize='11' fontWeight='600' fill='#564e40' letterSpacing='1'>
        COCINA
      </text>
      <rect x='60' y='72' width='200' height='12' rx='4' fill='#e2dfda' />
      <text x='270' y='82' fontSize='9' fill='#564e40'>
        Pase
      </text>
      <rect x='322' y='12' width='66' height='68' rx='8' fill='#ebe9e4' />
      <text x='332' y='34' fontSize='11' fontWeight='600' fill='#564e40' letterSpacing='1'>
        CAVA
      </text>
      {/* Barra */}
      <rect x='346' y='104' width='24' height='150' rx='6' fill='#ddd3bd' />
      {[118, 146, 174, 202, 230].map(stool => (
        <circle key={stool} cx='334' cy={stool} r='5' fill='#ece5d5' />
      ))}
      <text x='356' y='272' fontSize='10' fontWeight='600' fill='#564e40' textAnchor='middle'>
        Barra
      </text>
      {/* Mesas */}
      {TABLES.map(table => (
        <g key={table.number}>
          <circle cx={table.x} cy={table.y} r='17' fill='#ffffff' stroke='#ddd3bd' strokeWidth='2' />
          <text x={table.x} y={table.y + 4} fontSize='11' fontWeight='600' fill='#564e40' textAnchor='middle'>
            {table.number}
          </text>
        </g>
      ))}
      {/* Entrada y host */}
      <rect x='14' y='250' width='60' height='22' rx='5' fill='#ece5d5' />
      <text x='54' y='265' fontSize='9' fontWeight='600' fill='#564e40' textAnchor='middle'>
        Host
      </text>
      <rect x='14' y='292' width='60' height='6' rx='3' fill='#29c50c' />
      <text x='80' y='296' fontSize='9' fill='#564e40'>
        Entrada
      </text>

      {/* Lo que ya pasó, en punto; lo de ahora, con su anillo */}
      {events.slice(0, activeIndex).map(event => (
        <circle key={event.id} cx={SPOTS[event.spot].x} cy={SPOTS[event.spot].y} r='5' fill={FAMILIES[event.family].color} stroke='#ffffff' strokeWidth='2' />
      ))}
      {active && (
        <g key={active.id}>
          <circle className='pb-pulse' cx={SPOTS[active.spot].x} cy={SPOTS[active.spot].y} r='22' fill='none' stroke={FAMILIES[active.family].color} strokeWidth='3' />
          <circle cx={SPOTS[active.spot].x} cy={SPOTS[active.spot].y} r='7' fill={FAMILIES[active.family].color} stroke='#ffffff' strokeWidth='2.5' />
        </g>
      )}
    </svg>
  )
}
