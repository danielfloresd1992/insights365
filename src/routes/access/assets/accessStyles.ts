/*  LAS CLASES DE LOS FORMULARIOS DE /acceso, sobre la tinta de Amazonas. Las comparten entrar, pedir el enlace y
 *  crear la contraseña nueva. */

// ERROR_TEXT = «el rojo de los errores sobre la tinta: el #bf3330 de siempre no se lee en fondo oscuro»
export const ERROR_TEXT = 'text-[#f4a29c]'

// fieldClasses = «el campo: algo más claro que la tinta, con borde que se distingue de ella; verde con el foco, rojo
// claro si tiene error. Deja sitio al icono de la izquierda y, si lo lleva, al ojo de la derecha»
export const fieldClasses = (hasError: boolean, withEye: boolean) =>
  `login-field block h-12 w-full rounded-lg border bg-[#3a3528] pl-11 text-[0.95rem] text-[#fbf8f0] outline-none transition-[border-color,box-shadow] placeholder:text-[#b3aa96] focus:border-[#29c50c] focus:ring-[3px] focus:ring-[#29c50c]/35 ${
    withEye ? 'pr-12' : 'pr-3.5'
  } ${hasError ? 'border-[#f4a29c]' : 'border-[#8b8577]'}`

// FIELD_ICON = «dónde va el icono de un campo: dentro, a la izquierda, centrado en alto»
export const FIELD_ICON = 'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b3aa96]'

// TEXT_LINK = «un enlace dentro del texto, en marfil y subrayado, que se distingue del texto de alrededor»
export const TEXT_LINK = 'landing-link font-semibold text-[#fbf8f0] underline decoration-[#29c50c] decoration-2 underline-offset-4'

// SECONDARY_BUTTON = «el botón que no es el principal: el contorno marfil sobre la tinta»
export const SECONDARY_BUTTON =
  'landing-button inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg font-semibold text-[#fbf8f0] ring-1 ring-inset ring-[#8b8577] hover:bg-white/[0.06] disabled:opacity-60 disabled:hover:translate-y-0'
