import { WATCH_GROUPS } from '../watchGroups'
import { cameraStill, type CameraScene } from './cameraStill'

/*  LAS ALERTAS DE MUESTRA DE LAS PROPUESTAS DE '/'
 *
 *  Los nombres salen del catálogo real de alertas (Jarvis-express365, src/component/Main/*.json), con sus fotos por
 *  paso tal como las pide cada alerta («Ocupa», «Primera atención»…). Los locales, las mesas y las horas son de
 *  ejemplo. Cada categoría del catálogo cae en una de las seis familias de «Lo que se vigila».
 */

// FamilyId = «una de las seis familias de alertas, como en las tarjetas de «Lo que se vigila»»
export type FamilyId = 'demoras' | 'clientes' | 'personal' | 'comida' | 'protocolo' | 'local'

// FAMILIES = «el nombre y el color de cada familia, los mismos de las tarjetas»
export const FAMILIES = Object.fromEntries(WATCH_GROUPS.map(group => [group.id, { label: group.name, color: group.color }])) as Record<
  FamilyId,
  { label: string; color: string }
>

// FAMILY_ORDER = «las familias en el orden de las tarjetas»
export const FAMILY_ORDER = WATCH_GROUPS.map(group => group.id) as FamilyId[]

// SAMPLE_DATE = «el día de las fotos de muestra: el lunes de la semana de ejemplo del semanal»
export const SAMPLE_DATE = '24/08/2026'

export type SampleAlert = {
  id: string
  title: string
  family: FamilyId
  place: string
  table?: string
  dish?: string
  shift: 'day' | 'night'
  // when = «cuándo, como lo escribe el muro»
  when: string
  scene: CameraScene
  // cam, time, markLabel = «la cámara, la hora de la foto y lo que dice el recuadro»
  cam: string
  time: string
  markLabel: string
}

// SAMPLE_ALERTS = «alertas de las seis familias, de tres sucursales, de la más nueva a la más vieja»
export const SAMPLE_ALERTS: SampleAlert[] = [
  { id: 'a1', title: 'Demora de primera atención', family: 'demoras', place: 'Sucursal Centro', table: '5', shift: 'day', when: 'hace 1 min', scene: 'table', cam: 'CAM 02 · SALÓN', time: '12:10:22', markLabel: 'MESA 5' },
  { id: 'a2', title: 'Cliente sin ser ubicado por el host', family: 'clientes', place: 'Sucursal Norte', shift: 'day', when: 'hace 3 min', scene: 'host', cam: 'CAM 01 · ENTRADA', time: '12:19:48', markLabel: 'ENTRADA' },
  { id: 'a3', title: 'Posible devolución de plato', family: 'comida', place: 'Sucursal Centro', table: '7', dish: 'Plato fuerte', shift: 'day', when: 'hace 6 min', scene: 'plateBack', cam: 'CAM 02 · SALÓN', time: '13:05:40', markLabel: 'MESA 7' },
  { id: 'a4', title: 'Puerta de cava abierta', family: 'local', place: 'Sucursal Puerto', shift: 'day', when: 'hace 9 min', scene: 'door', cam: 'CAM 05 · COCINA', time: '13:32:02', markLabel: 'CAVA' },
  { id: 'a5', title: 'Empleado sin uniforme', family: 'personal', place: 'Sucursal Norte', shift: 'day', when: 'hace 12 min', scene: 'staff', cam: 'CAM 03 · SALÓN', time: '14:10:15', markLabel: 'SALÓN' },
  { id: 'a6', title: 'Demora en preparación de plato', family: 'demoras', place: 'Sucursal Centro', table: '8', dish: 'Plato fuerte', shift: 'day', when: 'hace 15 min', scene: 'pass', cam: 'CAM 04 · PASE', time: '12:53:12', markLabel: 'PASE' },
  { id: 'a7', title: 'Cliente no recibe acompañamiento de valet parking', family: 'protocolo', place: 'Sucursal Puerto', shift: 'night', when: 'hace 18 min', scene: 'valet', cam: 'CAM 07 · VALET', time: '19:42:30', markLabel: 'VALET' },
  { id: 'a8', title: 'Manipulación de alimentos sin guantes', family: 'comida', place: 'Sucursal Norte', shift: 'night', when: 'hace 22 min', scene: 'kitchen', cam: 'CAM 05 · COCINA', time: '20:05:11', markLabel: 'COCINA' },
  { id: 'a9', title: 'Demora de limpieza', family: 'demoras', place: 'Sucursal Puerto', table: '2', shift: 'night', when: 'hace 25 min', scene: 'tableDirty', cam: 'CAM 02 · SALÓN', time: '20:18:44', markLabel: 'MESA 2' },
  { id: 'a10', title: 'Cliente solicita atención', family: 'clientes', place: 'Sucursal Centro', table: '3', shift: 'night', when: 'hace 31 min', scene: 'tableHand', cam: 'CAM 03 · SALÓN', time: '20:31:09', markLabel: 'MESA 3' },
  { id: 'a11', title: 'Uso de celular', family: 'personal', place: 'Sucursal Puerto', shift: 'night', when: 'hace 36 min', scene: 'bar', cam: 'CAM 06 · BARRA', time: '20:47:52', markLabel: 'BARRA' },
  { id: 'a12', title: 'Basura acumulada', family: 'local', place: 'Sucursal Norte', shift: 'night', when: 'hace 42 min', scene: 'trash', cam: 'CAM 08 · PUERTA TRASERA', time: '21:03:26', markLabel: 'PUERTA TRASERA' },
  { id: 'a13', title: 'Protocolo y organización de mesa', family: 'protocolo', place: 'Sucursal Centro', table: '1', shift: 'day', when: 'hace 48 min', scene: 'tableClean', cam: 'CAM 02 · SALÓN', time: '15:12:40', markLabel: 'MESA 1' },
  { id: 'a14', title: 'Área de host sola', family: 'local', place: 'Sucursal Centro', shift: 'day', when: 'hace 53 min', scene: 'hostEmpty', cam: 'CAM 01 · ENTRADA', time: '15:26:03', markLabel: 'HOST' },
  { id: 'a15', title: 'Falla de conexión con DVR', family: 'local', place: 'Sucursal Puerto', shift: 'day', when: 'hace 1 h', scene: 'noSignal', cam: 'CAM 03 · SALÓN', time: '15:40:00', markLabel: 'CAM 03' },
  { id: 'a16', title: 'Demora de servicio', family: 'demoras', place: 'Sucursal Norte', table: 'Barra', shift: 'night', when: 'hace 1 h', scene: 'bar', cam: 'CAM 06 · BARRA', time: '21:15:37', markLabel: 'BARRA' },
]

// alertImage = «la foto de cámara de una alerta de muestra, con el recuadro del color de su familia»
export const alertImage = (alert: SampleAlert) =>
  cameraStill({
    scene: alert.scene,
    cam: alert.cam,
    stamp: `${SAMPLE_DATE} ${alert.time}`,
    mark: { color: FAMILIES[alert.family].color, label: alert.markLabel },
    night: alert.shift === 'night',
  })

/*  LAS FOTOS POR PASO DE TRES ALERTAS, COMO LAS PIDE EL CATÁLOGO */

// PhotoStep = «una foto de la secuencia: su nombre en el catálogo, la hora y lo que enseña»
export type PhotoStep = { caption: string; time: string; scene: CameraScene; cam: string }

// FIRST_ATTENTION_STEPS = «"Demora de primera atención": dos fotos, cuando se ocupa la mesa y cuando llega la primera
// atención. Entre una y otra, 6 min 12 s»
export const FIRST_ATTENTION_STEPS: PhotoStep[] = [
  { caption: 'Ocupa', time: '12:04:10', scene: 'table', cam: 'CAM 02 · SALÓN' },
  { caption: 'Primera atención', time: '12:10:22', scene: 'tableWaiter', cam: 'CAM 02 · SALÓN' },
]

// PREP_DELAY_STEPS = «"Demora en preparación de plato": cuatro fotos, de la toma de orden a la entrega. De punta a
// punta, 21 min 26 s»
export const PREP_DELAY_STEPS: PhotoStep[] = [
  { caption: 'Toma de orden', time: '12:37:05', scene: 'tableWaiter', cam: 'CAM 02 · SALÓN' },
  { caption: 'Listo en tablet', time: '12:49:40', scene: 'tablet', cam: 'CAM 04 · COCINA' },
  { caption: 'Listo en cocina', time: '12:53:12', scene: 'pass', cam: 'CAM 04 · PASE' },
  { caption: 'Entrega de plato', time: '12:58:31', scene: 'serve', cam: 'CAM 02 · SALÓN' },
]

// RETURN_STEPS = «"Posible devolución de plato": dos fotos, cuando el empleado retira el plato y cuando llega a cocina»
export const RETURN_STEPS: PhotoStep[] = [
  { caption: 'Empleado retira plato', time: '13:05:40', scene: 'plateBack', cam: 'CAM 02 · SALÓN' },
  { caption: 'Plato en cocina', time: '13:06:15', scene: 'pass', cam: 'CAM 04 · PASE' },
]

// stepImage = «la foto de un paso, con el recuadro de su familia»
export const stepImage = (step: PhotoStep, family: FamilyId, markLabel: string) =>
  cameraStill({ scene: step.scene, cam: step.cam, stamp: `${SAMPLE_DATE} ${step.time}`, mark: { color: FAMILIES[family].color, label: markLabel } })

/*  EL CATÁLOGO, PARA LAS CINTAS DE NOMBRES */

// CATALOG_NAMES = «alertas del catálogo real, con su familia; algunos nombres largos van recortados»
export const CATALOG_NAMES: { name: string; family: FamilyId }[] = [
  { name: 'Demora de primera atención', family: 'demoras' },
  { name: 'Demora de limpieza', family: 'demoras' },
  { name: 'Demora de servicio', family: 'demoras' },
  { name: 'Demora en preparación de plato', family: 'demoras' },
  { name: 'Cliente sin ser ubicado por el host', family: 'clientes' },
  { name: 'Cliente solicita atención', family: 'clientes' },
  { name: 'Posible reclamo de cliente', family: 'clientes' },
  { name: 'Cliente solicita cuenta', family: 'clientes' },
  { name: 'Cliente de otra franquicia', family: 'clientes' },
  { name: 'Llegada de vehículo', family: 'clientes' },
  { name: 'Empleados conversando', family: 'personal' },
  { name: 'Empleado sin actividad', family: 'personal' },
  { name: 'Empleado sin uniforme', family: 'personal' },
  { name: 'Uso de celular', family: 'personal' },
  { name: 'Empleado de salón en área de cocina', family: 'personal' },
  { name: 'Empleado de cocina en barra', family: 'personal' },
  { name: 'Empleado manipula efectivo', family: 'personal' },
  { name: 'Reunión de empleados', family: 'personal' },
  { name: 'Empleado sobre mesón', family: 'personal' },
  { name: 'Derrame de líquido', family: 'personal' },
  { name: 'Alimento expuesto', family: 'comida' },
  { name: 'Manipulación de alimentos sin guantes', family: 'comida' },
  { name: 'Manipulación de alimentos en el suelo', family: 'comida' },
  { name: 'Caída de alimento', family: 'comida' },
  { name: 'Posible devolución de plato', family: 'comida' },
  { name: 'Posible devolución de bebida', family: 'comida' },
  { name: 'Posible devolución de postre', family: 'comida' },
  { name: 'Posible devolución de entrada', family: 'comida' },
  { name: 'Posible devolución de pedido', family: 'comida' },
  { name: 'Posible error de orden', family: 'comida' },
  { name: 'Cliente no recibe acompañamiento de valet parking', family: 'protocolo' },
  { name: 'Protocolo y organización de mesa', family: 'protocolo' },
  { name: 'Cliente se retira con porta cuentas', family: 'protocolo' },
  { name: 'Mesa ocupada sin ser limpiada correctamente', family: 'protocolo' },
  { name: 'Toma de orden antes de la primera atención', family: 'protocolo' },
  { name: 'Puerta de cava abierta', family: 'local' },
  { name: 'Puerta de refrigerador abierta', family: 'local' },
  { name: 'Área de host sola', family: 'local' },
  { name: 'Basura acumulada', family: 'local' },
  { name: 'Papelera rebosada', family: 'local' },
  { name: 'Falla de conexión con DVR', family: 'local' },
  { name: 'Incidencia en área de cocina', family: 'local' },
  { name: 'Mercancía mal ubicada', family: 'local' },
  { name: 'Cajas en puerta trasera', family: 'local' },
]
