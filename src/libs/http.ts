import axios from 'axios'

/*  EL CLIENTE HTTP DE LA API
 *
 *  Una sola instancia de axios para todo el portal. La dirección base de la API se carga aquí: la de VITE_API_URL en
 *  .env, o DEFAULT_API_URL si .env no la trae. Las cookies de sesión viajan en cada petición (withCredentials): el
 *  navegador guarda la que pone la API al entrar y la manda de vuelta, porque la API vive en otro dominio
 *  (express-session, como en Client365 y Jarvis-express365). Las peticiones de cada recurso van en ajax/, una
 *  función por endpoint, sobre esta instancia.
 */

// DEFAULT_API_URL = «la API de Jarvis365 cuando .env no dice otra»
const DEFAULT_API_URL = 'https://72.68.60.201:3006/api_jarvis/v1/'

// API_URL = «la dirección base de todas las peticiones»
export const API_URL = import.meta.env.VITE_API_URL?.trim() || DEFAULT_API_URL

// REQUEST_TIMEOUT_MS = «cuánto se espera a la API antes de dar la petición por fallida»
const REQUEST_TIMEOUT_MS = 20_000

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
})
