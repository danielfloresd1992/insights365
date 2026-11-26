import { useEffect, useState } from 'react'
import { getOpenRotations, getSavedRotations, type Rotation } from '@/ajax/tables.ajax'
import { socket } from '@/libs/socket'
import { mergeRotations, operationalDay } from './tableActivity'

/*  LAS ROTACIONES DE HOY DE UN LOCAL, AL DÍA
 *
 *  Las abiertas (en vivo) y las guardadas del día operativo en curso, juntas (mergeRotations). Se vuelven a pedir:
 *  - cuando la API avisa por el socket de que algo cambió en ese local: 'rotation-sync:<id>' (Mesas abre, cambia o
 *    quita una rotación) y '<nombre>-post' / '<nombre>-put' (se guardó o se corrigió una);
 *  - y cada minuto, por si el socket no llega (sin conexión, certificado…).
 *  Los avisos que llegan seguidos se juntan en una sola petición (REFETCH_MS).
 *  Lo cargado lleva el id de su local: al cambiar de local, hasta que llegue lo nuevo, se devuelve «cargando».
 */

// REFETCH_MS = «cuánto se espera tras un aviso antes de volver a pedir», y POLL_MS = «cada cuánto se pide sin aviso»
const REFETCH_MS = 800
const POLL_MS = 60_000

type ActivityState = { status: 'idle' | 'loading' | 'ready' | 'failed'; rotations: Rotation[]; day: string }
type Loaded = { id: string; status: 'ready' | 'failed'; rotations: Rotation[]; day: string }

// fetchDay = «las rotaciones de hoy de un local»: las abiertas y las guardadas del día operativo
async function fetchDay(id: string) {
  const day = operationalDay()
  const [open, saved] = await Promise.all([getOpenRotations(id), getSavedRotations(id, day)])
  return { day, rotations: mergeRotations(open, saved) }
}

export function useTableActivity(establishment: { _id: string; name: string } | null): ActivityState {
  const id = establishment?._id ?? null
  const name = establishment?.name ?? null
  const [loaded, setLoaded] = useState<Loaded | null>(null)

  useEffect(() => {
    if (!id || !name) return
    let alive = true
    let timer: ReturnType<typeof setTimeout> | null = null

    const run = () => {
      fetchDay(id)
        .then(({ day, rotations }) => {
          if (alive) setLoaded({ id, status: 'ready', rotations, day })
        })
        .catch(() => {
          // Si ya había algo de este local, se queda: mejor una cifra de hace un minuto que ninguna
          if (alive) setLoaded(previous => (previous?.id === id && previous.status === 'ready' ? previous : { id, status: 'failed', rotations: [], day: operationalDay() }))
        })
    }
    const soon = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(run, REFETCH_MS)
    }

    run()
    const events = [`rotation-sync:${id}`, `${name}-post`, `${name}-put`]
    events.forEach(event => socket.on(event, soon))
    if (!socket.connected) socket.connect()
    const poll = setInterval(run, POLL_MS)

    return () => {
      alive = false
      events.forEach(event => socket.off(event, soon))
      clearInterval(poll)
      if (timer) clearTimeout(timer)
    }
  }, [id, name])

  if (!id) return { status: 'idle', rotations: [], day: operationalDay() }
  if (loaded?.id !== id) return { status: 'loading', rotations: [], day: operationalDay() }
  return { status: loaded.status, rotations: loaded.rotations, day: loaded.day }
}
