import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { establishmentsSlice, loadEstablishments } from './slices/establishments.slice'
import { preferencesSlice, themeChanged, voiceChanged, writePreferences } from './slices/preferences.slice'
import { sessionSlice, signedIn } from './slices/session.slice'

/*  EL ESTADO GLOBAL (Redux Toolkit)
 *
 *  Un slice por cosa, en store/slices/<nombre>.slice.ts, y se registra aquí. Los tipos RootState y AppDispatch
 *  salen del propio store: así los hooks de store/hooks.ts siempre cuadran con lo registrado.
 *
 *  Lo que pasa SOLO al ocurrir algo va en el listener de aquí abajo, no en un componente: así no depende de qué
 *  pantalla esté montada.
 */
const listener = createListenerMiddleware()

export const store = configureStore({
  reducer: {
    session: sessionSlice.reducer,
    establishments: establishmentsSlice.reducer,
    preferences: preferencesSlice.reducer,
  },
  middleware: getDefaultMiddleware => getDefaultMiddleware().prepend(listener.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Al abrir sesión, sea al entrar o al abrir el portal con la sesión ya abierta, se cargan sus establecimientos
listener.startListening.withTypes<RootState, AppDispatch>()({
  actionCreator: signedIn,
  effect: (_action, listenerApi) => {
    void listenerApi.dispatch(loadEstablishments())
  },
})

// Cada cambio de tema o de voz se recuerda en este navegador
listener.startListening.withTypes<RootState, AppDispatch>()({
  matcher: isAnyOf(themeChanged, voiceChanged),
  effect: (_action, listenerApi) => {
    writePreferences(listenerApi.getState().preferences)
  },
})
