import { useEffect, useRef, useState } from 'react'
import { getFranchiseEstablishments, getFranchises, type Franchise } from '@/libs/wall.api'

/*  DE QUÉ FRANQUICIAS SON LAS ALERTAS QUE SE VEN
 *
 *  Lo que se pidió es que el muro enseñe las alertas de las franquicias del dueño que entra. HOY LA API NO SABE de
 *  quién es cada franquicia: sus usuarios no están ligados a ninguna. Así que:
 *  - si la sesión trae las franquicias del dueño (`ownedFranchises`), se usan esas y no se puede elegir otras;
 *  - si no, se eligen a mano entre todas, y la elección se recuerda en este navegador.
 *  Con las franquicias se piden sus locales, y el muro se queda con las alertas de esos locales.
 *
 *  `scopeIds` es el conjunto de locales: null si no hay ninguna elegida (se ve todo), undefined mientras llegan.
 */

// STORAGE_KEY = «dónde se recuerda, en este navegador, qué franquicias se eligieron»
const STORAGE_KEY = 'insights365.muro.franquicias'

function readStoredSelection(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(stored) ? stored.filter(entry => typeof entry === 'string') : []
  } catch {
    return []
  }
}

export function useFranchiseScope(ownedFranchises: string[] | null) {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [selected, setSelected] = useState<string[]>(() => (ownedFranchises ? [] : readStoredSelection()))
  // resolved = «los locales de la última elección ya resuelta, con la clave de esa elección»
  const [resolved, setResolved] = useState<{ key: string; ids: Set<string> } | null>(null)
  const establishmentCache = useRef(new Map<string, string[]>())

  const names = ownedFranchises ?? selected
  const selectionKey = [...names].sort().join('|')

  // La lista de franquicias solo hace falta para elegir
  useEffect(() => {
    if (ownedFranchises) return
    let cancelled = false
    getFranchises()
      .then(list => {
        if (!cancelled) setFranchises([...list].sort((first, second) => first.name.localeCompare(second.name, 'es')))
      })
      .catch(() => {
        if (!cancelled) setFranchises([])
      })
    return () => {
      cancelled = true
    }
  }, [ownedFranchises])

  // La elección se recuerda en este navegador
  useEffect(() => {
    if (ownedFranchises) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected))
    } catch {
      // Sin almacenamiento (ventana privada) la elección dura lo que dure la página
    }
  }, [selected, ownedFranchises])

  // Los locales de las franquicias elegidas, una petición por franquicia y guardados para no repetirla
  useEffect(() => {
    if (!selectionKey) return
    let cancelled = false
    const wanted = selectionKey.split('|')
    Promise.all(
      wanted.map(name => {
        const cached = establishmentCache.current.get(name)
        if (cached) return Promise.resolve(cached)
        return getFranchiseEstablishments(name)
          .then(list => {
            const ids = list.map(establishment => String(establishment._id))
            establishmentCache.current.set(name, ids)
            return ids
          })
          .catch(() => [] as string[])
      }),
    ).then(groups => {
      if (!cancelled) setResolved({ key: selectionKey, ids: new Set(groups.flat()) })
    })
    return () => {
      cancelled = true
    }
  }, [selectionKey])

  const scopeIds: Set<string> | null | undefined = !selectionKey ? null : resolved?.key === selectionKey ? resolved.ids : undefined

  const toggle = (name: string) =>
    setSelected(current => (current.includes(name) ? current.filter(entry => entry !== name) : [...current, name]))
  const clear = () => setSelected([])

  return {
    owned: ownedFranchises,
    franchises,
    selected: names,
    scopeIds,
    selectionKey,
    toggle,
    clear,
  }
}
