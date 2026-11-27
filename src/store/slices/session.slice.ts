import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ApiSessionAccess, ApiUser } from '@/ajax/user.ajax'

/*  LA SESIÓN: quién está viendo el portal
 *
 *  Guarda al usuario con sesión abierta y en qué punto está la sesión: sin comprobar todavía (al abrir la página),
 *  abierta o cerrada. La sesión de verdad vive en la cookie de la API; esto es lo que el portal sabe de ella.
 */

// SessionAccess = «qué locales ve, ya relacionados con el usuario»: sus franquicias y sus locales con nombre, y por qué
// (scope). Viene con la sesión (ver ApiSessionAccess en ajax/user.ajax) y con él se piden luego sus establecimientos
export type SessionAccess = ApiSessionAccess

// SessionUser = «el usuario con sesión abierta», lo que el portal usa de él
export type SessionUser = {
  id: string
  name: string
  email: string | null
  admin: boolean
  // access = null si la API no lo mandó: entonces los establecimientos los decide solo GET /insights/establishments
  access: SessionAccess | null
}

const SCOPES = ['assigned', 'staff', 'none'] as const

// toSessionAccess = «el acceso como llega, con lo que falte resuelto»; null si no llegó
function toSessionAccess(raw: ApiUser['access']): SessionAccess | null {
  if (!raw || typeof raw !== 'object' || !SCOPES.includes(raw.scope)) return null
  return {
    mode: raw.mode === 'only' ? 'only' : 'all',
    scope: raw.scope,
    franchises: Array.isArray(raw.franchises) ? raw.franchises.filter(item => item?._id) : [],
    locals: Array.isArray(raw.locals) ? raw.locals.filter(item => item?._id) : [],
    updatedAt: raw.updatedAt ?? null,
  }
}

// SessionStatus = «sin comprobar» al abrir la página, y luego «abierta» o «cerrada»
export type SessionStatus = 'unknown' | 'signedIn' | 'signedOut'

type SessionState = {
  status: SessionStatus
  user: SessionUser | null
}

const initialState: SessionState = {
  status: 'unknown',
  user: null,
}

// toSessionUser = «el usuario de la API, reducido a lo que el portal usa»
export function toSessionUser(apiUser: ApiUser): SessionUser {
  const fullName = [apiUser.name, apiUser.surName].filter(Boolean).join(' ').trim()
  return {
    id: apiUser._id,
    name: fullName || apiUser.email || 'Usuario',
    email: apiUser.email ?? null,
    admin: Boolean(apiUser.admin),
    access: toSessionAccess(apiUser.access),
  }
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    // signedIn = «abrió sesión, o la API confirmó que la tenía»
    signedIn: (state, action: PayloadAction<SessionUser>) => {
      state.status = 'signedIn'
      state.user = action.payload
    },
    // signedOut = «cerró sesión, o la API dijo que no había»
    signedOut: (state) => {
      state.status = 'signedOut'
      state.user = null
    },
    // accessRefreshed = «la API volvió a decir qué ve» (al volver a preguntar por la sesión, ver refreshAccess)
    accessRefreshed: (state, action: PayloadAction<SessionAccess | null>) => {
      if (state.user) state.user.access = action.payload
    },
  },
})

export const { signedIn, signedOut, accessRefreshed } = sessionSlice.actions
