import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { isAxiosError } from 'axios'
import { getMyEstablishments, type FullEstablishment, type InsightsAccess, type InsightsScope } from '@/ajax/establishments.ajax'
import { fetchSession } from '@/ajax/user.ajax'
import type { RootState } from '../index'
import { accessRefreshed, signedOut, toSessionUser } from './session.slice'

/*  LOS ESTABLECIMIENTOS DE QUIEN ENTRA
 *
 *  Al abrir sesión (al entrar, o al abrir el portal con la sesión ya abierta) se cargan los locales que esa persona
 *  puede ver, con todo lo poblado (ver ajax/establishments.ajax), y quedan aquí para cualquier pantalla. Lo dispara
 *  el store al ver `signedIn` (store/index.ts); al cerrar sesión se vacían.
 *
 *  El orden es: la sesión trae el acceso del usuario ya relacionado (session.user.access: sus franquicias y sus locales
 *  con nombre, y `scope`), y con él se pide la información de sus establecimientos (GET /insights/establishments, que
 *  la API filtra por la misma cookie). Si la sesión dice que no tiene nada asignado, no se pide nada. Al volver a la
 *  pestaña y cada pocos minutos se vuelve a preguntar por la sesión (refreshAccess, desde
 *  layouts/hook/useEstablishmentsRefresh): si un administrador le cambió el acceso en Client365, se vuelven a pedir.
 *
 *  Qué locales ve cada quien: los que un administrador le asignó (sus franquicias y sus locales sueltos), ninguno si no
 *  tiene nada asignado, y todos solo si es del equipo de Jarvis365 (`scope`, ver InsightsScope). Aquí no se filtra
 *  nada: lo que llega es lo que puede ver, y todas las pantallas (muro, visor de mesas, reportes) salen de esta lista.
 *  Es un permiso de verdad: la API tampoco le da los croquis, las rotaciones ni los informes de los demás.
 */

// EstablishmentsStatus = «sin pedir», «llegando», «listos» o «falló» (con `error` diciendo por qué)
export type EstablishmentsStatus = 'idle' | 'loading' | 'ready' | 'failed'

type EstablishmentsState = {
  status: EstablishmentsStatus
  items: FullEstablishment[]
  // access, scope, userId = «con qué acceso y por qué los eligió la API, y de quién son los que hay»
  access: InsightsAccess | null
  scope: InsightsScope | null
  userId: string | null
  // requestId = «la petición en curso»: la respuesta de otra (de antes de cerrar sesión) se descarta
  requestId: string | null
  error: string | null
}

const initialState: EstablishmentsState = {
  status: 'idle',
  items: [],
  access: null,
  scope: null,
  userId: null,
  requestId: null,
  error: null,
}

// Loaded = «lo que llegó»; unchanged = «es lo mismo que ya había» (al volver a pedirlos sin que nada cambiara, las
// pantallas siguen con los mismos objetos y no se vuelve a pedir nada que dependa de ellos)
type Loaded = { userId: string; access: InsightsAccess; scope: InsightsScope; items: FullEstablishment[]; unchanged: boolean }

// LoadOptions: force = «pedirlos aunque ya estén»; silent = «por detrás»: si ya hay unos, se siguen enseñando sin pasar
// por «cargando», y si falla no se enseña ningún error (se quedan los de antes)
type LoadOptions = { force?: boolean; silent?: boolean }

// loadFailure = «por qué no llegaron, dicho para quien usa el portal»
function loadFailure(error: unknown) {
  if (isAxiosError(error)) {
    if (!error.response) return 'No se pudo hablar con la API. Revisa la conexión e inténtalo de nuevo.'
    if (error.response.status === 401) return 'La sesión se cerró. Vuelve a entrar.'
    if (error.response.status === 404) return 'La API todavía no sabe qué locales ve cada usuario (falta desplegarla).'
    return `La API no devolvió los establecimientos (código ${error.response.status}).`
  }
  return 'No se pudieron leer los establecimientos.'
}

/*  Pide los locales del usuario con sesión. No repite la petición si ya están los suyos o van llegando; con
 *  `{ force: true }` los vuelve a pedir (y mientras llegan se quedan los de antes), y con `silent` además sin que se
 *  note (es lo que hace el portal al volver a la pestaña: así vale lo que un administrador le haya asignado o quitado
 *  sin tener que recargar). Un 401 cierra la sesión. */
export const loadEstablishments = createAsyncThunk<Loaded, LoadOptions | undefined, { state: RootState; rejectValue: string }>(
  'establishments/load',
  async (_options, { getState, dispatch, rejectWithValue }) => {
    const user = getState().session.user
    if (!user) return rejectWithValue('No hay sesión abierta.')
    // isSame = «es lo mismo que ya había»
    const isSame = (access: InsightsAccess, scope: InsightsScope, items: FullEstablishment[]) => {
      const before = getState().establishments
      return before.userId === user.id && before.scope === scope
        && JSON.stringify(before.access) === JSON.stringify(access) && JSON.stringify(before.items) === JSON.stringify(items)
    }
    // La sesión ya dice que no tiene nada asignado (y no es del equipo): no hay nada que pedir
    if (user.access?.scope === 'none') {
      const access: InsightsAccess = { mode: user.access.mode, franchises: [], locals: [] }
      return { userId: user.id, access, scope: 'none', items: [], unchanged: isSame(access, 'none', []) }
    }
    try {
      // Con lo que dice la sesión se pide la información de esos establecimientos (la API la filtra igual)
      const { access, scope, items } = await getMyEstablishments()
      return { userId: user.id, access, scope, items, unchanged: isSame(access, scope, items) }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) dispatch(signedOut())
      return rejectWithValue(loadFailure(error))
    }
  },
  {
    condition: (options, { getState }) => {
      const { session, establishments } = getState()
      if (!session.user) return false
      if (establishments.requestId !== null) return false
      if (options?.force) return true
      return !(establishments.status === 'ready' && establishments.userId === session.user.id)
    },
  },
)

/*  Vuelve a preguntar a la API por la sesión (GET /auth/isAuth), que trae el acceso del usuario leído de la base: si un
 *  administrador le asignó o quitó algo en Client365, se guarda en la sesión y se vuelven a pedir sus establecimientos
 *  por detrás. Si no cambió nada, no se pide nada más. Un 401 cierra la sesión. Lo usa useEstablishmentsRefresh. */
export const refreshAccess = createAsyncThunk<void, void, { state: RootState }>(
  'establishments/refreshAccess',
  async (_options, { getState, dispatch }) => {
    let apiUser
    try {
      apiUser = await fetchSession()
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) dispatch(signedOut())
      return
    }
    const before = getState().session.user?.access ?? null
    const next = toSessionUser(apiUser).access
    dispatch(accessRefreshed(next))
    // Sin acceso en la sesión (una API de antes) no se sabe si cambió: se piden igual, por detrás
    if (next === null || JSON.stringify(before) !== JSON.stringify(next)) {
      await dispatch(loadEstablishments({ force: true, silent: true }))
    }
  },
)

export const establishmentsSlice = createSlice({
  name: 'establishments',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadEstablishments.pending, (state, action) => {
        state.requestId = action.meta.requestId
        // Por detrás y con unos ya enseñados: no pasa por «cargando»
        if (action.meta.arg?.silent && state.userId !== null) return
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadEstablishments.fulfilled, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.status = 'ready'
        state.requestId = null
        state.error = null
        if (action.payload.unchanged) return
        state.items = action.payload.items
        state.access = action.payload.access
        state.scope = action.payload.scope
        state.userId = action.payload.userId
      })
      .addCase(loadEstablishments.rejected, (state, action) => {
        if (state.requestId !== action.meta.requestId) return
        state.requestId = null
        // Por detrás: se quedan los de antes, sin error (se volverá a intentar)
        if (action.meta.arg?.silent && state.userId !== null) return
        state.status = 'failed'
        state.error = action.payload ?? 'No se pudieron leer los establecimientos.'
      })
      // Al cerrar sesión no queda nada de la anterior
      .addCase(signedOut, () => initialState)
  },
})

// selectEstablishments, selectEstablishment = «los locales de quien entra» y «uno de ellos, por su id»
export const selectEstablishments = (state: RootState) => state.establishments.items
export const selectEstablishment = (state: RootState, id: string) => state.establishments.items.find(establishment => establishment._id === id) ?? null
