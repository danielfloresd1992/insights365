import { useEffect, useState } from 'react'

/*  LA HORA DE AHORA, REFRESCADA CADA `intervalMs`: para que «hace 5 min» no se quede quieto. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
