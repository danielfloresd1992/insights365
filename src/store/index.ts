import { configureStore } from '@reduxjs/toolkit'
import { sessionSlice } from './slices/session.slice'

/*  EL ESTADO GLOBAL (Redux Toolkit)
 *
 *  Un slice por cosa, en store/slices/<nombre>.slice.ts, y se registra aquí. Los tipos RootState y AppDispatch
 *  salen del propio store: así los hooks de store/hooks.ts siempre cuadran con lo registrado.
 */
export const store = configureStore({
  reducer: {
    session: sessionSlice.reducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
