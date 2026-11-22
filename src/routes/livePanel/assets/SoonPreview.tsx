import type { SceneFactory } from '@/routes/landing/hook/useThreeScene'
import { useThreeScene } from '@/routes/landing/hook/useThreeScene'

/*  UN ADELANTO «PRÓXIMAMENTE» DEL PANEL. Solo pinta.
 *
 *  Una escena 3D de muestra (las de la portada) que llena la tarjeta y, encima, en la esquina, qué será: la píldora
 *  «Próximamente», el título y una línea. Abajo a la derecha se aclara que es un ejemplo, no los datos del local.
 *  La escena se anima solo mientras se ve y queda quieta con «reducir movimiento»; sin WebGL queda la tarjeta sola.
 *
 *  @param createScene  la escena de muestra
 *  @param badge        «Próximamente», en el idioma del portal
 *  @param title        qué será
 *  @param text         una línea que lo explica
 *  @param sample       «Ejemplo»
 *  @param className    el sitio que le deja el panel
 */
type SoonPreviewProps = {
  createScene: SceneFactory
  badge: string
  title: string
  text: string
  sample: string
  className?: string
}

export default function SoonPreview({ createScene, badge, title, text, sample, className = '' }: SoonPreviewProps) {
  const { containerRef, ready, failed } = useThreeScene(createScene, false)
  const titleId = `soon-${title.replace(/\W+/g, '-').toLowerCase()}`

  return (
    <section aria-labelledby={titleId} className={`relative min-h-0 overflow-hidden rounded-2xl bg-portal-ctl ring-1 ring-inset ring-portal-line ${className}`}>
      <div ref={containerRef} aria-hidden='true' className={`absolute inset-0 transition-opacity duration-700 ${ready && !failed ? 'opacity-100' : 'opacity-0'}`} />
      <div className='pointer-events-none relative flex h-full flex-col justify-between p-4'>
        <div className='max-w-[19rem] rounded-xl bg-portal-surface/85 px-3.5 py-3 shadow-[0_12px_32px_-18px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-portal-line backdrop-blur-md'>
          <div className='flex flex-wrap items-center gap-x-2.5 gap-y-1.5'>
            <span className='inline-flex h-6 items-center gap-1.5 rounded-full bg-[#29c50c]/12 px-2.5 text-xs font-semibold text-[#177406] dark:bg-[#29c50c]/16 dark:text-[#8be070]'>
              <span aria-hidden='true' className='h-1.5 w-1.5 rounded-full bg-[#29c50c]' />
              {badge}
            </span>
            <h2 id={titleId} className='m-0 text-base font-semibold tracking-[-0.01em] text-portal-ink'>
              {title}
            </h2>
          </div>
          <p className='m-0 mt-1.5 text-[13px] leading-snug text-portal-muted'>{text}</p>
        </div>
        <p className='m-0 self-end rounded-full bg-portal-surface/80 px-2.5 py-0.5 text-[11px] font-medium text-portal-muted ring-1 ring-inset ring-portal-line backdrop-blur-md'>
          {sample}
        </p>
      </div>
    </section>
  )
}
