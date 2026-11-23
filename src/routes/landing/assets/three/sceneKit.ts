import * as THREE from 'three'

/*  LAS PIEZAS COMUNES DE LAS ESCENAS 3D: curvas de movimiento, etiquetas de texto y la limpieza al desmontar */

// clamp01 = «el valor recortado entre 0 y 1»
export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

// easeOutCubic = «arranca rápido y llega suave»
export const easeOutCubic = (progress: number) => 1 - Math.pow(1 - clamp01(progress), 3)

// easeOutBack = «llega pasándose un poco y vuelve, para que las piezas caigan con peso»
export const easeOutBack = (progress: number) => {
  const clamped = clamp01(progress)
  const overshoot = 1.5
  return 1 + (overshoot + 1) * Math.pow(clamped - 1, 3) + overshoot * Math.pow(clamped - 1, 2)
}

// smoothStep = «0 antes de edgeStart, 1 después de edgeEnd y una curva suave entre los dos»
export const smoothStep = (edgeStart: number, edgeEnd: number, value: number) => {
  const ratio = clamp01((value - edgeStart) / (edgeEnd - edgeStart))
  return ratio * ratio * (3 - 2 * ratio)
}

// TINY_SCALE = «la escala más pequeña que se usa en vez de 0, que deja la matriz de la pieza sin inversa»
export const TINY_SCALE = 0.0001

/*  Suelta de la tarjeta gráfica todo lo que cuelga de root: geometrías, materiales y texturas. Marca cada
 *  material como soltado para que una etiqueta que termina de cargar su letra después no lo vuelva a usar. */
export function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  root.traverse(node => {
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points) {
      geometries.add(node.geometry)
    }
    if (node instanceof THREE.Mesh || node instanceof THREE.Line || node instanceof THREE.Points || node instanceof THREE.Sprite) {
      const list: THREE.Material[] = Array.isArray(node.material) ? node.material : [node.material]
      for (const material of list) materials.add(material)
    }
  })

  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value instanceof THREE.Texture) textures.add(value)
    }
    material.userData.disposed = true
    material.dispose()
  }
  for (const texture of textures) texture.dispose()
  for (const geometry of geometries) geometry.dispose()
}

type LabelOptions = {
  color: string
  family: string
  weight?: number
  // worldHeight = «cuánto mide de alto la etiqueta dentro de la escena»
  worldHeight: number
  // background = «una píldora de color detrás del texto, para que se lea sobre cualquier fondo»; sin ella, solo letra
  background?: string
}

// LABEL_FONT_PX = «el tamaño al que se dibuja el texto en el lienzo, antes de llevarlo a la escena»
const LABEL_FONT_PX = 64

/*  Una etiqueta de texto que siempre mira a la cámara. Se dibuja ya con la letra de reserva y se vuelve a
 *  dibujar cuando carga la de verdad; como el ancho puede cambiar, entonces estrena textura. */
export function makeLabelSprite(text: string, options: LabelOptions) {
  const canvas = document.createElement('canvas')
  const material = new THREE.SpriteMaterial({ transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(material)
  const font = `${options.weight ?? 600} ${LABEL_FONT_PX}px ${options.family}`

  const draw = () => {
    const context = canvas.getContext('2d')
    if (!context) return
    context.font = font
    const padding = LABEL_FONT_PX * (options.background ? 0.55 : 0.2)
    const width = Math.ceil(context.measureText(text).width + padding * 2)
    const height = Math.ceil(LABEL_FONT_PX * (options.background ? 1.6 : 1.3))
    canvas.width = width
    canvas.height = height
    if (options.background) {
      context.fillStyle = options.background
      context.beginPath()
      context.roundRect(0, 0, width, height, height / 2)
      context.fill()
    }
    context.font = font
    context.fillStyle = options.color
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, width / 2, height / 2)
    sprite.scale.set(options.worldHeight * (width / height), options.worldHeight, 1)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    material.map?.dispose()
    material.map = texture
    material.needsUpdate = true
  }

  draw()
  if (typeof document !== 'undefined' && document.fonts) {
    void document.fonts.load(font).then(() => {
      if (!material.userData.disposed) draw()
    })
  }
  return sprite
}

// orbitPosition = «el punto a `radius` del objetivo, girado `azimuth` alrededor del eje vertical y alzado `elevation`»
export function orbitPosition(target: THREE.Vector3, radius: number, azimuth: number, elevation: number) {
  return new THREE.Vector3(
    target.x + radius * Math.cos(elevation) * Math.sin(azimuth),
    target.y + radius * Math.sin(elevation),
    target.z + radius * Math.cos(elevation) * Math.cos(azimuth),
  )
}
