import { http } from './http'

/*  LA SESIÓN CONTRA LA API (api_jarvis365, /auth)
 *
 *  La API pone una cookie de sesión al entrar (express-session) y la lee en cada petición: aquí no se guarda ningún
 *  token. Tres llamadas: entrar con correo y contraseña, preguntar quién tiene la sesión abierta, y salir.
 */

// ApiUser = «el usuario tal como lo devuelve la API»; solo se nombra lo que el portal usa
export type ApiUser = {
  _id: string
  name?: string
  surName?: string
  email?: string
  admin?: boolean
  super?: boolean
  // franchises = «las franquicias del dueño». HOY LA API NO LO TIENE: sus usuarios no están ligados a franquicias.
  // Cuando lo tenga, el muro filtrará por ellas en vez de dejar elegir (ver routes/wall/hook/useFranchiseScope)
  franchises?: unknown
}

// ALREADY_SIGNED_IN = «lo que contesta /auth/login cuando ya había sesión: un aviso, sin el usuario»
const ALREADY_SIGNED_IN = 'User already authenticated'

/*  Entra con correo y contraseña. Si ya había una sesión abierta, la API no devuelve el usuario sino un aviso, y
 *  entonces se pregunta por la sesión. Los errores de la API llegan tal cual (404, 401, 403): los traduce quien
 *  muestra el formulario. */
export async function login(email: string, password: string): Promise<ApiUser> {
  const response = await http.post<ApiUser | { message?: string }>('/auth/login', { email, password })
  const body = response.data
  if (body && 'message' in body && body.message === ALREADY_SIGNED_IN) return fetchSession()
  return body as ApiUser
}

// fetchSession = «quién tiene la sesión abierta; la API contesta 401 si nadie»
export async function fetchSession(): Promise<ApiUser> {
  const response = await http.get<ApiUser>('/auth/isAuth')
  return response.data
}

// logout = «cierra la sesión en la API»
export async function logout(): Promise<void> {
  await http.get('/auth/logout')
}
