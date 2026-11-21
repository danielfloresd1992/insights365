/*  LOS PÓSTERS DE LAS PORTADAS (public/posters)

    Abre cada portada con ?poster en un Chrome sin ventana: la escena se dibuja quieta en su segundo de reposo y
    conserva el lienzo. Espera a que carguen las letras, lee el lienzo como WebP y lo guarda. Hay que volver a
    correrlo cuando cambie una escena o el tamaño de su hueco, y copiar el tamaño que imprime a POSTERS
    (src/routes/landing/assets/landing.content.ts).

    Con el servidor de desarrollo en marcha:
      node scripts/make-posters.mjs "C:/Program Files/Google/Chrome/Application/chrome.exe" <carpeta de perfil temporal> public/posters http://localhost:5174 [a,b,c,d]
    El último argumento, opcional, dice qué portadas fotografiar; sin él, todas.
*/
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const [chromePath, profile, outDir, base] = process.argv.slice(2)
fs.mkdirSync(outDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars',
  '--force-device-scale-factor=1.5', '--window-size=1440,900', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] })

const endpoint = await new Promise((resolve, reject) => {
  let buffer = ''
  chrome.stderr.on('data', chunk => {
    buffer += chunk
    const match = buffer.match(/DevTools listening on (ws:\/\/\S+)/)
    if (match) resolve(match[1])
  })
  setTimeout(() => reject(new Error('Chrome no abrió DevTools')), 20000)
})
const port = new URL(endpoint).port

try {
  for (const variant of process.argv[6] ? process.argv[6].split(',') : ['a', 'b', 'c', 'd']) {
    const url = `${base}/portadas/${variant}?poster`
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?${url}`, { method: 'PUT' })).json()
    const socket = new WebSocket(target.webSocketDebuggerUrl)
    await new Promise(resolve => socket.addEventListener('open', resolve))
    let messageId = 0
    const pending = new Map()
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message)
        pending.delete(message.id)
      }
    })
    const send = (method, params = {}) => new Promise(resolve => {
      messageId += 1
      pending.set(messageId, resolve)
      socket.send(JSON.stringify({ id: messageId, method, params }))
    })

    let dataUrl = null
    for (let attempt = 0; attempt < 40 && !dataUrl; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 500))
      const reply = await send('Runtime.evaluate', {
        expression: `(async () => {
          const canvas = document.querySelector('canvas')
          if (!canvas) return null
          await document.fonts.ready
          await new Promise(resolve => setTimeout(resolve, 1500))
          return JSON.stringify({ data: canvas.toDataURL('image/webp', 0.86), width: canvas.width, height: canvas.height })
        })()`,
        awaitPromise: true,
        returnByValue: true,
      })
      const value = reply.result?.result?.value
      if (value) dataUrl = JSON.parse(value)
    }
    if (!dataUrl) throw new Error(`sin lienzo en ${url}`)
    const file = path.join(outDir, `portada-${variant}.webp`)
    fs.writeFileSync(file, Buffer.from(dataUrl.data.split(',')[1], 'base64'))
    console.log(`${file}: ${dataUrl.width}x${dataUrl.height}, ${Math.round(fs.statSync(file).size / 1024)} KB`)
    socket.close()
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`)
  }
} finally {
  chrome.kill()
}
