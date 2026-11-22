import { API_URL } from './http'

/*  LOS VÍDEOS DE LAS NOVEDADES
 *
 *  La API guarda la dirección de cada vídeo con su dominio público (https://amazona365.ddns.net/api_jarvis/v1/
 *  novelty/video=<archivo>) y, a diferencia de las fotos, pide sesión para servirlo. La cookie de sesión del portal es
 *  la de la API a la que habla (API_URL): pedido a otro dominio, el vídeo llegaría sin ella y daría 401. Por eso se pide
 *  a la misma API, con el mismo archivo. Una dirección que no sea de un vídeo de novedad se deja como está.
 */
export function videoUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = /\/novelty\/video=([^/?#]+)/.exec(url)
  if (!match) return url
  const base = API_URL.endsWith('/') ? API_URL : `${API_URL}/`
  return new URL(`novelty/video=${match[1]}`, base).toString()
}
