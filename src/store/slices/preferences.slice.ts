import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/*  LAS PREFERENCIAS DE QUIEN USA EL PORTAL: el tema, la voz y los avisos del sistema
 *
 *  Se eligen en el header y se recuerdan en este navegador (PREFERENCES_KEY): el store las guarda cada vez que
 *  cambian (store/index.ts). La primera vez, el tema sigue al sistema (claro u oscuro) y las alertas nuevas se leen
 *  en voz alta (el interruptor del header las silencia).
 *  El idioma no vive aquí: lo lleva i18next (src/i18n), que también lo recuerda.
 */

// PREFERENCES_VERSION = «la versión de lo guardado». En la 2 la voz pasó a estar encendida de partida: lo guardado
// antes (con la voz apagada porque era lo de partida) la enciende una vez
const PREFERENCES_VERSION = 2

// Theme = «claro u oscuro»
export type Theme = 'light' | 'dark'

// VoicePreferences = «si se leen en voz alta las alertas nuevas, con qué voz del navegador y a qué velocidad»
export type VoicePreferences = {
  on: boolean
  // voiceURI = «la voz elegida»; null es «la primera que haya para el idioma»
  voiceURI: string | null
  rate: number
}

// NotificationPreferences = «si las alertas nuevas salen como aviso del sistema» (libs/notifications); además hace
// falta el permiso del navegador, que se pide aparte
export type NotificationPreferences = { on: boolean }

export type PreferencesState = { theme: Theme; voice: VoicePreferences; notifications: NotificationPreferences }

// PREFERENCES_KEY = «dónde se recuerdan en este navegador»
export const PREFERENCES_KEY = 'insights365.preferencias'

// RATE_RANGE = «la velocidad de la voz, de la más lenta a la más rápida»
export const RATE_RANGE = { min: 0.7, max: 1.5, step: 0.1 }

const clampRate = (rate: unknown) =>
  typeof rate === 'number' && Number.isFinite(rate) ? Math.min(RATE_RANGE.max, Math.max(RATE_RANGE.min, rate)) : 1

// systemTheme = «el tema del sistema operativo, si el navegador lo dice»
function systemTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

// readPreferences = «lo que se recordó en este navegador, con lo que falte resuelto»
function readPreferences(): PreferencesState {
  let stored: (Partial<PreferencesState> & { version?: number }) | null = null
  try {
    stored = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? 'null')
  } catch {
    stored = null
  }
  const voice = stored?.voice
  return {
    theme: stored?.theme === 'dark' || stored?.theme === 'light' ? stored.theme : systemTheme(),
    voice: {
      on: stored?.version === PREFERENCES_VERSION ? Boolean(voice?.on) : true,
      voiceURI: typeof voice?.voiceURI === 'string' ? voice.voiceURI : null,
      rate: clampRate(voice?.rate),
    },
    // Encendidos de partida: no salen hasta que el navegador da permiso
    notifications: { on: typeof stored?.notifications?.on === 'boolean' ? stored.notifications.on : true },
  }
}

// writePreferences = «las recuerda en este navegador»; sin almacenamiento (ventana privada) duran lo que la página
export function writePreferences(state: PreferencesState) {
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify({ ...state, version: PREFERENCES_VERSION }))
  } catch {
    // Nada que hacer: siguen valiendo mientras la página esté abierta
  }
}

export const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: readPreferences,
  reducers: {
    // themeChanged = «eligió claro u oscuro»
    themeChanged: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload
    },
    // voiceChanged = «cambió algo de la voz: encenderla, la voz o la velocidad»
    voiceChanged: (state, action: PayloadAction<Partial<VoicePreferences>>) => {
      const next = action.payload
      if (next.on !== undefined) state.voice.on = next.on
      if (next.voiceURI !== undefined) state.voice.voiceURI = next.voiceURI
      if (next.rate !== undefined) state.voice.rate = clampRate(next.rate)
    },
    // notificationsChanged = «encendió o apagó los avisos del sistema»
    notificationsChanged: (state, action: PayloadAction<boolean>) => {
      state.notifications.on = action.payload
    },
  },
})

export const { themeChanged, voiceChanged, notificationsChanged } = preferencesSlice.actions
