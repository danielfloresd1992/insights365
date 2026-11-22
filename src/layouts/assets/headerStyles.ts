/*  LAS CLASES DEL HEADER DEL PORTAL, compartidas por sus piezas. Los colores son los del portal (bg-portal-*,
 *  text-portal-*): cambian solos con el tema. */

// FOCUS = «el anillo del foco del teclado, en la tinta del tema»
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'

// SEGMENT_TRACK = «el carril de un selector de dos opciones (idioma, tema)»
export const SEGMENT_TRACK = 'flex gap-0.5 rounded-full bg-portal-ctl p-0.5 ring-1 ring-inset ring-portal-ring'

// segmentButton = «una opción del selector»: la elegida, blanca (o tinta clara en oscuro) y con sombra
export const segmentButton = (active: boolean, wide: boolean) =>
  `inline-flex h-11 items-center justify-center gap-2 rounded-full font-semibold transition-colors ${FOCUS} ${
    wide ? 'flex-1 text-sm' : 'w-11 text-[13px] tracking-[0.04em]'
  } ${
    active
      ? 'bg-portal-on text-portal-ink shadow-[0_1px_2px_rgba(47,42,30,0.16)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.45)]'
      : 'text-portal-muted hover:text-portal-ink'
  }`

// ICON_BUTTON = «un botón redondo que solo lleva icono»
export const ICON_BUTTON = `relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-portal-ink transition-colors hover:bg-portal-ctl ${FOCUS}`

// OUTLINE_BUTTON = «un botón con borde, como Cerrar sesión»
export const OUTLINE_BUTTON =
  'landing-button inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 text-sm font-semibold text-portal-ink ring-1 ring-inset ring-portal-ring hover:bg-portal-ctl disabled:opacity-60'

// GROUP_LABEL = «el rótulo de un grupo de opciones, en mayúsculas pequeñas»
export const GROUP_LABEL = 'mb-2 block p-0 text-xs font-semibold uppercase tracking-[0.08em] text-portal-muted'

// LIVE_DOT = «el punto verde de lo que está activo»
export const LIVE_DOT = 'h-2 w-2 rounded-full bg-[#29c50c]'
