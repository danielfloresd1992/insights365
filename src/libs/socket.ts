import { io, type Socket } from 'socket.io-client'

/*  EL SOCKET DE LA API (socket.io)
 *
 *  La API de Jarvis365 monta su socket.io en el mismo servidor y puerto que la API, en la ruta de siempre (/socket.io).
 *  La dirección se carga aquí: la de VITE_SOCKET_URL en .env, o DEFAULT_SOCKET_URL si .env no la trae.
 *
 *  Se crea sin conectar (autoConnect: false): importar este archivo no abre nada. Quien lo use llama a
 *  socket.connect() cuando haga falta, y socket.disconnect() al cerrar sesión.
 *  Sin withCredentials: el socket.io de la API acepta cualquier origen ("*"), y con "*" el navegador no deja mandar
 *  cookies; la sesión no viaja por aquí.
 */

// DEFAULT_SOCKET_URL = «el socket de Jarvis365 cuando .env no dice otro»: la misma dirección y puerto que la API
const DEFAULT_SOCKET_URL = 'wss://72.68.60.201:3006'

// SOCKET_URL = «a dónde se conecta el socket»
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL?.trim() || DEFAULT_SOCKET_URL

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
})
