/*  LA FORMA DE UN CORREO, para los formularios de /acceso (entrar y pedir el enlace). */

// EMAIL_SHAPE = «la forma mínima de un correo: algo, arroba, algo, punto, algo»
export const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// emailProblem = «qué le falta al correo escrito, o nada si tiene forma de correo»
export function emailProblem(email: string): string | undefined {
  const trimmed = email.trim()
  if (!trimmed) return 'Escribe tu correo.'
  if (!EMAIL_SHAPE.test(trimmed)) return 'Revisa el correo: le falta algo.'
  return undefined
}
