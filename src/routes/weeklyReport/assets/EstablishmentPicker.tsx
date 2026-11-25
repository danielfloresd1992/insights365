import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { FullEstablishment } from '@/ajax/establishments.ajax'
import { TRIGGER } from './parts'

/*  ELEGIR EL LOCAL (propuesta A del lienzo de los filtros, elegida por el usuario)
 *
 *  Un botón con las iniciales y el nombre del local; al abrirlo, un buscador (por nombre o por franquicia) y la lista
 *  agrupada por franquicia, con los inactivos al final de cada grupo y marcados. Con el teclado: las flechas recorren
 *  la lista (desde el buscador, la flecha abajo entra en ella) y Escape cierra y devuelve el foco al botón. Un clic
 *  fuera también cierra.
 *
 *  @param items     los locales de quien entra
 *  @param selected  el local elegido
 *  @param onChange  (id) => void
 */
type EstablishmentPickerProps = { items: FullEstablishment[]; selected: FullEstablishment; onChange: (id: string) => void }

// TINTS = «los colores de las iniciales»: cada local tiene siempre el mismo, sacado de su nombre
const TINTS = [
  'bg-[#dfe9d4] text-[#2f5a1a] dark:bg-[#3d5a2a] dark:text-[#e3f4d6]',
  'bg-[#f1e4c8] text-[#6a4a10] dark:bg-[#6a5226] dark:text-[#f7e7c4]',
  'bg-[#d6e4f0] text-[#1f4a6a] dark:bg-[#28506a] dark:text-[#dcecf9]',
  'bg-[#f0dcd6] text-[#7a3424] dark:bg-[#6a3426] dark:text-[#f9e0d8]',
]
const tintOf = (name: string) => TINTS[[...name].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % TINTS.length]

// initialsOf = «las iniciales de un local»: la primera letra de su primera y de su última palabra
function initialsOf(name: string) {
  const words = name.split(/\s+/).filter(Boolean)
  const first = words[0] ?? ''
  return (first.charAt(0) + (words.length > 1 ? words[words.length - 1].charAt(0) : first.charAt(1))).toUpperCase()
}

function Initials({ name, size = 'md' }: { name: string; size?: 'md' | 'sm' }) {
  return (
    <span aria-hidden='true' className={`inline-flex flex-none items-center justify-center font-bold ${size === 'md' ? 'h-9 w-9 rounded-[10px] text-[13px]' : 'h-8 w-8 rounded-[9px] text-xs'} ${tintOf(name)}`}>
      {initialsOf(name)}
    </span>
  )
}

const Chevron = () => (
  <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='flex-none text-portal-muted'><path d='m6 9 6 6 6-6' /></svg>
)

export default function EstablishmentPicker({ items, selected, onChange }: EstablishmentPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  // Un clic fuera cierra
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const close = () => {
    setOpen(false)
    setQuery('')
    triggerRef.current?.focus()
  }
  const pick = (id: string) => {
    onChange(id)
    close()
  }

  const text = query.trim().toLocaleLowerCase()
  const visible = items.filter(item => !text || `${item.name} ${item.franchiseName ?? ''}`.toLocaleLowerCase().includes(text))
  // groups = «los locales por franquicia»: las franquicias por nombre y los sin franquicia al final; dentro, los activos primero
  const groups = [...new Set(visible.map(item => item.franchiseName ?? ''))]
    .sort((a, b) => (a === '' ? 1 : b === '' ? -1 : a.localeCompare(b)))
    .map(name => ({
      name: name || t('reports.noFranchise'),
      items: visible.filter(item => (item.franchiseName ?? '') === name).sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name)),
    }))

  // Las flechas recorren las opciones; Escape cierra
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const options = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])]
    if (options.length === 0) return
    event.preventDefault()
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    const next = event.key === 'ArrowDown' ? (index + 1) % options.length : index <= 0 ? options.length - 1 : index - 1
    options[next].focus()
  }

  return (
    <div ref={rootRef} className='relative min-w-0 flex-[1_1_280px] sm:max-w-[380px]' onKeyDown={open ? onKeyDown : undefined}>
      <button
        ref={triggerRef}
        type='button'
        aria-haspopup='listbox'
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? close() : setOpen(true))}
        className={`${TRIGGER} w-full ${open ? 'bg-portal-soft' : 'bg-portal-surface hover:bg-portal-soft dark:bg-portal-page dark:hover:bg-portal-soft'}`}
      >
        <Initials name={selected.name} />
        <span className='flex min-w-0 flex-1 flex-col'>
          <span className='text-xs text-portal-muted'>{t('reports.picker.local')}</span>
          <span className='truncate text-[15px] font-semibold text-portal-ink'>
            {selected.name}
            {!selected.isActive && <span className='font-normal text-portal-muted'> · {t('reports.inactive')}</span>}
          </span>
        </span>
        <Chevron />
      </button>

      {open && (
        <div className='absolute left-0 top-[calc(100%+10px)] z-30 w-[min(380px,calc(100vw-48px))] rounded-2xl bg-portal-surface p-2.5 shadow-[0_18px_40px_rgb(0_0_0/0.25)] ring-1 ring-portal-ring'>
          <label className='flex h-11 items-center gap-2 rounded-[11px] bg-portal-ctl px-3 ring-1 ring-inset ring-portal-line focus-within:ring-2 focus-within:ring-portal-ink'>
            <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' className='flex-none text-portal-muted'><circle cx='11' cy='11' r='7' /><path d='m20 20-3.5-3.5' /></svg>
            <span className='sr-only'>{t('reports.picker.search')}</span>
            <input
              type='search'
              // oxlint-disable-next-line jsx-a11y/no-autofocus -- al abrir el buscador lo que se quiere es escribir
              autoFocus
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder={t('reports.picker.search')}
              className='h-10 min-w-0 flex-1 bg-transparent text-sm text-portal-ink outline-none placeholder:text-portal-muted'
            />
          </label>
          <div ref={listRef} id={listId} role='listbox' aria-label={t('reports.picker.listLabel')} className='mt-2 flex max-h-[min(320px,50vh)] flex-col gap-0.5 overflow-y-auto'>
            {groups.map(group => (
              <div key={group.name} role='group' aria-label={groups.length > 1 ? group.name : undefined} className='flex flex-col gap-0.5'>
                {groups.length > 1 && <p aria-hidden='true' className='m-0 px-2 pb-1 pt-2 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-portal-muted'>{group.name}</p>}
                {group.items.map(item => {
                  const on = item._id === selected._id
                  return (
                    <button
                      key={item._id}
                      type='button'
                      role='option'
                      aria-selected={on}
                      onClick={() => pick(item._id)}
                      className={`flex min-h-12 items-center gap-3 rounded-[10px] px-2.5 py-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-portal-ink ${on ? 'bg-portal-soft' : 'hover:bg-portal-ctl'} ${item.isActive ? '' : 'opacity-75'}`}
                    >
                      <Initials name={item.name} size='sm' />
                      <span className='min-w-0 flex-1 truncate text-sm font-medium text-portal-ink'>{item.name}</span>
                      {!item.isActive && <span className='rounded-full bg-portal-soft px-2 py-0.5 text-[11.5px] text-portal-muted'>{t('reports.inactive')}</span>}
                      {on && <svg aria-hidden='true' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.6' strokeLinecap='round' strokeLinejoin='round' className='flex-none text-[#1f7a0a] dark:text-[#8be070]'><path d='M5 12l5 5L20 7' /></svg>}
                    </button>
                  )
                })}
              </div>
            ))}
            {visible.length === 0 && <p className='m-0 px-2 py-3 text-[13.5px] text-portal-muted'>{t('reports.picker.noMatch', { query: query.trim() })}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// AllEstablishments = «lo que va en el sitio del local en la vista global»: todos, con cuántos activos y franquicias
export function AllEstablishments({ items }: { items: FullEstablishment[] }) {
  const { t } = useTranslation()
  const active = items.filter(item => item.isActive)
  const franchises = new Set(active.map(item => item.franchiseName).filter(Boolean)).size
  return (
    <div className='flex h-14 min-w-0 flex-[1_1_280px] items-center gap-3 rounded-[13px] bg-portal-surface px-3.5 sm:max-w-[380px] dark:bg-portal-page'>
      <span aria-hidden='true' className='inline-flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-[#dfe9d4] text-[#2f5a1a] dark:bg-[#2f3a26] dark:text-[#9fe28a]'>
        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'><path d='M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z' /></svg>
      </span>
      <span className='flex min-w-0 flex-col'>
        <span className='text-[15px] font-semibold text-portal-ink'>{t('reports.picker.allLocals')}</span>
        <span className='truncate text-xs text-portal-muted'>
          {t('reports.picker.activeCount', { count: active.length })}
          {franchises > 0 && `, ${t('reports.picker.franchiseCount', { count: franchises })}`}
        </span>
      </span>
    </div>
  )
}
