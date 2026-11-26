/*  LOS AVISOS DEL SISTEMA (notificaciones) EN ESCRITORIO, ANDROID E iOS
 *
 *  Pone en el sistema operativo un aviso por cada alerta nueva que llega por el socket (layouts/hook/
 *  useAlertNotifications). No es Web Push: no hay servidor de avisos ni suscripciones. Los avisos salen de la página
 *  mientras el portal está abierto, aunque esté en otra pestaña, minimizado o detrás de otra app. Con el navegador
 *  cerrado, o con el móvil bloqueado un rato (el sistema congela la página y el socket se corta), no llega nada.
 *
 *  Cada plataforma tiene lo suyo, y este archivo lo resuelve para que quien lo use no tenga que saberlo:
 *  - Escritorio (Chrome, Edge, Firefox, Safari): vale `new Notification`, pero se prefiere el service worker
 *    (public/sw.js), que al pulsar el aviso vuelve a la pestaña del portal.
 *  - Android (Chrome y compañía): `new Notification` no existe ahí (lanza TypeError); solo el service worker puede
 *    mostrarlos. Admite foto grande (image) y el icono pequeño de la barra (badge).
 *  - iPhone y iPad (iOS 16.4 o más): solo dentro de la app añadida a la pantalla de inicio y abierta desde su icono
 *    (public/manifest.webmanifest); en Safari normal no existen. Siempre por el service worker.
 *  El permiso se pide siempre al tocar un botón (requestNotifications): iOS lo exige y los demás lo agradecen.
 *  Todo necesita una página segura (https, o localhost mientras se desarrolla).
 *
 *  EL SONIDO: cada aviso suena en la página (playAlertSound), dos notas cortas generadas aquí con Web Audio, sin
 *  archivo. No se fía del sonido del sistema, que muchas veces no suena (Windows sin sonido de avisos, «No molestar»).
 *  Los navegadores no dejan sonar una página hasta que se la toca una vez: unlockAlertSound se engancha al primer
 *  clic, toque o tecla (useAlertNotifications) y desde ahí ya suena. En iPhone, el interruptor de silencio lo calla.
 */

// NotificationPlatform = «dónde corre el portal», por lo que cambia en cada uno
export type NotificationPlatform = 'ios' | 'android' | 'desktop'

// NotificationSupport = «qué se puede hacer con los avisos en este dispositivo»
//   ready        hay permiso: los avisos salen
//   ask          se pueden pedir: falta el permiso (se pide con requestNotifications, desde un toque)
//   denied       se denegó: solo se cambia en los ajustes del sitio del navegador
//   ios-install  iPhone o iPad en Safari: hay que añadir insights365 a la pantalla de inicio y abrirlo desde ahí
//   unsupported  este navegador no tiene avisos del sistema (o la página no es segura)
export type NotificationSupport = 'ready' | 'ask' | 'denied' | 'ios-install' | 'unsupported'

// SystemNotice = «un aviso»: título y texto, la etiqueta que lo identifica (el mismo tag reemplaza al anterior en vez
// de apilarse), a dónde lleva al pulsarlo y, si hay, una foto
export type SystemNotice = { title: string; body: string; tag: string; url?: string; image?: string | null }

// WORKER_URL = «el service worker de los avisos», en public/: se sirve en la raíz para que valga para todo el portal
const WORKER_URL = '/sw.js'
// ICON = «el icono del aviso» y BADGE = «el icono pequeño de la barra de Android» (solo su silueta)
const ICON = '/icons/icon-192.png'
const BADGE = '/icons/badge-96.png'
// DEFAULT_URL = «a dónde lleva un aviso al pulsarlo, si no dice otra cosa»
const DEFAULT_URL = '/en-vivo'

/** Dónde corre el portal. iPadOS se presenta como un Mac: se le nota en la pantalla táctil. */
export function notificationPlatform(): NotificationPlatform {
  const agent = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/i.test(agent)) return 'android'
  return 'desktop'
}

/** Si el portal está abierto como app (desde el icono de la pantalla de inicio o instalada), y no en una pestaña. */
export function isInstalledApp(): boolean {
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return standalone || Boolean(window.matchMedia?.('(display-mode: standalone)').matches)
}

/** Qué se puede hacer con los avisos aquí y ahora. */
export function notificationSupport(): NotificationSupport {
  if (typeof window === 'undefined' || !window.isSecureContext) return 'unsupported'
  if (!('Notification' in window)) {
    // En iPhone y iPad, Safari no los tiene; la app de la pantalla de inicio, sí
    return notificationPlatform() === 'ios' && !isInstalledApp() ? 'ios-install' : 'unsupported'
  }
  // Android sin service worker no puede mostrar ninguno
  if (notificationPlatform() !== 'desktop' && !('serviceWorker' in navigator)) return 'unsupported'
  if (Notification.permission === 'granted') return 'ready'
  if (Notification.permission === 'denied') return 'denied'
  return 'ask'
}

// workerPromise = «el registro del service worker», una sola vez por página
let workerPromise: Promise<ServiceWorkerRegistration | null> | null = null

/** El service worker de los avisos, registrado y listo; null si el navegador no tiene o no se pudo registrar. */
export function notificationWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return Promise.resolve(null)
  workerPromise ??= navigator.serviceWorker
    .register(WORKER_URL)
    .then(() => navigator.serviceWorker.ready)
    .catch(() => null)
  return workerPromise
}

/** Pide permiso para los avisos. Hay que llamarla desde un toque o un clic (iOS no la deja de otra forma), y lo
 *  primero que hace es pedirlo, sin esperar a nada antes. Devuelve cómo quedan. */
export async function requestNotifications(): Promise<NotificationSupport> {
  const before = notificationSupport()
  if (before !== 'ask') return before
  // Safari anterior a la 15 solo entiende la forma con callback; los demás devuelven una promesa
  const answer = await new Promise<NotificationPermission>(resolve => {
    const pending = Notification.requestPermission(resolve)
    if (pending) pending.then(resolve, () => resolve(Notification.permission))
  })
  if (answer === 'granted') await notificationWorker()
  return notificationSupport()
}

// audio = «el motor de sonido de la página», uno solo; se crea al primer toque (antes nacería callado)
let audio: AudioContext | null = null
// lastSound = «cuándo sonó el último aviso»: varias alertas juntas suenan una vez (SOUND_GAP_MS)
let lastSound = 0
const SOUND_GAP_MS = 1500
// CHIME = «las dos notas del aviso» (mi y la, en hercios) y cuánto dura cada una, en segundos
const CHIME = [659.25, 880]
const NOTE_S = 0.45

function audioContext(): AudioContext | null {
  if (audio) return audio
  const Engine = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Engine) return null
  try {
    audio = new Engine()
  } catch {
    audio = null
  }
  return audio
}

/** Despierta el sonido. Hay que llamarla desde un clic, un toque o una tecla: solo ahí deja el navegador. */
export function unlockAlertSound() {
  const engine = audioContext()
  if (engine?.state === 'suspended') void engine.resume().catch(() => {})
}

/** Toca el sonido del aviso: dos notas que suben, cortas y suaves. Sin sonido despertado, no suena (ni falla). */
export function playAlertSound() {
  const now = Date.now()
  if (now - lastSound < SOUND_GAP_MS) return
  const engine = audioContext()
  if (!engine) return
  if (engine.state === 'suspended') void engine.resume().catch(() => {})
  lastSound = now
  const start = engine.currentTime + 0.02
  CHIME.forEach((frequency, index) => {
    const at = start + index * 0.16
    const tone = engine.createOscillator()
    const volume = engine.createGain()
    tone.type = 'sine'
    tone.frequency.value = frequency
    volume.gain.setValueAtTime(0.0001, at)
    volume.gain.exponentialRampToValueAtTime(0.28, at + 0.015)
    volume.gain.exponentialRampToValueAtTime(0.0001, at + NOTE_S)
    tone.connect(volume).connect(engine.destination)
    tone.start(at)
    tone.stop(at + NOTE_S + 0.05)
  })
}

/** Pone un aviso en el sistema. Devuelve si salió: sin permiso, o sin manera de mostrarlo, no hace nada. */
export async function showNotice(notice: SystemNotice): Promise<boolean> {
  if (notificationSupport() !== 'ready') return false
  // image y renotify no están en los tipos del DOM, pero Chrome los usa: la foto grande y que vuelva a sonar
  const options: NotificationOptions & { image?: string; renotify?: boolean } = {
    body: notice.body,
    tag: notice.tag,
    icon: ICON,
    badge: BADGE,
    lang: document.documentElement.lang || undefined,
    data: { url: notice.url ?? DEFAULT_URL },
  }
  if (notice.image) options.image = notice.image

  const worker = await notificationWorker()
  if (worker) {
    try {
      await worker.showNotification(notice.title, options)
      return true
    } catch {
      // Sigue abajo: en escritorio todavía queda el aviso de la página
    }
  }
  if (notificationPlatform() !== 'desktop') return false
  try {
    const shown = new Notification(notice.title, options)
    shown.onclick = () => {
      window.focus()
      shown.close()
    }
    return true
  } catch {
    return false
  }
}
