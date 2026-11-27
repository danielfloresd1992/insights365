import { http } from '@/libs/http'

/*  EL USUARIO CONTRA LA API (api_jarvis365, /auth)
 *
 *  Todas las llamadas de la cuenta de quien usa el portal:
 *  - la sesión: entrar con correo y contraseña, confirmar quién tiene la sesión abierta (al abrir o recargar la
 *    página) y cerrarla;
 *  - recuperar la contraseña: pedir el enlace por correo, comprobar si el enlace sigue valiendo y poner la nueva.
 *
 *  La API pone una cookie de sesión al entrar (express-session) y la lee en cada petición; la instancia de axios
 *  (libs/http) la manda sola. Aquí no se guarda ningún token. Los errores de la API llegan tal cual (400, 401, 403,
 *  404, 410, 429, 503): los traduce quien muestra el formulario.
 */

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// LA SESIÓN
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════

// ApiSessionAccess = «qué locales ve el usuario, ya relacionados con él» (user.access en la API, con los nombres de sus
// franquicias y sus locales). Llega en /auth/login y en /auth/isAuth, y la API lo lee de la base en cada /auth/isAuth:
// un cambio que haga un administrador en Client365 llega sin volver a entrar.
//   scope: 'assigned' sus franquicias y locales · 'staff' del equipo, todos · 'none' todavía nada asignado
export type ApiSessionAccess = {
  mode: 'all' | 'only'
  scope: 'assigned' | 'staff' | 'none'
  franchises: { _id: string; name: string | null }[]
  locals: { _id: string; name: string | null; franchise: string | null; franchiseName: string | null }[]
  updatedAt: string | null
}

// ApiUser = «el usuario tal como lo devuelve la API»; solo se nombra lo que el portal usa
export type ApiUser = {
  _id: string
  name?: string
  surName?: string
  email?: string
  admin?: boolean
  super?: boolean
  // access = null si la API no lo pudo leer (o es una API de antes): entonces decide GET /insights/establishments
  access?: ApiSessionAccess | null
}

// ALREADY_SIGNED_IN = «lo que contesta /auth/login cuando ya había sesión: un aviso, sin el usuario»
const ALREADY_SIGNED_IN = 'User already authenticated'

/*  Entra con correo y contraseña (POST /auth/login). Si ya había una sesión abierta, la API no devuelve el usuario
 *  sino un aviso, y entonces se le pregunta por la sesión. La API contesta 404 si el correo no existe, 401 si la
 *  contraseña no es y 403 si la cuenta está deshabilitada. */
export async function login(email: string, password: string): Promise<ApiUser> {
  const response = await http.post<ApiUser | { message?: string }>('/auth/login', { email, password })
  const body = response.data
  if (body && 'message' in body && body.message === ALREADY_SIGNED_IN) return fetchSession()
  return body as ApiUser
}

/*  Confirma quién tiene la sesión abierta (GET /auth/isAuth). Es lo que se pregunta al abrir o recargar la página:
 *  la cookie sigue en el navegador, pero el portal no sabe de quién es hasta que la API lo dice. Contesta 401 si no
 *  hay sesión o caducó. */
export async function fetchSession(): Promise<ApiUser> {
  const response = await http.get<ApiUser>('/auth/isAuth')
  return response.data
}

// logout = «cierra la sesión en la API (GET /auth/logout): la API la destruye y la cookie deja de valer»
export async function logout(): Promise<void> {
  await http.get('/auth/logout')
}

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// RECUPERAR LA CONTRASEÑA (/auth/password), sin sesión
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// El token del enlace va siempre en el cuerpo, nunca en la URL, porque la API escribe las URL en su log.

// PORTAL = «a qué portal tiene que apuntar el enlace del correo; la dirección la pone la API, no el portal»
const PORTAL = 'insights'

// ForgotAnswer = «la respuesta al pedir el enlace: la misma exista la cuenta o no, con los minutos que dura»
export type ForgotAnswer = { message: string; minutes: number }

// requestPasswordReset = «pide que le llegue un enlace a ese correo»
export async function requestPasswordReset(email: string): Promise<ForgotAnswer> {
  const response = await http.post<ForgotAnswer>('/auth/password/forgot', { email, app: PORTAL })
  return response.data
}

// ResetCheck = «de quién es el enlace: el nombre y el correo tapado (d•••@dominio), y hasta cuándo vale»
export type ResetCheck = { name: string; email: string; expiresAt: string }

// checkResetToken = «si el enlace sigue valiendo; la API contesta 410 si caducó, se usó o no es suyo»
export async function checkResetToken(token: string): Promise<ResetCheck> {
  const response = await http.post<ResetCheck>('/auth/password/reset/check', { token })
  return response.data
}

// resetPassword = «pone la contraseña nueva y gasta el enlace; la API cierra las sesiones abiertas de la cuenta»
export async function resetPassword(token: string, password: string): Promise<void> {
  await http.post('/auth/password/reset', { token, password })
}
