import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useThreeScene } from '@/routes/landing/hook/useThreeScene'
import { useAppSelector } from '@/store/hooks'
import { createReliefControls, createReliefScene, type ReliefData, type ReliefHover } from './reliefScene'

/*  EL RELIEVE 3D, MONTADO. Se carga aparte (lazy): trae three.js.
 *
 *  Monta la escena (reliefScene) en su caja y le pasa, sin rehacerla, el indicador elegido. Encima pone lo que la
 *  escena no dibuja: el rótulo de la barra bajo el ratón y, si la maqueta está girada, el botón para devolverla a su
 *  sitio. Si el equipo no tiene WebGL enseña `fallback` (la gráfica plana del indicador elegido). La escena sigue el
 *  tema del portal: al cambiarlo se rehace con sus colores.
 *
 *  @param data      las semanas y los indicadores, ya escritos; debe venir memorizado (cambia = escena nueva)
 *  @param selected  el id del indicador elegido
 *  @param onPick    (id) => void, al tocar una barra
 *  @param fallback  lo que se enseña sin WebGL
 */
type Relief3DProps = { data: ReliefData; selected: string; onPick: (id: string) => void; fallback: ReactNode }

// TIP_HALF_WIDTH = «medio ancho del rótulo flotante, más o menos»: para que no se salga de la caja por los lados
const TIP_HALF_WIDTH = 96

export default function Relief3D({ data, selected, onPick, fallback }: Relief3DProps) {
  const { t } = useTranslation()
  const theme = useAppSelector(state => state.preferences.theme)
  // controls = «el mando»: uno por montaje; la escena lo lee al dibujar y cuenta por él lo que pasa
  const [controls] = useState(() => createReliefControls(selected))
  const factory = useMemo(() => createReliefScene({ data, theme, controls }), [data, theme, controls])
  const { containerRef, ready, failed, redraw } = useThreeScene(factory, false)
  const [hover, setHover] = useState<ReliefHover | null>(null)
  const [moved, setMoved] = useState(false)

  useEffect(() => {
    controls.listen({ pick: onPick, hover: setHover, viewMoved: setMoved })
  }, [controls, onPick])

  // Una escena quieta (movimiento reducido) no tiene bucle: al elegir otro indicador se le pide un fotograma
  useEffect(() => {
    controls.setSelected(selected)
    redraw()
  }, [controls, selected, redraw])

  if (failed) return <>{fallback}</>

  // El rótulo va sobre el techo de la barra; si no cabe encima (barra muy alta), va debajo
  const tipBelow = hover !== null && hover.y < 84
  return (
    <>
      <div ref={containerRef} aria-hidden='true' className={`absolute inset-0 transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`} />
      {hover && (
        <div
          aria-hidden='true'
          className={`pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-xl bg-portal-surface px-3 py-2 shadow-lg ring-1 ring-portal-line ${tipBelow ? 'translate-y-3' : '-translate-y-full'}`}
          style={{ left: Math.min(Math.max(hover.x, TIP_HALF_WIDTH), Math.max(TIP_HALF_WIDTH, hover.width - TIP_HALF_WIDTH)), top: tipBelow ? hover.y : hover.y - 10 }}
        >
          <p className='m-0 text-[12px] font-medium text-portal-muted'>{hover.name}</p>
          <p className='m-0 mt-0.5 text-[14px] text-portal-ink'>
            {hover.week} · <span className='font-plex-mono font-semibold'>{hover.value}</span>
          </p>
          {!hover.selected && <p className='m-0 mt-1 text-[11.5px] text-portal-muted'>{t('reports.reliefTipPick')}</p>}
        </div>
      )}
      {moved && (
        <button
          type='button'
          onClick={() => controls.resetView()}
          className='absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-full border border-solid border-portal-line bg-portal-surface px-3 py-1.5 text-[12.5px] font-medium text-portal-ink shadow-sm hover:bg-portal-ctl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'
        >
          <svg aria-hidden='true' width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.4' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M3 12a9 9 0 1 0 3-6.7L3 8' />
            <path d='M3 3v5h5' />
          </svg>
          {t('reports.reliefReset')}
        </button>
      )}
    </>
  )
}
