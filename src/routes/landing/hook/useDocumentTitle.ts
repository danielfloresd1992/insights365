import { useEffect } from 'react'

/*  El título de la pestaña mientras la pantalla está abierta. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
