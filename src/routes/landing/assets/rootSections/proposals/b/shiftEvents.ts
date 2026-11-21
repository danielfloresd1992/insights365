import { FIRST_ATTENTION_STEPS, PREP_DELAY_STEPS, RETURN_STEPS, type FamilyId, type PhotoStep } from '../alertSamples'

/*  UN ALMUERZO DE EJEMPLO, ALERTA POR ALERTA (propuesta B, «Un turno, minuto a minuto»)
 *
 *  Un turno diurno de 12:00 a 16:00 en una sucursal de ejemplo: seis alertas del catálogo real, cada una con las fotos
 *  que pide su tipo, su tiempo medido cuando lo lleva y su validación; al final, el cierre del turno. Las horas, las
 *  mesas y los umbrales son de ejemplo, y cuadran entre sí (el plato que se devuelve a las 13:05 es el que se entregó
 *  a las 12:58).
 */

// FloorSpot = «dónde pasa, en el plano de la sala»
export type FloorSpot = 'table3' | 'table5' | 'table8' | 'host' | 'cava' | 'pass'

// Measure = «el tiempo que midió el operador y, si lo hay, el umbral del local a partir del cual es demora»
export type Measure = { label: string; minutes: number; thresholdMinutes?: number; thresholdLabel?: string }

export type ShiftEvent = {
  id: string
  time: string
  // minute = «minutos desde las 12:00, para la regla del turno»
  minute: number
  family: FamilyId
  title: string
  place: string
  spot: FloorSpot
  detail: string
  steps: PhotoStep[]
  markLabel: string
  measure?: Measure
  // validation = «quién la validó y a qué hora»
  validation: string
}

// SHIFT_START, SHIFT_MINUTES = «el turno de ejemplo empieza a las 12:00 y dura cuatro horas»
export const SHIFT_START = '12:00'
export const SHIFT_END = '16:00'
export const SHIFT_MINUTES = 240

export const SHIFT_EVENTS: ShiftEvent[] = [
  {
    id: 'first-attention',
    time: '12:04',
    minute: 4,
    family: 'demoras',
    title: 'Demora de primera atención',
    place: 'Mesa 5 · Salón',
    spot: 'table5',
    detail: 'La mesa se ocupó a las 12:04 y nadie la atendió hasta las 12:10.',
    steps: FIRST_ATTENTION_STEPS,
    markLabel: 'MESA 5',
    measure: { label: '6 min 12 s', minutes: 6.2, thresholdMinutes: 5, thresholdLabel: 'umbral del local: 5 min' },
    validation: 'Aprobada por supervisión de turno · 12:12',
  },
  {
    id: 'host',
    time: '12:19',
    minute: 19,
    family: 'clientes',
    title: 'Cliente sin ser ubicado por el host',
    place: 'Entrada',
    spot: 'host',
    detail: 'Tres clientes esperan en la entrada y nadie los lleva a una mesa.',
    steps: [{ caption: 'Entrada', time: '12:19:48', scene: 'host', cam: 'CAM 01 · ENTRADA' }],
    markLabel: 'ENTRADA',
    validation: 'Aprobada por supervisión de turno · 12:21',
  },
  {
    id: 'preparation',
    time: '12:37',
    minute: 37,
    family: 'demoras',
    title: 'Demora en preparación de plato',
    place: 'Mesa 8 · Plato fuerte',
    spot: 'table8',
    detail: 'Cuatro fotos, de la toma de orden a la entrega: el plato tardó más de lo que el local tiene por bueno.',
    steps: PREP_DELAY_STEPS,
    markLabel: 'MESA 8',
    measure: { label: '21 min 26 s', minutes: 21.43, thresholdMinutes: 18, thresholdLabel: 'umbral del local: 18 min' },
    validation: 'Aprobada por supervisión de turno · 13:01',
  },
  {
    id: 'return',
    time: '13:05',
    minute: 65,
    family: 'comida',
    title: 'Posible devolución de plato',
    place: 'Mesa 8 · Plato fuerte',
    spot: 'pass',
    detail: 'El mismo plato vuelve a cocina siete minutos después de entregado.',
    steps: RETURN_STEPS,
    markLabel: 'MESA 8',
    validation: 'Aprobada por supervisión de turno · 13:09',
  },
  {
    id: 'cava',
    time: '13:32',
    minute: 92,
    family: 'local',
    title: 'Puerta de cava abierta',
    place: 'Cocina',
    spot: 'cava',
    detail: 'La puerta de la cava se queda abierta, sin nadie dentro.',
    steps: [{ caption: 'Cava', time: '13:32:02', scene: 'door', cam: 'CAM 05 · COCINA' }],
    markLabel: 'CAVA',
    measure: { label: '4 min 30 s abierta', minutes: 4.5 },
    validation: 'Aprobada por supervisión de turno · 13:38',
  },
  {
    id: 'uniform',
    time: '14:10',
    minute: 130,
    family: 'personal',
    title: 'Empleado sin uniforme',
    place: 'Salón · Mesa 3',
    spot: 'table3',
    detail: 'Un mesero atiende la mesa 3 sin el uniforme del local.',
    steps: [{ caption: 'Salón', time: '14:10:15', scene: 'staff', cam: 'CAM 03 · SALÓN' }],
    markLabel: 'SALÓN',
    validation: 'Aprobada por supervisión de turno · 14:14',
  },
]

// SPOTS = «el centro de cada sitio en el plano (viewBox 400 × 300)»
export const SPOTS: Record<FloorSpot, { x: number; y: number }> = {
  table3: { x: 264, y: 128 },
  table5: { x: 184, y: 188 },
  table8: { x: 184, y: 248 },
  host: { x: 28, y: 261 },
  cava: { x: 356, y: 52 },
  pass: { x: 160, y: 80 },
}
