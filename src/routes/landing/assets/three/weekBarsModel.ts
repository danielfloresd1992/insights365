import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { DEMO_WEEK } from '../landing.content'
import { TINY_SCALE, easeOutCubic, makeLabelSprite, smoothStep } from './sceneKit'

/*  LAS BARRAS DE LA SEMANA, LISTAS PARA PONER EN UNA ESCENA (portadas B y D)
 *
 *  Los catorce turnos de la semana de ejemplo: siete días a lo ancho, el nocturno delante (es el más bajo y no tapa)
 *  y el diurno detrás. Cada barra mide los procesos evaluados del turno y su remate son los que acabaron en demora de
 *  preparación, con la cifra encima; un turno sin demoras no lleva cifra. Debajo de cada día, su nombre. Al cargar
 *  las barras crecen día a día.
 *
 *  No trae luces, suelo ni cámara: eso es de cada escena. Los colores y la letra llegan como parámetros.
 */

// WeekBarsPalette = «los colores de las barras y de sus rótulos»
export type WeekBarsPalette = {
  day: string
  night: string
  cap: string
  capEmissive: string
  capEmissiveIntensity: number
  countLabel: string
  dayLabel: string
}

// WeekBarsLayout = «la forma: separación entre días y filas, grueso y alto máximo, dónde arrancan y con qué letra»
export type WeekBarsLayout = {
  daySpacing: number
  rowOffset: number
  barWidth: number
  maxBarHeight: number
  baseY: number
  labelFamily: string
  countLabelHeight: number
  dayLabelHeight: number
  // startDelay = «cuántos segundos espera la primera barra antes de crecer»
  startDelay: number
}

type Bar = {
  base: THREE.Mesh
  cap: THREE.Mesh
  label: THREE.Sprite | null
  baseHeight: number
  capHeight: number
  delay: number
}

// GROW_SECONDS, CAP_DELAY_SECONDS = «lo que tarda en crecer una barra, y cuánto después empieza su remate»
const GROW_SECONDS = 1.1
const CAP_DELAY_SECONDS = 0.75

/*  Arma las barras dentro de `parent` y devuelve cómo moverlas: `update(elapsed)` las pone a su altura del segundo
 *  `elapsed`, y `restingSeconds` dice cuándo terminan de crecer. */
export function buildWeekBars(parent: THREE.Object3D, palette: WeekBarsPalette, layout: WeekBarsLayout) {
  const barGeometry = new RoundedBoxGeometry(layout.barWidth, 1, layout.barWidth, 3, 0.05)
  barGeometry.translate(0, 0.5, 0)
  const dayMaterial = new THREE.MeshStandardMaterial({ color: palette.day, roughness: 0.5, metalness: 0 })
  const nightMaterial = new THREE.MeshStandardMaterial({ color: palette.night, roughness: 0.55, metalness: 0 })
  const capMaterial = new THREE.MeshStandardMaterial({
    color: palette.cap,
    emissive: palette.capEmissive,
    emissiveIntensity: palette.capEmissiveIntensity,
    roughness: 0.35,
  })
  const unit = layout.maxBarHeight / Math.max(...DEMO_WEEK.processes.day, ...DEMO_WEEK.processes.night)

  const bars: Bar[] = []
  const shifts = [
    { key: 'night', positionZ: layout.rowOffset, material: nightMaterial, extraDelay: 0.12 },
    { key: 'day', positionZ: -layout.rowOffset, material: dayMaterial, extraDelay: 0 },
  ] as const

  DEMO_WEEK.days.forEach((dayName, dayIndex) => {
    const positionX = (dayIndex - (DEMO_WEEK.days.length - 1) / 2) * layout.daySpacing

    for (const shift of shifts) {
      const processes = DEMO_WEEK.processes[shift.key][dayIndex]
      const delays = DEMO_WEEK.prepDelays[shift.key][dayIndex]
      const base = new THREE.Mesh(barGeometry, shift.material)
      base.position.set(positionX, layout.baseY, shift.positionZ)
      base.castShadow = true
      base.receiveShadow = true
      const cap = new THREE.Mesh(barGeometry, capMaterial)
      cap.position.set(positionX, layout.baseY, shift.positionZ)
      cap.castShadow = true
      parent.add(base, cap)

      // Un turno sin demoras no lleva cifra: su 0 flotaría sobre la barra sin decir nada
      let label: THREE.Sprite | null = null
      if (delays > 0) {
        label = makeLabelSprite(String(delays), {
          color: palette.countLabel,
          family: layout.labelFamily,
          weight: 500,
          worldHeight: layout.countLabelHeight,
        })
        label.position.set(positionX, 0, shift.positionZ)
        label.material.opacity = 0
        parent.add(label)
      }

      bars.push({
        base,
        cap,
        label,
        baseHeight: (processes - delays) * unit,
        capHeight: delays * unit,
        delay: layout.startDelay + dayIndex * 0.08 + shift.extraDelay,
      })
    }

    const dayLabel = makeLabelSprite(dayName, {
      color: palette.dayLabel,
      family: layout.labelFamily,
      weight: 500,
      worldHeight: layout.dayLabelHeight,
    })
    dayLabel.position.set(positionX, layout.baseY + 0.18, layout.rowOffset + layout.barWidth / 2 + 0.85)
    parent.add(dayLabel)
  })

  const lastDelay = Math.max(...bars.map(bar => bar.delay))

  return {
    restingSeconds: lastDelay + CAP_DELAY_SECONDS + 0.6 + 0.6,
    update: (elapsed: number) => {
      for (const bar of bars) {
        const growth = easeOutCubic((elapsed - bar.delay) / GROW_SECONDS)
        const capGrowth = easeOutCubic((elapsed - bar.delay - CAP_DELAY_SECONDS) / 0.6)
        const baseTop = layout.baseY + bar.baseHeight * growth
        bar.base.scale.y = Math.max(TINY_SCALE, bar.baseHeight * growth)
        bar.cap.position.y = baseTop
        bar.cap.scale.y = Math.max(TINY_SCALE, bar.capHeight * capGrowth)
        bar.cap.visible = bar.capHeight > 0
        if (bar.label) {
          bar.label.position.y = baseTop + bar.capHeight * capGrowth + layout.countLabelHeight
          bar.label.material.opacity = smoothStep(bar.delay + GROW_SECONDS, bar.delay + GROW_SECONDS + 0.5, elapsed)
        }
      }
    },
  }
}
