import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { imageUrl } from '@/libs/imageUrl'
import { notificationSupport, notificationWorker, playAlertSound, showNotice, unlockAlertSound } from '@/libs/notifications'
import { socket } from '@/libs/socket'

/*  LAS ALERTAS NUEVAS, COMO AVISO DEL SISTEMA (atado al socket)
 *
 *  Escucha el socket de la API mientras el portal está abierto, en cualquier pantalla. La API emite
 *  'document_updated' con la novedad entera cada vez que se edita una; cuando esa novedad queda VALIDADA y ENVIADA AL
 *  GRUPO (el mismo criterio del muro: validationResult.isApproved y sharedByAmazonActive, o givenToTheGroup en las de
 *  antes) y es de uno de los establecimientos de quien entra, sale un aviso del sistema (libs/notifications): las
 *  demoras, las incidencias, las devoluciones… todo lo que entra al muro.
 *
 *  Cada alerta avisa una sola vez: se recuerdan las avisadas en este navegador (NOTIFIED_KEY). Y solo las validadas
 *  hace poco (FRESH_MS): si alguien retoca más tarde una alerta vieja, la API vuelve a emitirla y no debe sonar.
 *  Cada aviso que sale, suena (playAlertSound); el sonido se despierta con el primer clic, toque o tecla en el portal.
 *  Sin permiso del navegador, o con los avisos apagados en el panel de la voz, no hace nada.
 *
 *  @param establishmentIds  los establecimientos de quien entra
 *  @param on                si los avisos están encendidos (preferencias)
 */

// NoveltyEvent = «lo que trae 'document_updated'»: la novedad tal cual la guarda la API, con el establecimiento
// poblado; aquí solo se mira lo que hace falta
type NoveltyEvent = {
  doc?: {
    _id?: string
    title?: string | null
    table?: string | null
    establishment?: { _id?: string; name?: string | null } | string | null
    local?: { name?: string | null } | null
    validationResult?: { isApproved?: boolean | null; updatedAt?: string | null } | null
    sharedByAmazonActive?: boolean | null
    givenToTheGroup?: boolean | null
    imageToShare?: string | null
    imageUrl?: { url?: string | null }[] | null
    updatedAt?: string | null
  } | null
}

// EVENT = «el evento del socket que trae las novedades editadas»
const EVENT = 'document_updated'
// FRESH_MS = «cuánto hace, como mucho, que se validó una alerta para avisar de ella»
const FRESH_MS = 15 * 60_000
// NOTIFIED_KEY = «dónde se recuerdan las alertas ya avisadas» y NOTIFIED_MAX = «cuántas, las últimas»
const NOTIFIED_KEY = 'insights365.avisadas'
const NOTIFIED_MAX = 300

function readNotified(): string[] {
  try {
    const stored = JSON.parse(window.localStorage.getItem(NOTIFIED_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function writeNotified(ids: string[]) {
  try {
    window.localStorage.setItem(NOTIFIED_KEY, JSON.stringify(ids.slice(-NOTIFIED_MAX)))
  } catch {
    // Sin almacenamiento (ventana privada): se recuerdan mientras la página esté abierta
  }
}

export function useAlertNotifications(establishmentIds: string[], on: boolean) {
  const { t } = useTranslation()
  // Lo que cambia sin que haga falta volver a escuchar: los establecimientos y los textos (cambian con el idioma)
  const idsRef = useRef(new Set(establishmentIds))
  const tRef = useRef(t)
  useEffect(() => {
    idsRef.current = new Set(establishmentIds)
    tRef.current = t
  }, [establishmentIds, t])

  useEffect(() => {
    if (!on) return
    const notified = new Set(readNotified())
    // Con permiso ya dado, el service worker se deja listo para el primer aviso
    if (notificationSupport() === 'ready') void notificationWorker()

    const onNovelty = (payload: NoveltyEvent) => {
      const doc = payload?.doc
      if (!doc?._id || notified.has(doc._id)) return
      const counted = doc.validationResult?.isApproved === true && Boolean(doc.sharedByAmazonActive || doc.givenToTheGroup)
      if (!counted) return
      const establishment = typeof doc.establishment === 'object' && doc.establishment ? doc.establishment : null
      const establishmentId = establishment?._id ?? (typeof doc.establishment === 'string' ? doc.establishment : null)
      if (!establishmentId || !idsRef.current.has(establishmentId)) return
      const validatedAt = Date.parse(doc.validationResult?.updatedAt ?? doc.updatedAt ?? '')
      if (Number.isFinite(validatedAt) && Date.now() - validatedAt > FRESH_MS) return
      if (notificationSupport() !== 'ready') return

      notified.add(doc._id)
      writeNotified([...notified])
      const translate = tRef.current
      const place = establishment?.name?.trim() || doc.local?.name?.trim() || translate('alert.noPlace')
      const table = doc.table?.trim()
      void showNotice({
        title: doc.title?.trim() || translate('alert.fallbackTitle'),
        body: table ? translate('notify.bodyWithTable', { place, table }) : place,
        tag: `alerta-${doc._id}`,
        url: '/en-vivo',
        image: imageUrl(doc.imageToShare ?? doc.imageUrl?.find(image => image?.url)?.url ?? null),
      }).then(shown => {
        if (shown) playAlertSound()
      })
    }

    // El sonido se despierta con el primer clic, toque o tecla (los navegadores no dejan sonar antes)
    const unlockEvents = ['click', 'touchend', 'keydown'] as const
    unlockEvents.forEach(event => window.addEventListener(event, unlockAlertSound, { passive: true }))

    socket.on(EVENT, onNovelty)
    if (!socket.connected) socket.connect()
    return () => {
      socket.off(EVENT, onNovelty)
      unlockEvents.forEach(event => window.removeEventListener(event, unlockAlertSound))
    }
  }, [on])
}
