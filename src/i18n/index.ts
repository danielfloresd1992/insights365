import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { es } from './es'

/*  EL IDIOMA DEL PORTAL (i18next + react-i18next)
 *
 *  Español o inglés. La primera vez se toma del navegador; desde que la persona elige en el header, se recuerda en
 *  este navegador (LANGUAGE_KEY). Los textos están en es.ts y en.ts; las pantallas los piden con useTranslation().
 *  Solo el portal con sesión está traducido: la portada y /acceso siguen en español.
 */

// LANGUAGES = «los idiomas del portal»; Language = «uno de ellos»
export const LANGUAGES = ['es', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

// LANGUAGE_KEY = «dónde se recuerda en este navegador el idioma elegido»
const LANGUAGE_KEY = 'insights365.idioma'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    fallbackLng: 'es',
    supportedLngs: LANGUAGES,
    // en-US o es-VE del navegador cuentan como en y es
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_KEY,
      caches: ['localStorage'],
    },
    // React ya escapa lo que pinta
    interpolation: { escapeValue: false },
  })

// currentLanguage = «el idioma en que está el portal ahora»
export function currentLanguage(): Language {
  return i18n.resolvedLanguage === 'en' ? 'en' : 'es'
}

export default i18n
