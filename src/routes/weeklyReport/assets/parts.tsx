import type { ReactNode } from 'react'
import { useRevealValues } from '../hook/useRevealValues'

/*  LAS PIEZAS QUE COMPARTEN LAS TRES VISTAS DEL REPORTE. Solo pintan. */

// Card = «un bloque con título»; con `id`, un enlace (#id) lleva a él sin quedar bajo la cabecera fija; con `icon`
// (trazos de 24×24), el título lleva delante su icono en relieve
export function Card({ id, title, note, icon, children, className = '' }: { id?: string; title: string; note?: string; icon?: string[]; children: ReactNode; className?: string }) {
  const heading = (
    <>
      <h2 className='m-0 text-[15px] font-semibold tracking-[-0.01em] text-portal-ink'>{title}</h2>
      {note && <p className='m-0 mt-0.5 text-[12.5px] text-portal-muted'>{note}</p>}
    </>
  )
  return (
    <section id={id} className={`flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-2xl bg-portal-surface p-4 ring-1 ring-inset ring-portal-line sm:p-5 ${className}`}>
      {icon ? (
        <header className='flex items-center gap-3'>
          <IconTile paths={icon} />
          <div className='min-w-0'>{heading}</div>
        </header>
      ) : (
        <header>{heading}</header>
      )}
      {children}
    </section>
  )
}

// IconTile = «un icono en una ficha ámbar en relieve», delante de un título (propuesta B del lienzo del semanal en 3D)
export function IconTile({ paths, size = 'md' }: { paths: string[]; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-8 w-8 rounded-[10px]' : 'h-9 w-9 rounded-[11px]'
  const icon = size === 'sm' ? 16 : 19
  return (
    <span
      aria-hidden='true'
      className={`grid flex-none place-items-center ${box} bg-[linear-gradient(160deg,#fff3d6_0%,#f0dcaa_100%)] text-[#8a5a0f] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_0_#e0cb98,0_5px_10px_rgba(120,90,20,0.16)] dark:bg-[linear-gradient(160deg,#5c4722_0%,#2f2614_100%)] dark:text-[#f1c66e] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_3px_0_#17120a,0_6px_12px_rgba(0,0,0,0.35)]`}
    >
      <svg width={icon} height={icon} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
        {paths.map(path => <path key={path} d={path} />)}
      </svg>
    </span>
  )
}

// GrowBar = «una barrita de proporción» (0 a 1) con su carril: en 0 hasta que entra en pantalla, luego crece hasta su
// sitio (useRevealValues). Decorativa: la cifra va escrita al lado
export function GrowBar({ fraction, track, fill }: { fraction: number; track: string; fill: string }) {
  const { ref, valueOf } = useRevealValues<HTMLSpanElement>([['barra', Math.min(1, Math.max(0, fraction))]])
  return (
    <span ref={ref} aria-hidden='true' className={track}>
      <span className={fill} style={{ width: `${valueOf('barra') * 100}%` }} />
    </span>
  )
}

// STAGE = «la luz de arriba de los bloques del semanal en 3D»: un degradado suave sobre el fondo y un filo claro arriba
export const STAGE = 'bg-[linear-gradient(180deg,#f9f3e6_0%,#fffdf7_55%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:bg-[linear-gradient(180deg,#2a251d_0%,#25211a_60%)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'

// Notice = «un aviso»: lo que falta (warn) o lo que falló (error)
export function Notice({ tone = 'warn', children }: { tone?: 'warn' | 'error'; children: ReactNode }) {
  const look = tone === 'error' ? 'bg-portal-danger-bg text-portal-danger' : 'bg-[#fdf3dc] text-[#6b3f06] dark:bg-[#3a2f17] dark:text-[#f0d28a]'
  return <p role={tone === 'error' ? 'alert' : 'status'} className={`m-0 rounded-xl px-4 py-3 text-[13.5px] leading-relaxed ${look}`}>{children}</p>
}

// Progress = «cuánto se ha traído»: el texto y una barra
export function Progress({ text, done, total }: { text: string; done: number; total: number }) {
  return (
    <div role='status' className='flex flex-col gap-2 rounded-2xl bg-portal-ctl p-4 ring-1 ring-inset ring-portal-line'>
      <span className='text-[13.5px] text-portal-muted'>{text}</span>
      <span aria-hidden='true' className='block h-1.5 overflow-hidden rounded-full bg-portal-line'>
        <span className='block h-full rounded-full bg-[#29c50c] transition-[width] duration-300' style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </span>
    </div>
  )
}

// Arrow = «la flecha de un cambio»: arriba, abajo o igual
export function Arrow({ direction, size = 14 }: { direction: 'up' | 'down' | 'flat'; size?: number }) {
  const path = direction === 'up' ? 'M12 19V5M6 11l6-6 6 6' : direction === 'down' ? 'M12 5v14M6 13l6 6 6-6' : 'M5 12h14'
  return <svg aria-hidden='true' width={size} height={size} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round'><path d={path} /></svg>
}

// TRIGGER = «el aspecto de los botones de la barra de filtros» (local y semana): un hueco de la barra; el fondo lo pone
// cada uno según esté abierto o no
export const TRIGGER = 'flex h-14 items-center gap-3 rounded-[13px] px-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-portal-ink'

// TABLE, TH, TD = «las clases de las tablas del reporte»
export const TABLE = 'w-full border-collapse text-[13.5px]'
export const TH = 'border-b border-portal-line px-2.5 py-2 text-left text-xs font-semibold text-portal-muted'
export const TD = 'border-b border-portal-line px-2.5 py-2 text-portal-ink'
export const NUM = 'text-right font-plex-mono tabular-nums'
