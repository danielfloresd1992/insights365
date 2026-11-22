import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import { LA_FRANCISCA, getFranchisesEstablishments, type FullEstablishment } from '@/ajax/establishments.ajax'
import type { RootState } from '../index'
import { signedOut, type SessionUser } from './session.slice'

/*  LOS ESTABLECIMIENTOS DE QUIEN ENTRA
 *
 *  Al abrir sesión (al entrar, o al abrir el portal con la sesión ya abierta) se cargan los locales que esa persona
 *  puede ver, con todo lo poblado (ver ajax/establishments.ajax), y quedan aquí para cualquier pantalla. Lo dispara
 *  el store al ver `signedIn` (store/index.ts); al cerrar sesión se vacían.
 *
 *  De qué franquicias es cada quien: las que traiga la sesión, cuando la API las dé. HOY LA API NO LIGA USUARIOS CON
 *  FRANQUICIAS, así que mientras tanto todo el que entra ve las de PROVISIONAL_FRANCHISES. Es para probar con datos de
 *  verdad, no un permiso: la API le sigue dejando ver todo a cualquier sesión.
 */

// PROVISIONAL_FRANCHISES = «lo que ve todo el que entra mientras la API no diga de quién es cada franquicia»
export const PROVISIONAL_FRANCHISES = [LA_FRANCISCA]

// franchisesOf = «qué franquicias ve este usuario»: nombres o ids, los dos valen
export function franchisesOf(user: SessionUser): string[] {
  return user.franchises?.length ? user.franchises : PROVISIONAL_FRANCHISES
}

// EstablishmentsStatus = «sin pedir», «llegando», «listos» o «falló» (con `error` diciendo por qué)
export type EstablishmentsStatus = 'idle' | 'loading' | 'ready' | 'failed'

type EstablishmentsState = {
  status: EstablishmentsStatus
  items: FullEstablishment[]
  // franchises, userId = «de qué franquicias y de quién son los que hay»
  franchises: string[]
  userId: string | null
  // requestId = «la petición en curso»: la respuesta de otra (de antes de cerrar sesión) se descarta
  requestId: string | null
  error: string | null
}

const initialState: EstablishmentsState = {
  status: 'idle',
  items: [],
  franchises: [],
  userId: null,
  requestId: null,
  error: null,
}

type Loaded = { userId: string; franchises: string[]; items: FullEstablishment[] }

// loadFailure = «por qué no llegaron, dicho para quien usa el portal»
function loadFailure(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) return 'No se pudo hablar con la API. Revisa la conexión e inténtalo de nuevo.'
    if (error.response.status === 401) return 'La sesión se cerró. Vuelve a entrar.'
    return `La API no devolvió los establecimientos (código ${error.response.status}).`
  }
  return 'No se pudieron leer los establecimientos.'
}

/*  Pide los locales del usuario con sesión. No repite la petición si ya están los suyos o van llegando; con
 *  `{ force: true }` los vuelve a pedir (y mientras llegan se quedan los de antes). Un 401 cierra la sesión. */
export const loadEstablishments = createAsyncThunk<Loaded, { force?: boolean } | undefined, { state: RootState; rejectValue: string }>(
  'establishments/load',
  async (_options, { getState, dispatch, rejectWithValue }) => {
    const user = getState().session.user
    if (!user) return rejectWithValue('No hay sesión abierta.')
    const franchises = franchisesOf(user)
    try {
      const items = await getFranchisesEstablishments(franchises)
      return { userId: user.id, franchises, items }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) dispatch(signedOut())
      return rejectWithValue(loadFailure(error))
    }
  },
  {
    condition: (options, { getState }) => {
      const { session, establishments } = getState()
      if (!session.user) return false
      if (establishments.status === 'loading') return false
      if (options?.force) return true
      return !(establishments.status === 'ready' && establishments.userId === session.user.id)
    },
  },
)

export const establishmentsSlice = createSlice({
  name: 'establishments',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadEstablishments.pending, (state, action) => {
        state.status = 'loading'
        state.requestId = action.meta.requestId
        state.error = null
      })
      .addCase(loadEstablishments.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'ready'
        state.items = action.payload.items
        state.franchises = action.payload.franchises
        state.userId = action.payload.userId
        state.requestId = null
      })
      .addCase(loadEstablishments.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron leer los establecimientos.'
        state.requestId = null
      })
      // Al cerrar sesión no queda nada de la anterior
      .addCase(signedOut, () => initialState)
  },
})

// selectEstablishments, selectEstablishment = «los locales de quien entra» y «uno de ellos, por su id»
export const selectEstablishments = (state: RootState) => state.establishments.items
export const selectEstablishment = (state: RootState, id: string) => state.establishments.items.find(establishment => establishment._id === id) ?? null
