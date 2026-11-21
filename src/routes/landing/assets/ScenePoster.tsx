/*  EL PÓSTER DE UNA ESCENA 3D: su fotograma de reposo, fotografiado de antemano (public/posters).
 *
 *  Se ve primero, mientras Three.js carga y la escena dibuja, y se aparta cuando la escena ya pintó. Si la escena
 *  falla (sin WebGL, o un shader rechazado) se queda: la portada nunca enseña un hueco vacío (taste-skill).
 *  Solo pinta.
 *
 *  @param poster  el póster y su tamaño en píxeles (para que el navegador le guarde el sitio)
 *  @param ready   si la escena ya dibujó su primer fotograma
 *  @param failed  si la escena no puede dibujarse
 *  @param fit     'contain' para un objeto en su marco, 'cover' para una escena que hace de fondo
 */
type ScenePosterProps = {
  poster: { src: string; width: number; height: number }
  ready: boolean
  failed: boolean
  fit?: 'contain' | 'cover'
  className?: string
}

export default function ScenePoster({ poster, ready, failed, fit = 'contain', className = '' }: ScenePosterProps) {
  const hidden = ready && !failed
  return (
    <img
      src={poster.src}
      width={poster.width}
      height={poster.height}
      alt=''
      aria-hidden='true'
      decoding='async'
      fetchPriority='high'
      className={`pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ${
        fit === 'cover' ? 'object-cover' : 'object-contain'
      } ${hidden ? 'opacity-0' : 'opacity-100'} ${className}`}
    />
  )
}
