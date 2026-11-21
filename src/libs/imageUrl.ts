/*  LAS IMÁGENES DE LAS NOVEDADES
 *
 *  La API guarda la dirección de cada imagen con su dominio público. Quien entra por la red del local la ve más rápido
 *  por la LAN: VITE_API_URL_IMAGE dice desde qué servidor pedirlas, y aquí se cambia el dominio por ese. Es lo mismo
 *  que hace reportes365 (app/lib/fetching/transUrlLocal.tsx).
 */

// PUBLIC_IMAGE_HOST = «el dominio con el que la API guarda las direcciones de las imágenes»
const PUBLIC_IMAGE_HOST = 'https://amazona365.ddns.net'

export function imageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const host = import.meta.env.VITE_API_URL_IMAGE
  if (!host || !url.startsWith(PUBLIC_IMAGE_HOST)) return url
  return `${host.replace(/\/$/, '')}${url.slice(PUBLIC_IMAGE_HOST.length)}`
}
