import type { ReactNode } from 'react'

/*  LAS PIEZAS QUE COMPARTEN LAS TRES VISTAS DEL REPORTE. Solo pintan. */

// Card = «un bloque con título»; con `id`, un enlace (#id) lleva a él sin quedar bajo la cabecera fija
export function Card({ id, title, note, children, className = '' }: { id?: string; title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`flex min-w-0 scroll-mt-24 flex-col gap-3 rounded-2xl bg-portal-surface p-4 ring-1 ring-inset ring-portal-line sm:p-5 ${className}`}>
      <header>
        <h2 className='m-0 text-[15px] font-semibold tracking-[-0.01em] text-portal-ink'>{title}</h2>
        {note && <p className='m-0 mt-0.5 text-[12.5px] text-portal-muted'>{note}</p>}
      </header>
      {children}
    </section>
  )
}

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
