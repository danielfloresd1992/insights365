/*  LAS VARIABLES DE ENTORNO, con su tipo
 *
 *  Van en .env (no se sube a git; el modelo está en .env.example) y todas llevan el prefijo VITE_, como en
 *  Jarvis-express365: Vite solo deja pasar al navegador las que lo llevan.
 */
interface ImportMetaEnv {
  /** La API de Jarvis365 (api_jarvis365), en otro dominio: las cookies de sesión viajan cross-domain. Sin ella,
   *  libs/http.ts usa su dirección por defecto */
  readonly VITE_API_URL?: string
  /** El socket de la API (socket.io), en la misma dirección y puerto que la API. Sin ella, libs/socket.ts usa su
   *  dirección por defecto */
  readonly VITE_SOCKET_URL?: string
  /** El servidor desde el que se ven las imágenes de las novedades, sin ruta (ver libs/imageUrl.ts) */
  readonly VITE_API_URL_IMAGE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
