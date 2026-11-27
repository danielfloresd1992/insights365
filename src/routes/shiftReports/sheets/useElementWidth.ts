import { useCallback, useState } from 'react'

/*  EL ANCHO DE UN ELEMENTO, AL DÍA (ResizeObserver). Devuelve [ref para el elemento, ancho en px]; 0 hasta medirlo. */
export function useElementWidth(): [(node: HTMLElement | null) => void, number] {
  const [width, setWidth] = useState(0)
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return
    setWidth(node.getBoundingClientRect().width)
    const observer = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}
