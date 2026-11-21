import { useEffect, useState } from 'react'

/*  UN CONTADOR QUE SUBE SOLO CADA CIERTO TIEMPO
 *
 *  Para lo que llega solo en las maquetas (una alerta nueva en el muro cada pocos segundos). Solo cuenta mientras
 *  está encendido: fuera de pantalla o con movimiento reducido se apaga y se queda donde iba.
 *
 *  @param everyMs   cada cuántos milisegundos sube
 *  @param running   si está contando
 */
export function useTicker(everyMs: number, running: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setCount(current => current + 1), everyMs)
    return () => window.clearInterval(timer)
  }, [everyMs, running])

  return count
}
