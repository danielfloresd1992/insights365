import type { Novelty } from '@/ajax/novelty.ajax'
import { imageUrl } from '@/libs/imageUrl'
import { videoUrl } from '@/libs/videoUrl'

/*  LO QUE SE VE EN EL VISOR DE UNA ALERTA, EN ORDEN
 *
 *  Primero lo mismo que enseña la tarjeta (el vídeo si lo hay; si no, la imagen que se envió al grupo), para que el
 *  visor abra donde se pulsó. Después la imagen enviada al grupo (si la tarjeta enseñaba el vídeo) y la secuencia de
 *  la cámara con sus rótulos («Inicio», «Secuencia», «Fin»). Sin repetir la misma imagen. Pura: los rótulos propios
 *  («Vídeo», «Imagen enviada al grupo») los pasa quien llama, en su idioma.
 */

// ViewerItem = «una cosa que se ve en el visor»: una imagen o el vídeo, con su rótulo
export type ViewerItem = { kind: 'image' | 'video'; src: string; caption: string | null; poster: string | null }

export function viewerItems(novelty: Novelty, labels: { video: string; shared: string }): ViewerItem[] {
  const shared = imageUrl(novelty.imageToShare)
  const video = videoUrl(novelty.videoUrl)
  const items: ViewerItem[] = []
  if (video) items.push({ kind: 'video', src: video, caption: labels.video, poster: shared })
  if (shared) items.push({ kind: 'image', src: shared, caption: labels.shared, poster: null })
  for (const image of novelty.images) {
    const src = imageUrl(image.url)
    if (src) items.push({ kind: 'image', src, caption: image.caption, poster: null })
  }
  const seen = new Set<string>()
  return items.filter(item => (seen.has(item.src) ? false : (seen.add(item.src), true)))
}
