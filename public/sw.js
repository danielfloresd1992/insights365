/*  EL SERVICE WORKER DE insights365: solo para los avisos del sistema (src/libs/notifications.ts)
 *
 *  No guarda nada en caché ni toca las peticiones: el portal sigue cargando como siempre. Muestra los avisos que le
 *  pide la página (en Android e iOS es la única manera) y, al pulsar uno, vuelve a la ventana abierta del portal y la
 *  lleva a donde dice el aviso (el panel en vivo); si no hay ninguna abierta, la abre.
 */

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/en-vivo', self.location.origin)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const open = windows.find(client => new URL(client.url).origin === target.origin)
      if (!open) {
        await self.clients.openWindow(target.href)
        return
      }
      await open.focus()
      if (new URL(open.url).pathname !== target.pathname && 'navigate' in open) await open.navigate(target.href).catch(() => {})
    })(),
  )
})
