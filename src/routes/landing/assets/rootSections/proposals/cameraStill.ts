/*  LAS FOTOS DE CÁMARA, DIBUJADAS (para las alertas de muestra de las propuestas de '/')
 *
 *  Cada alerta del catálogo lleva su foto de la cámara, y las demoras una por paso («Ocupa», «Primera atención»…).
 *  No hay fotos reales que enseñar, así que aquí se dibujan: la sala vista desde arriba, en maqueta, como la de la
 *  portada, con el aspecto de una cámara de seguridad (color apagado, líneas, grano y viñeta), el nombre de la
 *  cámara, la hora y un recuadro del color de la familia alrededor de lo que se anota.
 *
 *  cameraStill devuelve una imagen SVG lista para un <img src>, la misma para la misma escena y textos.
 */

// CameraScene = «lo que enseña la foto»
export type CameraScene =
  | 'table'
  | 'tableWaiter'
  | 'tableDirty'
  | 'tableClean'
  | 'tableHand'
  | 'serve'
  | 'plateBack'
  | 'pass'
  | 'tablet'
  | 'host'
  | 'hostEmpty'
  | 'door'
  | 'bar'
  | 'staff'
  | 'kitchen'
  | 'trash'
  | 'noSignal'
  | 'valet'

export type CameraStillOptions = {
  scene: CameraScene
  // cam = «la cámara, como la escribe el grabador: "CAM 02 · SALÓN"»
  cam: string
  // stamp = «la fecha y la hora de la foto»
  stamp: string
  // mark = «el recuadro sobre lo que se anota: su color y su etiqueta»; sin él no se pinta
  mark?: { color: string; label: string }
  // night = «de noche: la cámara se ve más oscura y gris»
  night?: boolean
}

// WIDTH, HEIGHT = «el tamaño de la foto, 16:10»
const WIDTH = 320
const HEIGHT = 200

// TONE = «los colores de la maqueta, apagados como los de una cámara»
const TONE = {
  floor: '#bdb6a8',
  tile: '#b1aa9b',
  wall: '#8e877b',
  wallTop: '#a39c8f',
  tableTop: '#efeae0',
  tableEdge: '#cfc8b9',
  chair: '#6f685c',
  body: '#544d42',
  head: '#2f2a23',
  staff: '#37322b',
  apron: '#e9e4d9',
  noUniform: '#a39276',
  plate: '#fbf9f4',
  plateRim: '#d6d0c3',
  food: '#a9783a',
  greens: '#7f8b55',
  glass: '#dde4e3',
  steel: '#d3d0c9',
  steelDark: '#a7a39a',
  screen: '#24211c',
  asphalt: '#85807a',
  bin: '#4d5248',
  bag: '#2c2a26',
} as const

// Las piezas de la maqueta, vistas desde arriba

const person = (positionX: number, positionY: number, angle = 0, body: string = TONE.body) =>
  `<g transform="translate(${positionX} ${positionY}) rotate(${angle})"><ellipse rx="12" ry="7.5" fill="${body}"/><circle r="6" cy="-0.5" fill="${TONE.head}"/></g>`

const waiter = (positionX: number, positionY: number, angle = 0, holding = '') =>
  `<g transform="translate(${positionX} ${positionY}) rotate(${angle})"><ellipse rx="12.5" ry="8" fill="${TONE.staff}"/><rect x="-6" y="2" width="12" height="7" rx="2" fill="${TONE.apron}"/><circle r="6" cy="-0.5" fill="${TONE.head}"/>${holding}</g>`

const chair = (positionX: number, positionY: number, angle = 0) =>
  `<rect x="-8" y="-7" width="16" height="14" rx="3.5" fill="${TONE.chair}" transform="translate(${positionX} ${positionY}) rotate(${angle})"/>`

const roundTable = (positionX: number, positionY: number, radius: number) =>
  `<circle cx="${positionX}" cy="${positionY}" r="${radius}" fill="${TONE.tableTop}" stroke="${TONE.tableEdge}" stroke-width="2.5"/>`

const plate = (positionX: number, positionY: number, food: string | null = TONE.food) =>
  `<circle cx="${positionX}" cy="${positionY}" r="7" fill="${TONE.plate}" stroke="${TONE.plateRim}" stroke-width="1.5"/>${food ? `<circle cx="${positionX + 1}" cy="${positionY - 1}" r="3.4" fill="${food}"/>` : ''}`

const glass = (positionX: number, positionY: number) =>
  `<circle cx="${positionX}" cy="${positionY}" r="3" fill="${TONE.glass}" stroke="#b9c1c0" stroke-width="1"/>`

const floor = (tile = 40) => {
  const lines: string[] = []
  for (let positionX = tile; positionX < WIDTH; positionX += tile) lines.push(`<line x1="${positionX}" y1="0" x2="${positionX}" y2="${HEIGHT}"/>`)
  for (let positionY = tile; positionY < HEIGHT; positionY += tile) lines.push(`<line x1="0" y1="${positionY}" x2="${WIDTH}" y2="${positionY}"/>`)
  return `<rect width="${WIDTH}" height="${HEIGHT}" fill="${TONE.floor}"/><g stroke="${TONE.tile}" stroke-width="1">${lines.join('')}</g>`
}

const topWall = (height = 26) =>
  `<rect width="${WIDTH}" height="${height}" fill="${TONE.wall}"/><rect y="${height - 5}" width="${WIDTH}" height="5" fill="${TONE.wallTop}"/>`

// Una mesa redonda con cuatro sillas y quien esté sentado (seats: qué sillas están ocupadas, de 0 a 3)
const diningTable = (centerX: number, centerY: number, seats: number[], extras = '') => {
  const angles = [-90, 0, 90, 180]
  const pieces = angles.map((angle, seat) => {
    const radians = (angle * Math.PI) / 180
    const chairX = centerX + Math.cos(radians) * 44
    const chairY = centerY + Math.sin(radians) * 44
    const sitterX = centerX + Math.cos(radians) * 40
    const sitterY = centerY + Math.sin(radians) * 40
    return chair(chairX, chairY, angle + 90) + (seats.includes(seat) ? person(sitterX, sitterY, angle + 90) : '')
  })
  return pieces.join('') + roundTable(centerX, centerY, 30) + extras
}

// SceneDrawing = «lo que se dibuja de una escena y dónde va el recuadro: x, y, ancho, alto»
type SceneDrawing = { body: string; box: [number, number, number, number] }

const SCENES: Record<CameraScene, () => SceneDrawing> = {
  // Clientes sentados con la carta, todavía sin atender
  table: () => ({
    body:
      floor() +
      topWall() +
      diningTable(160, 112, [0, 1, 2], `<rect x="146" y="98" width="12" height="16" rx="1.5" fill="#f6f3ec" stroke="${TONE.plateRim}"/><rect x="164" y="112" width="12" height="16" rx="1.5" fill="#f6f3ec" stroke="${TONE.plateRim}"/>${glass(150, 124)}${glass(172, 100)}`) +
      chair(40, 150, 20) +
      chair(286, 70, -30),
    box: [106, 58, 108, 108],
  }),
  // El mesero llega a la mesa: la primera atención
  tableWaiter: () => ({
    body:
      floor() +
      topWall() +
      diningTable(150, 114, [0, 1, 2], `<rect x="136" y="100" width="12" height="16" rx="1.5" fill="#f6f3ec" stroke="${TONE.plateRim}"/>${glass(140, 126)}${glass(162, 102)}`) +
      waiter(222, 112, -90, `<rect x="-7" y="-19" width="14" height="10" rx="2" fill="${TONE.screen}"/><rect x="-5.5" y="-17.5" width="11" height="7" rx="1" fill="#6f8f6a"/>`),
    box: [96, 60, 152, 108],
  }),
  // La mesa recién desocupada, con los platos sucios
  tableDirty: () => ({
    body:
      floor() +
      topWall() +
      [chair(160, 62, 15), chair(212, 118, 120), chair(160, 166, 160), chair(104, 108, 75)].join('') +
      roundTable(160, 112, 30) +
      plate(146, 104, '#8c7b5f') +
      plate(170, 100, null) +
      plate(166, 124, '#8c7b5f') +
      `<path d="M140 124 q4 -6 9 -2 q3 5 -2 8 z" fill="#f2efe8"/>` +
      glass(182, 114) +
      glass(150, 90),
    box: [108, 60, 104, 104],
  }),
  // Limpiando la mesa
  tableClean: () => ({
    body:
      floor() +
      topWall() +
      [chair(160, 68, 0), chair(204, 112, 90), chair(160, 156, 180), chair(116, 112, 270)].join('') +
      roundTable(160, 112, 30) +
      `<rect x="150" y="104" width="18" height="12" rx="2" fill="#dfe6e9" transform="rotate(-18 159 110)"/>` +
      waiter(160, 160, 0),
    box: [112, 64, 96, 116],
  }),
  // Un cliente levanta la mano
  tableHand: () => ({
    body:
      floor() +
      topWall() +
      diningTable(160, 110, [0, 1, 2, 3], plate(150, 104) + plate(172, 112) + glass(160, 124)) +
      `<path d="M206 104 l14 -16" stroke="${TONE.body}" stroke-width="5" stroke-linecap="round"/><circle cx="221" cy="86" r="3.5" fill="#c9b49a"/>`,
    box: [108, 58, 124, 110],
  }),
  // El mesero deja el plato en la mesa: la entrega
  serve: () => ({
    body:
      floor() +
      topWall() +
      diningTable(150, 114, [0, 1, 2], plate(140, 106) + glass(140, 126) + glass(162, 102)) +
      waiter(218, 116, -90, `<g transform="translate(0 -18)">${plate(0, 0, TONE.greens)}</g>`),
    box: [96, 60, 150, 108],
  }),
  // El mesero se lleva un plato servido de vuelta a cocina
  plateBack: () => ({
    body:
      floor() +
      topWall() +
      diningTable(110, 118, [1, 3], plate(100, 112, null) + glass(118, 126)) +
      `<path d="M168 112 C 200 96, 226 80, 258 54" stroke="#f4f1ea" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/>` +
      waiter(232, 78, -60, `<g transform="translate(0 -16)">${plate(0, 0)}</g>`),
    box: [196, 44, 72, 66],
  }),
  // El pase de cocina, con los platos listos bajo las lámparas
  pass: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#b4b0a8"/>` +
      `<rect y="0" width="${WIDTH}" height="74" fill="#9c988f"/>` +
      waiter(120, 44, 180) +
      waiter(214, 40, 180) +
      `<rect x="20" y="84" width="280" height="44" rx="3" fill="${TONE.steel}" stroke="${TONE.steelDark}" stroke-width="2"/>` +
      [60, 108, 156, 204, 252].map(positionX => `<circle cx="${positionX}" cy="106" r="20" fill="#fff4d9" opacity="0.35"/>`).join('') +
      plate(60, 106) +
      plate(108, 106, TONE.greens) +
      plate(156, 106) +
      plate(204, 106) +
      plate(252, 106, TONE.greens) +
      person(150, 168, 0, TONE.staff),
    box: [138, 84, 84, 44],
  }),
  // La tableta de cocina, con la comanda marcada como lista
  tablet: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#aeaaa2"/>` +
      `<rect x="62" y="26" width="196" height="148" rx="10" fill="#1c1a16"/>` +
      `<rect x="72" y="36" width="176" height="128" rx="4" fill="${TONE.screen}"/>` +
      [0, 1, 2].map(column => {
        const left = 80 + column * 56
        const ready = column === 1
        return `<rect x="${left}" y="44" width="48" height="112" rx="3" fill="#f2efe7"/><rect x="${left + 6}" y="52" width="30" height="4" rx="2" fill="#6b655a"/><rect x="${left + 6}" y="62" width="36" height="3" rx="1.5" fill="#a39d91"/><rect x="${left + 6}" y="70" width="28" height="3" rx="1.5" fill="#a39d91"/><rect x="${left + 6}" y="78" width="33" height="3" rx="1.5" fill="#a39d91"/><rect x="${left + 6}" y="138" width="36" height="10" rx="5" fill="${ready ? '#55b23f' : '#cfc9bc'}"/>`
      }).join(''),
    box: [130, 40, 60, 120],
  }),
  // En la entrada esperan clientes y nadie los ubica
  host: () => ({
    body:
      floor() +
      `<rect y="${HEIGHT - 18}" width="${WIDTH}" height="18" fill="${TONE.wall}"/><rect x="128" y="${HEIGHT - 18}" width="64" height="18" fill="#cfcac0"/>` +
      `<rect x="40" y="70" width="46" height="26" rx="4" fill="#5d564b"/><rect x="46" y="76" width="22" height="14" rx="2" fill="#8f897d"/>` +
      `<rect x="30" y="20" width="260" height="34" rx="4" fill="#ada697"/>` +
      person(150, 150, 0) +
      person(174, 144, -10) +
      person(162, 124, 10),
    box: [130, 106, 64, 64],
  }),
  // El área de host, sola
  hostEmpty: () => ({
    body:
      floor() +
      `<rect y="${HEIGHT - 18}" width="${WIDTH}" height="18" fill="${TONE.wall}"/><rect x="128" y="${HEIGHT - 18}" width="64" height="18" fill="#cfcac0"/>` +
      `<rect x="136" y="80" width="50" height="28" rx="4" fill="#5d564b"/><rect x="142" y="86" width="24" height="16" rx="2" fill="#8f897d"/>` +
      `<rect x="30" y="20" width="260" height="34" rx="4" fill="#ada697"/>`,
    box: [120, 68, 82, 56],
  }),
  // La puerta de la cava, abierta y sin nadie
  door: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#b6b2aa"/>` +
      `<rect x="176" y="0" width="144" height="120" fill="#a9b0b0"/>` +
      [24, 52, 80].map(positionY => `<rect x="196" y="${positionY}" width="110" height="10" rx="2" fill="#8d9494"/>`).join('') +
      `<rect x="168" y="0" width="8" height="128" fill="${TONE.wall}"/><rect x="176" y="120" width="144" height="8" fill="${TONE.wall}"/>` +
      `<path d="M176 128 A 60 60 0 0 0 128 176" stroke="#f4f1ea" stroke-width="1.5" stroke-dasharray="4 4" fill="none"/>` +
      `<rect x="118" y="124" width="58" height="9" rx="2" fill="#f1f4f3" stroke="#6f7777" stroke-width="1.5" transform="rotate(48 176 128)"/>`,
    box: [118, 96, 120, 92],
  }),
  // La barra, con quien atiende detrás
  bar: () => ({
    body:
      floor() +
      `<rect y="0" width="${WIDTH}" height="64" fill="#9e978a"/>` +
      `<rect x="20" y="64" width="280" height="30" rx="4" fill="#6b5e4c"/>` +
      [52, 98, 144, 190, 236, 282].map(positionX => `<circle cx="${positionX}" cy="116" r="10" fill="${TONE.chair}"/>`).join('') +
      person(98, 132) +
      glass(90, 78) +
      glass(198, 80) +
      waiter(170, 40, 180, `<rect x="5" y="6" width="6" height="10" rx="1.5" fill="#cfe3ff" opacity="0.9"/>`),
    box: [144, 18, 56, 48],
  }),
  // Dos empleados en el pasillo; uno sin uniforme
  staff: () => ({
    body:
      floor() +
      topWall() +
      roundTable(40, 120, 26) +
      roundTable(282, 104, 26) +
      waiter(150, 108, 10) +
      person(184, 116, -20, TONE.noUniform),
    box: [164, 92, 42, 46],
  }),
  // La mesa de preparación: manos sin guantes sobre el alimento
  kitchen: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#aaa69e"/>` +
      `<rect x="30" y="60" width="260" height="80" rx="4" fill="${TONE.steel}" stroke="${TONE.steelDark}" stroke-width="2"/>` +
      `<rect x="120" y="78" width="70" height="44" rx="3" fill="#d9c7a3"/>` +
      `<circle cx="70" cy="90" r="12" fill="#e9e5dc" stroke="#b9b3a6"/><circle cx="70" cy="90" r="7" fill="${TONE.greens}"/>` +
      `<circle cx="244" cy="96" r="14" fill="#e9e5dc" stroke="#b9b3a6"/><circle cx="244" cy="96" r="8" fill="${TONE.food}"/>` +
      `<rect x="138" y="92" width="30" height="14" rx="5" fill="#b9714f"/>` +
      waiter(156, 168, 0) +
      `<circle cx="140" cy="128" r="5" fill="#c3a588"/><circle cx="172" cy="128" r="5" fill="#c3a588"/>`,
    box: [124, 84, 64, 54],
  }),
  // La puerta de atrás, con bolsas de basura amontonadas
  trash: () => ({
    body:
      floor(50) +
      `<rect x="${WIDTH - 22}" y="0" width="22" height="${HEIGHT}" fill="${TONE.wall}"/><rect x="${WIDTH - 22}" y="62" width="22" height="58" fill="#cfcac0"/>` +
      `<rect x="214" y="42" width="34" height="34" rx="4" fill="${TONE.bin}"/><rect x="214" y="112" width="34" height="34" rx="4" fill="${TONE.bin}"/>` +
      [
        [198, 92, 13],
        [222, 86, 11],
        [186, 112, 12],
        [206, 124, 14],
        [180, 140, 10],
        [234, 158, 12],
      ]
        .map(([positionX, positionY, radius]) => `<circle cx="${positionX}" cy="${positionY}" r="${radius}" fill="${TONE.bag}"/>`)
        .join(''),
    box: [164, 72, 84, 102],
  }),
  // La cámara sin señal
  noSignal: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="#5b5852"/>` +
      `<rect width="${WIDTH}" height="${HEIGHT}" filter="url(#static)" opacity="0.9"/>` +
      `<rect x="96" y="84" width="128" height="32" rx="4" fill="#1d1b17" opacity="0.85"/>` +
      `<text x="160" y="105" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="13" font-weight="700" fill="#f4f1ea" letter-spacing="2">SIN SEÑAL</text>`,
    box: [90, 78, 140, 44],
  }),
  // Llega un carro y nadie del valet acompaña al cliente
  valet: () => ({
    body:
      `<rect width="${WIDTH}" height="${HEIGHT}" fill="${TONE.asphalt}"/>` +
      `<rect y="0" width="${WIDTH}" height="58" fill="#c2bcb0"/><rect y="58" width="${WIDTH}" height="6" fill="#d8d3c8"/>` +
      `<g stroke="#e9e4d9" stroke-width="3" stroke-dasharray="18 14"><line x1="0" y1="168" x2="${WIDTH}" y2="168"/></g>` +
      `<rect x="96" y="82" width="132" height="62" rx="18" fill="#3d3a35"/><rect x="186" y="90" width="26" height="46" rx="8" fill="#6f7a80"/><rect x="112" y="90" width="20" height="46" rx="7" fill="#6f7a80"/>` +
      person(160, 70, 0),
    box: [134, 52, 54, 40],
  }),
}

// cache = «las imágenes ya hechas, por sus opciones: se dibuja cada una una sola vez»
const cache = new Map<string, string>()

const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function cameraStill(options: CameraStillOptions) {
  const key = JSON.stringify(options)
  const cached = cache.get(key)
  if (cached) return cached

  const { body, box } = SCENES[options.scene]()
  const [boxX, boxY, boxWidth, boxHeight] = box
  const mark = options.mark
  const markColorIsLight = mark ? ['#d9a441', '#88847f'].includes(mark.color) : false
  const font = 'ui-monospace, Menlo, Consolas, monospace'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH * 2}" height="${HEIGHT * 2}">
<defs>
  <filter id="grade"><feColorMatrix type="saturate" values="${options.night ? 0.05 : 0.6}"/>${options.night ? '<feComponentTransfer><feFuncR type="linear" slope="0.72"/><feFuncG type="linear" slope="0.8"/><feFuncB type="linear" slope="0.72"/></feComponentTransfer>' : ''}</filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0"/></filter>
  <filter id="static" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="3" seed="7"/><feColorMatrix type="saturate" values="0"/></filter>
  <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.08"/></pattern>
  <radialGradient id="vignette" cx="50%" cy="50%" r="72%"><stop offset="58%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.42"/></radialGradient>
</defs>
<g filter="url(#grade)">${body}</g>
<rect width="${WIDTH}" height="${HEIGHT}" filter="url(#grain)" opacity="0.35"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#scan)"/>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#vignette)"/>
${
  mark
    ? `<rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="${boxHeight}" rx="3" fill="none" stroke="${mark.color}" stroke-width="2.5"/>
<rect x="${boxX}" y="${Math.max(0, boxY - 14)}" width="${Math.max(36, mark.label.length * 5.6 + 10)}" height="13" rx="2" fill="${mark.color}"/>
<text x="${boxX + 5}" y="${Math.max(0, boxY - 14) + 9.5}" font-family="${font}" font-size="8" font-weight="700" fill="${markColorIsLight ? '#2f2a1e' : '#ffffff'}">${escapeText(mark.label)}</text>`
    : ''
}
<g font-family="${font}" font-size="9" font-weight="600" fill="#f7f4ee" stroke="#000" stroke-opacity="0.55" stroke-width="2.4" paint-order="stroke">
  <text x="9" y="16">${escapeText(options.cam)}</text>
  <text x="9" y="${HEIGHT - 9}">${escapeText(options.stamp)}</text>
  <text x="${WIDTH - 9}" y="16" text-anchor="end">REC</text>
</g>
<circle cx="${WIDTH - 36}" cy="13" r="3.4" fill="#d03b3b"/>
</svg>`

  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  cache.set(key, source)
  return source
}
