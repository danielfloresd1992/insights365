import { useEffect, useState } from 'react'
import { listVoices, speechSupported, voicesFor, type BrowserVoice, type SpeechLanguage } from './speech'

/*  LAS VOCES DEL NAVEGADOR PARA UN IDIOMA
 *
 *  El navegador las carga cuando quiere: a veces ya están, a veces llegan después (voiceschanged), y algunos no traen
 *  ninguna. `loaded` se vuelve true en cuanto hay alguna o pasado LOAD_WAIT_MS, para poder decir «no hay» en vez de
 *  «cargando» para siempre.
 */

// LOAD_WAIT_MS = «cuánto se espera a que lleguen las voces antes de decir que no hay»
const LOAD_WAIT_MS = 1500

export function useBrowserVoices(language: SpeechLanguage) {
  const [all, setAll] = useState<BrowserVoice[]>(() => listVoices())
  const [waited, setWaited] = useState(false)

  useEffect(() => {
    if (!speechSupported()) return
    const synth = window.speechSynthesis
    const refresh = () => setAll(listVoices())
    synth.addEventListener('voiceschanged', refresh)
    const timer = window.setTimeout(() => setWaited(true), LOAD_WAIT_MS)
    return () => {
      synth.removeEventListener('voiceschanged', refresh)
      window.clearTimeout(timer)
    }
  }, [])

  return { voices: voicesFor(all, language), loaded: all.length > 0 || waited, supported: speechSupported() }
}
