import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import * as THREE from 'three'
import { useStillScene } from './useStillScene'

/*  EL MOTOR DE LAS ESCENAS 3D
 *
 *  Monta un lienzo WebGL dentro del contenedor, lo ajusta a su tamaño y le pide a la escena un fotograma por cada
 *  vuelta del navegador. El reloj solo avanza cuando la escena se ve, la pestaña está delante y nadie la pausó.
 *  Con movimiento reducido, y en el teléfono, no hay bucle: se dibuja una vez, en el segundo de reposo de la escena.
 *  Si el equipo no tiene WebGL, `failed` lo dice y la portada enseña su reserva.
 */

// SceneInstance = «lo que devuelve cada escena: cómo se dibuja, cómo cambia de tamaño y cómo se suelta»
export type SceneInstance = {
  // restingSeconds = «el segundo en que la escena ya está montada y quieta; es el que se dibuja sin movimiento»
  restingSeconds: number
  renderFrame: (elapsedSeconds: number) => void
  resize: (width: number, height: number) => void
  dispose: () => void
}

// SceneFactory = «la función que arma una escena sobre un renderizador ya creado»
export type SceneFactory = (renderer: THREE.WebGLRenderer, width: number, height: number) => SceneInstance

// SceneSlot = «lo que una portada necesita para poner la escena en su sitio: dónde va, si ya dibujó su primer
// fotograma (hasta entonces se ve el póster) y si falló (sin WebGL, o un shader rechazado: se queda el póster)»
export type SceneSlot = {
  containerRef: RefObject<HTMLDivElement | null>
  ready: boolean
  failed: boolean
}

// MAX_FRAME_SECONDS = «el salto más grande que da el reloj entre dos fotogramas, para no brincar tras una pausa»
const MAX_FRAME_SECONDS = 0.1

// POSTER_MODE = «la página se abrió con ?poster para fotografiar la escena: quieta y con el lienzo conservado,
// para poder leerlo con toDataURL. Es lo que usa el script que fabrica los pósters de public/posters»
const POSTER_MODE = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('poster')

// detectWebGL = «si este navegador puede abrir un contexto WebGL; lo abre, mira y lo suelta enseguida»
function detectWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!context) return false
    context.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch {
    return false
  }
}

export function useThreeScene(createScene: SceneFactory | null, paused: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  // clockRef = «los segundos que lleva corriendo la escena; la tarjeta de novedades lee el mismo reloj»
  const clockRef = useRef(0)
  const pausedRef = useRef(paused)
  // drawRef = «dibuja ya el fotograma actual»: una escena quieta no tiene bucle, y si cambia lo que enseña (un
  // indicador elegido) hay que pedírselo (redraw)
  const drawRef = useRef<(() => void) | null>(null)
  const [webglAvailable] = useState(detectWebGL)
  // readyScene, brokenScene = «la escena que ya dibujó su primer fotograma, y la que rompió un shader»; se guardan
  // por escena para que al cambiar de portada la nueva empiece sin listo ni roto
  const [readyScene, setReadyScene] = useState<SceneFactory | null>(null)
  const [brokenScene, setBrokenScene] = useState<SceneFactory | null>(null)
  // still = «la escena no se anima: movimiento reducido, teléfono o fotografía del póster»
  const still = useStillScene() || POSTER_MODE

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !createScene || !webglAvailable) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: POSTER_MODE,
      })
    } catch {
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setClearColor(0x000000, 0)
    // Un shader que la tarjeta gráfica rechaza no lanza: deja la escena vacía. Se avisa y la portada vuelve al póster
    renderer.debug.onShaderError = () => setBrokenScene(() => createScene)
    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    const initialWidth = Math.max(1, container.clientWidth)
    const initialHeight = Math.max(1, container.clientHeight)
    renderer.setSize(initialWidth, initialHeight, false)
    const scene = createScene(renderer, initialWidth, initialHeight)

    clockRef.current = still ? scene.restingSeconds : 0
    let visible = true
    let frameId = 0
    let lastTimestamp: number | null = null

    let announced = false
    const drawCurrent = () => {
      scene.renderFrame(clockRef.current)
      if (announced) return
      announced = true
      // Se avisa en el fotograma siguiente, ya pintado, para que el póster se aparte sobre la escena entera
      requestAnimationFrame(() => setReadyScene(() => createScene))
    }
    drawRef.current = drawCurrent

    const loop = (timestamp: number) => {
      frameId = requestAnimationFrame(loop)
      const deltaSeconds = lastTimestamp === null ? 0 : Math.min((timestamp - lastTimestamp) / 1000, MAX_FRAME_SECONDS)
      lastTimestamp = timestamp
      if (!visible || pausedRef.current || document.hidden) return
      clockRef.current += deltaSeconds
      drawCurrent()
    }

    // FONT_SETTLE_MS = «lo que se espera tras cargar las letras para que las etiquetas y las hojas terminen de redibujarse»
    const FONT_SETTLE_MS = 80
    let fontTimer = 0
    let disposed = false
    if (still) {
      drawCurrent()
      // Quieta no hay bucle: si las letras de las etiquetas y las hojas llegan después, hay que volver a dibujar
      void document.fonts?.ready.then(() => {
        if (!disposed) fontTimer = window.setTimeout(drawCurrent, FONT_SETTLE_MS)
      })
    } else {
      frameId = requestAnimationFrame(loop)
    }

    const resizeObserver = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect
      if (!box || box.width < 1 || box.height < 1) return
      renderer.setSize(box.width, box.height, false)
      scene.resize(box.width, box.height)
      drawCurrent()
    })
    resizeObserver.observe(container)

    const visibilityObserver = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting)
    })
    visibilityObserver.observe(container)

    return () => {
      disposed = true
      drawRef.current = null
      cancelAnimationFrame(frameId)
      window.clearTimeout(fontTimer)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      scene.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    }
  }, [createScene, still, webglAvailable])

  const failed = !webglAvailable || (createScene !== null && brokenScene === createScene)
  const ready = createScene !== null && readyScene === createScene
  const redraw = useCallback(() => drawRef.current?.(), [])
  return { containerRef, clockRef, ready, failed, still, redraw }
}
