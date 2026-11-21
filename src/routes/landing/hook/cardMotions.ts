import type { CardsMotion } from './useCardsMotion'

/*  LOS TRES MOVIMIENTOS CON SCROLL DE LAS TARJETAS DE «LO QUE SE VIGILA»
 *
 *  Cada uno recibe dónde van la sección y su rejilla, el alto de la pantalla y el sitio de cada tarjeta, y escribe en cada <li> su
 *  transform y --pop (cuánto flotan su icono y su título sobre la cara). Al terminar, cada tarjeta queda con transform
 *  'none', para que el texto se lea nítido.
 *
 *    a · Se levantan: las tarjetas llegan tumbadas, como fichas sobre la mesa, y se ponen de pie en diagonal.
 *    b · En profundidad: flotan a distintas profundidades y se juntan en la rejilla al llegar al centro de la
 *        pantalla; al seguir bajando se vuelven a separar.
 *    c · Se reparten: la sección se queda fija y las seis salen de una baraja boca abajo, una tras otra, dándose
 *        la vuelta en el aire hasta su sitio.
 */

const clamp = (value: number, low = 0, high = 1) => Math.min(high, Math.max(low, value))
const easeOut = (value: number) => 1 - Math.pow(1 - value, 3)
const easeInOut = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - Math.pow(-2 * value + 2, 3) / 2)
// easeOutBack = «llega pasándose un poco y vuelve, como una ficha que se pone de pie de golpe»
const easeOutBack = (value: number) => 1 + 2.2 * Math.pow(value - 1, 3) + 1.2 * Math.pow(value - 1, 2)

/*  Escribe el estado de una tarjeta; quieta del todo, sin transform */
function place(element: HTMLElement, transform: string | null, pop: number) {
  element.style.transform = transform ?? 'none'
  element.style.setProperty('--pop', pop.toFixed(3))
}

/*  A · SE LEVANTAN */

// RISE_TRAVEL = «qué parte de la pantalla tiene que subir una ficha, desde que asoma, para ponerse de pie»
const RISE_TRAVEL = 0.32
// RISE_STEP = «cuánto más tarda cada columna que la de su izquierda, en fracciones de ese recorrido»
const RISE_STEP = 0.2

export const riseMotion: CardsMotion = ({ grid, viewportHeight }, layout) => {
  for (const card of layout.cards) {
    // Cada ficha empieza a levantarse cuando su borde de abajo (la bisagra) asoma por la pantalla
    const risen = (viewportHeight - (grid.top + card.bottom)) / (viewportHeight * RISE_TRAVEL)
    const local = clamp(risen - card.column * RISE_STEP)
    if (local >= 1) {
      place(card.element, null, 0)
      continue
    }
    const lying = 1 - easeOutBack(local)
    const away = 1 - easeOut(local)
    place(card.element, `translate3d(0, ${away * 70}px, ${away * -90}px) rotateX(${lying * 80}deg)`, away)
  }
}

/*  B · EN PROFUNDIDAD */

// DEPTHS = «a qué profundidad flota cada tarjeta, en píxeles; distintas para que se crucen al moverse»
const DEPTHS = [150, 60, 230, 100, 280, 30]
// FLAT_ZONE = «el tramo alrededor del centro de la pantalla en el que la rejilla está plana, para leerla»
const FLAT_ZONE = 0.12

export const depthMotion: CardsMotion = ({ grid, viewportHeight }, layout) => {
  // passage = «-1 cuando la rejilla asoma por abajo, 0 cuando está centrada, 1 cuando se va por arriba»
  const halfScreen = viewportHeight / 2
  const passage = clamp((halfScreen - (grid.top + grid.height / 2)) / (halfScreen + grid.height / 2), -1, 1)
  const amount = easeInOut(clamp((Math.abs(passage) - FLAT_ZONE) / (1 - FLAT_ZONE)))
  // strength = «amount con el signo de por dónde va: negativa al llegar, positiva al irse»
  const strength = Math.sign(passage) * amount
  const middleColumn = (layout.columns - 1) / 2

  for (const card of layout.cards) {
    if (amount === 0) {
      place(card.element, null, 0)
      continue
    }
    const depth = DEPTHS[card.index % DEPTHS.length]
    const side = card.column - middleColumn
    // Lo más hondo va más despacio: queda más abajo al llegar y más arriba al irse
    const transform = `translate3d(${side * 50 * amount}px, ${-depth * 0.55 * strength}px, ${-depth * amount}px) rotateX(${22 * strength}deg) rotateY(${side * 20 * amount}deg)`
    place(card.element, transform, amount)
  }
}

/*  C · SE REPARTEN */

// DEAL_LEAD = «cuánto del tramo fijo pasa antes de que salga la primera carta»
const DEAL_LEAD = 0.06
// DEAL_STEP, DEAL_SPAN = «cuánto espera cada carta respecto a la anterior, y cuánto tarda en llegar a su sitio»
const DEAL_STEP = 0.12
const DEAL_SPAN = 0.3
// DECK_GAP, DECK_TURN = «la separación en profundidad entre cartas de la baraja y lo torcida que está cada una»
const DECK_GAP = 4
const DECK_TURN = 2.5

export const dealMotion: CardsMotion = ({ section, viewportHeight }, layout) => {
  // progress = «cuánto se ha recorrido del tramo en que la sección está fija»
  const progress = clamp(-section.top / Math.max(1, section.height - viewportHeight))
  const lastIndex = layout.cards.length - 1

  for (const card of layout.cards) {
    const local = clamp((progress - DEAL_LEAD - card.index * DEAL_STEP) / DEAL_SPAN)
    if (local >= 1) {
      place(card.element, null, 0)
      continue
    }
    const travel = easeInOut(local)
    const left = 1 - travel
    // arc = «el vuelo: sube y se acerca a mitad de camino»
    const arc = Math.sin(local * Math.PI)
    // La primera en salir es la de arriba de la baraja
    const deckDepth = (lastIndex - card.index) * DECK_GAP
    const turn = (card.index - lastIndex / 2) * DECK_TURN
    const transform = `translate3d(${card.offsetX * left}px, ${card.offsetY * left - arc * 50}px, ${deckDepth * left + arc * 180}px) rotateY(${180 * left}deg) rotateZ(${turn * left}deg)`
    place(card.element, transform, arc)
  }
}
