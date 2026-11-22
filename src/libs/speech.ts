/*  LA VOZ DEL NAVEGADOR (Web Speech API, speechSynthesis)
 *
 *  Dice un texto con una de las voces que trae el navegador, sin librerías ni servidor propio. Qué voces hay depende
 *  del navegador y del equipo: las «en el equipo» (localService) se generan aquí; las «en línea» mandan el texto a su
 *  proveedor (las Google de Chrome, por ejemplo).
 *  El navegador solo deja hablar después de que la persona haya tocado algo en la página.
 */

// BrowserVoice = «una voz del navegador», lo que el portal usa de ella
export type BrowserVoice = { uri: string; name: string; lang: string; local: boolean; isDefault: boolean }

// SpeechLanguage = «el idioma en que se habla»
export type SpeechLanguage = 'es' | 'en'

// UTTERANCE_LANG = «el idioma que se le pide al navegador cuando no hay voz elegida»
const UTTERANCE_LANG: Record<SpeechLanguage, string> = { es: 'es-ES', en: 'en-US' }

// speechSupported = «si este navegador puede generar voz»
export function speechSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

// listVoices = «las voces que el navegador tiene cargadas ahora» (pueden llegar un poco después: voiceschanged)
export function listVoices(): BrowserVoice[] {
  if (!speechSupported()) return []
  return window.speechSynthesis.getVoices().map(voice => ({
    uri: voice.voiceURI,
    name: voice.name,
    lang: voice.lang || '',
    local: voice.localService,
    isDefault: voice.default,
  }))
}

// voicesFor = «las voces de un idioma, la del sistema primero y luego por nombre»
export function voicesFor(voices: BrowserVoice[], language: SpeechLanguage) {
  return voices
    .filter(voice => voice.lang.toLowerCase().startsWith(language))
    .sort((first, second) => Number(second.isDefault) - Number(first.isDefault) || first.name.localeCompare(second.name))
}

type SpeakOptions = {
  language: SpeechLanguage
  voiceURI?: string | null
  rate?: number
  // interrupt = «calla lo que estuviera sonando»; sin él, este texto espera su turno detrás
  interrupt?: boolean
  onEnd?: () => void
}

/*  Dice el texto. Usa la voz elegida solo si es del idioma pedido; si no, deja que el navegador elija una de ese
 *  idioma. Devuelve false si el navegador no puede hablar. */
export function speak(text: string, { language, voiceURI, rate = 1, interrupt = true, onEnd }: SpeakOptions): boolean {
  if (!speechSupported()) return false
  const synth = window.speechSynthesis
  if (interrupt) synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = UTTERANCE_LANG[language]
  const chosen = voiceURI ? synth.getVoices().find(voice => voice.voiceURI === voiceURI) : undefined
  if (chosen && chosen.lang.toLowerCase().startsWith(language)) utterance.voice = chosen
  utterance.rate = rate
  if (onEnd) {
    utterance.onend = onEnd
    utterance.onerror = onEnd
  }
  synth.speak(utterance)
  return true
}

// stopSpeaking = «calla lo que esté sonando y lo que esperaba su turno»
export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
