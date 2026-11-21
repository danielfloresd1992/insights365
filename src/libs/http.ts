import axios from 'axios'

/*  EL CLIENTE HTTP DE LA API
 *
 *  Una sola instancia de axios para todo el portal: la dirección sale de VITE_API_URL y las cookies de sesión van
 *  en cada petición (withCredentials), porque la API vive en otro dominio (express-session, como en Client365 y
 *  Jarvis-express365). Las peticiones de cada recurso irán en libs/, una función por endpoint, sobre esta instancia.
 */

// REQUEST_TIMEOUT_MS = «cuánto se espera a la API antes de dar la petición por fallida»
const REQUEST_TIMEOUT_MS = 20_000

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
})
