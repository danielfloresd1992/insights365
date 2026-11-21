/*  LO QUE CUENTAN LAS PORTADAS: los colores, las cinco demoras y una semana de ejemplo
 *
 *  Las cifras salen de una semana real de los informes: la fixture del semanal de reportes365, del 24 al 30 de
 *  agosto de 2026, catorce turnos de catorce. Se quitó el nombre del restaurante; nada más se tocó ni se inventó.
 */

// LOGIN_PATH, WALL_PATH = «la pantalla para entrar con correo y contraseña, y el muro de alertas, que pide sesión»
export const LOGIN_PATH = '/acceso'
export const WALL_PATH = '/muro'
// PORTAL_PATH = «a dónde lleva Entrar al portal: al muro; sin sesión abierta, el muro manda a entrar»
export const PORTAL_PATH = WALL_PATH

// PALETTE = «los colores de la familia Jarvis365: marfil, tinta, el verde de la marca solo en detalles y la tierra
// de las gráficas de los informes (ocre, naranja, chocolate, barro)»
export const PALETTE = {
  ink: '#1f1b14',
  inkSoft: '#6b6252',
  ivory: '#fbf8f0',
  ivoryDeep: '#f2ead8',
  rule: '#e3d8c1',
  green: '#29c50c',
  greenText: '#177406',
  ochre: '#d6aa42',
  orange: '#d96100',
  chocolate: '#813b1e',
  clay: '#b5763b',
  sage: '#4f6b57',
  night: '#15120d',
  reportHeader: '#818181',
} as const

// BRAND_GRADIENT = «el degradado fino de la marca: verde, ocre y barro, solo en tiras y reglas»
export const BRAND_GRADIENT = 'linear-gradient(90deg, #29c50c 0%, #d9a441 55%, #b5763b 100%)'

// DelayKind = «una de las cinco demoras que miden los informes»
export type DelayKind = 'firstAttention' | 'cleaning' | 'preparation' | 'delivery' | 'service'

// DELAY_KINDS = «las cinco demoras, con su nombre en el informe y el color con que se pintan en las portadas»
export const DELAY_KINDS: { kind: DelayKind; label: string; color: string }[] = [
  { kind: 'firstAttention', label: 'Primera atención', color: PALETTE.orange },
  { kind: 'cleaning', label: 'Limpieza', color: PALETTE.ochre },
  { kind: 'preparation', label: 'Preparación', color: PALETTE.chocolate },
  { kind: 'delivery', label: 'Entrega', color: PALETTE.clay },
  { kind: 'service', label: 'Servicio', color: PALETTE.sage },
]

// DELAY_COLORS, DELAY_LABELS = «lo mismo, buscado por la demora»
export const DELAY_COLORS = Object.fromEntries(DELAY_KINDS.map(entry => [entry.kind, entry.color])) as Record<DelayKind, string>
export const DELAY_LABELS = Object.fromEntries(DELAY_KINDS.map(entry => [entry.kind, entry.label])) as Record<DelayKind, string>

/*  LA SALA DE LA PORTADA A
 *
 *  El orden en que se encienden las novedades sobre la sala. La escena 3D y la tarjeta de novedades leen esta
 *  misma lista con el mismo reloj, así que la mesa que se enciende es la que aparece arriba en la tarjeta.
 *  spot: 0 a 8 son las mesas 1 a 9, 9 es la cocina y 10 la barra.
 */
export const FLOOR_ALERTS: { spot: number; kind: DelayKind; place: string }[] = [
  { spot: 4, kind: 'firstAttention', place: 'Mesa 5' },
  { spot: 9, kind: 'preparation', place: 'Cocina · Plato fuerte' },
  { spot: 1, kind: 'cleaning', place: 'Mesa 2' },
  { spot: 7, kind: 'delivery', place: 'Mesa 8' },
  { spot: 10, kind: 'service', place: 'Barra' },
  { spot: 3, kind: 'firstAttention', place: 'Mesa 4' },
  { spot: 9, kind: 'preparation', place: 'Cocina · Lunch' },
  { spot: 8, kind: 'cleaning', place: 'Mesa 9' },
]
// FLOOR_ALERT_SECONDS = «cada cuánto se enciende una novedad nueva»
export const FLOOR_ALERT_SECONDS = 3.2
// FLOOR_ALERT_START_SECONDS = «cuándo empieza la primera: después de que la sala termina de montarse»
export const FLOOR_ALERT_START_SECONDS = 1.9

/*  LAS TRES PORTADAS */

// CoverId = «la letra de cada prototipo, la misma de su dirección: /portadas/a, /portadas/b, /portadas/c»
export type CoverId = 'a' | 'b' | 'c' | 'd'

export const isCoverId = (value: string | undefined): value is CoverId => value === 'a' || value === 'b' || value === 'c' || value === 'd'

// COVERS = «cada prototipo con su nombre, de qué va y una muestra de su color para la página que los reúne»
export const COVERS: { id: CoverId; name: string; summary: string; preview: string }[] = [
  {
    id: 'a',
    name: 'Sala en vivo',
    summary: 'Un comedor en maqueta donde se encienden las demoras mesa por mesa, al ritmo de la tarjeta de novedades.',
    preview: `radial-gradient(circle at 34% 46%, ${PALETTE.orange} 0 7px, transparent 8px), radial-gradient(circle at 63% 60%, ${PALETTE.ochre} 0 7px, transparent 8px), radial-gradient(circle at 52% 30%, ${PALETTE.chocolate} 0 7px, transparent 8px), linear-gradient(160deg, #f2e8d3, #e8dabd)`,
  },
  {
    id: 'b',
    name: 'La semana en relieve',
    summary: 'Los catorce turnos del semanal en barras 3D sobre fondo oscuro, con el cuadro general al lado.',
    preview: `linear-gradient(180deg, transparent 0 30%, ${PALETTE.night} 30% 31%, transparent 31%), repeating-linear-gradient(90deg, ${PALETTE.ochre} 0 14px, ${PALETTE.night} 14px 30px)`,
  },
  {
    id: 'c',
    name: 'Del turno al informe',
    summary: 'Las hojas reales del PDF semanal se reparten en abanico sobre blanco; la que señalas se adelanta.',
    preview: `linear-gradient(180deg, #ffffff 0 86%, transparent 86%), ${BRAND_GRADIENT}`,
  },
  {
    id: 'd',
    name: 'Sala y semana',
    summary: 'La sala en vivo delante y las barras de la semana detrás, en una sola escena, con los colores de Amazonas: verde, blanco, gris y marfil.',
    preview: `radial-gradient(circle at 36% 62%, #b5763b 0 7px, transparent 8px), radial-gradient(circle at 58% 70%, #d03b3b 0 7px, transparent 8px), repeating-linear-gradient(90deg, #29c50c 0 12px, transparent 12px 24px) top / 100% 42% no-repeat, linear-gradient(160deg, #fbf8f0, #f4f2ee)`,
  },
]

/*  LAS TRES OPCIONES DE LAS TARJETAS DE «LO QUE SE VIGILA» (se prueban en '/' con ?tarjetas=a, b o c) */

// CardsVariant = «la letra de cada opción de movimiento de las seis tarjetas»
export type CardsVariant = 'a' | 'b' | 'c'

export const isCardsVariant = (value: string | null): value is CardsVariant => value === 'a' || value === 'b' || value === 'c'

// CARDS_VARIANTS = «cada opción con su nombre, para el selector»
export const CARDS_VARIANTS: { id: CardsVariant; name: string }[] = [
  { id: 'a', name: 'Se levantan' },
  { id: 'b', name: 'En profundidad' },
  { id: 'c', name: 'Se reparten' },
]

/*  LAS TRES PROPUESTAS PARA LO QUE SIGUE A LAS TARJETAS (se prueban en '/' con ?secciones=a, b o c) */

// SectionsVariant = «la letra de cada propuesta de secciones»
export type SectionsVariant = 'a' | 'b' | 'c'

export const isSectionsVariant = (value: string | null): value is SectionsVariant => value === 'a' || value === 'b' || value === 'c'

// SECTIONS_VARIANTS = «cada propuesta con su nombre, para el selector»
export const SECTIONS_VARIANTS: { id: SectionsVariant; name: string }[] = [
  { id: 'a', name: 'La semana en cifras' },
  { id: 'b', name: 'Un turno, minuto a minuto' },
  { id: 'c', name: 'Cada alerta, con su prueba' },
]

// POSTERS = «el fotograma de reposo de cada escena, en public/posters, con su tamaño en píxeles. Los fabrica
// scripts/make-posters.mjs abriendo cada portada con ?poster; si cambia una escena, hay que volver a fabricarlos»
export const POSTERS: Record<CoverId, { src: string; width: number; height: number }> = {
  a: { src: '/posters/portada-a.webp', width: 912, height: 966 },
  b: { src: '/posters/portada-b.webp', width: 2136, height: 1207 },
  c: { src: '/posters/portada-c.webp', width: 1860, height: 650 },
  d: { src: '/posters/portada-d.webp', width: 912, height: 966 },
}

// PRODUCT_FACTS =«tres datos ciertos del producto para cualquier sucursal, para la tira fija bajo una portada»
export const PRODUCT_FACTS = [
  { value: '5', label: 'tipos de demora medidos' },
  { value: '7', label: 'tipos de devolución' },
  { value: '1', label: 'informe por turno, y el semanal que los junta' },
]

/*  LA SEMANA DE EJEMPLO (portadas B y C) */
export const DEMO_WEEK = {
  branch: 'Sucursal de ejemplo',
  range: 'del 24 al 30 de agosto de 2026',
  shiftsFound: 14,
  shiftsExpected: 14,
  days: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  // processes = «procesos evaluados (tickets de cocina) por día, diurno y nocturno»
  processes: { day: [57, 42, 37, 44, 46, 46, 40], night: [11, 12, 25, 19, 24, 26, 21] },
  // prepDelays = «de esos, cuántos acabaron en demora de preparación»
  prepDelays: { day: [15, 2, 12, 4, 10, 8, 4], night: [1, 0, 2, 1, 0, 2, 2] },
  // delayPctByDay = «demoras sobre procesos de cada día, como la hoja "Porcentaje de demoras por día"»
  delayPctByDay: [23.5, 3.7, 22.6, 7.9, 14.3, 13.9, 9.8],
  // delaysByDish = «demoras de cada día por categoría de plato, como la hoja "Cantidad de demoras por día"»
  delaysByDish: { lunch: [9, 1, 6, 3, 10, 0, 0], mainCourse: [7, 1, 8, 2, 0, 10, 6] },
  // summary = «las filas del cuadro general, ya escritas como las imprime el informe»
  summary: [
    { label: 'Rotaciones de mesas evaluadas', day: '314', night: '141', total: '455' },
    { label: 'Mesas con demora de primera atención', day: '3', night: '2', total: '5' },
    { label: 'Porcentaje de demora de primera atención', day: '1.0%', night: '1.4%', total: '1.1%' },
    { label: 'Mesas con demora de limpieza', day: '1', night: '4', total: '5' },
    { label: 'Porcentaje de demora de limpieza', day: '0.3%', night: '2.8%', total: '1.1%' },
  ],
  // metric = «la tabla general de métrica: procesos, tiempo medio y demoras por categoría de plato»
  metric: [
    { dish: 'Lunch', processes: '106', average: '00:10:53', delays: '29' },
    { dish: 'Plato fuerte', processes: '344', average: '00:12:16', delays: '34' },
  ],
  metricTotal: { processes: '450', delays: '63', delayPct: '14%' },
  // touches = «el promedio semanal de toques del gerente: primeros sobre rotaciones, otros sobre los primeros»
  touches: { role: 'Gerente', first: 27.2, others: 116.7 },
} as const

/*  LOS COLORES DE AMAZONAS (portada D)

    La paleta de la casa, la de Jarvis-express365 (sus --color-jx-* de src/index.css), que es la que Client365 llama
    «los colores de Amazonas»: verde, blanco, grises y marfiles, con la tinta, y el ocre y el cobre solo de acento.
    Su regla: el verde #29c50c es de RELLENO, con la tinta encima y nunca letra blanca; como letra se usa #177406.
    Las parejas de letra y fondo son las que Jarvis tiene medidas, salvo inkSoft (ver abajo).
    La letra de la portada D es IBM Plex Sans; la de la casa es Inter.
*/
export const AMAZONAS = {
  green: '#29c50c',
  greenHover: '#24b00a',
  greenText: '#177406',
  greenBar: '#1c8c08',
  greenSoft: '#f2fbee',
  white: '#ffffff',
  ivory: '#fbf8f0',
  ivoryPanel: '#f7f2e4',
  rule: '#ece5d5',
  rule2: '#ddd3bd',
  grayPanel: '#f4f2ee',
  graySunk: '#ebe9e4',
  grayRule: '#e2dfda',
  grayBorder: '#88847f',
  ink: '#2f2a1e',
  // inkSoft = «el texto de cuerpo: la tinta secundaria de la casa (#6b6252) oscurecida hasta pasar de 7:1 sobre blanco,
  // como pide taste-skill para el cuerpo»
  inkSoft: '#564e40',
  ochre: '#d9a441',
  ochreText: '#8a5a28',
  copper: '#b5763b',
  critical: '#d03b3b',
} as const

// AMAZONAS_DELAY_COLORS = «las cinco demoras con colores de la casa. Ninguna en verde: el verde es la marca y las
// barras de la semana. Preparación en cobre, el mismo remate de las barras, que cuentan justo esas demoras»
export const AMAZONAS_DELAY_COLORS: Record<DelayKind, string> = {
  firstAttention: AMAZONAS.critical,
  cleaning: AMAZONAS.ochre,
  preparation: AMAZONAS.copper,
  delivery: AMAZONAS.ink,
  service: AMAZONAS.grayBorder,
}

// AMAZONAS_DELAY_KINDS = «las cinco demoras con su color de Amazonas, para la leyenda»
export const AMAZONAS_DELAY_KINDS = DELAY_KINDS.map(entry => ({ ...entry, color: AMAZONAS_DELAY_COLORS[entry.kind] }))
