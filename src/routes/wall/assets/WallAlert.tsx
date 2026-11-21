import AlertCardView from '@/components/AlertCardView'
import { formatWhen } from '@/libs/formatWhen'
import { imageUrl } from '@/libs/imageUrl'
import type { WallItem } from '@/libs/wall.api'
import { useNoveltyDetail } from '../hook/useNoveltyDetail'

/*  UNA ALERTA DEL MURO
 *
 *  Pinta la publicación con AlertCardView y, cuando la tarjeta está por entrar en pantalla, le pide a la API el
 *  contenido de su novedad (foto, mesa, plato, turno). Es la única pieza del muro que pide algo por su cuenta: cada
 *  tarjeta trae lo suyo y solo cuando se va a ver.
 *
 *  @param item  la publicación del muro
 *  @param now   la hora con la que se calcula «hace 5 min» (la da el controlador, que la refresca)
 */
type WallAlertProps = {
  item: WallItem
  now: number
}

export default function WallAlert({ item, now }: WallAlertProps) {
  const { ref, detail, loading } = useNoveltyDetail(item.noveltie ?? null)
  const firstImage = detail?.imageToShare || detail?.imageUrl?.find(image => image?.url)?.url

  return (
    <div ref={ref}>
      <AlertCardView
        place={item.local?.localName || 'Local sin nombre'}
        title={detail?.title || item.title || 'Novedad'}
        when={formatWhen(item.date, now)}
        table={detail?.table || null}
        dish={detail?.nameDish || detail?.menu || null}
        shift={detail?.shift ?? null}
        imageSrc={imageUrl(firstImage)}
        loading={Boolean(item.noveltie) && loading}
      />
    </div>
  )
}
